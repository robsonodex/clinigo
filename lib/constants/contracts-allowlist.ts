/**
 * ALLOWLIST EXCLUSIVA — MÓDULO DE CONTRATOS E ASSINATURA ELETRÔNICA
 * 
 * REQUISITO INVIOLÁVEL DE ESCOPO:
 * O módulo de contratos, modelos e assinaturas é de uso EXCLUSIVO da clínica World Sensory.
 * Nenhuma outra clínica tem autorização para visualizar, emitir ou assinar documentos neste módulo.
 */

export const WORLD_SENSORY_CLINIC_ID = '4c13e586-5390-4393-a180-2c9dd7ed81c7'

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
