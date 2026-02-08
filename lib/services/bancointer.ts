
import axios, { AxiosInstance } from 'axios'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { logger } from '@/lib/logger'

interface InterConfig {
    clientId: string
    clientSecret: string
    certPath: string
    keyPath: string
}

interface BoletoData {
    seuNumero: string // ID único do cliente (ex: subscription_id)
    cnpjCPFBeneficiario: string
    valorNominal: number
    dataVencimento: string // YYYY-MM-DD
    numDiasAgenda: number // 0 (pagamento no mesmo dia) a 60
    pagador: {
        cpfCnpj: string
        tipoPessoa: 'FISICA' | 'JURIDICA'
        nome: string
        endereco: string
        numero: string
        bairro: string
        cidade: string
        uf: string
        cep: string
        email: string
        ddd: string
        telefone: string
    }
    mensagem?: {
        linha1?: string
        linha2?: string
        linha3?: string
        linha4?: string
        linha5?: string
    }
}

interface PixData {
    cpfCnpj: string // CPF/CNPJ do pagador (opcional, mas recomendado para conciliação)
    nome: string // Nome do pagador
    originalValor: number
    solicitacaoPagador?: string
    chave: string // Chave Pix (EVP) cadastrada
}


export class BancoInterService {
    private api: AxiosInstance
    private config: InterConfig
    private token: string | null = null
    private tokenExpiresAt: number = 0

    constructor() {
        this.config = {
            clientId: process.env.INTER_CLIENT_ID!,
            clientSecret: process.env.INTER_CLIENT_SECRET!,
            certPath: process.env.INTER_CERT_PATH || path.join(process.cwd(), 'certs', 'inter.crt'),
            keyPath: process.env.INTER_KEY_PATH || path.join(process.cwd(), 'certs', 'inter.key'),
        }

        // Check if certs exist (only if we are not in build time environment check)
        // We initialize the agent lazily in methods to avoid startup crashes if files are missing
    }

    private getHttpsAgent() {
        try {
            if (!fs.existsSync(this.config.certPath) || !fs.existsSync(this.config.keyPath)) {
                throw new Error(`Certificates not found at ${this.config.certPath} or ${this.config.keyPath}`)
            }

            const cert = fs.readFileSync(this.config.certPath)
            const key = fs.readFileSync(this.config.keyPath)

            return new https.Agent({
                cert,
                key,
                passphrase: process.env.INTER_CERT_PASSWORD // Optional if key is encrypted
            })
        } catch (error) {
            logger.error({ error }, 'Failed to load Banco Inter certificates')
            throw error
        }
    }

