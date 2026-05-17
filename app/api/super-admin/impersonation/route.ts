// @ts-nocheck
/**
 * API: Super Admin Impersonation
 * GET  /api/super-admin/impersonation — Lista histórico de impersonations
 * POST /api/super-admin/impersonation — Inicia nova sessão de impersonation
 */
import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { successResponse, handleApiError, ForbiddenError, BadRequestError } from '@/lib/utils/responses'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const SUPER_ADMIN_EMAILS = (
    process.env.SUPER_ADMIN_EMAILS || 'robsonfenriz@gmail.com,contato@clinigo.app'
).split(',').map(e => e.trim().toLowerCase())

async function verifySuperAdmin() {
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
    return user
}

/**
 * GET — Lista histórico de impersonations (todas, ordenadas por started_at desc)
 */
export async function GET(request: NextRequest) {
    try {
        const user = await verifySuperAdmin()
        const supabaseAdmin = createServiceRoleClient()

        const { searchParams } = new URL(request.url)
        const clinicFilter = searchParams.get('clinic_id')
        const dateFrom = searchParams.get('date_from')
        const dateTo = searchParams.get('date_to')

        let query = supabaseAdmin
            .from('impersonation_sessions')
            .select('*, clinics:clinic_id(id, name), admin:super_admin_id(id, email)')
            .order('started_at', { ascending: false })
            .limit(100)

        if (clinicFilter) {
            query = query.eq('clinic_id', clinicFilter)
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
        return handleApiError(error)
    }
}

/**
 * POST — Inicia nova sessão de impersonation
 * Body: { clinic_id: string, reason: string }
 * Retorna: session_id, salva cookie httpOnly
 */
export async function POST(request: NextRequest) {
    try {
        const user = await verifySuperAdmin()
        const supabaseAdmin = createServiceRoleClient()

        const body = await request.json()
        const { clinic_id, reason } = body

        if (!clinic_id) {
            throw new BadRequestError('clinic_id é obrigatório')
        }
        if (!reason || reason.trim().length < 10) {
            throw new BadRequestError('Motivo deve ter no mínimo 10 caracteres')
        }

        // Verificar se a clínica existe
        const { data: clinic, error: clinicError } = await supabaseAdmin
            .from('clinics')
            .select('id, name')
            .eq('id', clinic_id)
            .single()

        if (clinicError || !clinic) {
            throw new BadRequestError('Clínica não encontrada')
        }

        // Encerrar sessões anteriores abertas deste admin
        await supabaseAdmin
            .from('impersonation_sessions')
            .update({ ended_at: new Date().toISOString() })
            .eq('super_admin_id', user.id)
            .is('ended_at', null)

        // Criar nova sessão
        const ipAddress = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') || 'unknown'

        const { data: session, error: insertError } = await supabaseAdmin
            .from('impersonation_sessions')
            .insert({
                super_admin_id: user.id,
                clinic_id: clinic.id,
                reason: reason.trim(),
                ip_address: ipAddress,
                started_at: new Date().toISOString(),
            })
            .select()
            .single()

        if (insertError) {
            console.error('[Impersonation POST] Insert error:', insertError)
            throw new Error('Erro ao criar sessão de impersonation')
        }

        // Log no system_logs
        try {
            await supabaseAdmin.from('system_logs').insert({
                admin_email: user.email,
                action_type: 'IMPERSONATION',
                action_category: 'SECURITY',
                action_description: `Iniciou impersonation na clínica "${clinic.name}" — Motivo: ${reason.trim()}`,
                target_clinic: clinic.name,
                ip_address: ipAddress,
                request_path: '/api/super-admin/impersonation',
            })
        } catch {
            // system_logs pode não existir
        }

        // Definir cookies httpOnly
        const cookieStore = await cookies()

        cookieStore.set('impersonation_clinic_id', clinic.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 4, // 4 horas max
        })

        cookieStore.set('impersonation_session_id', session.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 4,
        })

        cookieStore.set('impersonation_clinic_name', clinic.name, {
            httpOnly: false, // Legível pelo JS para exibir no banner
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 4,
        })

        return successResponse({
            session_id: session.id,
            clinic_id: clinic.id,
            clinic_name: clinic.name,
            message: `Impersonation iniciada na clínica "${clinic.name}"`,
        }, { status: 201 })
    } catch (error) {
        return handleApiError(error)
    }
}
