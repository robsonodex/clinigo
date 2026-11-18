import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { writeTissAudit } from '@/lib/tiss/audit';

export const dynamic = 'force-dynamic';

const updateAccountSchema = z.object({
    health_insurance_id: z.string().uuid().optional().nullable(),
    patient_card_number: z.string().max(60).optional(),
    patient_card_validity: z.string().optional().nullable(),
    authorization_code: z.string().max(60).optional().nullable(),
    cid10_code: z.string().max(15).optional().nullable(),
    cid10_description: z.string().max(255).optional().nullable(),
    account_notes: z.string().max(2000).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
});

export const GET = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireTissAction(request, 'conta.ver');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const adminDb = createServiceRoleClient() as any;
        const { data: profile } = await adminDb
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        const clinicId = profile?.clinic_id || guard.session.clinicId;
        if (!clinicId) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const { data: guide, error: guideErr } = await adminDb
            .from('tiss_guides')
            .select(`
                *,
                health_insurance:health_insurances(id, name, code),
                doctor:doctors(id, crm, specialty, user:users(full_name)),
                patient:patients(id, full_name, cpf, date_of_birth, phone, insurance_card_number, insurance_validity)
            `)
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .maybeSingle();

        if (guideErr || !guide) {
            return NextResponse.json({ success: false, error: 'Conta médica não encontrada' }, { status: 404 });
        }

        let { data: procedures } = await adminDb
            .from('tiss_guide_procedures')
            .select('*')
            .eq('guide_id', id)
            .order('created_at', { ascending: true });

        // Se a guia legada ainda não tinha linha em tiss_guide_procedures, sintetiza visualização segura sem perder dado
        if (!procedures || procedures.length === 0) {
            procedures = [
                {
                    id: `virtual-${guide.id}`,
                    clinic_id: clinicId,
                    guide_id: guide.id,
                    procedure_code: guide.procedure_code,
                    procedure_name: guide.procedure_name,
                    item_group: 'HONORARIOS',
                    unit_measure: 'UN',
                    quantity: Number(guide.procedure_quantity || 1),
                    unit_value: Number(guide.unit_value || 0),
                    total_value: Number(guide.total_value || 0),
                    execution_date: guide.execution_date,
                    status: 'ACTIVE',
                    is_virtual: true,
                },
            ];
        }

        let appointmentData: any = null;
        let medicalRecordData: any = null;
        if (guide.appointment_id) {
            const [{ data: appt }, { data: rec }] = await Promise.all([
                adminDb
                    .from('appointments')
                    .select('id, appointment_date, appointment_time, status, session_status, checked_in_at, checkin_confirmed_at, checkin_method, therapist_start_verified_at, completed_at')
                    .eq('id', guide.appointment_id)
                    .eq('clinic_id', clinicId)
                    .maybeSingle(),
                adminDb
                    .from('medical_records')
                    .select('id, chief_complaint, history_present_illness, treatment_plan, signed_at, signature_hash, created_at')
                    .eq('appointment_id', guide.appointment_id)
                    .eq('clinic_id', clinicId)
                    .maybeSingle(),
            ]);
            appointmentData = appt;
            medicalRecordData = rec;
        }

        return NextResponse.json({
            success: true,
            data: {
                guide,
                procedures,
                appointment: appointmentData,
                medical_record: medicalRecordData,
            },
        });
    } catch (err: any) {
        request.log.error('tiss/accounts/[id] GET', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ success: false, error: err.message || 'Erro ao abrir conta' }, { status: 500 });
    }
});

export const PATCH = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireTissAction(request, 'conta.editar');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const validated = updateAccountSchema.parse(body);

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const adminDb = createServiceRoleClient() as any;
        const { data: profile } = await adminDb
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        const clinicId = profile?.clinic_id || guard.session.clinicId;
        if (!clinicId) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const { data: current } = await adminDb
            .from('tiss_guides')
            .select('id, billing_stage, health_insurance_id, authorization_code, patient_card_number, patient_card_validity, cid10_code')
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .maybeSingle();

        if (!current) {
            return NextResponse.json({ success: false, error: 'Conta médica não encontrada' }, { status: 404 });
        }

        if (current.billing_stage && current.billing_stage !== 'ELABORACAO') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Conta já liberada ou em lote. Estorne a liberação antes de editar os dados cadastrais da conta.',
                },
                { status: 409 }
            );
        }

        const now = new Date().toISOString();
        const { data: updated, error: upErr } = await adminDb
            .from('tiss_guides')
            .update({
                ...validated,
                updated_at: now,
            })
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .select()
            .single();

        if (upErr) {
            return NextResponse.json({ success: false, error: upErr.message }, { status: 500 });
        }

        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: 'TISS_ACCOUNT_SAVED',
            entityType: 'tiss_guide',
            entityId: id,
            previousState: current,
            newState: validated,
            customSupabase: adminDb,
        });

        return NextResponse.json({ success: true, data: updated, message: 'Alterações gravadas com sucesso.' });
    } catch (err: any) {
        if (err?.name === 'ZodError') {
            return NextResponse.json({ success: false, error: err.errors?.[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        request.log.error('tiss/accounts/[id] PATCH', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ success: false, error: err.message || 'Erro ao salvar conta' }, { status: 500 });
    }
});

