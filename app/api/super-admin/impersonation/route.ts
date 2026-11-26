import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
// @ts-nocheck
/**
 * API: Super Admin Impersonation 2.0 (Silencioso, 1-Clique e Multi-Perfil)
 * GET   /api/super-admin/impersonation — Lista histórico OU usuários de uma clínica (?clinic_users_for=<id>)
 * POST  /api/super-admin/impersonation — Inicia sessão 1-clique (motivo opcional) em qualquer perfil/usuário da clínica
 * PATCH /api/super-admin/impersonation — Troca de perfil/usuário ao vivo (Hot-Switch) sem sair da clínica
 */
import { cookies } from 'next/headers'
import { successResponse, handleApiError, ForbiddenError, BadRequestError } from '@/lib/utils/responses'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const SUPER_ADMIN_EMAILS = (
    process.env.SUPER_ADMIN_EMAILS || 'robsonfenriz@gmail.com,contato@clinigo.app'
).split(',').map(e => e.trim().toLowerCase())

const ALLOWED_TARGET_ROLES = new Set([
    'CLINIC_ADMIN',
    'DOCTOR',
    'RECEPTIONIST',
    'FINANCIAL',
    'READONLY',
])

const COOKIE_MAX_AGE = 60 * 60 * 6 // 6 horas

function sanitizeIpForInet(rawHeader: string | null): string | null {
    if (!rawHeader) return null
    const first = rawHeader.split(',')[0]?.trim() || ''
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(first) || /^[0-9a-fA-F:]+$/.test(first)) {
        return first
    }
    return null
}

async function verifySuperAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new ForbiddenError('Not authenticated')

    const isWhitelisted = SUPER_ADMIN_EMAILS.includes((user.email || '').toLowerCase())
    if (!isWhitelisted) {
        const supabaseAdmin = createServiceRoleClient() as any
        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()
        if (profile?.role !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Super admin only')
        }
    }
    return user
}

async function resolveTargetClinicUser(
    supabaseAdmin: any,
    clinicId: string,
    targetUserId?: string | null,
    targetRole?: string | null
): Promise<{ id: string | null; full_name: string; email: string | null; role: string }> {
    // 1. Usuário específico selecionado pelo Super Admin
    if (targetUserId) {
        const { data: specificUser } = await supabaseAdmin
            .from('users')
            .select('id, full_name, email, role')
            .eq('id', targetUserId)
            .eq('clinic_id', clinicId)
            .maybeSingle()

        if (specificUser) {
            return {
                id: specificUser.id,
                full_name: specificUser.full_name || specificUser.email || 'Usuário da Clínica',
                email: specificUser.email || null,
                role: specificUser.role || 'CLINIC_ADMIN',
            }
        }
    }

    // 2. Perfil específico selecionado (pega um usuário real desse perfil na clínica, ou emula o papel)
    const desiredRole = targetRole && ALLOWED_TARGET_ROLES.has(targetRole) ? targetRole : 'CLINIC_ADMIN'
    const { data: roleUser } = await supabaseAdmin
        .from('users')
        .select('id, full_name, email, role')
        .eq('clinic_id', clinicId)
        .eq('role', desiredRole)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

    if (roleUser) {
        return {
            id: roleUser.id,
            full_name: roleUser.full_name || roleUser.email || desiredRole,
            email: roleUser.email || null,
            role: roleUser.role || desiredRole,
        }
    }

    // Fallback: emula o papel solicitado sem quebrar caso a clínica ainda não tenha usuário com aquele papel
    const roleLabels: Record<string, string> = {
        CLINIC_ADMIN: 'Administração da Clínica',
        DOCTOR: 'Profissional',
        RECEPTIONIST: 'Recepção',
        FINANCIAL: 'Financeiro',
        READONLY: 'Somente Leitura',
    }
    return {
        id: null,
        full_name: roleLabels[desiredRole] || 'Administração da Clínica',
        email: null,
        role: desiredRole,
    }
}

