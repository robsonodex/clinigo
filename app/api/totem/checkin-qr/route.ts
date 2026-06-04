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

async function processQueueAndTicket(supabase: any, appointment: any, clinicId: string) {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const now = new Date().toISOString()

    // 1. Verificar se já existe na fila
    const { data: existingQueue } = await supabase
        .from('appointment_queue')
        .select('id')
        .eq('appointment_id', appointment.id)
        .maybeSingle()

    let queuePosition = 1
    if (!existingQueue) {
        // Obter contagem da fila
        const { count } = await supabase
            .from('appointment_queue')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .eq('status', 'waiting')

        queuePosition = (count || 0) + 1

        const isPriority = (appointment.priority_level || 0) > 0
        const priorityScore = isPriority ? 30 : 100
        const priorityReason = isPriority ? 'preferencial' : 'normal'

        await supabase
            .from('appointment_queue')
            .insert({
                appointment_id: appointment.id,
                clinic_id: clinicId,
                patient_id: appointment.patient_id || appointment.patients?.id,
                doctor_id: appointment.doctor_id || appointment.doctors?.id,
                status: 'waiting',
                priority_score: priorityScore,
                priority_reason: priorityReason,
                queue_position: queuePosition,
                entered_queue_at: now,
            } as any)
    }

    // 2. Gerar número do ticket
    let finalTicketNumber = appointment.ticket_number
    if (!finalTicketNumber) {
        const isPriority = (appointment.priority_level || 0) > 0
        const prefix = isPriority ? 'P' : 'N'

        // Busca os tickets gerados hoje
        const { data: todayAppts } = await supabase
            .from('appointments')
            .select('ticket_number')
            .eq('clinic_id', clinicId)
            .eq('appointment_date', todayStr)
            .not('ticket_number', 'is', null)

        let nextNum = 1
        if (todayAppts && todayAppts.length > 0) {
            const numbers = todayAppts
                .map((a: any) => {
                    const ticket = a.ticket_number || ''
                    if (ticket.startsWith(`${prefix}-`)) {
                        const numPart = ticket.split('-')[1]
                        return parseInt(numPart, 10) || 0
                    }
                    return 0
                })
                .filter((num: number) => num > 0)

            if (numbers.length > 0) {
                nextNum = Math.max(...numbers) + 1
            }
        }

        finalTicketNumber = `${prefix}-${String(nextNum).padStart(3, '0')}`
    }

    // 3. Atualizar appointments
    await supabase
        .from('appointments')
        .update({
            status: 'CHECKED_IN',
            ticket_number: finalTicketNumber,
            checked_in_at: now,
            updated_at: now
        })
        .eq('id', appointment.id)

    return finalTicketNumber
}

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

        const allowedPlans = ['PRO', 'PROFESSIONAL', 'ENTERPRISE', 'NETWORK']
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
                    patient_id,
                    doctor_id,
                    ticket_number,
                    priority_level,
                    patients:patient_id (id, full_name),
                    doctors:doctor_id (id, users (full_name))
                )
            `)
            .or(`qr_token.eq.${qr_token},appointment_id.eq.${appointmentId}`)
            .eq('clinic_id', clinic_id)
            .maybeSingle()

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

            // Perform check-in using helper
            const ticketNumber = await processQueueAndTicket(supabase, appointment, clinic_id)

            const now = new Date().toISOString()
            await (supabase as any)
                .from('appointment_qr_codes')
                .update({ checked_in: true, checked_in_at: now })
                .eq('id', qrData.id)

            return successResponse({
                success: true,
                patient_name: appointment.patients?.full_name || 'Paciente',
                doctor_name: appointment.doctors?.users?.full_name || 'Médico',
                appointment_time: appointment.appointment_time,
                ticket_number: ticketNumber,
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
                patient_id,
                doctor_id,
                ticket_number,
                priority_level,
                patients:patient_id (id, full_name),
                doctors:doctor_id (id, users (full_name))
            `)
            .eq('id', appointmentId)
            .eq('clinic_id', clinic_id)
            .maybeSingle()

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

        // Perform check-in using helper
        const ticketNumber = await processQueueAndTicket(supabase, directAppt, clinic_id)

        return successResponse({
            success: true,
            patient_name: directAppt.patients?.full_name || 'Paciente',
            doctor_name: directAppt.doctors?.users?.full_name || 'Médico',
            appointment_time: directAppt.appointment_time,
            ticket_number: ticketNumber,
        })
    } catch (error) {
        return handleApiError(error)
    }
}
