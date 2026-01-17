/**
 * API de Check-in via QR Code
 * POST /api/reception/checkin-qr
 * 
 * Recebe o token do QR e faz check-in do paciente
 */
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        // Get user clinic
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        const userProfile = userData as { clinic_id: string; role: string } | null
        if (!userProfile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const body = await request.json()
        const { qr_token } = body

        if (!qr_token) {
            return NextResponse.json({ error: 'Token QR obrigatório' }, { status: 400 })
        }

        // Find QR code record
        const { data: qrData, error: qrError } = await (supabase
            .from('appointment_qr_codes') as any)
            .select(`
                *,
                appointments:appointment_id (
                    id,
                    scheduled_at,
                    status,
                    patients:patient_id (
                        id,
                        full_name,
                        phone,
                        email
                    ),
                    doctors:doctor_id (
                        id,
                        users (
                            full_name
                        )
                    )
                )
            `)
            .eq('qr_token', qr_token)
            .eq('clinic_id', userProfile.clinic_id)
            .single()

        if (qrError || !qrData) {
            return NextResponse.json({
                success: false,
                error: 'QR Code inválido ou não pertence a esta clínica'
            }, { status: 404 })
        }

        // Check if already checked in
        if (qrData.checked_in) {
            return NextResponse.json({
                success: false,
                error: 'Paciente já realizou check-in',
                checked_in_at: qrData.checked_in_at,
                appointment: qrData.appointments
            }, { status: 400 })
        }

        // Check if expired
        if (new Date(qrData.expires_at) < new Date()) {
            return NextResponse.json({
                success: false,
                error: 'QR Code expirado'
            }, { status: 400 })
        }

        // Check if appointment is for today
        const appointmentDate = new Date(qrData.appointments.scheduled_at)
        const today = new Date()
        const isToday = appointmentDate.toDateString() === today.toDateString()

        if (!isToday) {
            const formattedDate = appointmentDate.toLocaleDateString('pt-BR')
            return NextResponse.json({
                success: false,
                error: `Agendamento não é para hoje. Data: ${formattedDate}`,
                appointment: qrData.appointments
            }, { status: 400 })
        }

        // Perform check-in
        const now = new Date().toISOString()

        // Update QR code record
        await (supabase
            .from('appointment_qr_codes') as any)
            .update({
                checked_in: true,
                checked_in_at: now
            })
            .eq('id', qrData.id)

        // Update appointment status to CONFIRMED/CHECKED_IN
        await (supabase
            .from('appointments') as any)
            .update({
                status: 'CONFIRMED',
                checked_in_at: now
            })
            .eq('id', qrData.appointment_id)

        // Get patient and appointment info for response
        const appointment = qrData.appointments
        const patient = appointment.patients
        const doctor = appointment.doctors

        return NextResponse.json({
            success: true,
            message: 'Check-in realizado com sucesso!',
            data: {
                patient_name: patient?.full_name || 'Paciente',
                patient_phone: patient?.phone,
                doctor_name: doctor?.users?.full_name || 'Médico',
                scheduled_at: appointment.scheduled_at,
                checked_in_at: now
            }
        })

    } catch (error) {
        console.error('Check-in QR error:', error)
        return NextResponse.json(
            { error: 'Erro ao processar check-in' },
            { status: 500 }
        )
    }
}
