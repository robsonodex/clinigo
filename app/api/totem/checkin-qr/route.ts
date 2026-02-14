/**
 * POST /api/totem/checkin-qr
 *
 * Public API for totem QR code check-in.
 * Receives qr_token, resolves appointment, performs check-in.
 * Uses service_role — no auth required.
 */
import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/rate-limit'
import { successResponse, errorResponse } from '@/lib/utils/responses'
import { handleApiError } from '@/lib/utils/errors'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        // Rate limit by IP
        const ip = request.headers.get('x-forwarded-for') || 'unknown'
        const rateLimitResponse = await withRateLimit('api', `totem-qr:${ip}`)
        if (rateLimitResponse) return rateLimitResponse

        const body = await request.json()
        const { qr_token, clinic_id } = body

        if (!qr_token || !clinic_id) {
            return errorResponse('QR token e clinic_id são obrigatórios', { status: 400 })
        }

        const supabase = createServiceRoleClient()

        // Plan guard — only PRO and ENTERPRISE
        const { data: clinic } = await (supabase as any)
            .from('clinics')
            .select('id, plan_type')
            .eq('id', clinic_id)
            .single()

        if (!clinic) {
            return errorResponse('Clínica não encontrada', { status: 404 })
        }

        const allowedPlans = ['PRO', 'ENTERPRISE']
        if (!allowedPlans.includes(clinic.plan_type || '')) {
            return errorResponse('Totem não disponível para este plano', { status: 403 })
        }

        // Try to find appointment via qr_token or appointment_id
        let appointmentId = qr_token
        if (qr_token.startsWith('CLINIGO:')) {
            appointmentId = qr_token.replace('CLINIGO:', '')
        }

        // First, try appointment_qr_codes table
        const { data: qrData } = await (supabase as any)
            .from('appointment_qr_codes')
            .select(`
                *,
                appointments:appointment_id (
                    id,
                    appointment_date,
                    appointment_time,
                    status,
                    checked_in_at,
                    patients:patient_id (id, full_name),
                    doctors:doctor_id (id, users (full_name))
                )
            `)
            .or(`qr_token.eq.${qr_token},appointment_id.eq.${appointmentId}`)
            .eq('clinic_id', clinic_id)
            .single()

        if (qrData?.appointments) {
            const appointment = qrData.appointments

            if (appointment.checked_in_at) {
                return errorResponse('Paciente já realizou check-in', { status: 400 })
            }

            // Check date (±1 day for timezone tolerance)
            const apptDate = new Date(appointment.appointment_date)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            apptDate.setHours(0, 0, 0, 0)
            const dayDiff = Math.abs((apptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

            if (dayDiff > 1) {
                return errorResponse(`Check-in disponível apenas no dia da consulta`, { status: 400 })
            }

            // Perform check-in
            const now = new Date().toISOString()

            await (supabase as any)
                .from('appointment_qr_codes')
                .update({ checked_in: true, checked_in_at: now })
                .eq('id', qrData.id)

            await (supabase as any)
                .from('appointments')
                .update({ status: 'CONFIRMED', checked_in_at: now })
                .eq('id', appointment.id)

            return successResponse({
                success: true,
                patient_name: appointment.patients?.full_name || 'Paciente',
                doctor_name: appointment.doctors?.users?.full_name || 'Médico',
                appointment_time: appointment.appointment_time,
            })
        }

        // Fallback: direct appointment lookup
        const { data: directAppt } = await (supabase as any)
            .from('appointments')
            .select(`
                id,
                appointment_date,
                appointment_time,
                status,
                checked_in_at,
                patients:patient_id (id, full_name),
                doctors:doctor_id (id, users (full_name))
            `)
            .eq('id', appointmentId)
            .eq('clinic_id', clinic_id)
            .single()

        if (!directAppt) {
            return errorResponse('QR Code inválido ou não pertence a esta clínica', { status: 404 })
        }

        if (directAppt.checked_in_at) {
            return errorResponse('Paciente já realizou check-in', { status: 400 })
        }

        // Check date
        const apptDate = new Date(directAppt.appointment_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        apptDate.setHours(0, 0, 0, 0)
        const dayDiff = Math.abs((apptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (dayDiff > 1) {
            return errorResponse('Check-in disponível apenas no dia da consulta', { status: 400 })
        }

        // Perform check-in
        const now = new Date().toISOString()
        await (supabase as any)
            .from('appointments')
            .update({ status: 'CONFIRMED', checked_in_at: now })
            .eq('id', appointmentId)

        return successResponse({
            success: true,
            patient_name: directAppt.patients?.full_name || 'Paciente',
            doctor_name: directAppt.doctors?.users?.full_name || 'Médico',
            appointment_time: directAppt.appointment_time,
        })
    } catch (error) {
        return handleApiError(error)
    }
}
