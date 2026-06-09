// @ts-nocheck
/**
 * API: Super Admin Billing — Central de Cobranças
 * GET    /api/super-admin/billing              — Lista clínicas inadimplentes
 * POST   /api/super-admin/billing/mark-paid    — Marca como pago
 * POST   /api/super-admin/billing/contact-log  — Registra contato de cobrança
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
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()
        if (profile?.role !== 'SUPER_ADMIN') throw new ForbiddenError('Super admin only')
    }
    return user
}

/**
 * GET — Lista clínicas com pagamento em atraso
 */
export async function GET(request: NextRequest) {
    try {
        const user = await verifySuperAdmin()
        const supabaseAdmin = createServiceRoleClient()

        // Buscar clínicas com subscriptions
        const { data: clinics, error: clinicsError } = await supabaseAdmin
            .from('clinics')
            .select('id, name, plan_type, is_active, subscription_due_date, custom_price, phone, email')
            .order('name')

        if (clinicsError) throw new Error('Erro ao buscar clínicas')

        const PLAN_PRICES: Record<string, number> = {
            FREE: 0, STARTER: 149, BASIC: 199, BASICO: 299,
            PROFESSIONAL: 449, PRO: 399, AVANCADO: 549,
            ENTERPRISE: 799, NETWORK: 999,
        }

        const now = new Date()
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        // Processar inadimplentes
        const allClinics = (clinics || []).map(c => {
            const price = c.custom_price ? Number(c.custom_price) : (PLAN_PRICES[c.plan_type] || 0)
            const dueDate = c.subscription_due_date ? new Date(c.subscription_due_date + 'T00:00:00') : null
            const isOverdue = dueDate ? dueDate < now : false
            const daysOverdue = dueDate ? Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))) : 0
            const isAtRisk = dueDate ? (dueDate >= now && dueDate <= sevenDaysFromNow) : false

            return {
                id: c.id,
                name: c.name,
                planType: c.plan_type,
                isActive: c.is_active,
                amount: price,
                dueDate: c.subscription_due_date,
                isOverdue,
                daysOverdue,
                isAtRisk,
                phone: c.phone,
                email: c.email,
            }
        })

        const overdueClinicsList = allClinics.filter(c => c.isOverdue && c.amount > 0)
        const atRiskList = allClinics.filter(c => c.isAtRisk && c.amount > 0)

        // Buscar último contato por clínica (para inadimplentes)
        const overdueIds = overdueClinicsList.map(c => c.id)
        let lastContacts: Record<string, string> = {}

        if (overdueIds.length > 0) {
            const { data: contacts } = await supabaseAdmin
                .from('billing_contact_log')
                .select('clinic_id, sent_at')
                .in('clinic_id', overdueIds)
                .order('sent_at', { ascending: false })

            if (contacts) {
                for (const contact of contacts) {
                    if (!lastContacts[contact.clinic_id]) {
                        lastContacts[contact.clinic_id] = contact.sent_at
                    }
                }
            }
        }

        // Enriquecer com último contato
        const enrichedOverdue = overdueClinicsList.map(c => ({
            ...c,
            lastContact: lastContacts[c.id] || null,
        }))

        // Métricas
        const totalOverdue = overdueClinicsList.reduce((sum, c) => sum + c.amount, 0)

        return successResponse({
            metrics: {
                totalOverdue,
                overdueCount: overdueClinicsList.length,
                atRiskCount: atRiskList.length,
            },
            overdueClinics: enrichedOverdue,
            atRiskClinics: atRiskList,
            allPaidClinics: allClinics.filter(c => c.amount > 0).map(c => ({
                ...c,
                lastContact: lastContacts[c.id] || null,
            })),
        })
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * POST — Ações de billing
 * Body: { action: 'mark_paid' | 'contact_log' | 'block', ...params }
 */
export async function POST(request: NextRequest) {
    try {
        const user = await verifySuperAdmin()
        const supabaseAdmin = createServiceRoleClient()
        const body = await request.json()

        const { action } = body

        switch (action) {
            case 'mark_paid': {
                const { clinic_id } = body
                if (!clinic_id) throw new BadRequestError('clinic_id é obrigatório')

                // Atualizar subscription_due_date para +30 dias a partir de hoje
                const newDueDate = new Date()
                newDueDate.setDate(newDueDate.getDate() + 30)
                const dueDateStr = newDueDate.toISOString().split('T')[0]

                const { error: updateError } = await supabaseAdmin
                    .from('clinics')
                    .update({
                        subscription_due_date: dueDateStr,
                        is_active: true,
                    })
                    .eq('id', clinic_id)

                if (updateError) throw new Error('Erro ao atualizar clínica')

                // Log
                try {
                    await supabaseAdmin.from('system_logs').insert({
                        admin_email: user.email,
                        action_type: 'BILLING_PAID',
                        action_category: 'BILLING',
                        action_description: `Marcou pagamento como confirmado para clínica ${clinic_id}`,
                        target_clinic: clinic_id,
                        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
                        request_path: '/api/super-admin/billing',
                    })
                } catch { }

                return successResponse({ message: 'Pagamento confirmado. Vencimento atualizado.' })
            }

            case 'contact_log': {
                const { clinic_id, channel, message } = body
                if (!clinic_id) throw new BadRequestError('clinic_id é obrigatório')
                if (!channel) throw new BadRequestError('channel é obrigatório')
                if (!message) throw new BadRequestError('message é obrigatória')

                const { error: insertError } = await supabaseAdmin
                    .from('billing_contact_log')
                    .insert({
                        clinic_id,
                        super_admin_id: user.id,
                        channel,
                        message,
                    })

                if (insertError) {
                    console.error('[Billing contact_log] Error:', insertError)
                    throw new Error('Erro ao registrar contato')
                }

                return successResponse({ message: 'Contato registrado com sucesso' })
            }

            case 'block': {
                const { clinic_id, reason } = body
                if (!clinic_id) throw new BadRequestError('clinic_id é obrigatório')

                const { error: blockError } = await supabaseAdmin
                    .from('clinics')
                    .update({ is_active: false })
                    .eq('id', clinic_id)

                if (blockError) throw new Error('Erro ao bloquear clínica')

                // Log
                try {
                    await supabaseAdmin.from('system_logs').insert({
                        admin_email: user.email,
                        action_type: 'BILLING_BLOCK',
                        action_category: 'BILLING',
                        action_description: `Bloqueou clínica por inadimplência: ${reason || 'sem motivo'}`,
                        target_clinic: clinic_id,
                        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
                        request_path: '/api/super-admin/billing',
                    })
                } catch { }

                return successResponse({ message: 'Clínica bloqueada por inadimplência' })
            }

            case 'get_contact_history': {
                const { clinic_id } = body
                if (!clinic_id) throw new BadRequestError('clinic_id é obrigatório')

                const { data: history, error: histError } = await supabaseAdmin
                    .from('billing_contact_log')
                    .select('*')
                    .eq('clinic_id', clinic_id)
                    .order('sent_at', { ascending: false })
                    .limit(50)

                if (histError) throw new Error('Erro ao buscar histórico')

                return successResponse({ history: history || [] })
            }

            default:
                throw new BadRequestError(`Ação desconhecida: ${action}`)
        }
    } catch (error) {
        return handleApiError(error)
    }
}
