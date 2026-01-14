// ============================================
// TISS Enterprise - Type Definitions
// ============================================

/**
 * Status possíveis de um lote TISS
 */
export type TissBatchStatus =
    | 'DRAFT'        // Em elaboração
    | 'VALIDATING'   // Validando guias
    | 'VALID'        // Validado, pronto para envio
    | 'INVALID'      // Possui erros
    | 'SENT'         // Enviado
    | 'PROCESSING'   // Operadora processando
    | 'APPROVED'     // Aprovado totalmente
    | 'PARTIAL'      // Aprovado parcialmente (glosas)
    | 'DENIED';      // Negado totalmente

/**
 * Tipo de guia TISS
 */
export type TissGuideType =
    | 'CONSULTATION'  // Consulta médica
    | 'SPSADT'        // Serviço Profissional / Serviço Auxiliar de Diagnóstico e Terapia
    | 'HONORARIUM'    // Honorário individual
    | 'INTERNMENT';   // Internação

/**
 * Status de uma guia TISS individual
 */
export type TissGuideStatus =
    | 'PENDING'    // Aguardando envio
    | 'SENT'       // Enviada
    | 'APPROVED'   // Aprovada
    | 'PARTIAL'    // Aprovada parcialmente
    | 'DENIED'     // Negada
    | 'APPEALING'; // Em recurso

/**
 * Status de validação
 */
export type ValidationStatus =
    | 'NOT_VALIDATED'  // Não validada
    | 'VALIDATING'     // Em validação
    | 'VALID'          // Validada
    | 'INVALID'        // Inválida
    | 'WARNING';       // Validada com avisos

/**
 * Severidade de erro de validação
 */
export type ValidationSeverity =
    | 'ERROR'    // Erro crítico (impede envio)
    | 'WARNING'  // Aviso (permite envio mas requer atenção)
    | 'INFO';    // Informativo

/**
 * Lote de guias TISS
 */
export interface TissBatch {
    id: string;
    clinic_id: string;

    // Identificação
    batch_number: string;
    insurance_company_id: string | null;
    insurance_company_name: string | null;

    // Competência
    reference_month: number; // 1-12
    reference_year: number;

    // Status
    status: TissBatchStatus;

    // Totalizadores
    total_guides: number;
    total_value: number;
    approved_value: number;
    denied_value: number;
    glosa_value: number;
    glosa_percentage: number;

    // Arquivos
    xml_file_url: string | null;
    xml_file_size: number | null;
    xml_generated_at: string | null;
    return_file_url: string | null;
    return_processed_at: string | null;

    // Metadados
    submission_date: string | null;
    protocol_number: string | null;
    notes: string | null;

    // Auditoria
    created_by: string | null;
    created_at: string;
    updated_at: string;
    submitted_by: string | null;
    submitted_at: string | null;

    // Versionamento
    tiss_version_used: string | null;
}

/**
 * Guia TISS individual
 */
export interface TissGuide {
    id: string;
    batch_id: string | null;
    clinic_id: string;

    // Relacionamentos
    appointment_id: string | null;
    consultation_id: string | null;
    patient_id: string;
    doctor_id: string;

    // Identificação
    guide_number: string;
    guide_type: TissGuideType;

    // Dados do Paciente
    patient_cpf: string | null;
    patient_name: string;
    patient_card_number: string;
    patient_card_validity: string | null;

    // Procedimento
    procedure_code: string;
    procedure_name: string;
    procedure_quantity: number;
    unit_value: number;
    total_value: number;

    // Dados Clínicos
    cid10_code: string | null;
    cid10_description: string | null;
    authorization_code: string | null;
    execution_date: string;

    // Status
    status: TissGuideStatus;
    validation_status: ValidationStatus;

    // Glosa
    glosa_value: number;
    glosa_code: string | null;
    glosa_description: string | null;
    can_appeal: boolean;
    appeal_deadline: string | null;

    // Recurso
    appeal_status: string | null;
    appeal_xml_url: string | null;
    appeal_response_value: number | null;
    appeal_sent_at: string | null;

    // Metadados
    notes: string | null;

    // Auditoria
    created_at: string;
    updated_at: string;
    sent_at: string | null;
    processed_at: string | null;
}

/**
 * Erro de validação
 */
export interface TissValidationError {
    id: string;
    guide_id: string | null;
    batch_id: string | null;
    clinic_id: string;

    // Detalhes do Erro
    error_code: string;
    error_message: string;
    error_field: string | null;
    severity: ValidationSeverity;

    // Sugestões
    current_value: string | null;
    suggested_value: string | null;

    // Resolução
    resolved: boolean;
    resolved_at: string | null;
    resolved_by: string | null;
    resolution_notes: string | null;

