/**
 * Labs RJ Adapter
 * Integration layer for Rio de Janeiro laboratory networks
 * 
 * Supports:
 * - Sérgio Franco (DASA)
 * - Richet Medicina Diagnóstica
 */

// ==========================================
// Abstract Adapter Interface
// ==========================================

export interface LabResult {
    /** ID único do resultado */
    id: string
    /** ID do pedido/solicitação */
    orderId: string
    /** Data/hora da coleta */
    collectionDate: string
    /** Data/hora do resultado */
    resultDate: string
    /** Paciente */
    patient: {
        cpf: string
        name: string
    }
    /** Médico solicitante */
    requestingDoctor: {
        crm: string
        name: string
    }
    /** Exames realizados */
    exams: LabExam[]
    /** Status do laudo */
    status: 'PENDING' | 'PARTIAL' | 'COMPLETE'
    /** PDF do laudo (URL ou base64) */
    reportUrl?: string
}

export interface LabExam {
    /** Código do exame */
    code: string
    /** Nome do exame */
    name: string
    /** Material (sangue, urina, etc) */
    material: string
    /** Resultado */
    result: string
    /** Unidade de medida */
    unit?: string
    /** Valor de referência */
    referenceRange?: string
    /** Indicador de anormalidade */
    abnormal?: boolean
    /** Observações */
    notes?: string
}

export interface LabOrder {
    /** Paciente */
    patient: {
        cpf: string
        name: string
        birthDate: string
        phone: string
    }
    /** Médico solicitante */
    requestingDoctor: {
        crm: string
        crmState: string
        name: string
    }
    /** Clínica */
    clinic: {
        id: string
        name: string
        cnpj: string
    }
    /** Exames solicitados (códigos) */
    examCodes: string[]
    /** Indicação clínica */
    clinicalIndication?: string
    /** Urgente */
    urgent?: boolean
}

export interface LabOrderResponse {
    success: boolean
    orderId?: string
    schedulingUrl?: string
    error?: {
        code: string
        message: string
    }
}

// Abstract adapter interface
export interface LabAdapter {
    name: string

    /** Test connection with API */
    testConnection(): Promise<boolean>

    /** Create a new lab order */
    createOrder(order: LabOrder): Promise<LabOrderResponse>

    /** Get results for a specific order */
    getResults(orderId: string): Promise<LabResult | null>

    /** Get all results for a patient */
    getPatientResults(cpf: string, limit?: number): Promise<LabResult[]>

    /** Get available exams catalog */
    getExamCatalog(): Promise<{ code: string; name: string; price?: number }[]>
}

// ==========================================
// Sérgio Franco (DASA) Adapter
// ==========================================

export class SergioFrancoAdapter implements LabAdapter {
    name = 'Sérgio Franco (DASA)'

    private apiUrl: string
    private apiKey: string
    private apiSecret: string

    constructor(config: { apiUrl?: string; apiKey: string; apiSecret: string }) {
        this.apiUrl = config.apiUrl || 'https://api.sergiofranco.com.br/v1'
        this.apiKey = config.apiKey
        this.apiSecret = config.apiSecret
    }

