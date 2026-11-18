import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tiss/glosas/search?q=...
 * "Pesquisa Conta / Paciente" global entre remessas no Nível 1 do Controle de Glosas.
 */
export const GET = withAxiom(async (request: AxiomRequest) => {
    const guard = await requireTissAction(request, 'glosa.revisar');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
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

        const { searchParams } = new URL(request.url);
        const q = (searchParams.get('q') || '').trim().toLowerCase();
        if (!q || q.length < 2) {
            return NextResponse.json({ success: true, data: [] });
        }

        const { data: guides, error } = await adminDb
            .from('tiss_guides')
            .select(`
                id,
                batch_id,
                guide_number,
                patient_name,
                patient_card_number,
                procedure_code,
                procedure_name,
                total_value,
                paid_value,
                glosa_value,
                status,
                billing_stage,
                execution_date,
                batch:tiss_batches(id, batch_number, insurance_company_name, review_status)
            `)
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .not('batch_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const matches = (guides || []).filter((g: any) => {
            return (
                String(g.patient_name || '').toLowerCase().includes(q) ||
                String(g.guide_number || '').toLowerCase().includes(q) ||
                String(g.patient_card_number || '').toLowerCase().includes(q) ||
                String(g.batch?.batch_number || '').toLowerCase().includes(q)
            );
        }).slice(0, 30);

        return NextResponse.json({
            success: true,
            data: matches,
        });
    } catch (err: any) {
        request.log.error('tiss/glosas/search GET', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ success: false, error: err.message || 'Erro ao pesquisar conta' }, { status: 500 });
    }
});