    // Auditoria
    created_at: string;
}

/**
 * DTO para criação de lote
 */
export interface CreateTissBatchDTO {
    insurance_company_id: string;
    reference_month: number;
    reference_year: number;
    appointment_ids?: string[]; // IDs de consultas para incluir automaticamente
}

/**
 * DTO para adicionar guias ao lote
 */
export interface AddGuidesToBatchDTO {
    batch_id: string;
    consultation_ids: string[];
}

/**
 * DTO para criar guia manualmente
 */
export interface CreateTissGuideDTO {
    batch_id?: string;
    appointment_id?: string;
    consultation_id?: string;
    patient_id: string;
    doctor_id: string;

    guide_type: TissGuideType;
    patient_card_number: string;
    patient_card_validity?: string;

    procedure_code: string;
    procedure_name: string;
    procedure_quantity?: number;
    unit_value: number;

    cid10_code?: string;
    authorization_code?: string;
    execution_date: string;

    notes?: string;
}

/**
 * Resposta da validação de lote
 */
export interface BatchValidationResult {
    batch_id: string;
    is_valid: boolean;
    total_guides: number;
    total_errors: number;
    total_warnings: number;
    errors: TissValidationError[];
    can_generate_xml: boolean;
}

/**
 * Resultado da geração de XML
 */
export interface GenerateXMLResult {
    batch_id: string;
    xml_url: string;
    file_size: number;
    guide_count: number;
    generated_at: string;
}

/**
 * Estatísticas de um lote
 */
export interface TissBatchStats {
    batch_id: string;
    batch_number: string;
    status: TissBatchStatus;

    total_guides: number;
    total_value: number;

    // Breakdown por status
    pending_count: number;
    sent_count: number;
    approved_count: number;
    denied_count: number;

    // Financeiro
    approved_value: number;
    denied_value: number;
    glosa_value: number;
    glosa_percentage: number;

    // Datas importantes
    created_at: string;
    sent_at: string | null;
    processed_at: string | null;
}

/**
 * Filtros para listagem de lotes
 */
export interface TissBatchFilters {
    status?: TissBatchStatus[];
    insurance_company_id?: string;
    reference_year?: number;
    reference_month?: number;
    date_from?: string;
    date_to?: string;
    search?: string; // Busca por batch_number ou protocol_number
}

/**
 * Filtros para listagem de guias
 */
export interface TissGuideFilters {
    batch_id?: string;
    status?: TissGuideStatus[];
    guide_type?: TissGuideType[];
    patient_id?: string;
    doctor_id?: string;
    execution_date_from?: string;
    execution_date_to?: string;
    has_glosa?: boolean;
}

/**
 * Relatório de glosas
 */
export interface GlosaReport {
    period: {
        reference_month: number;
        reference_year: number;
    };

    summary: {
        total_value: number;
        approved_value: number;
        glosa_value: number;
        glosa_percentage: number;
        total_guides: number;
        glosadas_count: number;
    };

    by_insurance: Array<{
        insurance_name: string;
        total_value: number;
        glosa_value: number;
        glosa_percentage: number;
    }>;

    by_procedure: Array<{
        procedure_code: string;
        procedure_name: string;
        occurrence_count: number;
        total_glosa_value: number;
    }>;

    top_glosa_reasons: Array<{
        glosa_code: string;
        description: string;
        occurrence_count: number;
        total_value: number;
    }>;
}

/**
 * Item da timeline de um lote
 */
export interface BatchTimelineEvent {
    id: string;
    event_type: 'CREATED' | 'VALIDATED' | 'XML_GENERATED' | 'SUBMITTED' | 'RESPONSE_RECEIVED' | 'STATUS_CHANGED';
    description: string;
    user_name: string | null;
    timestamp: string;
    metadata?: Record<string, any>;
}

/**
 * Opções de configuração TISS por clínica
 */
export interface TissSettings {
    clinic_id: string;

    // Prefixos e sequenciais
    batch_number_prefix: string; // Ex: "001" para identificar unidade
    guide_number_prefix: string;

    // Validações
    require_authorization_code: boolean;
    require_cid10: boolean;
    validate_card_validity: boolean;

    // Automações
    auto_create_guides_on_completion: boolean; // Criar guia automaticamente ao finalizar consulta
    auto_validate_on_add: boolean; // Validar guia ao adicionar no lote

    // Notificações
    notify_on_validation_errors: boolean;
    notify_on_glosa: boolean;
    glosa_alert_threshold: number; // Percentual que dispara alerta

    // Exportação
    include_patient_cpf_in_xml: boolean;
    xml_encoding: 'UTF-8' | 'ISO-8859-1';
}
