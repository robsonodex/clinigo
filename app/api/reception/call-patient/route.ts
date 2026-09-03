import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkInstanceStatus, sendWhatsAppMessage } from '@/lib/whatsapp/service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/reception/call-patient
 * Body: { appointmentId: string, consultingRoomId?: string }
 * Changes appointment status to WAITING so the TV panel shows the call animation.
 * Se habilitado na clínica e com WhatsApp conectado, dispara notificação ao paciente.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { appointmentId, consultingRoomId } = body

        if (!appointmentId) {
            return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify user belongs to a clinic
        const { data: currentUser } = await (supabase as any)
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!currentUser?.clinic_id) {
            return NextResponse.json({ error: 'Clinic not found' }, { status: 403 })
        }

        // Auto-resolve consulting room from doctor if not explicitly provided
        let finalRoomId = consultingRoomId || null

        if (!finalRoomId) {
            const { data: currentAppt } = await (supabase as any)
                .from('appointments')
                .select('doctor_id, consulting_room_id')
                .eq('id', appointmentId)
                .single()

            if (currentAppt?.consulting_room_id) {
                finalRoomId = currentAppt.consulting_room_id
            } else if (currentAppt?.doctor_id) {
                const { data: doctorRoom } = await (supabase as any)
                    .from('consulting_rooms')
                    .select('id')
                    .eq('clinic_id', currentUser.clinic_id)
                    .eq('doctor_id', currentAppt.doctor_id)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                if (doctorRoom?.id) {
                    finalRoomId = doctorRoom.id
                }
            }
        }

        // Update appointment status to WAITING (TV panel listens for this)
        const { data: appointment, error } = await (supabase as any)
            .from('appointments')
            .update({
                status: 'WAITING',
                called_at: new Date().toISOString(),
                called_by: user.id,
                ...(finalRoomId && { consulting_room_id: finalRoomId }),
            })
            .eq('id', appointmentId)
            .eq('clinic_id', currentUser.clinic_id)
            .select(`
                id,
                status,
                consulting_room_id,
                patient:patients(id, full_name, phone),
                doctor:doctors(specialty, user:users(full_name))
            `)
            .single()

        if (error) {
            console.error('[Call Patient] Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // -------------------------------------------------------------
        // PRIORIDADE 1: Notificação Multicanal via WhatsApp
        // -------------------------------------------------------------
        try {
            // 1. Obter configuração da clínica
            const { data: clinic } = await (supabase as any)
                .from('clinics')
                .select('name, chamada_whatsapp_habilitada, notification_settings')
                .eq('id', currentUser.clinic_id)
                .single()

            const isWhatsappCallEnabled = Boolean(
                clinic?.chamada_whatsapp_habilitada || 
                clinic?.notification_settings?.whatsapp_call_notification
            )

            // 2. Se habilitado e paciente tem telefone cadastrado
            const patientPhone = appointment?.patient?.phone
            if (isWhatsappCallEnabled && patientPhone && patientPhone.trim().length >= 8) {
                // Verificar se WhatsApp está conectado
                const liveStatus = await checkInstanceStatus(currentUser.clinic_id, 'default')
                if (liveStatus?.connected) {
                    // Resolver nome legível da sala
                    let roomName = 'Consultório'
                    if (finalRoomId) {
                        const { data: roomData } = await (supabase as any)
                            .from('consulting_rooms')
                            .select('name, display_name, room_number')
                            .eq('id', finalRoomId)
                            .maybeSingle()

                        if (roomData) {
                            roomName = roomData.display_name || roomData.name || `Sala ${roomData.room_number}`
                        }
                    }

                    const patientName = appointment?.patient?.full_name?.trim() || 'Paciente'
                    const docName = appointment?.doctor?.user?.full_name ? `Dr(a). ${appointment.doctor.user.full_name}` : 'seu profissional'
                    const specialtyText = appointment?.doctor?.specialty ? ` (${appointment.doctor.specialty})` : ''
                    const clinicName = clinic?.name || 'CliniGO'

                    const message = `🔔 *Chamada de Atendimento*\n\nOlá, *${patientName}*!\n\nO(A) profissional *${docName}*${specialtyText} está lhe chamando para atendimento na *${roomName}*.\n\nPor favor, dirija-se ao local de atendimento.\n\n_${clinicName}_`

                    // Disparar sem travar fluxo principal
                    await sendWhatsAppMessage(
                        currentUser.clinic_id,
                        patientPhone,
                        message,
                        'call-patient',
                        'default'
                    )
                }
            }
        } catch (whatsappErr) {
            // Em caso de queda do WhatsApp ou qualquer erro, seguir silenciosamente
            console.warn('[Call Patient] WhatsApp notification failed silently:', whatsappErr)
        }

        return NextResponse.json({
            success: true,
            appointment,
            message: `Paciente ${appointment?.patient?.full_name || ''} chamado com sucesso`,
        })
    } catch (error) {
        console.error('[Call Patient] Internal error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
