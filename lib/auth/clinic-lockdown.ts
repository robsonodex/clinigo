/**
 * Guarda central de bloqueio definitivo e agendado de clínicas (LGPD / Encerramento).
 * Compatível com Edge Runtime (middleware.ts), Server Components, Route Handlers e Client Components.
 */

export type ClinicBlockType = 'SUSPENDED_BILLING' | 'TERMINATED_LGPD' | 'MANUAL_LOCK'

export interface ClinicLockdownState {
    id?: string | null
    name?: string | null
    is_active?: boolean | null
    scheduled_block_at?: string | null
    block_type?: string | null
    manual_unlock_only?: boolean | null
    block_notice_message?: string | null
    blocked_reason?: string | null
    blocked_at?: string | null
}

export const DEFAULT_TERMINATED_MESSAGE =
    'O ambiente desta clínica no CliniGo foi desativado definitivamente em atendimento à solicitação de encerramento da conta e conclusão do protocolo LGPD.'

export const DEFAULT_SCHEDULED_BANNER_MESSAGE =
    'Em atendimento à solicitação formal de encerramento do contrato e ao protocolo de exportação LGPD, o acesso ao sistema desta unidade será desativado definitivamente no horário programado. Caso precise consultar alguma informação pontual, conclua antes desse horário.'

export const CLINIC_LOCKDOWN_SELECT_EXTENDED =
    'id, name, is_active, blocked_at, blocked_reason, scheduled_block_at, block_type, manual_unlock_only, block_notice_message'

export const CLINIC_LOCKDOWN_SELECT_LEGACY = 'id, name, is_active, blocked_at, blocked_reason'

export function isClinicEffectivelyBlocked(
    clinic: ClinicLockdownState | null | undefined,
    nowMs: number = Date.now()
): boolean {
    if (!clinic) return false
    if (clinic.is_active === false) return true
    if (clinic.scheduled_block_at) {
        const scheduledMs = new Date(clinic.scheduled_block_at).getTime()
        if (!Number.isNaN(scheduledMs) && scheduledMs <= nowMs) {
            return true
        }
    }
    return false
}

export function isClinicTerminated(clinic: ClinicLockdownState | null | undefined): boolean {
    if (!clinic) return false
    const normalizedType = String(clinic.block_type || '').toUpperCase()
    if (normalizedType === 'TERMINATED_LGPD' || normalizedType === 'MANUAL_LOCK') {
        return true
    }
    if (clinic.manual_unlock_only === true) {
        return true
    }
    const reason = String(clinic.blocked_reason || '')
    return /lgpd|encerrad|cancelad|desativad|novo contrato/i.test(reason)
}

export function getClinicBlockedRedirectPath(clinic: ClinicLockdownState | null | undefined): string {
    return isClinicTerminated(clinic) ? '/conta-bloqueada?type=terminated' : '/conta-bloqueada'
}

export function hasPendingScheduledBlock(
    clinic: ClinicLockdownState | null | undefined,
    nowMs: number = Date.now()
): boolean {
    if (!clinic) return false
    if (clinic.is_active === false) return false
    if (!clinic.scheduled_block_at) return false
    const scheduledMs = new Date(clinic.scheduled_block_at).getTime()
    return !Number.isNaN(scheduledMs) && scheduledMs > nowMs
}

export function formatScheduledBlockBrt(isoDate: string): string {
    try {
        const date = new Date(isoDate)
        if (Number.isNaN(date.getTime())) return isoDate
        const datePart = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(date)
        const timePart = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).format(date)
        return `${datePart} às ${timePart.replace(':', 'h')}`
    } catch {
        return isoDate
    }
}

export function buildClinicBlockedErrorPayload(clinic: ClinicLockdownState | null | undefined) {
    const terminated = isClinicTerminated(clinic)
    const redirectUrl = getClinicBlockedRedirectPath(clinic)
    return {
        success: false,
        error: {
            code: 'CLINIC_INACTIVE',
            block_type: terminated ? 'TERMINATED_LGPD' : 'SUSPENDED_BILLING',
            manual_unlock_only: Boolean(clinic?.manual_unlock_only || terminated),
            redirect_url: redirectUrl,
            message: terminated
                ? DEFAULT_TERMINATED_MESSAGE
                : 'O acesso a esta clínica está bloqueado pela administração do CliniGo.',
        },
    }
}

function isMissingColumnError(error: any): boolean {
    if (!error) return false
    const code = String(error.code || '')
    const msg = String(error.message || '')
    return code === '42703' || msg.includes('scheduled_block_at') || msg.includes('block_type') || msg.includes('manual_unlock_only')
}

export async function fetchClinicLockdownById(
    supabase: any,
    clinicId: string | null | undefined
): Promise<ClinicLockdownState | null> {
    if (!clinicId) return null
    const { data, error } = await supabase
        .from('clinics')
        .select(CLINIC_LOCKDOWN_SELECT_EXTENDED)
        .eq('id', clinicId)
        .maybeSingle()

    if (!error) {
        return (data as ClinicLockdownState | null) || null
    }

    if (isMissingColumnError(error)) {
        const { data: legacy } = await supabase
            .from('clinics')
            .select(CLINIC_LOCKDOWN_SELECT_LEGACY)
            .eq('id', clinicId)
            .maybeSingle()
        return (legacy as ClinicLockdownState | null) || null
    }

    return null
}

export async function fetchClinicLockdownByUserId(
    supabase: any,
    userId: string | null | undefined
): Promise<{ role: string | null; clinicId: string | null; clinic: ClinicLockdownState | null }> {
    if (!userId) return { role: null, clinicId: null, clinic: null }
    const { data: profile } = await supabase
        .from('users')
        .select('role, clinic_id')
        .eq('id', userId)
        .maybeSingle()

    if (!profile?.clinic_id || profile.role === 'SUPER_ADMIN') {
        return { role: profile?.role || null, clinicId: profile?.clinic_id || null, clinic: null }
    }

    const clinic = await fetchClinicLockdownById(supabase, profile.clinic_id)
    return { role: profile.role || null, clinicId: profile.clinic_id, clinic }
}

export async function fetchClinicLockdownByUserEmail(
    supabase: any,
    email: string | null | undefined
): Promise<{ userId: string | null; role: string | null; clinicId: string | null; clinic: ClinicLockdownState | null }> {
    if (!email) return { userId: null, role: null, clinicId: null, clinic: null }
    const normalizedEmail = email.trim().toLowerCase()
    const { data: profile } = await supabase
        .from('users')
        .select('id, role, clinic_id')
        .ilike('email', normalizedEmail)
        .maybeSingle()

    if (!profile) {
        return { userId: null, role: null, clinicId: null, clinic: null }
    }

    if (!profile.clinic_id || profile.role === 'SUPER_ADMIN') {
        return { userId: profile.id, role: profile.role || null, clinicId: profile.clinic_id || null, clinic: null }
    }

    const clinic = await fetchClinicLockdownById(supabase, profile.clinic_id)
    return { userId: profile.id, role: profile.role || null, clinicId: profile.clinic_id, clinic }
}

