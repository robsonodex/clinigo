import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp/service'
import { format } from 'date-fns'

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const appointmentId = params.id
        
        // Pega do header
        const clinicId = request.headers.get('x-clinic-id')
        if (!clinicId) {
            return NextResponse.json(
                { error: 'Clinic ID é obrigatório' },
                { status: 400 }
            )
        }

        const supabase = getSupabaseAdmin()

        // Busca os detalhes do agendamento
        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select(`
                *,
                patient:patients(*),
                doctor:doctors(
                    *,
                    user:users(*)
                )
            `)
            .eq('id', appointmentId)
            .eq('clinic_id', clinicId)
            .single()

        if (fetchError || !appointment) {
            return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
        }

        const patient = appointment.patient
        if (!patient || !patient.phone) {
            return NextResponse.json({ error: 'Paciente não tem um celular cadastrado' }, { status: 400 })
        }

        const doctorFullName = appointment.doctor.user.full_name
        
        // Formatar data
        const dateParts = appointment.appointment_date.split('-')
        const appointmentDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
        const appointmentTime = appointment.appointment_time.substring(0, 5)

        let message = `✅ *Reenvio: Agendamento Confirmado!*\n\n`
        message += `Olá *${patient.full_name}*!\n\n`
        message += `Lembrando que sua consulta está agendada:\n\n`
        message += `👨‍⚕️ *Médico(a):* Dr(a). ${doctorFullName}\n`
        message += `📅 *Data:* ${appointmentDate}\n`
        message += `🕐 *Horário:* ${appointmentTime}\n`
        
        if (appointment.video_link) {
            message += `\n🎥 *Link da Teleconsulta:* ${appointment.video_link}\n`
        }
        
        if (appointment.notes) {
            message += `\n📝 *Observações:* ${appointment.notes}\n`
        }

        message += `\nAguardamos você!`

        try {
            await sendWhatsAppMessage(clinicId, patient.phone, message, 'appointment_resend')
            return NextResponse.json({ success: true })
        } catch (waError: any) {
            console.error('[RESEND] WhatsApp falhou:', waError)
            return NextResponse.json({ error: waError.message || 'WhatsApp desconectado ou falhou.' }, { status: 500 })
        }

    } catch (error: any) {
        console.error('[RESEND] Error:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