    /**
     * Authenticate and get Access Token (OAuth 2.0 Client Credentials with mTLS)
     */
    private async getAccessToken(): Promise<string> {
        const now = Date.now()
        // Return cached token if valid (with 5 min buffer)
        if (this.token && now < this.tokenExpiresAt - 300000) {
            return this.token
        }

        try {
            const agent = this.getHttpsAgent()

            const params = new URLSearchParams()
            params.append('client_id', this.config.clientId)
            params.append('client_secret', this.config.clientSecret)
            params.append('grant_type', 'client_credentials')
            params.append('scope', 'boleto-cobranca.read boleto-cobranca.write pix.read pix.write webhook.read webhook.write') // Adjust scopes as needed

            const response = await axios.post(
                'https://cdpj.partners.bancointer.com.br/oauth/v2/token',
                params.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    httpsAgent: agent
                }
            )

            this.token = response.data.access_token
            // Default expiration is 3600s (1h)
            this.tokenExpiresAt = now + (response.data.expires_in * 1000)

            return this.token!
        } catch (error: any) {
            logger.error({ error: error.response?.data || error.message }, 'Banco Inter Auth Failed')
            throw new Error('Falha na autenticação com Banco Inter')
        }
    }

    /**
     * Create HTTP Client with valid token
     */
    private async getClient() {
        const token = await this.getAccessToken()
        const agent = this.getHttpsAgent()

        return axios.create({
            baseURL: 'https://cdpj.partners.bancointer.com.br/cobranca/v3', // V3 for Boleto/Pix endpoints
            httpsAgent: agent,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
    }

    /**
     * Issue a Boleto (Cobranca)
     * Note: Inter V3 API unifies Boleto and Pix in some endpoints, 
     * but usually "Cobranca" generates a Boleto which can have a Pix QR Code attached.
     */
    async createBoleto(data: BoletoData) {
        try {
            const client = await this.getClient()

            const payload = {
                seuNumero: data.seuNumero,
                valorNominal: data.valorNominal,
                dataVencimento: data.dataVencimento,
                numDiasAgenda: data.numDiasAgenda,
                pagador: data.pagador,
                mensagem: data.mensagem
                // Note: desconto, multa, mora are optional - using API defaults
            }

            // Step 1: Create the cobranca - V3 API returns only codigoSolicitacao
            const createResponse = await client.post('/cobrancas', payload)
            const codigoSolicitacao = createResponse.data?.codigoSolicitacao

            if (!codigoSolicitacao) {
                throw new Error('Banco Inter não retornou codigoSolicitacao')
            }

            // Step 2: Wait a bit for the boleto to be processed
            await new Promise(resolve => setTimeout(resolve, 2000))

            // Step 3: Fetch the boleto details using codigoSolicitacao
            const detailsResponse = await client.get(`/cobrancas/${codigoSolicitacao}`)
            const boletoDetails = detailsResponse.data

            // Return with expected format
            return {
                nossoNumero: boletoDetails.nossoNumero || codigoSolicitacao,
                codigoBarras: boletoDetails.codigoBarras || '',
                linhaDigitavel: boletoDetails.linhaDigitavel || '',
                codigoSolicitacao: codigoSolicitacao
            }
        } catch (error: any) {
            logger.error({ error: error.response?.data || error.message }, 'Banco Inter Create Boleto Failed')
            throw error
        }
    }

    /**
     * Create an Immediate PIX Cobranca (Dynamic QR Code)
     */
    async createPixImmediate(data: PixData) {
        try {
            const token = await this.getAccessToken()
            const agent = this.getHttpsAgent()

            // Pix API Base URL is different
            const client = axios.create({
                baseURL: 'https://cdpj.partners.bancointer.com.br/pix/v2',
                httpsAgent: agent,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            const payload = {
                calendario: {
                    expiracao: 86400 // 24 hours
                },
                devedor: {
                    cpf: data.cpfCnpj.replace(/\D/g, '').length === 11 ? data.cpfCnpj.replace(/\D/g, '') : undefined,
                    cnpj: data.cpfCnpj.replace(/\D/g, '').length === 14 ? data.cpfCnpj.replace(/\D/g, '') : undefined,
                    nome: data.nome
                },
                valor: {
                    original: data.originalValor.toFixed(2)
                },
                chave: data.chave, // Your Pix Key
                solicitacaoPagador: data.solicitacaoPagador
            }

            const response = await client.post('/cob', payload)

            // Returns { txid, pixCopiaECola, location }
            return response.data
        } catch (error: any) {
            logger.error({ error: error.response?.data || error.message }, 'Banco Inter Create Pix Failed')
            throw error
        }
    }

    /**
     * Get Cobranca Status (Boleto)
     */
    async getBoletoStatus(nossoNumero: string) {
        try {
            const client = await this.getClient()
            const response = await client.get(`/cobrancas/${nossoNumero}`)
            return response.data
        } catch (error: any) {
            logger.error({ error: error.response?.data || error.message, nossoNumero }, 'Banco Inter Get Boleto Status Failed')
            throw error
        }
    }

    /**
     * Get Boleto PDF (Base64)
     */
    async getBoletoPdf(nossoNumero: string) {
        try {
            const client = await this.getClient()
            const response = await client.get(`/cobrancas/${nossoNumero}/pdf`)
            // API returns { pdf: "base64string..." }
            return response.data.pdf
        } catch (error: any) {
            logger.error({ error: error.response?.data || error.message, nossoNumero }, 'Banco Inter Get Boleto PDF Failed')
            throw error
        }
    }
}

export const bancoInterService = new BancoInterService()
