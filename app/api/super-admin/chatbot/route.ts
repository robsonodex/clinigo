// @ts-nocheck
/**
 * API: Super Admin Chatbot Dashboard
 * GET /api/super-admin/chatbot — Métricas do funil do Clin
 */
import { type NextRequest } from 'next/server'
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
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
        if (profile?.role !== 'SUPER_ADMIN') throw new ForbiddenError('Super admin only')
    }
    return user
}

export async function GET(request: NextRequest) {
    try {
        await verifySuperAdmin()
        const supabaseAdmin = createServiceRoleClient()

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '30')
        const since = new Date()
        since.setDate(since.getDate() - days)
        const sinceISO = since.toISOString()

        // Buscar sessões do chatbot
        let sessions: any[] = []
        try {
            const { data } = await supabaseAdmin
                .from('chatbot_sessions')
                .select('*')
                .gte('created_at', sinceISO)
                .order('created_at', { ascending: false })
                .limit(500)
            sessions = data || []
        } catch { }

        // Buscar leads do chatbot
        let leads: any[] = []
        try {
            const { data } = await supabaseAdmin
                .from('chatbot_leads')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200)
            leads = data || []
        } catch { }

        // Métricas do funil
        const totalSessions = sessions.length
        const sessionsCompleted = sessions.filter(s => s.status === 'completed').length
        const sessionsDropped = sessions.filter(s => s.status === 'dropped' || s.status === 'timeout').length
        const sessionsTransferred = sessions.filter(s => s.status === 'transferred').length
        const totalLeads = leads.length
        const leadsConverted = leads.filter(l => l.status === 'converted').length
        const leadsNew = leads.filter(l => l.status === 'new' || l.status === 'pending').length

        const conversionRate = totalSessions > 0 ? (leadsConverted / totalSessions * 100) : 0
        const dropRate = totalSessions > 0 ? (sessionsDropped / totalSessions * 100) : 0

        // Steps frequency
        const stepCounts: Record<string, number> = {}
        sessions.forEach(s => {
            const step = s.last_step || s.current_step || 'unknown'
            stepCounts[step] = (stepCounts[step] || 0) + 1
        })

        return successResponse({
            metrics: {
                totalSessions,
                sessionsCompleted,
                sessionsDropped,
                sessionsTransferred,
                totalLeads,
                leadsConverted,
                leadsNew,
                conversionRate: parseFloat(conversionRate.toFixed(1)),
                dropRate: parseFloat(dropRate.toFixed(1)),
            },
            stepBreakdown: stepCounts,
            recentLeads: leads.slice(0, 20),
            recentSessions: sessions.slice(0, 20),
            period: { days, since: sinceISO },
        })
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        await verifySuperAdmin()
        const supabaseAdmin = createServiceRoleClient()
        const body = await request.json()

        const { action, lead_id, status, notes } = body

        if (action === 'update_lead') {
            if (!lead_id) throw new BadRequestError('lead_id é obrigatório')
            const updateData: any = {}
            if (status) updateData.status = status
            if (notes !== undefined) updateData.notes = notes

            const { error } = await supabaseAdmin
                .from('chatbot_leads')
                .update(updateData)
                .eq('id', lead_id)

            if (error) throw new Error('Erro ao atualizar lead')
            return successResponse({ message: 'Lead atualizado' })
        }

        throw new BadRequestError(`Ação desconhecida: ${action}`)
    } catch (error) {
        return handleApiError(error)
    }
}
