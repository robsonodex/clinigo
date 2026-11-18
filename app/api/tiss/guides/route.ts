import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET: List TISS guides
export const GET = withAxiom(async (request: AxiomRequest) => {
    const guard = await requireTissAction(request, 'guia.ver');
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

        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');
        const operatorId = searchParams.get('operator_id');
        const patientId = searchParams.get('patient_id');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const offset = (page - 1) * limit;

        let query = adminDb
            .from('tiss_guides')
            .select('*, batch:tiss_batches!batch_id(insurance_company_name), health_insurance:health_insurances(id, name, code)', { count: 'exact' })
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) query = query.eq('status', status);
        if (operatorId) query = query.eq('health_insurance_id', operatorId);
        if (patientId) query = query.eq('patient_id', patientId);
        if (startDate) query = query.gte('execution_date', startDate);
        if (endDate) query = query.lte('execution_date', endDate);

        const { data: guides, error, count } = await query;

        if (error) {
            console.error('TISS guides error:', error);
            return NextResponse.json({ error: 'Erro ao buscar guias' }, { status: 500 });
        }

        const statusMap: Record<string, string> = {
            PENDING: 'pendente',
            DRAFT: 'pendente',
            VALID: 'pendente',
            INVALID: 'pendente',
            SENT: 'enviada',
            APPROVED: 'aprovada',
            PAID: 'paga',
            DENIED: 'negada',
            TOTALLY_GLOSED: 'negada',
            PARTIALLY_GLOSED: 'aprovada',
        };

        const mappedGuides = (guides || []).map((g: any) => ({
            ...g,
            numero: g.guide_number,
            tipo: g.guide_type === 'SP_SADT' || g.guide_type === 'SP/SADT'
                ? 'sadt'
                : g.guide_type === 'CONSULTA'
                    ? 'consulta'
                    : (g.guide_type || 'sadt').toLowerCase(),
            paciente: g.patient_name || '',
            procedimento: g.procedure_name || '',
            operadora: g.batch?.insurance_company_name || g.health_insurance?.name || '',
            valor: parseFloat(g.total_value) || 0,
            status: statusMap[String(g.status || '').toUpperCase()] || 'pendente',
            data_criacao: g.created_at ? new Date(g.created_at).toLocaleDateString('pt-BR') : '',
        }));

        return NextResponse.json({
            guides: mappedGuides,
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        });
    } catch (error) {
        request.log.error('tiss/guides', { error: error instanceof Error ? error.message : String(error) });
        console.error('TISS error:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
});

