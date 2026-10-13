/**
 * ALLOWLIST EXCLUSIVA — MÓDULO DE CONTRATOS E ASSINATURA ELETRÔNICA
 * 
 * REQUISITO INVIOLÁVEL DE ESCOPO:
 * O módulo de contratos, modelos e assinaturas é de uso EXCLUSIVO da clínica World Sensory.
 * Nenhuma outra clínica tem autorização para visualizar, emitir ou assinar documentos neste módulo.
 */

export const WORLD_SENSORY_CLINIC_ID = '4c13e586-5390-4393-a180-2c9dd7ed81c7'
export const DEMO_TESTE_CLINIC_ID = '0c9ccb05-8530-4f8d-8d64-dd3eb6614e30'

export const CONTRACTS_AUTHORIZED_CLINIC_IDS: readonly string[] = Object.freeze([
    WORLD_SENSORY_CLINIC_ID,
])

/**
 * Valida se o ID da clínica possui autorização para o módulo de contratos
 */
export function isClinicAuthorizedForContracts(clinicId: string | null | undefined): boolean {
    if (!clinicId) return false
    return CONTRACTS_AUTHORIZED_CLINIC_IDS.includes(clinicId)
}

export const TELECONSULTA_AUTHORIZED_CLINIC_IDS: readonly string[] = Object.freeze([
    WORLD_SENSORY_CLINIC_ID,
    DEMO_TESTE_CLINIC_ID,
])

/**
 * Valida se a clínica possui autorização para o módulo de Teleconsulta
 * Liberado para WorldSensory, Clínica Demo Teste do proprietário e Super Admins
 */
export function isClinicAuthorizedForTeleconsulta(
    clinicId: string | null | undefined,
    options?: {
        isDemo?: boolean
        slug?: string | null
        clinicName?: string | null
        isSuperAdmin?: boolean
    }
): boolean {
    if (options?.isSuperAdmin) return true
    if (clinicId && TELECONSULTA_AUTHORIZED_CLINIC_IDS.includes(clinicId)) return true
    if (options?.isDemo) return true
    if (options?.slug && (options.slug === 'demo-teste' || options.slug.includes('demo'))) return true
    if (options?.clinicName && options.clinicName.toLowerCase().includes('demo')) return true
    return false
}
