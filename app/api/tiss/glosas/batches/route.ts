import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tiss/glosas/batches
 * Nível 1 do Controle de Glosas (TOTVS RM Saúde):
 * Lista remessas/faturas para revisão de glosas com legenda de status visual e resumo de contas.
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
        const insuranceId = searchParams.get('health_insurance_id');
        const careType = searchParams.get('care_type');
        const reviewStatus = searchParams.get('review_status');
        const month = searchParams.get('reference_month');
        const year = searchParams.get('reference_year');
        const search = (searchParams.get('search') || '').trim().toLowerCase();

        let query = adminDb
            .from('tiss_batches')
            .select('*')
            .eq('clinic_id', clinicId)
            .neq('status', 'CANCELLED')
            .order('created_at', { ascending: false })
            .limit(120);

        if (insuranceId && insuranceId !== 'ALL') {
            query = query.eq('insurance_company_id', insuranceId);
        }
        if (careType && careType !== 'ALL') {
            query = query.eq('care_type', careType);
        }
        if (reviewStatus && reviewStatus !== 'ALL') {
            query = query.eq('review_status', reviewStatus);
        }
        if (month && month !== 'ALL') {
            query = query.eq('reference_month', Number(month));
        }
        if (year && year !== 'ALL') {
            query = query.eq('reference_year', Number(year));
        }

        const { data: batches, error } = await query;
        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const batchList = batches || [];
        const batchIds = batchList.map((b: any) => b.id);

        const [{ data: guides }, { data: glosas }] = await Promise.all([
            batchIds.length > 0
                ? adminDb
                      .from('tiss_guides')
                      .select('id, batch_id, status, billing_stage, total_value, paid_value, glosa_value')
                      .eq('clinic_id', clinicId)
                      .in('batch_id', batchIds)
                      .is('deleted_at', null)
                      .not('status', 'in', '("CANCELLED","CANCELED")')
                : Promise.resolve({ data: [] }),
            batchIds.length > 0
                ? adminDb
                      .from('tiss_glosas')
                      .select('id, batch_id, glosa_value, is_irrecoverable, status, deleted_at')
                      .eq('clinic_id', clinicId)
                      .in('batch_id', batchIds)
                      .is('deleted_at', null)
                      .neq('status', 'CANCELLED')
                : Promise.resolve({ data: [] }),
        ]);

        const guidesByBatch = new Map<string, any[]>();
        for (const g of guides || []) {
            const arr = guidesByBatch.get(g.batch_id) || [];
            arr.push(g);
            guidesByBatch.set(g.batch_id, arr);
        }

        const glosasByBatch = new Map<string, any[]>();
        for (const gl of glosas || []) {
            const arr = glosasByBatch.get(gl.batch_id) || [];
            arr.push(gl);
            glosasByBatch.set(gl.batch_id, arr);
        }

        const enriched = batchList
            .map((b: any) => {
                const bGuides = guidesByBatch.get(b.id) || [];
                const bGlosas = glosasByBatch.get(b.id) || [];

                const billedTotal = bGuides.length > 0
                    ? bGuides.reduce((acc, g) => acc + Number(g.total_value || 0), 0)
                    : Number(b.total_value || 0);
                const glosaSum = bGlosas.length > 0
                    ? bGlosas.reduce((acc, gl) => acc + Number(gl.glosa_value || 0), 0)
                    : Number(b.glosa_value || 0);
                const approvedSum = bGuides.length > 0
                    ? bGuides.reduce((acc, g) => acc + Number(g.paid_value ?? Math.max(0, Number(g.total_value || 0) - Number(g.glosa_value || 0))), 0)
                    : Number(b.approved_value || 0);
                const irrecoverableSum = bGlosas
                    .filter((gl) => gl.is_irrecoverable)
                    .reduce((acc, gl) => acc + Number(gl.glosa_value || 0), 0);

                return {
                    ...b,
                    total_guides: bGuides.length || b.total_guides || 0,
                    total_value: Number(billedTotal.toFixed(2)),
                    approved_value: Number(approvedSum.toFixed(2)),
                    glosa_value: Number(glosaSum.toFixed(2)),
                    irrecoverable_value: Number(irrecoverableSum.toFixed(2)),
                    review_status: b.review_status || 'NAO_INICIADA',
                    care_type: b.care_type || 'AMBULATORIAL_TERAPIAS',
                    glosas_count: bGlosas.length,
                    pending_accounts_count: bGuides.filter((g) => !['PAID', 'CLOSED', 'PARTIALLY_GLOSED', 'TOTALLY_GLOSED'].includes(String(g.status).toUpperCase())).length,
                };
            })
            .filter((b: any) => {
                if (!search) return true;
                return (
                    String(b.batch_number || '').toLowerCase().includes(search) ||
                    String(b.protocol_number || '').toLowerCase().includes(search) ||
                    String(b.insurance_company_name || '').toLowerCase().includes(search)
                );
            });

        return NextResponse.json({
            success: true,
            data: enriched,
        });
    } catch (err: any) {
        request.log.error('tiss/glosas/batches GET', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ success: false, error: err.message || 'Erro ao listar remessas para glosa' }, { status: 500 });
    }
});

