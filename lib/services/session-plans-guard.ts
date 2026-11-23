/**
 * GUARD DE SEGURANÇA: CENTRAL DE PLANOS DE SESSÃO & MANUAL DE EVOLUÇÃO
 * Disponível para todas as clínicas do CliniGo, respeitando:
 * - Kill Switch global (SESSION_PLANS_BETA_ENABLED)
 * - Configuração de módulos da própria clínica (clinics.theme.clinical_modules + clinica_modulos)
 * - Isolamento multi-tenant estrito por clinic_id + auditoria
 */

import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { extractClinicalModulesFromTheme } from '@/lib/utils/clinic-clinical-modules'

export interface SessionPlanAccessCheck {
    isAllowed: boolean
    reason?: string
    enabledSpecialties: string[]
    evolutionManualEnabled?: boolean
    clinicId?: string
    userId?: string
}

/**
 * Kill Switch via variável de ambiente.
 * Se SESSION_PLANS_BETA_ENABLED='false', a funcionalidade é desativada instantaneamente.
 */
export function isSessionPlansKillSwitchActive(): boolean {
    return process.env.SESSION_PLANS_BETA_ENABLED === 'false'
}

/**
 * Registra log de auditoria na tabela pública auditoria_acesso_planos_sessao
 */
export async function logSessionPlanAudit(params: {
    clinicId?: string | null
    userId?: string | null
    route: string
    specialty?: string | null
    action: string
    result?: 'PERMITIDO' | 'NEGADO'
    resultado?: 'PERMITIDO' | 'NEGADO'
    details?: Record<string, any>
}) {
    try {
        const supabase = createServiceRoleClient() as any
        const outcome = params.resultado || params.result || 'NEGADO'
        await supabase.from('auditoria_acesso_planos_sessao').insert({
            clinica_id: params.clinicId || null,
            user_id: params.userId || null,
            rota: params.route,
            especialidade: params.specialty || null,
            acao: params.action,
            resultado: outcome,
            detalhes: params.details || {},
        })
    } catch (err) {
        console.error('[AUDITORIA-PLANOS] Erro ao gravar log:', err)
    }
}

/**
 * Consulta a lista de especialidades habilitadas para uma clínica,
 * lendo clinics.theme.clinical_modules (padrão: 6 especialidades ativas)
 * e sincronizando clinica_modulos quando Psicomotricidade estiver habilitada.
 */
export async function getEnabledSessionPlanSpecialties(
    clinicId: string | null | undefined
): Promise<string[]> {
    if (!clinicId) return []

    if (isSessionPlansKillSwitchActive()) {
        return []
    }

    try {
        const supabase = createServiceRoleClient() as any

        const [{ data: clinic }, { data: modulos }] = await Promise.all([
            supabase.from('clinics').select('theme').eq('id', clinicId).maybeSingle(),
            supabase
                .from('clinica_modulos')
                .select('modulo_id, ativo, modulos_planos_sessao_habilitados')
                .eq('clinica_id', clinicId),
        ])

        const config = extractClinicalModulesFromTheme(clinic?.theme, clinicId)

        if (!config.sessionPlansEnabled) {
            return []
        }

        const enabled = new Set<string>(config.sessionPlanSpecialties)

        // Garante linha ativa em clinica_modulos quando psicomotricidade está habilitada (necessário para RLS das tabelas de psicomotricidade)
        if (enabled.has('psicomotricidade')) {
            const psicoRow = modulos?.find((m: any) => m.modulo_id === 'psicomotricidade_sensory')
            if (!psicoRow || psicoRow.ativo !== true) {
                await supabase.from('clinica_modulos').upsert(
                    {
                        clinica_id: clinicId,
                        modulo_id: 'psicomotricidade_sensory',
                        ativo: true,
                        modulos_planos_sessao_habilitados: Array.from(enabled),
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'clinica_id,modulo_id' }
                )
            }
        }

        return Array.from(enabled)
    } catch (err) {
        console.error('[PLANOS-SESSAO] Erro ao verificar especialidades:', err)
        return []
    }
}

/**
 * Verifica o acesso completo de uma clínica a uma especialidade específica ou ao Manual de Evolução.
 */
