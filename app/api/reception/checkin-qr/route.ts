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

        console.log('[CHECKIN-QR] Looking for QR token:', qr_token)
        console.log('[CHECKIN-QR] User clinic_id:', userProfile.clinic_id)

        // Find QR code record
        // 🔥 FIX: Search by qr_token OR appointment_id
        // The scanner extracts appointment ID from URL, so we support both
        const { data: qrData, error: qrError } = await (supabase
            .from('appointment_qr_codes') as any)
            .select(`
                *,
                appointments:appointment_id (
                    id,
                    appointment_date,
                    appointment_time,
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
            .or(`qr_token.eq.${qr_token},appointment_id.eq.${qr_token}`)
            .eq('clinic_id', userProfile.clinic_id)
            .single()

        console.log('[CHECKIN-QR] QR query error:', qrError)
        console.log('[CHECKIN-QR] QR data found:', qrData ? 'YES' : 'NO')
        if (qrData) {
            console.log('[CHECKIN-QR] QR clinic_id:', qrData.clinic_id)
            console.log('[CHECKIN-QR] Appointment ID:', qrData.appointment_id)
        }

        if (qrError || !qrData) {
            // NEW: Fallback for pre-checkin QR format CLINIGO:{appointment_id}
            // Pre-checkin generates QR with just the appointment_id, not stored in appointment_qr_codes
            let appointmentId = qr_token
            if (qr_token.startsWith('CLINIGO:')) {
                appointmentId = qr_token.replace('CLINIGO:', '')
            }

            console.log('[CHECKIN-QR] Trying direct appointment lookup:', appointmentId)

            // Try to find appointment directly
            const { data: directAppointment, error: directError } = await supabase
                .from('appointments')
                .select(`
                    id,
                    appointment_date,
                    appointment_time,
                    status,
                    clinic_id,
                    checked_in_at,
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
                `)
                .eq('id', appointmentId)
                .eq('clinic_id', userProfile.clinic_id)
                .single()

            if (directError || !directAppointment) {
                console.log('[CHECKIN-QR] Direct lookup failed:', directError)
                return NextResponse.json({
                    success: false,
                    error: 'QR Code inválido ou não pertence a esta clínica'
                }, { status: 404 })
            }

            // Check if already checked in
            if ((directAppointment as any).checked_in_at) {
                return NextResponse.json({
                    success: false,
                    error: 'Paciente já realizou check-in',
                    checked_in_at: (directAppointment as any).checked_in_at,
                    appointment: directAppointment
                }, { status: 400 })
            }

            // Check if appointment is for today (±1 day)
            const appointmentDate = new Date((directAppointment as any).appointment_date)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            appointmentDate.setHours(0, 0, 0, 0)
            const dayDiff = Math.abs((appointmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

            if (dayDiff > 1) {
                const formattedDate = appointmentDate.toLocaleDateString('pt-BR')
                return NextResponse.json({
                    success: false,
                    error: `Check-in disponível apenas no dia da consulta. Data: ${formattedDate}`,
                    appointment: directAppointment
                }, { status: 400 })
            }

            // Perform check-in directly
            const now = new Date().toISOString()
            await supabase
                .from('appointments')
                .update({
                    status: 'WAITING_ROOM',
                    checked_in_at: now
                } as any)
                .eq('id', appointmentId)

            const patient = (directAppointment as any).patients
            const doctor = (directAppointment as any).doctors

            return NextResponse.json({
                success: true,
                message: 'Check-in realizado com sucesso!',
                data: {
                    patient_name: patient?.full_name || 'Paciente',
                    patient_phone: patient?.phone,
                    doctor_name: doctor?.users?.full_name || 'Médico',
                    appointment_date: (directAppointment as any).appointment_date,
                    appointment_time: (directAppointment as any).appointment_time,
                    checked_in_at: now
                }
            })
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

        // Check if expired (48h total: 24h base + 24h grace period)
        const expirationDate = new Date(qrData.expires_at)
        const currentTime = new Date()
        const hoursSinceExpiration = (currentTime.getTime() - expirationDate.getTime()) / (1000 * 60 * 60)

        if (hoursSinceExpiration > 24) { // Allow 24h after expires_at (48h total)
            return NextResponse.json({
                success: false,
                error: 'QR Code expirado. Por favor, solicite um novo QR code.'
            }, { status: 400 })
        }

        // Check if appointment is within ±1 day (to handle timezone issues)
        // 🔥 FIX: Allow D-1, D, D+1 to handle UTC vs local time differences
        const appointmentDate = new Date(qrData.appointments.appointment_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        appointmentDate.setHours(0, 0, 0, 0)

        const dayDiff = Math.abs((appointmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (dayDiff > 1) {
            const formattedDate = appointmentDate.toLocaleDateString('pt-BR')
            return NextResponse.json({
                success: false,
                error: `Este QR code não é válido para check-in hoje. Data do agendamento: ${formattedDate}`,
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