    private async makeRequest<T>(
        endpoint: string,
        method: 'GET' | 'POST' = 'GET',
        body?: unknown
    ): Promise<T> {
        const response = await fetch(`${this.apiUrl}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey,
                'X-API-Secret': this.apiSecret,
            },
            body: body ? JSON.stringify(body) : undefined,
        })

        if (!response.ok) {
            throw new Error(`Sérgio Franco API error: ${response.status}`)
        }

        return response.json()
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.makeRequest('/health')
            return true
        } catch {
            return false
        }
    }

    async createOrder(order: LabOrder): Promise<LabOrderResponse> {
        try {
            const result = await this.makeRequest<{
                pedidoId: string
                urlAgendamento: string
            }>('/pedidos', 'POST', {
                paciente: {
                    cpf: order.patient.cpf,
                    nome: order.patient.name,
                    dataNascimento: order.patient.birthDate,
                    telefone: order.patient.phone,
                },
                medicoSolicitante: {
                    crm: order.requestingDoctor.crm,
                    ufCrm: order.requestingDoctor.crmState,
                    nome: order.requestingDoctor.name,
                },
                exames: order.examCodes,
                indicacaoClinica: order.clinicalIndication,
                urgente: order.urgent,
            })

            return {
                success: true,
                orderId: result.pedidoId,
                schedulingUrl: result.urlAgendamento,
            }
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'SF_ORDER_FAILED',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
            }
        }
    }

    async getResults(orderId: string): Promise<LabResult | null> {
        try {
            const result = await this.makeRequest<any>(`/resultados/${orderId}`)
            return this.mapToLabResult(result)
        } catch {
            return null
        }
    }

    async getPatientResults(cpf: string, limit = 10): Promise<LabResult[]> {
        try {
            const results = await this.makeRequest<any[]>(
                `/resultados/paciente/${cpf}?limit=${limit}`
            )
            return results.map(r => this.mapToLabResult(r))
        } catch {
            return []
        }
    }

    async getExamCatalog(): Promise<{ code: string; name: string; price?: number }[]> {
        try {
            return await this.makeRequest('/exames')
        } catch {
            return []
        }
    }

    private mapToLabResult(data: any): LabResult {
        return {
            id: data.id,
            orderId: data.pedidoId,
            collectionDate: data.dataColeta,
            resultDate: data.dataResultado,
            patient: {
                cpf: data.paciente?.cpf,
                name: data.paciente?.nome,
            },
            requestingDoctor: {
                crm: data.medico?.crm,
                name: data.medico?.nome,
            },
            exams: (data.exames || []).map((e: any) => ({
                code: e.codigo,
                name: e.nome,
                material: e.material,
                result: e.resultado,
                unit: e.unidade,
                referenceRange: e.valorReferencia,
                abnormal: e.alterado,
                notes: e.observacoes,
            })),
            status: data.status === 'COMPLETO' ? 'COMPLETE' :
                data.status === 'PARCIAL' ? 'PARTIAL' : 'PENDING',
            reportUrl: data.urlLaudo,
        }
    }
}

// ==========================================
// Richet Adapter
// ==========================================

export class RichetAdapter implements LabAdapter {
    name = 'Richet Medicina Diagnóstica'

    private apiUrl: string
    private token: string

    constructor(config: { apiUrl?: string; token: string }) {
        this.apiUrl = config.apiUrl || 'https://api.richet.com.br/api/v2'
        this.token = config.token
    }

    private async makeRequest<T>(
        endpoint: string,
        method: 'GET' | 'POST' = 'GET',
        body?: unknown
    ): Promise<T> {
        const response = await fetch(`${this.apiUrl}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`,
            },
            body: body ? JSON.stringify(body) : undefined,
        })

        if (!response.ok) {
            throw new Error(`Richet API error: ${response.status}`)
        }

        return response.json()
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.makeRequest('/ping')
            return true
        } catch {
            return false
        }
    }

    async createOrder(order: LabOrder): Promise<LabOrderResponse> {
        try {
            const result = await this.makeRequest<{
                id: string
                linkAgenda: string
            }>('/solicitacoes', 'POST', {
                paciente: {
                    cpf: order.patient.cpf.replace(/\D/g, ''),
                    nomeCompleto: order.patient.name,
                    nascimento: order.patient.birthDate,
                    celular: order.patient.phone,
                },
                solicitante: {
                    crm: order.requestingDoctor.crm,
                    estado: order.requestingDoctor.crmState,
                },
                exames: order.examCodes.map(code => ({ codigo: code })),
            })

            return {
                success: true,
                orderId: result.id,
                schedulingUrl: result.linkAgenda,
            }
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'RICHET_ORDER_FAILED',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
            }
        }
    }

    async getResults(orderId: string): Promise<LabResult | null> {
        try {
            const result = await this.makeRequest<any>(`/resultados/${orderId}`)
            return this.mapToLabResult(result)
        } catch {
            return null
        }
    }

    async getPatientResults(cpf: string, limit = 10): Promise<LabResult[]> {
        try {
            const cleanCpf = cpf.replace(/\D/g, '')
            const results = await this.makeRequest<any[]>(
                `/pacientes/${cleanCpf}/resultados?limite=${limit}`
            )
            return results.map(r => this.mapToLabResult(r))
        } catch {
            return []
        }
    }

    async getExamCatalog(): Promise<{ code: string; name: string; price?: number }[]> {
        try {
            const exams = await this.makeRequest<any[]>('/catalogo/exames')
            return exams.map(e => ({
                code: e.codigo,
                name: e.descricao,
                price: e.valor,
            }))
        } catch {
            return []
        }
    }

    private mapToLabResult(data: any): LabResult {
        return {
            id: data.id,
            orderId: data.solicitacaoId,
            collectionDate: data.coletaEm,
            resultDate: data.liberadoEm,
            patient: {
                cpf: data.paciente?.cpf,
                name: data.paciente?.nome,
            },
            requestingDoctor: {
                crm: data.medico?.crm,
                name: data.medico?.nome,
            },
            exams: (data.resultados || []).map((e: any) => ({
                code: e.exame?.codigo,
                name: e.exame?.nome,
                material: e.material,
                result: e.valor,
                unit: e.unidade,
                referenceRange: e.referencia,
                abnormal: e.foraDoNormal,
                notes: e.obs,
            })),
            status: data.situacao === 'LIBERADO' ? 'COMPLETE' :
                data.situacao === 'PARCIAL' ? 'PARTIAL' : 'PENDING',
            reportUrl: data.linkPdf,
        }
    }
}

// ==========================================
// Factory
// ==========================================

export type LabProviderType = 'sergio_franco' | 'richet'

export function createLabAdapter(
    provider: LabProviderType,
    config: {
        apiUrl?: string
        apiKey?: string
        apiSecret?: string
        token?: string
    }
): LabAdapter {
    switch (provider) {
        case 'sergio_franco':
            if (!config.apiKey || !config.apiSecret) {
                throw new Error('Sérgio Franco requires apiKey and apiSecret')
            }
            return new SergioFrancoAdapter({
                apiUrl: config.apiUrl,
                apiKey: config.apiKey,
                apiSecret: config.apiSecret,
            })

        case 'richet':
            if (!config.token) {
                throw new Error('Richet requires token')
            }
            return new RichetAdapter({
                apiUrl: config.apiUrl,
                token: config.token,
            })

        default:
            throw new Error(`Unknown lab provider: ${provider}`)
    }
}
