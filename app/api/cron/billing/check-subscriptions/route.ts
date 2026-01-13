
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Use admin client to bypass RLS for background jobs
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

function getAdminClient() {
    return createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

/**
 * CRON JOB: Check for upcoming subscriptions and send defaults
 * Schedule: Daily (e.g. 08:00 AM)
 */
export async function GET(request: Request) {
    try {
        // Optional: Verify Authorization header (e.g. Bearer CRON_SECRET)
        // const authHeader = request.headers.get('authorization')
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        // }

        const supabase = getAdminClient()
        const today = new Date()

        // --------------------------------------------------------
        // CHECK 1: 7 Days Before Expiration
        // --------------------------------------------------------
        const targetDate7 = new Date()
        targetDate7.setDate(today.getDate() + 7)
        const startOfTarget7 = new Date(targetDate7.setHours(0, 0, 0, 0)).toISOString()
        const endOfTarget7 = new Date(targetDate7.setHours(23, 59, 59, 999)).toISOString()

        const { data: clinics7 } = await supabase
            .from('clinics')
            .select('id, name, subscription_due_date, plan_type')
            .gte('subscription_due_date', startOfTarget7)
            .lte('subscription_due_date', endOfTarget7)
            .eq('is_active', true)

        let sent7 = 0
        if (clinics7) {
            for (const clinic of clinics7) {
                // Check duplicate
                const { data: existing } = await supabase
                    .from('billing_notifications')
                    .select('id')
                    .eq('clinic_id', clinic.id)
                    .eq('type', 'REMINDER_7D')
                    .gte('sent_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())

                if (!existing || existing.length === 0) {
                    await supabase.from('billing_notifications').insert({
                        clinic_id: clinic.id,
                        type: 'REMINDER_7D',
                        title: 'Sua assinatura vence em 7 dias',
                        message: `Olá! Sua assinatura do plano ${clinic.plan_type} vence dia ${new Date(clinic.subscription_due_date).toLocaleDateString()}. Renove agora para manter o acesso.`,
                        priority: 'NORMAL'
                    })
                    sent7++
                }
            }
        }

        // --------------------------------------------------------
        // CHECK 2: OVERDUE (Yesterday)
        // --------------------------------------------------------
        const yesterday = new Date()
        yesterday.setDate(today.getDate() - 1)
        const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString()
        const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString()

        const { data: clinicsOverdue } = await supabase
            .from('clinics')
            .select('id, name, subscription_due_date, plan_type')
            .gte('subscription_due_date', startOfYesterday)
            .lte('subscription_due_date', endOfYesterday)
            .eq('is_active', true) // They are still active until we suspend them

        let sentOverdue = 0
        if (clinicsOverdue) {
            for (const clinic of clinicsOverdue) {
                // Mark as OVERDUE in DB (optional logic, maybe handled elsewhere)

                // Send Notification
                const { data: existing } = await supabase
                    .from('billing_notifications')
                    .select('id')
                    .eq('clinic_id', clinic.id)
                    .eq('type', 'OVERDUE')
                    .gte('sent_at', startOfYesterday)

                if (!existing || existing.length === 0) {
                    await supabase.from('billing_notifications').insert({
                        clinic_id: clinic.id,
                        type: 'OVERDUE',
                        title: 'Assinatura Vencida',
                        message: `Sua assinatura do plano ${clinic.plan_type} venceu ontem. Realize o pagamento para evitar suspensão.`,
                        priority: 'HIGH'
                    })
                    sentOverdue++
                }
            }
        }

        return NextResponse.json({
            success: true,
            processed: {
                reminder_7d: clinics7?.length || 0,
                sent_7d: sent7,
                overdue_check: clinicsOverdue?.length || 0,
                sent_overdue: sentOverdue
            }
        })

    } catch (error) {
        console.error('Cron job error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
