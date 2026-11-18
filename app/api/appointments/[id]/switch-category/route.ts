import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { writeTissAudit } from '@/lib/tiss/audit'

export const dynamic = 'force-dynamic'

const switchCategorySchema = z.object({
    payment_type: z.enum(['PARTICULAR', 'CONVENIO']),
    health_insurance_plan_id: z.string().uuid().optional().nullable(),
    insurance_card_number: z.string().max(50).optional().nullable(),
    insurance_card_validity: z.string().optional().nullable(),
    reason: z.string().max(300).optional().nullable(),
})

const ALLOWED_SWITCH_ROLES = new Set(['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST'])

/**
 * POST /api/appointments/[id]/switch-category
 * Alterna rapidamente a categoria do atendimento no balcão (Particular <-> Convênio),
 * verificando validade da carteirinha e saldo de autorização quando Convênio.
 */
export const POST = withAxiom(async (request: AxiomRequest, context: { params: Promise<{ id: string }> }) => {
    try {
        const { id: appointmentId } = await context.params
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
        }

        const adminDb = createServiceRoleClient() as any
        const { data: currentUser } = await adminDb
            .from('users')
            .select('id, role, clinic_id')
            .eq('id', user.id)
            .single()

        if (!currentUser || !ALLOWED_SWITCH_ROLES.has(currentUser.role)) {
            return NextResponse.json(
                { success: false, error: 'Apenas recepção, financeiro ou administradores podem alterar a categoria no balcão' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const validated = switchCategorySchema.parse(body)

        const { data: appointment, error: apptErr } = await adminDb
            .from('appointments')
            .select(`
                id,
                clinic_id,
                patient_id,
                appointment_date,
                payment_type,
                health_insurance_plan_id,
                insurance_card_number,
                insurance_card_validity,
                patient:patients(
                    id,
                    full_name,
                    health_insurance_id,
                    insurance_card_number,
                    insurance_validity
                )
            `)
            .eq('id', appointmentId)
            .maybeSingle()

        if (apptErr || !appointment) {
            return NextResponse.json({ success: false, error: 'Agendamento não encontrado' }, { status: 404 })
        }

        if (currentUser.role !== 'SUPER_ADMIN' && appointment.clinic_id !== currentUser.clinic_id) {
            return NextResponse.json({ success: false, error: 'Acesso negado para esta clínica' }, { status: 403 })
        }

        const targetClinicId = appointment.clinic_id
        const now = new Date().toISOString()

        if (validated.payment_type === 'PARTICULAR') {
            const { data: updated, error: upErr } = await adminDb
                .from('appointments')
                .update({
                    payment_type: 'PARTICULAR',
                    updated_at: now,
                })
                .eq('id', appointmentId)
                .eq('clinic_id', targetClinicId)
                .select('id, payment_type, health_insurance_plan_id, insurance_card_number, insurance_card_validity')
                .single()

            if (upErr) {
                return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })
            }

            await writeTissAudit({
                clinicId: targetClinicId,
                userId: user.id,
                action: 'APPOINTMENT_CATEGORY_SWITCHED',
                entityType: 'appointment',
                entityId: appointmentId,
                previousState: { payment_type: appointment.payment_type },
                newState: { payment_type: 'PARTICULAR' },
                reason: validated.reason || 'Alternância rápida no balcão para Particular',
                customSupabase: adminDb,
            })

            return NextResponse.json({
                success: true,
                data: updated,
                message: 'Categoria alterada para Particular com sucesso.',
            })
        }

        // Alternando para CONVENIO
        const planId =
            validated.health_insurance_plan_id ||
            appointment.health_insurance_plan_id ||
            null
        const cardNumber =
            validated.insurance_card_number ||
            appointment.insurance_card_number ||
            appointment.patient?.insurance_card_number ||
            null
        const cardValidity =
            validated.insurance_card_validity ||
            appointment.insurance_card_validity ||
            appointment.patient?.insurance_validity ||
            null

        const { data: updated, error: upErr } = await adminDb
            .from('appointments')
            .update({
                payment_type: 'CONVENIO',
                health_insurance_plan_id: planId,
                insurance_card_number: cardNumber,
                insurance_card_validity: cardValidity,
                updated_at: now,
            })
            .eq('id', appointmentId)
            .eq('clinic_id', targetClinicId)
            .select('id, payment_type, health_insurance_plan_id, insurance_card_number, insurance_card_validity')
            .single()

        if (upErr) {
            return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })
        }

        // Atualiza dados de carteirinha do paciente se informados explicitamente no balcão
        if (appointment.patient_id && (validated.insurance_card_number || validated.insurance_card_validity)) {
            await adminDb
                .from('patients')
                .update({
                    ...(validated.insurance_card_number ? { insurance_card_number: validated.insurance_card_number } : {}),
                    ...(validated.insurance_card_validity ? { insurance_validity: validated.insurance_card_validity } : {}),
                    updated_at: now,
                })
                .eq('id', appointment.patient_id)
                .eq('clinic_id', targetClinicId)
        }

        // Verifica autorização ativa e alertas para exibir na recepção
        const { data: authList } = await adminDb
            .from('tiss_authorization_requests')
            .select('id, authorization_number, request_number, expires_at, sessions_authorized, sessions_used, status')
            .eq('clinic_id', targetClinicId)
            .eq('patient_id', appointment.patient_id)
            .order('created_at', { ascending: false })
            .limit(3)

        const latestAuth = (authList || [])[0] || null
        const warnings: string[] = []
        if (!planId) warnings.push('Plano de convênio não vinculado ao paciente')
        if (!cardNumber) warnings.push('Carteirinha sem numeração')
        if (cardValidity && cardValidity < appointment.appointment_date) {
            warnings.push('Carteirinha expirada')
        }
        if (latestAuth) {
            const saldo = Number(latestAuth.sessions_authorized || 1) - Number(latestAuth.sessions_used || 0)
            if (saldo <= 0) warnings.push('Autorização sem saldo de sessões')
            if (latestAuth.expires_at && String(latestAuth.expires_at).slice(0, 10) < appointment.appointment_date) {
                warnings.push('Senha de autorização vencida')
            }
        }

        await writeTissAudit({
            clinicId: targetClinicId,
            userId: user.id,
            action: 'APPOINTMENT_CATEGORY_SWITCHED',
            entityType: 'appointment',
            entityId: appointmentId,
            previousState: { payment_type: appointment.payment_type },
            newState: { payment_type: 'CONVENIO', health_insurance_plan_id: planId },
            reason: validated.reason || 'Alternância rápida no balcão para Convênio',
            customSupabase: adminDb,
        })

        return NextResponse.json({
            success: true,
            data: updated,
            warnings,
            authorization: latestAuth
                ? {
                      authorization_number: latestAuth.authorization_number || latestAuth.request_number,
                      expires_at: latestAuth.expires_at,
                      sessions_authorized: latestAuth.sessions_authorized || 1,
                      sessions_used: latestAuth.sessions_used || 0,
                      sessions_remaining: Math.max(0, (latestAuth.sessions_authorized || 1) - (latestAuth.sessions_used || 0)),
                  }
                : null,
            message: 'Categoria alterada para Convênio com sucesso.',
        })
    } catch (error: any) {
        if (error?.name === 'ZodError') {
            return NextResponse.json({ success: false, error: error.errors?.[0]?.message || 'Dados inválidos' }, { status: 400 })
        }
        request.log.error('appointments/switch-category', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ success: false, error: 'Erro interno ao alternar categoria' }, { status: 500 })
    }
})