async function writeImpersonationCookies(params: {
    sessionId: string
    clinicId: string
    clinicName: string
    targetUserId: string | null
    targetRole: string
    targetName: string
}) {
    const cookieStore = await cookies()
    const baseOpts = {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: COOKIE_MAX_AGE,
    }

    cookieStore.set('impersonation_session_id', params.sessionId, { ...baseOpts, httpOnly: true })
    cookieStore.set('impersonation_clinic_id', params.clinicId, { ...baseOpts, httpOnly: false })
    cookieStore.set('impersonation_clinic_name', params.clinicName, { ...baseOpts, httpOnly: false })
    cookieStore.set('impersonation_active', 'true', { ...baseOpts, httpOnly: false })
    cookieStore.set('impersonation_target_role', params.targetRole, { ...baseOpts, httpOnly: false })
    cookieStore.set('impersonation_target_name', params.targetName, { ...baseOpts, httpOnly: false })

    if (params.targetUserId) {
        cookieStore.set('impersonation_target_user_id', params.targetUserId, { ...baseOpts, httpOnly: false })
    } else {
        cookieStore.delete('impersonation_target_user_id')
    }
}

/**
 * GET — Lista histórico de impersonations OU usuários de uma clínica para escolha de perfil
 */
export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        await verifySuperAdmin()
        const supabaseAdmin = createServiceRoleClient() as any

        const { searchParams } = new URL(request.url)
        const clinicUsersFor = searchParams.get('clinic_users_for')

        // Modo rápido: listar usuários/perfis de uma clínica para seleção 1-clique ou Hot-Switch
        if (clinicUsersFor) {
            const { data: users, error: usersErr } = await supabaseAdmin
                .from('users')
                .select('id, full_name, email, role, is_coordinator')
                .eq('clinic_id', clinicUsersFor)
                .neq('role', 'SUPER_ADMIN')
                .order('role', { ascending: true })
                .order('full_name', { ascending: true })
                .limit(150)

            if (usersErr) {
                throw new Error('Erro ao buscar perfis da clínica')
            }

            return successResponse({
                users: (users || []).filter((u: any) => !String(u.email || '').startsWith('inativo-')),
            })
        }

        const clinicFilter = searchParams.get('clinic_id')
        const dateFrom = searchParams.get('date_from')
        const dateTo = searchParams.get('date_to')

        let query = supabaseAdmin
            .from('impersonation_sessions')
            .select('*, clinics:target_clinic_id(id, name)')
            .order('started_at', { ascending: false })
            .limit(100)

        if (clinicFilter) {
            query = query.eq('target_clinic_id', clinicFilter)
        }
        if (dateFrom) {
            query = query.gte('started_at', dateFrom)
        }
        if (dateTo) {
            query = query.lte('started_at', dateTo)
        }

        const { data: sessions, error } = await query

        if (error) {
            console.error('[Impersonation GET] Error:', error)
            throw new Error('Erro ao buscar sessões de impersonation')
        }

        return successResponse({ sessions: sessions || [] })
    } catch (error) {
        request.log.error('super-admin/impersonation', { error: error instanceof Error ? error.message : String(error) })
        return handleApiError(error)
    }
})

/**
 * POST — Inicia nova sessão de impersonation em 1 clique (motivo totalmente opcional)
 * Body: { clinic_id: string, target_user_id?: string, target_role?: string, reason?: string }
 */
