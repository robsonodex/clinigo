import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendCancellationEmail } from '@/lib/services/email'

// Force Node.js runtime for nodemailer support
export const runtime = 'nodejs'

// Cancela agendamentos não pagos após 30min
export async function GET(request: Request) {
    // Validate request comes from Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const cutoffTime = new Date(Date.now() - 30 * 60 * 1000)

    const { data: unpaidAppointments } = await supabase
        .from('appointments')
        .select('*, payment:payments(*), patient:patients(*), doctor:doctors(*)') // Joined patient/doctor for email
        .eq('status', 'PENDING_PAYMENT')
        .lt('created_at', cutoffTime.toISOString())

    let cancelledCount = 0

    for (const appointment of unpaidAppointments || []) {
        const { error } = await supabase
            .from('appointments')
            .update({
                status: 'CANCELLED',
                cancellation_reason: 'Pagamento não realizado no prazo'
            })
            .eq('id', appointment.id)

        if (!error) {
            cancelledCount++
            // Notificar paciente
            await sendCancellationEmail(appointment)
        }
    }

    return NextResponse.json({ cancelled: cancelledCount })
}
