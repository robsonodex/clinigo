// @ts-nocheck
/**
 * API: Encerrar sessão de Impersonation
 * DELETE /api/super-admin/impersonation/[id]
 */
import { type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { successResponse, handleApiError, ForbiddenError, BadRequestError } from '@/lib/utils/responses'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const SUPER_ADMIN_EMAILS = (
    process.env.SUPER_ADMIN_EMAILS || 'robsonfenriz@gmail.com,contato@clinigo.app'
).split(',').map(e => e.trim().toLowerCase())

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new ForbiddenError('Not authenticated')

        const isWhitelisted = SUPER_ADMIN_EMAILS.includes((user.email || '').toLowerCase())
        if (!isWhitelisted) {
            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single()
            if (profile?.role !== 'SUPER_ADMIN') {
                throw new ForbiddenError('Super admin only')
            }
        }

        const supabaseAdmin = createServiceRoleClient()
        const sessionId = (await params).id

        if (!sessionId) {
            throw new BadRequestError('ID da sessão é obrigatório')
        }

        // Encerrar sessão
        const { data: session, error } = await supabaseAdmin
            .from('impersonation_sessions')
            .update({ ended_at: new Date().toISOString(), is_active: false })
            .eq('id', sessionId)
            .is('ended_at', null)
            .select('*, clinics:target_clinic_id(name)')
            .single()

        if (error) {
            console.error('[Impersonation DELETE] Error:', error)
            throw new BadRequestError('Sessão não encontrada ou já encerrada')
        }

        // Log no system_logs
        try {
            await supabaseAdmin.from('system_logs').insert({
                admin_email: user.email,
                action_type: 'IMPERSONATION_END',
                action_category: 'SECURITY',
                action_description: `Encerrou impersonation na clínica "${session.clinics?.name || 'desconhecida'}"`,
                target_clinic: session.clinics?.name || '',
                ip_address: request.headers.get('x-forwarded-for') || 'unknown',
                request_path: `/api/super-admin/impersonation/${sessionId}`,
            })
        } catch {
            // system_logs pode não existir
        }

        // Limpar cookies
        const cookieStore = await cookies()
        cookieStore.delete('impersonation_clinic_id')
        cookieStore.delete('impersonation_session_id')
        cookieStore.delete('impersonation_clinic_name')

        return successResponse({
            message: 'Sessão de impersonation encerrada',
            session_id: sessionId,
        })
    } catch (error) {
        return handleApiError(error)
    }
}
