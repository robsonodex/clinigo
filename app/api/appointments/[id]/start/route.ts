// app/api/appointments/[id]/start/route.ts
// Início de Atendimento com Verificação Biométrica Facial da Terapeuta (Fluxo B)

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { decryptFaceDescriptor, calculateFaceDistance } from '@/lib/utils/face-encryption'

export const dynamic = 'force-dynamic'

/**
 * POST /api/appointments/:id/start
 * Body: { face_descriptor?: number[] }
 * Sessão autenticada da terapeuta responsável pelo atendimento
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: appointmentId } = await context.params
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
        }

        const adminDb = createServiceRoleClient()

        // 1. Obter usuário e dados da clínica
        const { data: currentUser, error: userError } = await (adminDb as any)
            .from('users')
            .select('id, clinic_id, role, full_name')
            .eq('id', user.id)
            .single()

        if (userError || !currentUser?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Usuário ou clínica não identificados' }, { status: 403 })
        }

        // 2. Buscar agendamento e verificar permissão
        const { data: appointment, error: aptError } = await (adminDb as any)
            .from('appointments')
            .select(`
                id, clinic_id, doctor_id, patient_id, status, session_status,
                doctor:doctors!appointments_doctor_id_fkey(id, user_id),
                patient:patients(id, full_name)
            `)
            .eq('id', appointmentId)
            .eq('clinic_id', currentUser.clinic_id)
            .single()

        if (aptError || !appointment) {
            return NextResponse.json({ success: false, error: 'Agendamento não encontrado' }, { status: 404 })
        }

        const isAdminOrCoord = currentUser.role === 'CLINIC_ADMIN' || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'COORDINATOR'
        const isAppointmentDoctor = appointment.doctor?.user_id === user.id

        if (!isAdminOrCoord && !isAppointmentDoctor) {
            return NextResponse.json({
                success: false,
                error: 'Apenas o terapeuta responsável pode iniciar este atendimento.'
            }, { status: 403 })
        }

        // 3. Checar configurações da clínica para o Fluxo B
        const { data: clinicData } = await (adminDb as any)
            .from('clinics')
            .select('id, checkin_settings')
            .eq('id', currentUser.clinic_id)
            .single()

        const checkinSettings = clinicData?.checkin_settings || {}
        const requireTherapistBiometric = Boolean(checkinSettings.require_therapist_biometric_on_start)

        let body: any = {}
        try {
            body = await request.json()
        } catch {
            body = {}
        }

        const rawDescriptor = body?.face_descriptor || body?.descriptor
        const now = new Date().toISOString()

        // 4. Se a clínica exige verificação da terapeuta:
        if (requireTherapistBiometric) {
            if (!rawDescriptor || !Array.isArray(rawDescriptor) || rawDescriptor.length !== 128) {
                return NextResponse.json({
                    success: false,
                    error: 'Validação facial da terapeuta obrigatória para iniciar o atendimento.'
                }, { status: 400 })
            }

            // Buscar cadastro biométrico da própria terapeuta
            const { data: therapistBio, error: bioError } = await (adminDb as any)
                .from('patient_face_biometrics')
                .select('id, face_descriptor_encrypted')
                .eq('therapist_user_id', user.id)
                .eq('person_type', 'therapist')
                .maybeSingle()

            if (bioError || !therapistBio || !therapistBio.face_descriptor_encrypted) {
                return NextResponse.json({
                    success: false,
                    error: 'Terapeuta não possui biometria facial cadastrada no sistema. Cadastre sua face para iniciar atendimentos.'
                }, { status: 403 })
            }

            const liveDescriptor = new Float32Array(rawDescriptor)
            let storedDescriptor: Float32Array | null = null

            try {
                storedDescriptor = decryptFaceDescriptor(therapistBio.face_descriptor_encrypted)
            } catch (decErr) {
                console.warn('[Start Appointment] Falha ao decriptar biometria da terapeuta:', decErr)
            }

            if (!storedDescriptor || storedDescriptor.length !== 128) {
                return NextResponse.json({
                    success: false,
                    error: 'Erro ao validar o cadastro biométrico da terapeuta no servidor.'
                }, { status: 500 })
            }

            const distance = calculateFaceDistance(liveDescriptor, storedDescriptor)
            const THRESHOLD = 0.58
            const matched = distance < THRESHOLD

            // Registrar evento de auditoria antifraude (imediato e imutável)
            await (adminDb as any)
                .from('therapist_start_biometric_events')
                .insert({
                    clinic_id: currentUser.clinic_id,
                    appointment_id: appointment.id,
                    therapist_user_id: user.id,
                    matched,
                    distance: Number(distance.toFixed(4)),
                    created_at: now,
                })

            if (!matched) {
                return NextResponse.json({
                    success: false,
                    error: 'Rosto posicionado não confere com o cadastro biométrico da terapeuta responsável.',
                    distance: Number(distance.toFixed(4)),
                }, { status: 403 })
            }

            // Se aprovado, registra timestamp e inicia o atendimento
            await (adminDb as any)
                .from('appointments')
                .update({
                    therapist_start_verified_at: now,
                    status: 'IN_PROGRESS',
                    session_status: 'Em Atendimento',
                })
                .eq('id', appointment.id)

            return NextResponse.json({
                success: true,
                verified: true,
                therapist_start_verified_at: now,
                message: 'Identidade da terapeuta verificada com sucesso. Atendimento iniciado.',
                prontuario_url: `/dashboard/prontuarios/${appointment.id}`,
            })
        }

        // 5. Se a flag estiver desligada: inicia normal (retrocompatível)
        await (adminDb as any)
            .from('appointments')
            .update({
                status: 'IN_PROGRESS',
                session_status: 'Em Atendimento',
            })
            .eq('id', appointment.id)

        return NextResponse.json({
            success: true,
            verified: false,
            message: 'Atendimento iniciado com sucesso.',
            prontuario_url: `/dashboard/prontuarios/${appointment.id}`,
        })

    } catch (error: any) {
        console.error('[Start Appointment] Erro interno:', error)
        return NextResponse.json({ success: false, error: 'Erro interno ao iniciar atendimento' }, { status: 500 })
    }
}
