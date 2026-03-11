import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

function getAdminClient() {
    return createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

/**
 * CRON JOB: Expire trial clinics whose trial_ends_at has passed
 * Schedule: Daily (e.g. 09:00 AM)
 * 
 * Finds clinics with approval_status='trial' and trial_ends_at < NOW(),
 * marks them as expired, and sends billing notifications.
 */
export async function GET(request: Request) {
    try {
        const supabase = getAdminClient()
        const now = new Date().toISOString()

        // Find clinics with expired trials
        const { data: expiredClinics, error: fetchError } = await supabase
            .from('clinics')
            .select('id, name, email, trial_ends_at')
            .eq('approval_status', 'trial')
            .lt('trial_ends_at', now)
            .eq('is_active', true)

        if (fetchError) {
            console.error('[CronExpireTrials] Fetch error:', fetchError)
            return NextResponse.json({ error: 'Failed to fetch expired trials' }, { status: 500 })
        }

        let expiredCount = 0

        if (expiredClinics && expiredClinics.length > 0) {
            for (const clinic of expiredClinics) {
                // Mark clinic as expired
                const { error: updateError } = await supabase
                    .from('clinics')
                    .update({
                        approval_status: 'expired',
                        is_active: false,
                    })
                    .eq('id', clinic.id)

                if (updateError) {
                    console.error(`[CronExpireTrials] Error expiring clinic ${clinic.id}:`, updateError)
                    continue
                }

                // Send notification
                await supabase.from('billing_notifications').insert({
                    clinic_id: clinic.id,
                    type: 'TRIAL_EXPIRED',
                    title: 'Período de teste encerrado',
                    message: `Seu teste grátis de 7 dias terminou. Escolha um plano para continuar usando o CliniGo.`,
                    priority: 'HIGH'
                })

                expiredCount++
                console.log(`[CronExpireTrials] Expired clinic: ${clinic.name} (${clinic.id})`)
            }
        }

        return NextResponse.json({
            success: true,
            processed: {
                found: expiredClinics?.length || 0,
                expired: expiredCount,
            }
        })

    } catch (error) {
        console.error('[CronExpireTrials] Unexpected error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
