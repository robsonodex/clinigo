/**
 * Cron Job: Send Appointment Reminders via WhatsApp
 * Sends automated WhatsApp reminders 24h and 1h before appointments
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WhatsAppBusinessService } from '@/lib/services/whatsapp-business'
import { sendReminderEmail } from '@/lib/services/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds timeout
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    try {
        // Security: Validate secret key
        const authHeader = request.headers.get('authorization')
        const expectedAuth = `Bearer ${process.env.CRON_SECRET_KEY || process.env.CRON_SECRET}`

        if (authHeader !== expectedAuth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createClient()
        const whatsapp = WhatsAppBusinessService.getInstance()
        const now = new Date()

        // Initialize WhatsApp if not ready
        if (!whatsapp.ready) {
            console.log('⚠️ WhatsApp not ready, initializing...')
            try {
                await whatsapp.initialize()
            } catch (error) {
                console.error('Failed to initialize WhatsApp:', error)
                // Continue with email fallback
            }
        }

        // 1. Reminders 24h before
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0]

        const { data: appointments24h, error: error24h } = await supabase
            .from('appointments')
            .select(`
        *,
        patient:patients(*),
        doctor:doctors(*, user:users(*)),
        clinic:clinics(*)
      `)
            .in('status', ['SCHEDULED', 'CONFIRMED'])
            .eq('lembrete_24h_enviado', false)
            .eq('appointment_date', tomorrowStr)

        if (error24h) {
            console.error('Error fetching 24h appointments:', error24h)
        }

        let sent24h = 0
        let failed24h = 0

        for (const apt of appointments24h || []) {
            try {
                // Try WhatsApp first
                if (whatsapp.ready && apt.patient?.phone) {
                    await whatsapp.sendLembrete24h(apt as any)
                    sent24h++
                } else {
                    // Fallback to email
                    await sendReminderEmail(apt, 24)
                    sent24h++
                }
            } catch (error) {
                console.error(`Error sending 24h reminder for ${apt.id}:`, error)
                failed24h++

                // Try email fallback if WhatsApp fails
                try {
                    await sendReminderEmail(apt, 24)
                    sent24h++
                } catch (emailError) {
                    console.error(`Email fallback also failed for ${apt.id}:`, emailError)
                }
            }
        }

        // 2. Reminders 1h before
        const todayStr = now.toISOString().split('T')[0]

        const { data: appointmentsToday, error: errorToday } = await supabase
            .from('appointments')
            .select(`
        *,
        patient:patients(*),
        doctor:doctors(*, user:users(*)),
        clinic:clinics(*)
      `)
            .eq('status', 'CONFIRMED')
            .eq('lembrete_1h_enviado', false)
            .eq('appointment_date', todayStr)

        if (errorToday) {
            console.error('Error fetching today appointments:', errorToday)
        }

        let sent1h = 0
        let failed1h = 0

        // Filter appointments within 30-90 minutes window
        const appointmentsInWindow = (appointmentsToday || []).filter((apt) => {
            try {
                const [hours, minutes] = apt.appointment_time.split(':').map(Number)
                const aptDateTime = new Date(apt.appointment_date)
                aptDateTime.setHours(hours, minutes, 0, 0)

                const diffInMinutes = (aptDateTime.getTime() - now.getTime()) / (1000 * 60)
                return diffInMinutes >= 30 && diffInMinutes <= 90
            } catch {
                return false
            }
        })

        for (const apt of appointmentsInWindow) {
            try {
                // Try WhatsApp first
                if (whatsapp.ready && apt.patient?.phone) {
                    await whatsapp.sendLembrete1h(apt as any)
                    sent1h++
                } else {
                    // Fallback to email
                    await sendReminderEmail(apt, 1)
                    sent1h++
                }
            } catch (error) {
                console.error(`Error sending 1h reminder for ${apt.id}:`, error)
                failed1h++

                // Try email fallback
                try {
                    await sendReminderEmail(apt, 1)
                    sent1h++
                } catch (emailError) {
                    console.error(`Email fallback also failed for ${apt.id}:`, emailError)
                }
            }
        }

        return NextResponse.json({
            success: true,
            whatsapp_ready: whatsapp.ready,
            sent_24h: sent24h,
            failed_24h: failed24h,
            sent_1h: sent1h,
            failed_1h: failed1h,
            timestamp: now.toISOString(),
        })
    } catch (error: any) {
        console.error('Cron error:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error?.message },
            { status: 500 }
        )
    }
}

