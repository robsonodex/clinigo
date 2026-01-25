/**
 * TISS Webservice Client
 * Cliente genérico para integração com webservices TISS (SOAP/REST)
 */
import axios, { AxiosInstance } from 'axios'

export interface WebserviceConfig {
    operator_id: string
    url: string
    username?: string
    password?: string
    certificate?: string // Base64 certificado A1
    type: 'SOAP' | 'REST'
    timeout_seconds?: number
    retry_attempts?: number
    retry_delay_ms?: number
}

export class TISSWebserviceClient {
    private config: WebserviceConfig
    private axios: AxiosInstance

    constructor(config: WebserviceConfig) {
        this.config = config

        this.axios = axios.create({
            baseURL: config.url,
            timeout: (config.timeout_seconds || 30) * 1000,
            headers: {
                'Content-Type': config.type === 'SOAP' ? 'text/xml' : 'application/json',
            },
        })

        // Adicionar auth se fornecido
        if (config.username && config.password) {
            this.axios.defaults.auth = {
                username: config.username,
                password: config.password,
            }
        }
    }

    /**
     * Enviar lote TISS via webservice
     */
    async enviarLote(loteXML: string): Promise<{ protocol: string }> {
        const startTime = Date.now()

        try {
            const response = await this.retryRequest(async () => {
                if (this.config.type === 'SOAP') {
                    return await this.axios.post('', loteXML, {
                        headers: { 'Content-Type': 'text/xml; charset=utf-8' },
                    })
                } else {
                    // REST
                    return await this.axios.post('/lotes', { xml: loteXML })
                }
            })

            const responseTime = Date.now() - startTime

            // Extrair protocolo da resposta
            const protocol = this.extractProtocol(response.data)

            // TODO: Log no banco
            console.log('[WEBSERVICE] Lote enviado:', { protocol, responseTime })

            return { protocol }
        } catch (error: any) {
            // TODO: Log erro no banco
            console.error('[WEBSERVICE] Erro ao enviar lote:', error.message)
            throw error
        }
    }

    /**
     * Consultar status de protocolo
     */
    async consultarProtocolo(protocol: string): Promise<{ status: string; xml?: string }> {
        try {
            const response = await this.retryRequest(async () => {
                if (this.config.type === 'SOAP') {
                    const soapRequest = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
              <soapenv:Body>
                <ConsultarProtocolo>
                  <protocolo>${protocol}</protocolo>
                </ConsultarProtocolo>
              </soapenv:Body>
            </soapenv:Envelope>
          `
                    return await this.axios.post('', soapRequest)
                } else {
                    return await this.axios.get(`/protocolos/${protocol}`)
                }
            })

            return {
                status: this.extractStatus(response.data),
                xml: response.data,
            }
        } catch (error: any) {
            console.error('[WEBSERVICE] Erro ao consultar protocolo:', error.message)
            throw error
        }
    }

    /**
     * Baixar retorno de protocolo
     */
    async baixarRetorno(protocol: string): Promise<string> {
        try {
            const response = await this.retryRequest(async () => {
                if (this.config.type === 'SOAP') {
                    const soapRequest = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
              <soapenv:Body>
                <BaixarRetorno>
                  <protocolo>${protocol}</protocolo>
                </BaixarRetorno>
              </soapenv:Body>
            </soapenv:Envelope>
          `
                    return await this.axios.post('', soapRequest)
                } else {
                    return await this.axios.get(`/retornos/${protocol}`)
                }
            })

            return response.data
        } catch (error: any) {
            console.error('[WEBSERVICE] Erro ao baixar retorno:', error.message)
            throw error
        }
    }

    /**
     * Retry automático de requisições
     */
    private async retryRequest<T>(
        requestFn: () => Promise<T>,
        attempt = 1
    ): Promise<T> {
        const maxAttempts = this.config.retry_attempts || 3
        const delay = this.config.retry_delay_ms || 1000

        try {
            return await requestFn()
        } catch (error: any) {
            if (attempt < maxAttempts) {
                console.log(`[WEBSERVICE] Retry attempt ${attempt}/${maxAttempts}`)
                await this.sleep(delay * attempt) // Exponential backoff
                return this.retryRequest(requestFn, attempt + 1)
            }
            throw error
        }
    }

    /**
     * Sleep helper
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    /**
     * Extrair número de protocolo da resposta
     */
    private extractProtocol(xml: string): string {
        // Stub simplificado - implementar parser XML adequado
        const match = xml.match(/<protocolo[^>]*>([^<]+)<\/protocolo>/i)
        return match ? match[1] : `PROTO_${Date.now()}`
    }

    /**
     * Extrair status da resposta
     */
    private extractStatus(xml: string): string {
        const match = xml.match(/<status[^>]*>([^<]+)<\/status>/i)
        return match ? match[1] : 'UNKNOWN'
    }

    /**
     * Testar conexão com webservice
     */
    async testConnection(): Promise<{ success: boolean; message: string; responseTime: number }> {
        const startTime = Date.now()

        try {
            await this.axios.get('/health', { timeout: 5000 })
            const responseTime = Date.now() - startTime

            return {
                success: true,
                message: 'Conexão estabelecida com sucesso',
                responseTime,
            }
        } catch (error: any) {
            const responseTime = Date.now() - startTime

            return {
                success: false,
                message: error.message || 'Erro ao conectar',
                responseTime,
            }
        }
    }
}
