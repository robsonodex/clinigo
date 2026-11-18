import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET: Get patient insurance cards (mapped from patients + health_insurances)
export const GET = withAxiom(async (request: AxiomRequest) => {
    const guard = await requireTissAction(request, 'paciente_convenio.ver');
    if (!guard.authorized) {
        return guard.response;
    }
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const patientId = searchParams.get('patient_id');

        if (!patientId) {
            return NextResponse.json({ error: 'patient_id é obrigatório' }, { status: 400 });
        }

        const adminDb = createServiceRoleClient() as any;
        const { data: userData } = await adminDb
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        const clinicId = userData?.clinic_id || guard.session?.clinicId;
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 });
        }

        const { data: patient, error: patientError } = await adminDb
            .from('patients')
            .select(`
                id,
                full_name,
                cpf,
                health_insurance,
                health_insurance_id,
                insurance_card_number,
                insurance_validity,
                insurance_plan_name,
                insurance_holder_name,
                insurance_holder_cpf,
                billing_type,
                operator:health_insurances(id, name, code, status)
            `)
            .eq('id', patientId)
            .eq('clinic_id', clinicId)
            .maybeSingle();

        if (patientError) {
            console.error('Patient insurance error:', patientError);
            return NextResponse.json({ error: 'Erro ao buscar convênios do paciente' }, { status: 500 });
        }

        const insurances: any[] = [];
        if (patient && (patient.health_insurance_id || patient.insurance_card_number || patient.health_insurance)) {
            insurances.push({
                id: patient.health_insurance_id || patient.id,
                patient_id: patient.id,
                operator_id: patient.health_insurance_id,
                card_number: patient.insurance_card_number || '',
                valid_until: patient.insurance_validity || '',
                card_validity: patient.insurance_validity || '',
                plan_name: patient.insurance_plan_name || patient.health_insurance || 'Plano Padrão',
                holder_name: patient.insurance_holder_name || patient.full_name,
                holder_cpf: patient.insurance_holder_cpf || patient.cpf,
                is_active: true,
                operator: patient.operator
                    ? {
                        id: patient.operator.id,
                        name: patient.operator.name,
                        ans_code: patient.operator.code || '',
                    }
                    : {
                        id: patient.health_insurance_id || '',
                        name: patient.health_insurance || 'Operadora',
                        ans_code: '',
                    },
            });
        }

        return NextResponse.json({
            success: true,
            data: insurances,
            insurances,
        });
    } catch (error) {
        request.log.error('tiss/patient-insurance', { error: error instanceof Error ? error.message : String(error) });
        console.error('Patient insurance error:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
});

// POST: Bind or update insurance on patient
export const POST = withAxiom(async (request: AxiomRequest) => {
    const guard = await requireTissAction(request, 'paciente_convenio.editar');
    if (!guard.authorized) {
        return guard.response;
    }
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const adminDb = createServiceRoleClient() as any;
        const { data: userData } = await adminDb
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        const clinicId = userData?.clinic_id || guard.session?.clinicId;
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 });
        }

        const body = await request.json().catch(() => ({}));
        const {
            patient_id,
            operator_id,
            card_number,
            card_validity,
            holder_name,
            holder_cpf,
            plan_name,
        } = body;

        if (!patient_id || !operator_id || !card_number) {
            return NextResponse.json({
                error: 'Campos obrigatórios: patient_id, operator_id, card_number'
            }, { status: 400 });
        }

        const { data: updated, error } = await adminDb
            .from('patients')
            .update({
                health_insurance_id: operator_id,
                insurance_card_number: card_number,
                insurance_validity: card_validity || null,
                insurance_holder_name: holder_name || null,
                insurance_holder_cpf: holder_cpf || null,
                insurance_plan_name: plan_name || null,
                billing_type: 'convenio',
            })
            .eq('id', patient_id)
            .eq('clinic_id', clinicId)
            .select('*, operator:health_insurances(id, name, code)')
            .single();

        if (error) {
            console.error('Add insurance error:', error);
            return NextResponse.json({ error: 'Erro ao vincular convênio ao paciente' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            insurance: {
                id: updated.health_insurance_id || updated.id,
                patient_id: updated.id,
                operator_id: updated.health_insurance_id,
                card_number: updated.insurance_card_number,
                card_validity: updated.insurance_validity,
                operator: updated.operator
                    ? { id: updated.operator.id, name: updated.operator.name, ans_code: updated.operator.code || '' }
                    : null,
            },
        });
    } catch (error) {
        request.log.error('tiss/patient-insurance', { error: error instanceof Error ? error.message : String(error) });
        console.error('Add insurance error:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
});

// PATCH: Update patient insurance fields
export const PATCH = withAxiom(async (request: AxiomRequest) => {
    const guard = await requireTissAction(request, 'paciente_convenio.editar');
    if (!guard.authorized) {
        return guard.response;
    }
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const adminDb = createServiceRoleClient() as any;
        const { data: userData } = await adminDb
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        const clinicId = userData?.clinic_id || guard.session?.clinicId;
        const body = await request.json().catch(() => ({}));
        const { id, patient_id, card_number, card_validity, holder_name, holder_cpf, plan_name } = body;
        const targetPatientId = patient_id || id;

        if (!targetPatientId) {
            return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
        }

        const updatePayload: Record<string, any> = {};
        if (card_number !== undefined) updatePayload.insurance_card_number = card_number;
        if (card_validity !== undefined) updatePayload.insurance_validity = card_validity;
        if (holder_name !== undefined) updatePayload.insurance_holder_name = holder_name;
        if (holder_cpf !== undefined) updatePayload.insurance_holder_cpf = holder_cpf;
        if (plan_name !== undefined) updatePayload.insurance_plan_name = plan_name;

        const { data: updated, error } = await adminDb
            .from('patients')
            .update(updatePayload)
            .eq('id', targetPatientId)
            .eq('clinic_id', clinicId)
            .select()
            .single();

        if (error) {
            console.error('Update insurance error:', error);
            return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
        }

        return NextResponse.json({ success: true, insurance: updated });
    } catch (error) {
        request.log.error('tiss/patient-insurance', { error: error instanceof Error ? error.message : String(error) });
        console.error('Update insurance error:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
});

// DELETE: Unlink patient insurance
export const DELETE = withAxiom(async (request: AxiomRequest) => {
    const guard = await requireTissAction(request, 'paciente_convenio.editar');
    if (!guard.authorized) {
        return guard.response;
    }
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const adminDb = createServiceRoleClient() as any;
        const { data: userData } = await adminDb
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        const clinicId = userData?.clinic_id || guard.session?.clinicId;
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id') || searchParams.get('patient_id');

        if (!id) {
            return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
        }

        const { error } = await adminDb
            .from('patients')
            .update({
                health_insurance_id: null,
                insurance_card_number: null,
                insurance_validity: null,
                billing_type: 'particular',
            })
            .eq('id', id)
            .eq('clinic_id', clinicId);

        if (error) {
            console.error('Delete insurance error:', error);
            return NextResponse.json({ error: 'Erro ao remover' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        request.log.error('tiss/patient-insurance', { error: error instanceof Error ? error.message : String(error) });
        console.error('Delete insurance error:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
});
