/**
 * Controle configurável por clínica dos módulos de Contratos Digitais e Teleconsulta.
 * Disponível para TODAS as clínicas do CliniGo com isolamento multi-tenant estrito por clinic_id,
 * podendo ser ativado ou desativado em Configurações -> Módulos Clínicos (clinics.theme.clinical_modules).
 */

import { extractClinicalModulesFromTheme } from '@/lib/utils/clinic-clinical-modules'

// Constantes mantidas apenas para compatibilidade de imports legados
export const WORLD_SENSORY_CLINIC_ID = '4c13e586-5390-4393-a180-2c9dd7ed81c7'
export const DEMO_TESTE_CLINIC_ID = '0c9ccb05-8530-4f8d-8d64-dd3eb6614e30'

export const CONTRACTS_AUTHORIZED_CLINIC_IDS: readonly string[] = Object.freeze([
    WORLD_SENSORY_CLINIC_ID,
])

export const TELECONSULTA_AUTHORIZED_CLINIC_IDS: readonly string[] = Object.freeze([
    WORLD_SENSORY_CLINIC_ID,
    DEMO_TESTE_CLINIC_ID,
])

/**
 * Valida se a clínica está com o módulo de Contratos e Assinatura Digital habilitado.
 * Padrão CliniGo: habilitado para todas as clínicas, podendo ser desativado em Configurações -> Módulos Clínicos.
 */
export function isClinicAuthorizedForContracts(
    clinicId: string | null | undefined,
    options?: {
        theme?: Record<string, unknown> | null
        contractsEnabled?: boolean
    }
): boolean {
    if (!clinicId) return false
    if (typeof options?.contractsEnabled === 'boolean') {
        return options.contractsEnabled
    }
    if (options?.theme) {
        return extractClinicalModulesFromTheme(options.theme, clinicId).contractsEnabled
    }
    return true
}

/**
 * Valida se a clínica está com o módulo de Teleconsulta Nativa habilitado.
 * Padrão CliniGo: habilitado para todas as clínicas (respeitando plano/permissões),
 * podendo ser desativado em Configurações -> Módulos Clínicos.
 */
export function isClinicAuthorizedForTeleconsulta(
    clinicId: string | null | undefined,
    options?: {
        isDemo?: boolean
        slug?: string | null
        clinicName?: string | null
        isSuperAdmin?: boolean
        theme?: Record<string, unknown> | null
        teleconsultaEnabled?: boolean
    }
): boolean {
    if (options?.isSuperAdmin) return true
    if (!clinicId) return false
    if (typeof options?.teleconsultaEnabled === 'boolean') {
        return options.teleconsultaEnabled
    }
    if (options?.theme) {
        return extractClinicalModulesFromTheme(options.theme, clinicId).teleconsultaEnabled
    }
    return true
}
