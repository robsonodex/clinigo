/**
 * CLINIGO PREMIUM - TISS 3.0.4 Schema Validator
 * Squad B: TISS Pré-Auditoria
 * 
 * Validates TISS XML structure according to ANS specifications
 */

export interface TISSValidationError {
    field: string
    code: string
    message: string
    severity: 'error' | 'warning'
}

export interface TISSValidationResult {
    valid: boolean
    errors: TISSValidationError[]
    warnings: TISSValidationError[]
}

/**
 * TISS 3.0.4 Required Fields by Guide Type
 */
const REQUIRED_FIELDS: Record<string, string[]> = {
    'CONSULTA': [
        'numeroGuiaPrestador',
        'dataAtendimento',
        'codigoProcedimento',
        'valorProcedimento',
        'nomeBeneficiario',
        'numeroCarteira'
    ],
    'SADT': [
        'numeroGuiaPrestador',
        'dataRealizacao',
        'codigoProcedimento',
        'quantidadeSolicitada',
        'valorTotal',
        'numeroCarteira'
    ],
    'SP_SADT': [
        'numeroGuia',
        'dataSolicitacao',
        'nomeProfissionalSolicitante',
        'numeroConselhoSolicitante',
        'procedimentosSolicitados'
    ],
    'INTERNACAO': [
        'numeroGuia',
        'dataInternacao',
        'tipoAcomodacao',
        'diariasAutorizadas',
        'numeroCarteira'
    ]
}

/**
 * Common TISS validation rules
 */
export function validateTISSGuide(guide: any, guideType: string = 'CONSULTA'): TISSValidationResult {
    const errors: TISSValidationError[] = []
    const warnings: TISSValidationError[] = []

    const requiredFields = REQUIRED_FIELDS[guideType] || REQUIRED_FIELDS['CONSULTA']

    // 1. Check required fields
    for (const field of requiredFields) {
        if (!guide[field]) {
            errors.push({
                field,
                code: 'MISSING_REQUIRED_FIELD',
                message: `Campo obrigatório "${field}" não informado`,
                severity: 'error'
            })
        }
    }

    // 2. Validate guide number format (TISS standard: max 20 chars)
    if (guide.numeroGuiaPrestador && guide.numeroGuiaPrestador.length > 20) {
        errors.push({
            field: 'numeroGuiaPrestador',
            code: 'INVALID_FORMAT',
            message: 'Número da guia excede 20 caracteres',
            severity: 'error'
        })
    }

    // 3. Validate cartão beneficiário (16-20 digits)
    if (guide.numeroCarteira) {
        const cleanCard = guide.numeroCarteira.replace(/\D/g, '')
        if (cleanCard.length < 16 || cleanCard.length > 20) {
            errors.push({
                field: 'numeroCarteira',
                code: 'INVALID_CARD_NUMBER',
                message: 'Número do cartão inválido (deve ter 16-20 dígitos)',
                severity: 'error'
            })
        }
    }

    // 4. Validate CID-10 format (if present)
    if (guide.codigoCID) {
        const cidPattern = /^[A-Z]\d{2}(\.\d{1,2})?$/
        if (!cidPattern.test(guide.codigoCID)) {
            warnings.push({
                field: 'codigoCID',
                code: 'INVALID_CID_FORMAT',
                message: `CID-10 "${guide.codigoCID}" não segue padrão (ex: J06.9)`,
                severity: 'warning'
            })
        }
    }

    // 5. Validate procedure code (TUSS table)
    if (guide.codigoProcedimento) {
        // TUSS codes are 8 digits
        const cleanCode = guide.codigoProcedimento.replace(/\D/g, '')
        if (cleanCode.length !== 8) {
            warnings.push({
                field: 'codigoProcedimento',
                code: 'INVALID_PROCEDURE_CODE',
                message: 'Código do procedimento deve ter 8 dígitos (tabela TUSS)',
                severity: 'warning'
            })
        }
    }

    // 6. Validate dates
    if (guide.dataAtendimento) {
        const date = new Date(guide.dataAtendimento)
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

        if (date < oneYearAgo) {
            warnings.push({
                field: 'dataAtendimento',
                code: 'OLD_DATE',
                message: 'Data de atendimento com mais de 1 ano pode ser rejeitada',
                severity: 'warning'
            })
        }

        if (date > new Date()) {
            errors.push({
                field: 'dataAtendimento',
                code: 'FUTURE_DATE',
                message: 'Data de atendimento não pode ser futura',
                severity: 'error'
            })
        }
    }

    // 7. Validate monetary values
    if (guide.valorProcedimento !== undefined) {
        const value = parseFloat(guide.valorProcedimento)
        if (isNaN(value) || value <= 0) {
            errors.push({
                field: 'valorProcedimento',
                code: 'INVALID_VALUE',
                message: 'Valor do procedimento deve ser maior que zero',
                severity: 'error'
            })
        }

        // Warning for suspiciously high values
        if (value > 10000) {
            warnings.push({
                field: 'valorProcedimento',
                code: 'HIGH_VALUE',
                message: `Valor muito alto (R$ ${value.toFixed(2)}) - verifique digitação`,
                severity: 'warning'
            })
        }
    }

    // 8. Professional data validation
    if (guide.numeroConselhoExecutante) {
        // CRM format: 6 digits + UF
        const crmPattern = /^\d{4,7}[A-Z]{2}$/
        if (!crmPattern.test(guide.numeroConselhoExecutante)) {
            warnings.push({
                field: 'numeroConselhoExecutante',
                code: 'INVALID_CRM_FORMAT',
                message: 'CRM deve seguir padrão: números + UF (ex: 123456SP)',
                severity: 'warning'
            })
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    }
}

/**
 * Validate entire TISS batch
 */
export function validateTISSBatch(guides: any[]): TISSValidationResult {
    const allErrors: TISSValidationError[] = []
    const allWarnings: TISSValidationError[] = []

    guides.forEach((guide, index) => {
        const result = validateTISSGuide(guide)

        // Prefix with guide number for clarity
        result.errors.forEach(err => {
            allErrors.push({
                ...err,
                field: `Guia #${index + 1} - ${err.field}`
            })
        })

        result.warnings.forEach(warn => {
            allWarnings.push({
                ...warn,
                field: `Guia #${index + 1} - ${warn.field}`
            })
        })
    })

    return {
        valid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings
    }
}

/**
 * Get human-readable validation summary
 */
export function getValidationSummary(result: TISSValidationResult): string {
    if (result.valid && result.warnings.length === 0) {
        return '✅ Lote válido - pronto para envio'
    }

    const parts: string[] = []

    if (result.errors.length > 0) {
        parts.push(`❌ ${result.errors.length} erro(s) crítico(s)`)
    }

    if (result.warnings.length > 0) {
        parts.push(`⚠️ ${result.warnings.length} aviso(s)`)
    }

    return parts.join(' | ')
}
