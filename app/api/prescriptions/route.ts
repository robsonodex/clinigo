/**
 * Prescriptions API — GET (list) + POST (create)
 * 
 * Feature: prescricao_digital (PROFESSIONAL+)
 * RBAC: DOCTOR vê próprias | CLINIC_ADMIN/SUPER_ADMIN vê todas da clínica
 */

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { guardFeature, createPlanError } from '@/lib/middlewares/plan-guard'
import { z } from 'zod'

// ── Validação ──
const PrescriptionItemSchema = z.object({
    medication_name: z.string().min(1, 'Nome do medicamento obrigatório'),
    dosage: z.string().min(1, 'Dosagem obrigatória'),
    frequency: z.string().min(1, 'Frequência obrigatória'),
    duration: z.string().optional(),
    instructions: z.string().optional(),
    sort_order: z.number().optional(),
})

const CreatePrescriptionSchema = z.object({
    patient_id: z.string().uuid('ID do paciente inválido'),
    appointment_id: z.string().uuid('ID do agendamento inválido').optional(),
    items: z.array(PrescriptionItemSchema).min(1, 'Pelo menos 1 medicamento obrigatório'),
    notes: z.string().optional(),
})

// ── GET: Lista prescrições ──
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const supabaseAdmin = createServiceRoleClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        // Get user profile
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

        // Query params
        const { searchParams } = request.nextUrl
        const patientId = searchParams.get('patient_id')
        const status = searchParams.get('status')
        const limit = parseInt(searchParams.get('limit') || '50', 10)
        const offset = parseInt(searchParams.get('offset') || '0', 10)

        // Build query
        let query = supabaseAdmin
            .from('prescriptions')
            .select(`
                *,
                patient:patients(id, full_name, cpf, birth_date, email, phone),
                doctor:users!prescriptions_doctor_id_fkey(id, full_name)
            `, { count: 'exact' })
            .eq('clinic_id', profile.clinic_id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        // RBAC: DOCTOR vê apenas as próprias
        if (profile.role === 'DOCTOR') {
            query = query.eq('doctor_id', user.id)
        }

        // Filters
        if (patientId) query = query.eq('patient_id', patientId)
        if (status) query = query.eq('status', status)

        const { data: prescriptions, error, count } = await query

        if (error) {
            console.error('[Prescriptions] GET error:', error)
            return NextResponse.json({ error: 'Erro ao buscar prescrições' }, { status: 500 })
        }

        // Fetch items for each prescription
        const prescriptionIds = (prescriptions || []).map((p: any) => p.id)
        let items: any[] = []
        if (prescriptionIds.length > 0) {
            const { data: itemsData } = await supabaseAdmin
                .from('prescription_items')
                .select('*')
                .in('prescription_id', prescriptionIds)
                .order('sort_order', { ascending: true })
            items = itemsData || []
        }

        // Attach items to prescriptions
        const enriched = (prescriptions || []).map((p: any) => ({
            ...p,
            items: items.filter((i: any) => i.prescription_id === p.id),
        }))

        return NextResponse.json({
            success: true,
            data: enriched,
            total: count || 0,
        })
    } catch (error: any) {
        console.error('[Prescriptions] GET error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// ── POST: Cria prescrição ──
export async function POST(request: NextRequest) {
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

        // RBAC: apenas DOCTOR, CLINIC_ADMIN ou SUPER_ADMIN podem criar
        if (!['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
        }

        // Parse body
        const body = await request.json()
        const parsed = CreatePrescriptionSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({
                error: 'Dados inválidos',
                details: parsed.error.flatten().fieldErrors,
            }, { status: 400 })
        }

        const { patient_id, appointment_id, items, notes } = parsed.data

        // Verify patient belongs to clinic
        const { data: patient } = await supabaseAdmin
            .from('patients')
            .select('id')
            .eq('id', patient_id)
            .eq('clinic_id', profile.clinic_id)
            .single()

        if (!patient) {
            return NextResponse.json({ error: 'Paciente não encontrado nesta clínica' }, { status: 404 })
        }

        // Create prescription
        const { data: prescription, error: prescError } = await supabaseAdmin
            .from('prescriptions')
            .insert({
                clinic_id: profile.clinic_id,
                patient_id,
                appointment_id: appointment_id || null,
                doctor_id: user.id,
                status: 'DRAFT',
                notes: notes || null,
            } as Record<string, unknown>)
            .select()
            .single()

        if (prescError || !prescription) {
            console.error('[Prescriptions] INSERT error:', prescError)
            return NextResponse.json({ error: 'Erro ao criar prescrição' }, { status: 500 })
        }

        // Create items
        const itemsToInsert = items.map((item, idx) => ({
            prescription_id: (prescription as any).id,
            medication_name: item.medication_name,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration || null,
            instructions: item.instructions || null,
            sort_order: item.sort_order ?? idx,
        }))

        const { error: itemsError } = await supabaseAdmin
            .from('prescription_items')
            .insert(itemsToInsert as Record<string, unknown>[])

        if (itemsError) {
            console.error('[Prescriptions] Items INSERT error:', itemsError)
            // Rollback prescription
            await supabaseAdmin.from('prescriptions').delete().eq('id', (prescription as any).id)
            return NextResponse.json({ error: 'Erro ao adicionar medicamentos' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            data: { ...(prescription as any), items: itemsToInsert },
        }, { status: 201 })
    } catch (error: any) {
        console.error('[Prescriptions] POST error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
