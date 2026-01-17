/**
 * CRM Automation Executor - Cron Job
 * POST /api/cron/execute-automations
 * 
 * Executes CRM automation rules based on triggers
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// Force Node.js runtime
export const runtime = 'nodejs'

// Cron secret for security
const CRON_SECRET = process.env.CRON_SECRET || 'clinigo-cron-secret'

interface AutomationRule {
    id: string
    clinic_id: string
    name: string
    trigger: string
    trigger_filters: Record<string, any>
    actions: Array<{
        type: string
        config: Record<string, any>
    }>
    is_active: boolean
}

interface TriggerContext {
    appointment?: any
    patient?: any
    consultation?: any
}

export async function POST(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization')
        if (authHeader !== `Bearer ${CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createServiceRoleClient()
        const results: { ruleId: string; ruleName: string; triggered: number; actions: string[] }[] = []

        // Get all active automation rules
        const { data: rules, error: rulesError } = await supabase
            .from('automation_rules')
            .select('*')
            .eq('is_active', true)

        if (rulesError) {
            console.error('[CRM Automation] Error fetching rules:', rulesError)
            return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 })
        }

        if (!rules || rules.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No active automation rules found',
                executed: 0
            })
        }

        console.log(`[CRM Automation] Processing ${rules.length} active rules`)

        for (const rule of rules as AutomationRule[]) {
            try {
                const triggeredItems = await processRule(supabase, rule)

                if (triggeredItems.length > 0) {
                    results.push({
                        ruleId: rule.id,
                        ruleName: rule.name,
                        triggered: triggeredItems.length,
                        actions: rule.actions.map(a => a.type)
                    })
                }
            } catch (ruleError) {
                console.error(`[CRM Automation] Error processing rule ${rule.id}:`, ruleError)
            }
        }

        const totalTriggered = results.reduce((sum, r) => sum + r.triggered, 0)

        return NextResponse.json({
            success: true,
            executed: results.length,
            totalTriggered,
            results
        })

    } catch (error) {
        console.error('[CRM Automation] Fatal error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

async function processRule(supabase: any, rule: AutomationRule): Promise<any[]> {
    const triggeredItems: any[] = []

    switch (rule.trigger) {
        case 'APPOINTMENT_CREATED':
            // Get appointments created in last hour that haven't been processed
            const { data: newAppointments } = await supabase
                .from('appointments')
                .select('*, patients(*)')
                .eq('clinic_id', rule.clinic_id)
                .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
                .is('automation_processed', null)

            if (newAppointments) {
                for (const apt of newAppointments) {
                    if (matchesFilters(apt, rule.trigger_filters)) {
                        await executeActions(supabase, rule, { appointment: apt, patient: apt.patients })
                        triggeredItems.push(apt)

                        // Mark as processed
                        await supabase
                            .from('appointments')
                            .update({ automation_processed: new Date().toISOString() })
                            .eq('id', apt.id)
                    }
                }
            }
            break

        case 'APPOINTMENT_CONFIRMED':
            const { data: confirmedApts } = await supabase
                .from('appointments')
                .select('*, patients(*)')
                .eq('clinic_id', rule.clinic_id)
                .eq('status', 'CONFIRMED')
                .gte('updated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
                .is('automation_confirmed_processed', null)

            if (confirmedApts) {
                for (const apt of confirmedApts) {
                    if (matchesFilters(apt, rule.trigger_filters)) {
                        await executeActions(supabase, rule, { appointment: apt, patient: apt.patients })
                        triggeredItems.push(apt)

                        await supabase
                            .from('appointments')
                            .update({ automation_confirmed_processed: new Date().toISOString() })
                            .eq('id', apt.id)
                    }
                }
            }
            break

        case 'APPOINTMENT_CANCELLED':
            const { data: cancelledApts } = await supabase
                .from('appointments')
                .select('*, patients(*)')
                .eq('clinic_id', rule.clinic_id)
                .eq('status', 'CANCELLED')
                .gte('cancelled_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
                .is('automation_cancelled_processed', null)

            if (cancelledApts) {
                for (const apt of cancelledApts) {
                    if (matchesFilters(apt, rule.trigger_filters)) {
                        await executeActions(supabase, rule, { appointment: apt, patient: apt.patients })
                        triggeredItems.push(apt)

                        await supabase
                            .from('appointments')
                            .update({ automation_cancelled_processed: new Date().toISOString() })
                            .eq('id', apt.id)
                    }
                }
            }
            break

        case 'CONSULTATION_COMPLETED':
            const { data: completedConsults } = await supabase
                .from('consultations')
                .select('*, appointments(*, patients(*))')
                .eq('clinic_id', rule.clinic_id)
                .not('ended_at', 'is', null)
                .gte('ended_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
                .is('automation_processed', null)

            if (completedConsults) {
                for (const consult of completedConsults) {
                    if (matchesFilters(consult, rule.trigger_filters)) {
                        await executeActions(supabase, rule, {
                            consultation: consult,
                            appointment: consult.appointments,
                            patient: consult.appointments?.patients
                        })
                        triggeredItems.push(consult)

                        await supabase
                            .from('consultations')
                            .update({ automation_processed: new Date().toISOString() })
                            .eq('id', consult.id)
                    }
                }
            }
            break

        case 'PATIENT_BIRTHDAY':
            // Check patients with birthday today
            const today = new Date()
            const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

            const { data: birthdayPatients } = await supabase
                .from('patients')
                .select('*')
                .eq('clinic_id', rule.clinic_id)
                .like('date_of_birth', `%-${monthDay}`)
                .is('birthday_automation_year', null)

            if (birthdayPatients) {
                for (const patient of birthdayPatients) {
                    if (matchesFilters(patient, rule.trigger_filters)) {
                        await executeActions(supabase, rule, { patient })
                        triggeredItems.push(patient)

                        await supabase
                            .from('patients')
                            .update({ birthday_automation_year: today.getFullYear() })
                            .eq('id', patient.id)
                    }
                }
            }
            break

        case 'NO_VISIT_DAYS':
            // Patients who haven't visited in X days
            const daysFilter = rule.trigger_filters?.days || 90
            const cutoffDate = new Date(Date.now() - daysFilter * 24 * 60 * 60 * 1000).toISOString()

            const { data: inactivePatients } = await supabase
                .from('patients')
                .select('*, appointments(scheduled_at)')
                .eq('clinic_id', rule.clinic_id)
                .order('appointments(scheduled_at)', { ascending: false })
                .limit(1)

            // This is simplified - in production would need more complex query
            break
    }

    return triggeredItems
}

function matchesFilters(item: any, filters: Record<string, any>): boolean {
    if (!filters || Object.keys(filters).length === 0) {
        return true
    }

    for (const [key, value] of Object.entries(filters)) {
        if (item[key] !== value) {
            return false
        }
    }

    return true
}

async function executeActions(supabase: any, rule: AutomationRule, context: TriggerContext) {
    for (const action of rule.actions) {
        try {
            switch (action.type) {
                case 'SEND_EMAIL':
                    await executeEmailAction(supabase, rule.clinic_id, action.config, context)
                    break

                case 'SEND_WHATSAPP':
                    await executeWhatsAppAction(rule.clinic_id, action.config, context)
                    break

                case 'CREATE_TASK':
                    await executeCreateTaskAction(supabase, rule.clinic_id, action.config, context)
                    break

                case 'UPDATE_TAG':
                    await executeUpdateTagAction(supabase, action.config, context)
                    break

                case 'CREATE_FOLLOWUP':
                    await executeCreateFollowupAction(supabase, rule.clinic_id, action.config, context)
                    break

                default:
                    console.warn(`[CRM Automation] Unknown action type: ${action.type}`)
            }
        } catch (actionError) {
            console.error(`[CRM Automation] Error executing action ${action.type}:`, actionError)
        }
    }

    // Log execution
    await supabase.from('automation_logs').insert({
        rule_id: rule.id,
        clinic_id: rule.clinic_id,
        trigger: rule.trigger,
        context: JSON.stringify(context),
        actions_executed: rule.actions.map(a => a.type),
        executed_at: new Date().toISOString()
    })
}

async function executeEmailAction(supabase: any, clinicId: string, config: any, context: TriggerContext) {
    const patient = context.patient
    if (!patient?.email) return

    // Get clinic SMTP config
    const { data: clinic } = await supabase
        .from('clinics')
        .select('name, smtp_enabled, smtp_from_email')
        .eq('id', clinicId)
        .single()

    // Create notification record (will be sent by send-notifications cron)
    await supabase.from('notifications').insert({
        clinic_id: clinicId,
        type: 'EMAIL',
        status: 'PENDING',
        recipient_email: patient.email,
        subject: replaceVariables(config.subject || 'Mensagem da clínica', context),
        body: replaceVariables(config.body || '', context),
        scheduled_for: new Date().toISOString()
    })
}

async function executeWhatsAppAction(clinicId: string, config: any, context: TriggerContext) {
    const patient = context.patient
    if (!patient?.phone) return

    // WhatsApp is manual - just log the intent
    console.log(`[CRM Automation] WhatsApp action for ${patient.phone}: ${config.message}`)
}

async function executeCreateTaskAction(supabase: any, clinicId: string, config: any, context: TriggerContext) {
    await supabase.from('crm_tasks').insert({
        clinic_id: clinicId,
        patient_id: context.patient?.id,
        title: replaceVariables(config.title || 'Tarefa automática', context),
        description: replaceVariables(config.description || '', context),
        due_date: config.due_days
            ? new Date(Date.now() + config.due_days * 24 * 60 * 60 * 1000).toISOString()
            : null,
        status: 'PENDING',
        priority: config.priority || 'MEDIUM'
    })
}

async function executeUpdateTagAction(supabase: any, config: any, context: TriggerContext) {
    if (!context.patient?.id || !config.tag) return

    const currentTags = context.patient.tags || []
    if (!currentTags.includes(config.tag)) {
        await supabase
            .from('patients')
            .update({ tags: [...currentTags, config.tag] })
            .eq('id', context.patient.id)
    }
}

async function executeCreateFollowupAction(supabase: any, clinicId: string, config: any, context: TriggerContext) {
    if (!context.patient?.id) return

    const followupDate = new Date()
    followupDate.setDate(followupDate.getDate() + (config.days || 30))

    await supabase.from('crm_followups').insert({
        clinic_id: clinicId,
        patient_id: context.patient.id,
        type: config.type || 'CALL',
        scheduled_date: followupDate.toISOString(),
        notes: replaceVariables(config.notes || '', context),
        status: 'PENDING'
    })
}

function replaceVariables(text: string, context: TriggerContext): string {
    const variables: Record<string, string> = {
        '{{paciente_nome}}': context.patient?.full_name || context.patient?.nome || '',
        '{{paciente_email}}': context.patient?.email || '',
        '{{paciente_telefone}}': context.patient?.phone || '',
        '{{data_agendamento}}': context.appointment?.scheduled_at
            ? new Date(context.appointment.scheduled_at).toLocaleDateString('pt-BR')
            : '',
        '{{hora_agendamento}}': context.appointment?.scheduled_at
            ? new Date(context.appointment.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : '',
    }

    let result = text
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(key, 'g'), value)
    }
    return result
}
