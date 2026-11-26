import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
// @ts-nocheck
/**
 * API: Super Admin Chatbot Dashboard
 * GET /api/super-admin/chatbot — Métricas do funil do Clin, leads e sessões WhatsApp
 * POST /api/super-admin/chatbot — Atualizar lead ou pausar/retomar Bot Clin por sessão
 */
import { successResponse, handleApiError, ForbiddenError, BadRequestError } from '@/lib/utils/responses'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { extractWhatsappDigits } from '@/lib/chatbot/clin-growth'

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

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        await verifySuperAdmin()
        const supabaseAdmin = createServiceRoleClient() as any

        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '30')
        const since = new Date()
        since.setDate(since.getDate() - days)
        const sinceISO = since.toISOString()

        let sessions: any[] = []
        try {
            const { data } = await supabaseAdmin
                .from('chatbot_sessions')
                .select('*')
                .gte('updated_at', sinceISO)
                .order('updated_at', { ascending: false })
                .limit(500)
            sessions = data || []
        } catch (_catchErr) {
            request.log.error('super-admin/chatbot', {
                error: _catchErr instanceof Error ? _catchErr.message : String(_catchErr),
            })
        }

        let leads: any[] = []
        try {
            const { data } = await supabaseAdmin
                .from('chatbot_leads')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(200)
            leads = data || []
        } catch (_catchErr) {
            request.log.error('super-admin/chatbot', {
                error: _catchErr instanceof Error ? _catchErr.message : String(_catchErr),
            })
        }

        const totalSessions = sessions.length
        const sessionsCompleted = sessions.filter(s => s.status === 'completed').length
        const sessionsDropped = sessions.filter(s => s.status === 'dropped' || s.status === 'timeout').length
        const sessionsTransferred = sessions.filter(s => s.status === 'transferred').length
        const totalLeads = leads.length
        const leadsConverted = leads.filter(l => l.status === 'converted').length
        const leadsNew = leads.filter(l => l.status === 'new' || l.status === 'pending' || l.status === 'qualified').length

        const conversionRate = totalSessions > 0 ? (leadsConverted / totalSessions * 100) : 0
        const dropRate = totalSessions > 0 ? (sessionsDropped / totalSessions * 100) : 0

        const stepCounts: Record<string, number> = {}
        sessions.forEach(s => {
            const step = s.conversation_state?.step || s.last_step || s.current_step || 'menu'
            stepCounts[step] = (stepCounts[step] || 0) + 1
        })

        const formattedSessions = sessions.slice(0, 60).map(s => {
            const leadData = s.conversation_state?.leadData || {}
            const phone = extractWhatsappDigits(String(s.session_id || ''), s.visitor_phone || leadData.telefone)
            return {
                id: s.id,
                session_id: s.session_id,
                channel: String(s.session_id || '').startsWith('wa-') ? 'whatsapp' : 'web',
                phone,
                visitor_name: s.visitor_name || leadData.nome || null,
                clinic_name: leadData.clinica || null,
                plan_interest: leadData.planoIndicado || null,
                step: s.conversation_state?.step || 'menu',
                status: s.status || 'active',
                message_count: s.message_count || 0,
                bot_paused_until: s.bot_paused_until || null,
                followup_2h_sent_at: s.followup_2h_sent_at || null,
                followup_24h_sent_at: s.followup_24h_sent_at || null,
                updated_at: s.updated_at || s.created_at,
            }
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
            recentLeads: leads.slice(0, 100),
            recentSessions: formattedSessions,
            period: { days, since: sinceISO },
        })
    } catch (error) {
        request.log.error('super-admin/chatbot', {
            error: error instanceof Error ? error.message : String(error),
        })
        return handleApiError(error)
    }
})

export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
        await verifySuperAdmin()
        const supabaseAdmin = createServiceRoleClient() as any
        const body = await request.json()

        const { action, lead_id, status, notes, session_id, hours } = body

        if (action === 'update_lead') {
            if (!lead_id) throw new BadRequestError('lead_id é obrigatório')
            const updateData: any = { updated_at: new Date().toISOString() }
            if (status) updateData.status = status
            if (notes !== undefined) updateData.notes = notes

            const { error } = await supabaseAdmin
                .from('chatbot_leads')
                .update(updateData)
                .eq('id', lead_id)

            if (error) throw new Error('Erro ao atualizar lead')
            return successResponse({ message: 'Lead atualizado com sucesso' })
        }

        if (action === 'pause_session') {
            if (!session_id) throw new BadRequestError('session_id é obrigatório')
            const durationHours = Math.min(168, Math.max(1, Number(hours || 24)))
            const pausedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()

            const { error } = await supabaseAdmin
                .from('chatbot_sessions')
                .update({
                    bot_paused_until: pausedUntil,
                    status: 'transferred',
                    updated_at: new Date().toISOString(),
                })
                .eq('session_id', session_id)

            if (error) throw new Error('Erro ao pausar bot para esta conversa')
            return successResponse({
                message: `Bot Clin pausado por ${durationHours}h para esta conversa.`,
                bot_paused_until: pausedUntil,
            })
        }

        if (action === 'resume_session') {
            if (!session_id) throw new BadRequestError('session_id é obrigatório')

            const { error } = await supabaseAdmin
                .from('chatbot_sessions')
                .update({
                    bot_paused_until: null,
                    status: 'active',
                    updated_at: new Date().toISOString(),
                })
                .eq('session_id', session_id)

            if (error) throw new Error('Erro ao retomar bot para esta conversa')
            return successResponse({
                message: 'Bot Clin retomado para esta conversa.',
                bot_paused_until: null,
            })
        }

        throw new BadRequestError(`Ação desconhecida: ${action}`)
    } catch (error) {
        request.log.error('super-admin/chatbot', {
            error: error instanceof Error ? error.message : String(error),
        })
        return handleApiError(error)
    }
})