export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
        const user = await verifySuperAdmin()
        const supabaseAdmin = createServiceRoleClient() as any

        const body = await request.json()
        const { clinic_id, target_user_id, target_role, reason } = body

        if (!clinic_id) {
            throw new BadRequestError('clinic_id é obrigatório')
        }

        const cleanReason =
            typeof reason === 'string' && reason.trim().length > 0
                ? reason.trim().slice(0, 300)
                : 'Acesso administrativo silencioso (Super Admin)'

        const { data: clinic, error: clinicError } = await supabaseAdmin
            .from('clinics')
            .select('id, name')
            .eq('id', clinic_id)
            .single()

        if (clinicError || !clinic) {
            throw new BadRequestError('Clínica não encontrada')
        }

        const targetProfile = await resolveTargetClinicUser(
            supabaseAdmin,
            clinic.id,
            target_user_id || null,
            target_role || null
        )

        // Encerrar sessões anteriores abertas deste Super Admin (silenciosamente)
        await supabaseAdmin
            .from('impersonation_sessions')
            .update({ ended_at: new Date().toISOString(), is_active: false })
            .eq('admin_id', user.id)
            .is('ended_at', null)

        const rawIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
        const cleanIp = sanitizeIpForInet(rawIp)

        const { data: session, error: insertError } = await supabaseAdmin
            .from('impersonation_sessions')
            .insert({
                admin_id: user.id,
                admin_email: user.email || '',
                target_clinic_id: clinic.id,
                target_clinic_name: clinic.name,
                target_user_id: targetProfile.id,
                target_user_name: targetProfile.full_name,
                target_role: targetProfile.role,
                reason: cleanReason,
                ip_address: cleanIp || 'unknown',
                started_at: new Date().toISOString(),
                is_active: true,
            })
            .select()
            .single()

        if (insertError) {
            console.error('[Impersonation POST] Insert error:', insertError)
            throw new Error('Erro ao criar sessão de impersonation')
        }

        // Log interno EXCLUSIVO Super Admin em system_logs (usando colunas reais — sem target_clinic inválido)
        try {
            await supabaseAdmin.from('system_logs').insert({
                admin_id: user.id,
                admin_email: user.email,
                action_type: 'IMPERSONATION',
                action_category: 'SECURITY',
                action_description: `Acesso silencioso em "${clinic.name}" como ${targetProfile.full_name} (${targetProfile.role})`,
                target_clinic_id: clinic.id,
                target_user_id: targetProfile.id,
                ip_address: cleanIp,
                request_path: '/api/super-admin/impersonation',
                metadata: {
                    target_clinic_name: clinic.name,
                    target_user_name: targetProfile.full_name,
                    target_role: targetProfile.role,
                    reason: cleanReason,
                    session_id: session.id,
                },
            })
        } catch {
            // Não-bloqueante
        }

        await writeImpersonationCookies({
            sessionId: session.id,
            clinicId: clinic.id,
            clinicName: clinic.name,
            targetUserId: targetProfile.id,
            targetRole: targetProfile.role,
            targetName: targetProfile.full_name,
        })

        return successResponse(
            {
                session_id: session.id,
                clinic_id: clinic.id,
                clinic_name: clinic.name,
                target_user_id: targetProfile.id,
                target_user_name: targetProfile.full_name,
                target_role: targetProfile.role,
                message: `Sessão iniciada em "${clinic.name}" como ${targetProfile.full_name}`,
            },
            { status: 201 }
        )
    } catch (error) {
        request.log.error('super-admin/impersonation', { error: error instanceof Error ? error.message : String(error) })
        return handleApiError(error)
    }
})

/**
 * PATCH — Troca de perfil/usuário ao vivo (Hot-Switch) dentro da mesma clínica sem sair do dashboard
 * Body: { target_user_id?: string | null, target_role?: string | null }
 */
export const PATCH = withAxiom(async (request: AxiomRequest) => {
    try {
        const user = await verifySuperAdmin()
        const supabaseAdmin = createServiceRoleClient() as any
        const cookieStore = await cookies()

        const clinicId = cookieStore.get('impersonation_clinic_id')?.value
        const clinicName = cookieStore.get('impersonation_clinic_name')?.value || 'Clínica'
        const sessionId = cookieStore.get('impersonation_session_id')?.value

        if (!clinicId) {
            throw new BadRequestError('Nenhuma sessão de impersonation ativa')
        }

        const body = await request.json()
        const targetProfile = await resolveTargetClinicUser(
            supabaseAdmin,
            clinicId,
            body.target_user_id || null,
            body.target_role || null
        )

        if (sessionId) {
            await supabaseAdmin
                .from('impersonation_sessions')
                .update({
                    target_user_id: targetProfile.id,
                    target_user_name: targetProfile.full_name,
                    target_role: targetProfile.role,
                })
                .eq('id', sessionId)
                .eq('admin_id', user.id)
        }

        await writeImpersonationCookies({
            sessionId: sessionId || 'active',
            clinicId,
            clinicName,
            targetUserId: targetProfile.id,
            targetRole: targetProfile.role,
            targetName: targetProfile.full_name,
        })

        return successResponse({
            clinic_id: clinicId,
            clinic_name: clinicName,
            target_user_id: targetProfile.id,
            target_user_name: targetProfile.full_name,
            target_role: targetProfile.role,
        })
    } catch (error) {
        request.log.error('super-admin/impersonation', { error: error instanceof Error ? error.message : String(error) })
        return handleApiError(error)
    }
})
