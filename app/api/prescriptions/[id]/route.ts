/**
 * Prescription Detail API — GET, PUT, DELETE
 * 
 * GET  /api/prescriptions/[id] — Detalhe com itens
 * PUT  /api/prescriptions/[id] — Atualiza (somente DRAFT)
 * DELETE /api/prescriptions/[id] — Remove (somente DRAFT)
 */

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { guardFeature, createPlanError } from '@/lib/middlewares/plan-guard'
import { z } from 'zod'

const UpdatePrescriptionSchema = z.object({
    items: z.array(z.object({
        medication_name: z.string().min(1),
        dosage: z.string().min(1),
        frequency: z.string().min(1),
        duration: z.string().optional(),
        instructions: z.string().optional(),
        sort_order: z.number().optional(),
    })).min(1).optional(),
    notes: z.string().optional(),
    patient_id: z.string().uuid().optional(),
    appointment_id: z.string().uuid().optional(),
})

// ── GET: Detalhe da prescrição ──
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params

    try {
        const supabase = await createClient()
        const supabaseAdmin = createServiceRoleClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // Plan guard
        const validation = await guardFeature(profile.clinic_id, 'prescricao_digital')
        if (!validation.allowed) {
            return createPlanError(validation.planType, 'Prescrição Digital', 'PROFESSIONAL')
        }

        // Query prescription
        let query = supabaseAdmin
            .from('prescriptions')
            .select(`
                *,
                patient:patients(id, full_name, cpf, birth_date, email, phone),
                doctor:users!prescriptions_doctor_id_fkey(id, full_name),
                signer:users!prescriptions_signed_by_fkey(id, full_name)
            `)
            .eq('id', params.id)
            .eq('clinic_id', profile.clinic_id)

        // RBAC: DOCTOR apenas próprias
        if (profile.role === 'DOCTOR') {
            query = query.eq('doctor_id', user.id)
        }

        const { data: prescription, error } = await query.single()

        if (error || !prescription) {
            return NextResponse.json({ error: 'Prescrição não encontrada' }, { status: 404 })
        }

        // Get items
        const { data: items } = await supabaseAdmin
            .from('prescription_items')
            .select('*')
            .eq('prescription_id', params.id)
            .order('sort_order', { ascending: true })

        return NextResponse.json({
            success: true,
            data: { ...(prescription as any), items: items || [] },
        })
    } catch (error: any) {
        console.error('[Prescriptions] GET detail error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// ── PUT: Atualiza prescrição (somente DRAFT) ──
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params

    try {
        const supabase = await createClient()
        const supabaseAdmin = createServiceRoleClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // Plan guard
        const validation = await guardFeature(profile.clinic_id, 'prescricao_digital')
        if (!validation.allowed) {
            return createPlanError(validation.planType, 'Prescrição Digital', 'PROFESSIONAL')
        }

        // Verify prescription exists and is DRAFT
        let prescQuery = supabaseAdmin
            .from('prescriptions')
            .select('id, status, doctor_id')
            .eq('id', params.id)
            .eq('clinic_id', profile.clinic_id)

        if (profile.role === 'DOCTOR') {
            prescQuery = prescQuery.eq('doctor_id', user.id)
        }

        const { data: existing } = await prescQuery.single()

        if (!existing) {
            return NextResponse.json({ error: 'Prescrição não encontrada' }, { status: 404 })
        }

        if ((existing as any).status !== 'DRAFT') {
            return NextResponse.json({
                error: 'Prescrição já assinada — não pode ser editada',
            }, { status: 409 })
        }

        // Parse body
        const body = await request.json()
        const parsed = UpdatePrescriptionSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({
                error: 'Dados inválidos',
                details: parsed.error.flatten().fieldErrors,
            }, { status: 400 })
        }

        const { items, notes, patient_id, appointment_id } = parsed.data

        // Update prescription fields
        const updateData: Record<string, unknown> = {}
        if (notes !== undefined) updateData.notes = notes
        if (patient_id) updateData.patient_id = patient_id
        if (appointment_id) updateData.appointment_id = appointment_id

        if (Object.keys(updateData).length > 0) {
            await supabaseAdmin
                .from('prescriptions')
                .update(updateData)
                .eq('id', params.id)
        }

        // Replace items if provided
        if (items && items.length > 0) {
            // Delete old items
            await supabaseAdmin
                .from('prescription_items')
                .delete()
                .eq('prescription_id', params.id)

            // Insert new items
            const itemsToInsert = items.map((item, idx) => ({
                prescription_id: params.id,
                medication_name: item.medication_name,
                dosage: item.dosage,
                frequency: item.frequency,
                duration: item.duration || null,
                instructions: item.instructions || null,
                sort_order: item.sort_order ?? idx,
            }))

            await supabaseAdmin
                .from('prescription_items')
                .insert(itemsToInsert as Record<string, unknown>[])
        }

        return NextResponse.json({ success: true, message: 'Prescrição atualizada' })
    } catch (error: any) {
        console.error('[Prescriptions] PUT error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// ── DELETE: Remove prescrição (somente DRAFT) ──
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params

    try {
        const supabase = await createClient()
        const supabaseAdmin = createServiceRoleClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // Plan guard
        const validation = await guardFeature(profile.clinic_id, 'prescricao_digital')
        if (!validation.allowed) {
            return createPlanError(validation.planType, 'Prescrição Digital', 'PROFESSIONAL')
        }

        // Verify prescription
        let prescQuery = supabaseAdmin
            .from('prescriptions')
            .select('id, status')
            .eq('id', params.id)
            .eq('clinic_id', profile.clinic_id)

        if (profile.role === 'DOCTOR') {
            prescQuery = prescQuery.eq('doctor_id', user.id)
        }

        const { data: existing } = await prescQuery.single()

        if (!existing) {
            return NextResponse.json({ error: 'Prescrição não encontrada' }, { status: 404 })
        }

        if ((existing as any).status !== 'DRAFT') {
            return NextResponse.json({
                error: 'Apenas prescrições em rascunho podem ser excluídas',
            }, { status: 409 })
        }

        // Delete (cascade removes items)
        const { error } = await supabaseAdmin
            .from('prescriptions')
            .delete()
            .eq('id', params.id)

        if (error) {
            console.error('[Prescriptions] DELETE error:', error)
            return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Prescrição excluída' })
    } catch (error: any) {
        console.error('[Prescriptions] DELETE error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
