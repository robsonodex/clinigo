import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendWhatsAppMessage, checkInstanceStatus } from '@/lib/whatsapp/service'
import { format } from 'date-fns'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: appointmentId } = await params
        
        // Pega do header
        const clinicId = request.headers.get('x-clinic-id')
        if (!clinicId) {
            return NextResponse.json(
                { error: 'Clinic ID é obrigatório' },
                { status: 400 }
            )
        }

        const supabase = createServiceRoleClient()

        // Busca os detalhes do agendamento
        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select(`
                *,
                patient:patients!appointments_patient_id_fkey(*),
                doctor:doctors!appointments_doctor_id_fkey(
                    *,
                    user:users(*)
                )
            `)
            .eq('id', appointmentId)
            .eq('clinic_id', clinicId)
            .single()

        if (fetchError || !appointment) {
            console.error('[RESEND ERROR]', fetchError)
            return NextResponse.json({ error: 'Agendamento não encontrado', details: fetchError }, { status: 404 })
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

        let sectorToSend = 'default'
        const doctorUserId = appointment.doctor?.user_id || appointment.doctor?.user?.id
        if (doctorUserId) {
            try {
                const status = await checkInstanceStatus(clinicId, doctorUserId)
                if (status.connected) {
                    sectorToSend = doctorUserId
                }
            } catch (err) {
                console.error(`[WhatsApp Routing Resend] Erro para terapeuta ${doctorUserId}:`, err)
            }
        }

        try {
            await sendWhatsAppMessage(clinicId, patient.phone, message, 'appointment_resend', sectorToSend)
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
