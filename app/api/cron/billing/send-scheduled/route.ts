// @ts-nocheck
import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

function getAdminClient() {
    return createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

/**
 * CRON JOB: Send scheduled billings
 * Process scheduled billings that are pending and should be sent now.
 * Target route: GET /api/cron/billing/send-scheduled
 */
export async function GET(request: Request) {
    const startTime = Date.now()
    const results = {
        processed: 0,
        sent: 0,
        failed: 0,
        errors: [] as string[],
    }

    try {
        // Verificar token de segurança opcional
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET || process.env.CRON_SECRET_KEY
        
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = getAdminClient()
        const now = new Date().toISOString()

        // 1. Buscar cobranças agendadas pendentes cujo horário de disparo seja <= NOW
        const { data: pendingBillings, error: fetchError } = await supabase
            .from('scheduled_billings')
            .select('*')
            .eq('status', 'pending')
            .lte('scheduled_for', now)
            .order('scheduled_for', { ascending: true })
            .limit(50)

        if (fetchError) {
            console.error('[CronSendScheduled] Error fetching scheduled billings:', fetchError)
            return NextResponse.json({ error: 'Failed to fetch scheduled billings', details: fetchError.message }, { status: 500 })
        }

        if (!pendingBillings || pendingBillings.length === 0) {
            return NextResponse.json({
                message: 'No pending scheduled billings to process',
                ...results,
                duration_ms: Date.now() - startTime,
            })
        }

        // 2. Processar cada cobrança agendada
        for (const item of pendingBillings) {
            results.processed++

            try {
                // Obter usuários da clínica
                const { data: clinicUsers, error: usersError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('clinic_id', item.clinic_id)

                if (usersError) {
                    throw new Error(`Failed to fetch clinic users: ${usersError.message}`)
                }

                // Se não houver usuários, apenas marca como concluído para evitar travamento
                if (!clinicUsers || clinicUsers.length === 0) {
                    await supabase
                        .from('scheduled_billings')
                        .update({ 
                            status: 'sent', 
                            updated_at: new Date().toISOString() 
                        })
                        .eq('id', item.id)
                    continue
                }

                // Inserir notificações na tabela 'notifications' para cada usuário
                const notifications = clinicUsers.map((u: any) => ({
                    user_id: u.id,
                    clinic_id: item.clinic_id,
                    title: item.title,
                    message: item.message,
                    type: 'billing_reminder',
                    read: false,
                    metadata: {
                        sent_by: 'system_cron_scheduled',
                        clinic_name: item.clinic_name,
                        scheduled_billing_id: item.id
                    },
                }))

                const { error: insertError } = await supabase
                    .from('notifications')
                    .insert(notifications)

                if (insertError) {
                    throw new Error(`Failed to insert notifications: ${insertError.message}`)
                }

                // Logar a ação no log de sistema
                try {
                    await supabase.from('system_logs').insert({
                        admin_email: 'cron_scheduler@clinigo.app',
                        action_type: 'BILLING_NOTIFICATION',
                        action_category: 'BILLING',
                        action_description: `Disparou cobrança agendada para ${item.clinic_name} (ID Agendamento: ${item.id})`,
                        target_clinic: item.clinic_name,
                        ip_address: '127.0.0.1',
                        request_path: '/api/cron/billing/send-scheduled',
                    })
                } catch {
                    // Log table might fail
                }

                // Atualizar o status do agendamento para enviado
                await supabase
                    .from('scheduled_billings')
                    .update({ 
                        status: 'sent', 
                        updated_at: new Date().toISOString() 
                    })
                    .eq('id', item.id)

                results.sent++
            } catch (itemError) {
                const errMsg = itemError instanceof Error ? itemError.message : 'Unknown error'
                console.error(`[CronSendScheduled] Error processing billing ${item.id}:`, itemError)
                
                // Opcional: Atualizar status do agendamento para falha para não reprocessar repetidamente
                await supabase
                    .from('scheduled_billings')
                    .update({ 
                        status: 'pending', // pode manter pendente para tentar novamente ou mudar para failed
                        updated_at: new Date().toISOString() 
                    })
                    .eq('id', item.id)

                results.failed++
                results.errors.push(`${item.id}: ${errMsg}`)
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Scheduled billings processed successfully',
            ...results,
            duration_ms: Date.now() - startTime,
        })

    } catch (error) {
        console.error('[CronSendScheduled] Fatal error:', error)
        return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
    }
}
