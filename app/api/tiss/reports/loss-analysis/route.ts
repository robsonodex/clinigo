import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/tiss/reports/loss-analysis
 * Relatório de Perda Financeira TISS
 */
export const GET = withAxiom(async (request: AxiomRequest) => {
    const guard = await requireTissAction(request, 'config.premium.ver');
    if (!guard.authorized) {
        return guard.response;
    }
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const adminDb = createServiceRoleClient() as any;
        const { data: profile } = await adminDb
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        const clinicId = profile?.clinic_id || guard.session?.clinicId;
        if (!clinicId) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const insuranceCompany = searchParams.get('insurance_company');

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, error: 'start_date e end_date obrigatórios' }, { status: 400 });
        }

        const { data: guides, error: guidesError } = await adminDb
            .from('tiss_guides')
            .select(`
                id,
                guide_number,
                procedure_code,
                procedure_name,
                total_value,
                paid_value,
                glosa_value,
                status,
                batch:tiss_batches(id, batch_number, insurance_company_id, insurance_company_name),
                health_insurance:health_insurances(id, name)
            `)
            .eq('clinic_id', clinicId)
            .gte('execution_date', startDate)
            .lte('execution_date', endDate)
            .neq('status', 'CANCELLED')
            .is('deleted_at', null);

        if (guidesError) throw guidesError;

        const allGuides = (guides || []).filter((g: any) => {
            if (!insuranceCompany) return true;
            const insName = g.batch?.insurance_company_name || g.health_insurance?.name || '';
            return insName.toLowerCase().includes(insuranceCompany.toLowerCase()) || g.batch?.insurance_company_id === insuranceCompany;
        });

        let billedValue = 0;
        let approvedValue = 0;
        let glosaValue = 0;

        const byInsurance: Record<string, any> = {};
        const procedureCounts: Record<string, { count: number; total: number; name: string }> = {};

        for (const g of allGuides) {
            const reqVal = Number(g.total_value || 0);
            const glVal = Number(g.glosa_value || 0);
            const appVal = g.paid_value !== null && g.paid_value !== undefined
                ? Number(g.paid_value)
                : Math.max(0, reqVal - glVal);

            billedValue += reqVal;
            approvedValue += appVal;
            glosaValue += glVal;

            const ins = g.batch?.insurance_company_name || g.health_insurance?.name || 'Não informado';
            if (!byInsurance[ins]) {
                byInsurance[ins] = {
                    name: ins,
                    billed: 0,
                    approved: 0,
                    glosa: 0,
                    count: 0,
                };
            }
            byInsurance[ins].billed += reqVal;
            byInsurance[ins].approved += appVal;
            byInsurance[ins].glosa += glVal;
            byInsurance[ins].count++;

            if (g.status === 'DENIED' || g.status === 'TOTALLY_GLOSED' || g.status === 'PARTIALLY_GLOSED' || glVal > 0) {
                const proc = g.procedure_code || 'N/A';
                if (!procedureCounts[proc]) {
                    procedureCounts[proc] = {
                        count: 0,
                        total: 0,
                        name: g.procedure_name || proc,
                    };
                }
                procedureCounts[proc].count++;
                procedureCounts[proc].total += glVal > 0 ? glVal : Math.max(0, reqVal - appVal);
            }
        }

        const glosaRate = billedValue > 0 ? (glosaValue / billedValue) * 100 : 0;

        Object.values(byInsurance).forEach((ins: any) => {
            ins.glosa_rate = ins.billed > 0 ? (ins.glosa / ins.billed) * 100 : 0;
        });

        const topGlosas = Object.entries(procedureCounts)
            .map(([code, data]) => ({ code, ...data }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        return NextResponse.json({
            success: true,
            data: {
                period: { startDate, endDate },
                summary: {
                    total_guides: allGuides.length,
                    billed_value: billedValue,
                    approved_value: approvedValue,
                    glosa_value: glosaValue,
                    glosa_rate: Number(glosaRate.toFixed(2)),
                },
                by_insurance: Object.values(byInsurance).sort((a: any, b: any) => b.glosa - a.glosa),
                top_glosed_procedures: topGlosas,
            },
        });
    } catch (error: any) {
        request.log.error('tiss/reports/loss-analysis', { error: error instanceof Error ? error.message : String(error) });
        console.error('[TISS] Erro ao gerar relatório de perda:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao gerar relatório', details: error.message },
            { status: 500 }
        );
    }
});
