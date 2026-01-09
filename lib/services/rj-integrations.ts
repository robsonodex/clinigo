/**
 * RJ Regional Integration Adapters
 * TypeScript Contracts for e-SUS, SISREG, Sérgio Franco, and Richet Labs
 * 
 * @module lib/services/rj-integrations
 * @description Interfaces and adapters for Rio de Janeiro healthcare integrations
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface IntegrationCredentials {
    apiKey?: string
    clientId?: string
    clientSecret?: string
    certificatePath?: string
    environment: 'sandbox' | 'production'
}

export interface IntegrationResult<T> {
    success: boolean
    data?: T
    error?: {
        code: string
        message: string
        details?: unknown
    }
    timestamp: Date
    requestId: string
}

export interface PatientIdentifier {
    cpf: string
    cns?: string // Cartão Nacional de Saúde
    name: string
    birthDate: string
}

// ============================================================================
// E-SUS / SUS NACIONAL INTEGRATION
// ============================================================================

export interface ESUSPatientData {
    cns: string // Required for e-SUS
    cpf: string
    nome: string
    dataNascimento: string
    sexo: 'M' | 'F' | 'I'
    racaCor: number // IBGE code
    nomeMae: string
    endereco: {
        cep: string
        logradouro: string
        numero: string
        bairro: string
        municipio: string // IBGE code
        uf: string
    }
}

export interface ESUSProcedure {
    codigo: string // SIGTAP code
    data: string
    quantidade: number
    profissional: {
        cns: string
        cbo: string
    }
    paciente: PatientIdentifier
}

export interface ESUSAdapter {
    /**
     * Validates CNS number format and check digit
     */
    validateCNS(cns: string): boolean

    /**
     * Searches for patient in SUS database
     */
    findPatient(cpf: string): Promise<IntegrationResult<ESUSPatientData | null>>

    /**
     * Registers a patient in e-SUS APS
     */
    registerPatient(patient: ESUSPatientData): Promise<IntegrationResult<{ id: string }>>

    /**
     * Reports a procedure to e-SUS
     */
    reportProcedure(procedure: ESUSProcedure): Promise<IntegrationResult<{ protocolo: string }>>

    /**
     * Gets patient vaccination history
     */
    getVaccinationHistory(cns: string): Promise<IntegrationResult<unknown[]>>
}

// ============================================================================
// SISREG - SISTEMA DE REGULAÇÃO RJ
// ============================================================================

export interface SISREGAppointment {
    tipoAgendamento: 'CONSULTA' | 'EXAME' | 'INTERNACAO'
    especialidade: string // CBO code
    unidadeSolicitante: string // CNES code
    unidadeExecutante: string // CNES code
    paciente: PatientIdentifier
    data: string
    prioridade: 'NORMAL' | 'URGENTE' | 'EMERGENCIA'
    cid?: string // Diagnosis code
    observacao?: string
}

export interface SISREGVacancy {
    unidade: string
    especialidade: string
    data: string
    horariosDisponiveis: string[]
    medico?: string
}

export interface SISREGAdapter {
    /**
     * Checks available slots for an specialty
     */
    checkAvailability(
        specialty: string,
        startDate: string,
        endDate: string,
        region?: string
    ): Promise<IntegrationResult<SISREGVacancy[]>>

    /**
     * Creates a referral request
     */
    createReferral(appointment: SISREGAppointment): Promise<IntegrationResult<{
        protocolo: string
        status: 'AGUARDANDO' | 'AGENDADO' | 'NEGADO'
        dataAgendada?: string
    }>>

    /**
     * Gets referral status
     */
    getReferralStatus(protocolo: string): Promise<IntegrationResult<{
        status: string
        posicaoFila?: number
        previsao?: string
    }>>

    /**
     * Cancels a referral
     */
    cancelReferral(protocolo: string, motivo: string): Promise<IntegrationResult<boolean>>
}

// ============================================================================
// SÉRGIO FRANCO LABORATORY INTEGRATION
// ============================================================================

export interface LabExamRequest {
    paciente: PatientIdentifier
    solicitante: {
        crm: string
        nome: string
    }
    exames: Array<{
        codigo: string
        nome: string
        material?: string // BLD, URN, etc
    }>
    prioridade: 'ROTINA' | 'URGENTE'
    observacaoClinica?: string
}

export interface LabExamResult {
    codigo: string
    nome: string
    resultado: string
    unidade: string
    valorReferencia: string
    interpretacao?: 'NORMAL' | 'ALTERADO' | 'CRITICO'
    dataColeta: string
    dataResultado: string
}

export interface SergioFrancoAdapter {
    /**
     * Requests exams for a patient
     */
    requestExams(request: LabExamRequest): Promise<IntegrationResult<{
        protocolo: string
        codigoBarras: string
        unidadeColeta: string[]
    }>>

    /**
     * Gets exam results
     */
    getResults(protocolo: string): Promise<IntegrationResult<{
        status: 'AGUARDANDO_COLETA' | 'COLETADO' | 'PROCESSANDO' | 'CONCLUIDO'
        exames: LabExamResult[]
        pdfUrl?: string
    }>>

