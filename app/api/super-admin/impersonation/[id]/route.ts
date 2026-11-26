import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
// @ts-nocheck
/**
 * API: Encerrar sessão de Impersonation (Silencioso)
 * DELETE /api/super-admin/impersonation/[id]  (aceita id = 'current' para encerrar a sessão ativa do cookie)
 */
import { cookies } from 'next/headers'
import { successResponse, handleApiError, ForbiddenError, BadRequestError } from '@/lib/utils/responses'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const SUPER_ADMIN_EMAILS = (
    process.env.SUPER_ADMIN_EMAILS || 'robsonfenriz@gmail.com,contato@clinigo.app'
).split(',').map(e => e.trim().toLowerCase())

function sanitizeIpForInet(rawHeader: string | null): string | null {
    if (!rawHeader) return null
    const first = rawHeader.split(',')[0]?.trim() || ''
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(first) || /^[0-9a-fA-F:]+$/.test(first)) {
        return first
    }
    return null
}

async function clearImpersonationCookies() {
    const cookieStore = await cookies()
    cookieStore.delete('impersonation_clinic_id')
    cookieStore.delete('impersonation_session_id')
    cookieStore.delete('impersonation_clinic_name')
    cookieStore.delete('impersonation_active')
    cookieStore.delete('impersonation_target_user_id')
    cookieStore.delete('impersonation_target_role')
    cookieStore.delete('impersonation_target_name')
}

export const DELETE = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new ForbiddenError('Not authenticated')

        const supabaseAdmin = createServiceRoleClient() as any
        const isWhitelisted = SUPER_ADMIN_EMAILS.includes((user.email || '').toLowerCase())
        if (!isWhitelisted) {
            const { data: profile } = await supabaseAdmin
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single()
            if (profile?.role !== 'SUPER_ADMIN') {
                throw new ForbiddenError('Super admin only')
            }
        }

        const rawParamId = (await params).id
        const cookieStore = await cookies()
        const resolvedSessionId =
            rawParamId === 'current'
                ? cookieStore.get('impersonation_session_id')?.value || null
                : rawParamId

        if (!resolvedSessionId && rawParamId !== 'current') {
            throw new BadRequestError('ID da sessão é obrigatório')
        }

        let endedSession: any = null
        if (resolvedSessionId) {
            const { data: session } = await supabaseAdmin
                .from('impersonation_sessions')
                .update({ ended_at: new Date().toISOString(), is_active: false })
                .eq('id', resolvedSessionId)
                .is('ended_at', null)
                .select('*, clinics:target_clinic_id(id, name)')
                .maybeSingle()
            endedSession = session
        }

        // Fallback: garante encerramento de qualquer sessão aberta do admin se veio 'current' sem cookie httpOnly
        if (!endedSession && rawParamId === 'current') {
            const { data: fallbackSessions } = await supabaseAdmin
                .from('impersonation_sessions')
                .update({ ended_at: new Date().toISOString(), is_active: false })
                .eq('admin_id', user.id)
                .is('ended_at', null)
                .select('*, clinics:target_clinic_id(id, name)')
            endedSession = fallbackSessions?.[0] || null
        }

        // Log interno exclusivo Super Admin em system_logs (colunas reais — sem target_clinic inválido)
        if (endedSession) {
            try {
                const clinicName = endedSession.clinics?.name || endedSession.target_clinic_name || 'desconhecida'
                const cleanIp = sanitizeIpForInet(
                    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
                )
                await supabaseAdmin.from('system_logs').insert({
                    admin_id: user.id,
                    admin_email: user.email,
                    action_type: 'IMPERSONATION_END',
                    action_category: 'SECURITY',
                    action_description: `Encerrou acesso silencioso em "${clinicName}"`,
                    target_clinic_id: endedSession.target_clinic_id || null,
                    target_user_id: endedSession.target_user_id || null,
                    ip_address: cleanIp,
                    request_path: `/api/super-admin/impersonation/${resolvedSessionId || 'current'}`,
                    metadata: {
                        target_clinic_name: clinicName,
                        target_user_name: endedSession.target_user_name || null,
                        target_role: endedSession.target_role || null,
                        session_id: endedSession.id,
                    },
                })
            } catch {
                // Não-bloqueante
            }
        }

        await clearImpersonationCookies()

        return successResponse({
            message: 'Sessão encerrada com sucesso',
            session_id: endedSession?.id || resolvedSessionId || 'current',
        })
    } catch (error) {
        request.log.error('super-admin/impersonation/[id]', { error: error instanceof Error ? error.message : String(error) })
        return handleApiError(error)
    }
})