// POST: Create TISS guide
export const POST = withAxiom(async (request: AxiomRequest) => {
    const guard = await requireTissAction(request, 'guia.criar');
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
            guide_type,
            patient_id,
            patient_insurance_id,
            health_insurance_id,
            operator_id,
            appointment_id,
            doctor_id,
            execution_date,
            cid_primary,
            cid10_code,
            authorization_number,
            authorization_code,
            patient_card_number,
            patient_card_validity,
            procedures = [],
            status: requestedStatus,
        } = body;

        if (!guide_type || !patient_id) {
            return NextResponse.json({
                error: 'Campos obrigatórios: guide_type, patient_id'
            }, { status: 400 });
        }

        const { data: patient } = await adminDb
            .from('patients')
            .select('id, full_name, cpf, health_insurance_id, insurance_card_number, insurance_validity')
            .eq('id', patient_id)
            .eq('clinic_id', clinicId)
            .maybeSingle();

        const resolvedHealthInsuranceId =
            health_insurance_id ||
            operator_id ||
            (patient_insurance_id && patient_insurance_id !== patient_id ? patient_insurance_id : null) ||
            patient?.health_insurance_id ||
            null;

        const year = new Date().getFullYear();
        let guideNumber: string;
        let generatedNum: string | null = null;
        let rpcErr: any = null;

        if (typeof adminDb.rpc === 'function') {
            const rpcRes = await adminDb.rpc('generate_tiss_guide_number', {
                p_clinic_id: clinicId,
                p_year: year,
            });
            generatedNum = rpcRes.data;
            rpcErr = rpcRes.error;
        } else {
            rpcErr = { code: '42883', message: 'Método rpc não disponível' };
        }

        if (!rpcErr && generatedNum) {
            guideNumber = generatedNum;
        } else {
            const { count: guideCount } = await adminDb
                .from('tiss_guides')
                .select('id', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .gte('created_at', `${year}-01-01`);
            guideNumber = `${year}${String((guideCount || 0) + 1).padStart(6, '0')}`;
        }

        const firstProc = Array.isArray(procedures) && procedures.length > 0 ? procedures[0] : null;
        const procCode = firstProc?.code || firstProc?.procedure_code || body.procedure_code || '10101012';
        const procName = firstProc?.description || firstProc?.procedure_name || body.procedure_name || 'Procedimento TISS';
        const procQty = Number(firstProc?.quantity ?? body.procedure_quantity ?? 1) || 1;
        const procUnit = Number(firstProc?.unit_price ?? firstProc?.unit_value ?? body.unit_value ?? 0) || 0;
        const totalValue = Array.isArray(procedures) && procedures.length > 0
            ? procedures.reduce((sum: number, p: any) => {
                const q = Number(p.quantity ?? 1) || 1;
                const u = Number(p.unit_price ?? p.unit_value ?? 0) || 0;
                return sum + q * u;
            }, 0)
            : procQty * procUnit;

        const normalizedType = String(guide_type).toUpperCase().includes('SADT')
            ? 'SP_SADT'
            : String(guide_type).toUpperCase().includes('INTERN')
                ? 'INTERNACAO'
                : 'CONSULTA';

        const execDate = execution_date || new Date().toISOString().split('T')[0];

        const { data: guide, error: guideError } = await adminDb
            .from('tiss_guides')
            .insert({
                clinic_id: clinicId,
                guide_type: normalizedType,
                guide_number: guideNumber,
                patient_id,
                doctor_id: doctor_id || null,
                appointment_id: appointment_id || null,
                health_insurance_id: resolvedHealthInsuranceId,
                patient_name: patient?.full_name || 'Paciente',
                patient_cpf: patient?.cpf || null,
                patient_card_number: patient_card_number || patient?.insurance_card_number || '00000000',
                patient_card_validity: patient_card_validity || patient?.insurance_validity || null,
                procedure_code: procCode,
                procedure_name: procName,
                procedure_quantity: procQty,
                unit_value: procUnit,
                total_value: totalValue,
                cid10_code: cid10_code || cid_primary || null,
                authorization_code: authorization_code || authorization_number || null,
                execution_date: execDate,
                status: requestedStatus === 'DRAFT' ? 'PENDING' : (requestedStatus || 'PENDING'),
                validation_status: 'PENDING',
                billing_stage: 'IN_ELABORATION',
            })
            .select()
            .single();

        if (guideError) {
            console.error('Create guide error:', guideError);
            return NextResponse.json({ error: 'Erro ao criar guia' }, { status: 500 });
        }

        if (Array.isArray(procedures) && procedures.length > 0) {
            const procedureRecords = procedures.map((proc: any) => {
                const q = Number(proc.quantity ?? 1) || 1;
                const u = Number(proc.unit_price ?? proc.unit_value ?? 0) || 0;
                return {
                    clinic_id: clinicId,
                    guide_id: guide.id,
                    procedure_code: proc.code || proc.procedure_code || procCode,
                    procedure_name: proc.description || proc.procedure_name || procName,
                    execution_date: proc.execution_date || execDate,
                    quantity: q,
                    unit_value: u,
                    total_value: q * u,
                    item_group: 'PROCEDIMENTOS',
                    unit_measure: 'UN',
                    status: 'ACTIVE',
                };
            });

            await adminDb.from('tiss_guide_procedures').insert(procedureRecords);
        }

        const { data: completeGuide } = await adminDb
            .from('tiss_guides')
            .select(`
                *,
                health_insurance:health_insurances(id, name, code),
                patient:patients(id, full_name),
                procedures:tiss_guide_procedures(*)
            `)
            .eq('id', guide.id)
            .single();

        return NextResponse.json({
            success: true,
            data: completeGuide || guide,
            guide: completeGuide || guide,
        });
    } catch (error) {
        request.log.error('tiss/guides', { error: error instanceof Error ? error.message : String(error) });
        console.error('Create TISS guide error:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
});