    /**
     * Gets available exam types
     */
    getExamCatalog(): Promise<IntegrationResult<Array<{
        codigo: string
        nome: string
        material: string
        prazo: string
        preco?: number
    }>>>

    /**
     * Gets collection units
     */
    getCollectionUnits(cep?: string): Promise<IntegrationResult<Array<{
        codigo: string
        nome: string
        endereco: string
        horario: string
    }>>>
}

// ============================================================================
// RICHET LABORATORY INTEGRATION
// ============================================================================

export interface RichetAdapter {
    /**
     * Similar to Sérgio Franco but with Richet-specific methods
     */
    requestExams(request: LabExamRequest): Promise<IntegrationResult<{
        pedido: string
        senha: string
    }>>

    getResults(pedido: string, senha: string): Promise<IntegrationResult<{
        status: string
        resultados: LabExamResult[]
        laudoUrl?: string
    }>>

    /**
     * Real-time notification webhook registration
     */
    registerWebhook(webhookUrl: string, events: string[]): Promise<IntegrationResult<{ id: string }>>
}

// ============================================================================
// FACTORY AND CONFIGURATION
// ============================================================================

export interface RJIntegrationsConfig {
    esus?: {
        baseUrl: string
        credentials: IntegrationCredentials
    }
    sisreg?: {
        baseUrl: string
        credentials: IntegrationCredentials
    }
    sergioFranco?: {
        baseUrl: string
        credentials: IntegrationCredentials
    }
    richet?: {
        baseUrl: string
        credentials: IntegrationCredentials
    }
}

/**
 * Creates configured RJ integration adapters based on clinic plan
 * Only available for ENTERPRISE and NETWORK plans
 */
export function createRJIntegrations(config: RJIntegrationsConfig): {
    esus?: ESUSAdapter
    sisreg?: SISREGAdapter
    sergioFranco?: SergioFrancoAdapter
    richet?: RichetAdapter
} {
    // Placeholder - actual implementations would be injected here
    return {
        esus: config.esus ? createESUSAdapter(config.esus) : undefined,
        sisreg: config.sisreg ? createSISREGAdapter(config.sisreg) : undefined,
        sergioFranco: config.sergioFranco ? createSergioFrancoAdapter(config.sergioFranco) : undefined,
        richet: config.richet ? createRichetAdapter(config.richet) : undefined,
    }
}

// Stub implementations - to be filled with actual API calls
function createESUSAdapter(config: { baseUrl: string; credentials: IntegrationCredentials }): ESUSAdapter {
    return {
        validateCNS: (cns: string) => {
            // CNS validation algorithm
            if (cns.length !== 15) return false
            const weights = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
            const sum = cns.split('').reduce((acc, digit, i) => acc + parseInt(digit) * weights[i], 0)
            return sum % 11 === 0
        },
        findPatient: async () => ({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'e-SUS integration pending' }, timestamp: new Date(), requestId: '' }),
        registerPatient: async () => ({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'e-SUS integration pending' }, timestamp: new Date(), requestId: '' }),
        reportProcedure: async () => ({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'e-SUS integration pending' }, timestamp: new Date(), requestId: '' }),
        getVaccinationHistory: async () => ({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'e-SUS integration pending' }, timestamp: new Date(), requestId: '' }),
    }
}

function createSISREGAdapter(_config: { baseUrl: string; credentials: IntegrationCredentials }): SISREGAdapter {
    return {
        checkAvailability: async () => ({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'SISREG integration pending' }, timestamp: new Date(), requestId: '' }),
        createReferral: async () => ({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'SISREG integration pending' }, timestamp: new Date(), requestId: '' }),
        getReferralStatus: async () => ({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'SISREG integration pending' }, timestamp: new Date(), requestId: '' }),
        cancelReferral: async () => ({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'SISREG integration pending' }, timestamp: new Date(), requestId: '' }),
    }
}

function createSergioFrancoAdapter(_config: { baseUrl: string; credentials: IntegrationCredentials }): SergioFrancoAdapter {
    return {
        requestExams: async () => ({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Sérgio Franco integration pending' }, timestamp: new Date(), requestId: '' }),
        getResults: async () => ({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Sérgio Franco integration pending' }, timestamp: new Date(), requestId: '' }),
        getExamCatalog: async () => ({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Sérgio Franco integration pending' }, timestamp: new Date(), requestId: '' }),
        getCollectionUnits: async () => ({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Sérgio Franco integration pending' }, timestamp: new Date(), requestId: '' }),
    }
}

function createRichetAdapter(_config: { baseUrl: string; credentials: IntegrationCredentials }): RichetAdapter {
    return {
        requestExams: async () => ({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Richet integration pending' }, timestamp: new Date(), requestId: '' }),
        getResults: async () => ({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Richet integration pending' }, timestamp: new Date(), requestId: '' }),
        registerWebhook: async () => ({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Richet integration pending' }, timestamp: new Date(), requestId: '' }),
    }
}
