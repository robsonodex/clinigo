import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET: List insurance operators (health_insurances) for the clinic
export const GET = withAxiom(async (request: AxiomRequest) => {
    const guard = await requireTissAction(request, 'config.operadoras.ver');
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
            return NextResponse.json({ success: true, data: [], operators: [] });
        }

        const searchParams = request.nextUrl.searchParams;
        const search = (searchParams.get('search') || '').trim();

        let query = adminDb
            .from('health_insurances')
            .select('id, clinic_id, name, code, phone, email, notes, status, appeal_deadline_days, closing_day, tiss_version, created_at')
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .order('name', { ascending: true });

        if (search) {
            query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
        }

        const { data: operators, error } = await query;

        if (error) {
            console.error('Operators error:', error);
            return NextResponse.json({ error: 'Erro ao buscar operadoras' }, { status: 500 });
        }

        const list = (operators || [])
            .filter((op: any) => op.status !== 'INACTIVE')
            .map((op: any) => ({
                ...op,
                ans_code: op.code || '',
                is_active: op.status !== 'INACTIVE',
            }));

        return NextResponse.json({
            success: true,
            data: list,
            operators: list,
        });
    } catch (error) {
        request.log.error('tiss/operators', { error: error instanceof Error ? error.message : String(error) });
        console.error('Operators error:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
});

// POST: Register or link operator for the clinic
export const POST = withAxiom(async (request: AxiomRequest) => {
    const guard = await requireTissAction(request, 'config.operadoras.editar');
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
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        const clinicId = userData?.clinic_id || guard.session?.clinicId;
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 });
        }

        const body = await request.json().catch(() => ({}));
        const { operator_id, name, ans_code, code } = body;

        if (!operator_id && !name) {
            return NextResponse.json({ error: 'operator_id ou name é obrigatório' }, { status: 400 });
        }

        if (operator_id) {
            const { data: existing } = await adminDb
                .from('health_insurances')
                .select('*')
                .eq('id', operator_id)
                .eq('clinic_id', clinicId)
                .maybeSingle();

            if (existing) {
                return NextResponse.json({ success: true, operator: existing }, { status: 200 });
            }
        }

        const { data: created, error: createError } = await adminDb
            .from('health_insurances')
            .insert({
                clinic_id: clinicId,
                name: name || `Operadora ${ans_code || code || operator_id}`,
                code: code || ans_code || '000000',
                status: 'ACTIVE',
                tiss_version: '4.01.00',
            })
            .select()
            .single();

        if (createError) {
            console.error('Create operator error:', createError);
            return NextResponse.json({ error: 'Erro ao cadastrar operadora' }, { status: 500 });
        }

        return NextResponse.json({ success: true, operator: { ...created, ans_code: created?.code || '' } }, { status: 201 });
    } catch (error) {
        request.log.error('tiss/operators', { error: error instanceof Error ? error.message : String(error) });
        console.error('Create operator error:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
});
