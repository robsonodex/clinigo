/**
 * GUARD DE SEGURANÇA: CENTRAL DE PLANOS DE SESSÃO & MANUAL
 * Validação rigorosa em Duas Camadas (Camada A + Camada B) + Kill Switch + Auditoria.
 */

import { notFound } from 'next/navigation'
import {
    isClinicInSessionPlansAllowlist,
    type SessionPlanSpecialty,
} from '@/lib/constants/session-plans-beta-clinics'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export interface SessionPlanAccessCheck {
    isAllowed: boolean
    reason?: string
    enabledSpecialties: string[]
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
    result: 'PERMITIDO' | 'NEGADO'
    details?: Record<string, any>
}) {
    try {
        const supabase = createServiceRoleClient()
        await supabase.from('auditoria_acesso_planos_sessao').insert({
            clinica_id: params.clinicId || null,
            user_id: params.userId || null,
            rota: params.route,
            especialidade: params.specialty || null,
            acao: params.action,
            resultado: params.result,
            detalhes: params.details || {},
        })
    } catch (err) {
        // Falha no log de auditoria não deve derrubar a aplicação, mas loga no console
        console.error('[AUDITORIA-PLANOS] Erro ao gravar log:', err)
    }
}

/**
 * Consulta a lista de especialidades habilitadas para uma clínica (Camada B),
 * garantindo antes que a clínica passe pela Camada A.
 */
export async function getEnabledSessionPlanSpecialties(
    clinicId: string | null | undefined
): Promise<string[]> {
    if (!clinicId) return []

    // Camada A obrigatória
    if (!isClinicInSessionPlansAllowlist(clinicId)) {
        return []
    }

    // Kill switch
    if (isSessionPlansKillSwitchActive()) {
        return []
    }

    try {
        const supabase = createServiceRoleClient()

        // 1. Busca coluna modulos_planos_sessao_habilitados em clinica_modulos
        const { data: modulos } = await supabase
            .from('clinica_modulos')
            .select('modulo_id, ativo, modulos_planos_sessao_habilitados')
            .eq('clinica_id', clinicId)

        const enabled = new Set<string>()

        // Verifica psicomotricidade ativa
        const psicoRow = modulos?.find(
            (m) => m.modulo_id === 'psicomotricidade_sensory' && m.ativo === true
        )
        if (psicoRow) {
            enabled.add('psicomotricidade')
        }

        // Verifica array de planos de sessão agregados
        modulos?.forEach((m) => {
            if (Array.isArray(m.modulos_planos_sessao_habilitados)) {
                m.modulos_planos_sessao_habilitados.forEach((spec: string) =>
                    enabled.add(spec)
                )
            }
        })

        // Para World Sensory e Demo Teste, assegura que todas as especialidades clínicas estejam ativas por padrão
        const allSpecs = [
            'fisioterapia',
            'fonoaudiologia',
            'intervencao_precoce_aba',
            'psicologia',
            'terapia_ocupacional',
        ]
        allSpecs.forEach((sp) => enabled.add(sp))

        return Array.from(enabled)
    } catch (err) {
        console.error('[PLANOS-SESSAO] Erro ao verificar especialidades:', err)
        return []
    }
}

/**
 * Verifica o acesso completo de uma clínica a uma especialidade específica.
 * Retorna objeto com resultado detalhado.
 */
export async function verifySessionPlanAccess(params: {
    clinicId?: string | null
    userId?: string | null
    specialty?: string | null
    route: string
}): Promise<SessionPlanAccessCheck> {
    const { clinicId, userId, specialty, route } = params

    // 1. Kill Switch
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
            clinicId: clinicId || undefined,
            userId: userId || undefined,
        }
    }

    // 2. Camada A: Allowlist estrita de UUIDs
    if (!isClinicInSessionPlansAllowlist(clinicId)) {
        await logSessionPlanAudit({
            clinicId,
            userId,
            route,
            specialty,
            action: 'bloqueio_404_fora_allowlist',
            resultado: 'NEGADO',
            details: { clinicIdTentativa: clinicId },
        })
        return {
            isAllowed: false,
            reason: 'Clínica não autorizada na Allowlist (Camada A)',
            enabledSpecialties: [],
            clinicId: clinicId || undefined,
            userId: userId || undefined,
        }
    }

    // 3. Camada B: Verificação das flags no banco
    const enabledSpecialties = await getEnabledSessionPlanSpecialties(clinicId)

    // Se uma especialidade específica foi requerida (exceto 'manual', que requer apenas pertencer à Camada A)
    if (specialty && specialty !== 'manual') {
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
                clinicId: clinicId || undefined,
                userId: userId || undefined,
            }
        }
    }

    // Acesso permitido
    await logSessionPlanAudit({
        clinicId,
        userId,
        route,
        specialty,
        action: 'acesso_permitido',
        resultado: 'PERMITIDO',
    })

    return {
        isAllowed: true,
        enabledSpecialties,
        clinicId: clinicId || undefined,
        userId: userId || undefined,
    }
}

import { cookies } from 'next/headers'

/**
 * Server Component / Page Guard: Lança notFound() (404 estrito)
 * se a clínica atual não tiver permissão. Não dá pista de 403.
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

    const { data: dbUser } = await supabase
        .from('users')
        .select('clinic_id, role')
        .eq('id', user.id)
        .maybeSingle()

    // 1. Verifica se há impersonation ativo via cookie
    const cookieStore = await cookies()
    const impersonationActive = cookieStore.get('impersonation_active')?.value === 'true'
    const impersonationClinicId = cookieStore.get('impersonation_clinic_id')?.value

    let clinicId = dbUser?.clinic_id

    if (impersonationActive && impersonationClinicId) {
        clinicId = impersonationClinicId
    } else if (!clinicId && fallbackClinicId && isClinicInSessionPlansAllowlist(fallbackClinicId)) {
        // Se usuário for Super Admin / sem clinic_id direto no perfil, mas navegando em clínica da Allowlist
        clinicId = fallbackClinicId
    } else if (fallbackClinicId && isClinicInSessionPlansAllowlist(fallbackClinicId) && dbUser?.role === 'SUPER_ADMIN') {
        clinicId = fallbackClinicId
    }

    const check = await verifySessionPlanAccess({
        clinicId,
        userId: user.id,
        specialty,
        route,
    })

    if (!check.isAllowed) {
        // Retorna 404 para não revelar a existência da rota para outras clínicas
        notFound()
    }

    return {
        clinicId: clinicId!,
        userId: user.id,
        enabledSpecialties: check.enabledSpecialties,
    }
}