export async function verifySessionPlanAccess(params: {
    clinicId?: string | null
    userId?: string | null
    specialty?: string | null
    route: string
}): Promise<SessionPlanAccessCheck> {
    const { clinicId, userId, specialty, route } = params

    if (isSessionPlansKillSwitchActive()) {
        await logSessionPlanAudit({
            clinicId,
            userId,
            route,
            specialty,
            action: 'kill_switch_bloqueio',
            resultado: 'NEGADO',
        })
        return {
            isAllowed: false,
            reason: 'Kill switch ativo',
            enabledSpecialties: [],
            evolutionManualEnabled: false,
            clinicId: clinicId || undefined,
            userId: userId || undefined,
        }
    }

    if (!clinicId) {
        await logSessionPlanAudit({
            clinicId,
            userId,
            route,
            specialty,
            action: 'bloqueio_sem_clinica',
            resultado: 'NEGADO',
        })
        return {
            isAllowed: false,
            reason: 'Clínica não identificada',
            enabledSpecialties: [],
            evolutionManualEnabled: false,
            userId: userId || undefined,
        }
    }

    const supabase = createServiceRoleClient() as any
    const { data: clinic } = await supabase
        .from('clinics')
        .select('theme')
        .eq('id', clinicId)
        .maybeSingle()

    const config = extractClinicalModulesFromTheme(clinic?.theme, clinicId)
    const enabledSpecialties = await getEnabledSessionPlanSpecialties(clinicId)

    if (specialty === 'manual') {
        if (!config.evolutionManualEnabled) {
            await logSessionPlanAudit({
                clinicId,
                userId,
                route,
                specialty,
                action: 'bloqueio_manual_desativado',
                resultado: 'NEGADO',
            })
            return {
                isAllowed: false,
                reason: 'Manual de Evolução desativado nas configurações da clínica',
                enabledSpecialties,
                evolutionManualEnabled: false,
                clinicId,
                userId: userId || undefined,
            }
        }
    } else if (specialty) {
        const normalizedSpec = specialty.replace(/-/g, '_')
        const isSpecEnabled =
            enabledSpecialties.includes(specialty) ||
            enabledSpecialties.includes(normalizedSpec)
        if (!isSpecEnabled) {
            await logSessionPlanAudit({
                clinicId,
                userId,
                route,
                specialty,
                action: 'bloqueio_modulo_desativado',
                resultado: 'NEGADO',
            })
            return {
                isAllowed: false,
                reason: `Especialidade ${specialty} não habilitada para esta clínica`,
                enabledSpecialties,
                evolutionManualEnabled: config.evolutionManualEnabled,
                clinicId,
                userId: userId || undefined,
            }
        }
    }

    await logSessionPlanAudit({
        clinicId,
        userId,
        route,
        specialty,
        action: 'acesso_permitido',
        resultado: 'PERMITIDO',
    })

    return {
        isAllowed: enabledSpecialties.length > 0 || config.evolutionManualEnabled,
        enabledSpecialties,
        evolutionManualEnabled: config.evolutionManualEnabled,
        clinicId,
        userId: userId || undefined,
    }
}

/**
 * Server Component / Page Guard: Lança notFound() (404 estrito)
 * se o usuário não estiver autenticado ou se o módulo estiver desativado para a clínica.
 */
export async function enforceSessionPlanRouteGuard(
    route: string,
    specialty?: string,
    fallbackClinicId?: string
): Promise<{ clinicId: string; userId: string; enabledSpecialties: string[] }> {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        notFound()
    }

    const { data: dbUser } = await (supabase as any)
        .from('users')
        .select('clinic_id, role')
        .eq('id', user.id)
        .maybeSingle()

    const typedDbUser = dbUser as { clinic_id?: string | null; role?: string | null } | null
    const cookieStore = await cookies()
    const impersonationActive = cookieStore.get('impersonation_active')?.value === 'true'
    const impersonationClinicId = cookieStore.get('impersonation_clinic_id')?.value

    let clinicId: string | null = typedDbUser?.clinic_id || null

    if (impersonationActive && impersonationClinicId && typedDbUser?.role === 'SUPER_ADMIN') {
        clinicId = impersonationClinicId
    } else if (!clinicId && fallbackClinicId) {
        clinicId = fallbackClinicId
    } else if (fallbackClinicId && typedDbUser?.role === 'SUPER_ADMIN') {
        clinicId = fallbackClinicId
    }

    if (!clinicId) {
        notFound()
    }

    const access = await verifySessionPlanAccess({
        clinicId,
        userId: user.id,
        specialty,
        route,
    })

    if (!access.isAllowed) {
        notFound()
    }

    return {
        clinicId,
        userId: user.id,
        enabledSpecialties: access.enabledSpecialties,
    }
}
