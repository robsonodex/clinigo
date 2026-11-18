import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/tiss/reports/loss-analysis
 * Relatório Executivo de Perda Financeira e Glosas TISS
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
        const insuranceCompany = (searchParams.get('insurance_company') || '').trim();

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, error: 'start_date e end_date obrigatórios' }, { status: 400 });
        }

        const [guidesRes, glosasRes, insurancesRes] = await Promise.all([
            adminDb
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
                    execution_date,
                    health_insurance_id,
                    batch:tiss_batches(id, batch_number, insurance_company_id, insurance_company_name),
                    health_insurance:health_insurances(id, name, code)
                `)
                .eq('clinic_id', clinicId)
                .gte('execution_date', startDate)
                .lte('execution_date', endDate)
                .neq('status', 'CANCELLED')
                .is('deleted_at', null),
            adminDb
                .from('tiss_glosas')
                .select('id, guide_id, glosa_code, glosa_description, glosa_value, is_irrecoverable, can_appeal, status, created_at')
                .eq('clinic_id', clinicId)
                .gte('created_at', `${startDate}T00:00:00.000Z`)
                .lte('created_at', `${endDate}T23:59:59.999Z`)
                .is('deleted_at', null),
            adminDb
                .from('health_insurances')
                .select('id, name, code')
                .eq('clinic_id', clinicId)
                .is('deleted_at', null)
                .order('name', { ascending: true }),
        ]);

        if (guidesRes.error) throw guidesRes.error;

        const allGuides = (guidesRes.data || []).filter((g: any) => {
            if (!insuranceCompany) return true;
            const insName = g.batch?.insurance_company_name || g.health_insurance?.name || '';
            return (
                insName.toLowerCase().includes(insuranceCompany.toLowerCase()) ||
                g.batch?.insurance_company_id === insuranceCompany ||
                g.health_insurance_id === insuranceCompany
            );
        });

        const matchedGuideIds = new Set(allGuides.map((g: any) => g.id));
        const relevantGlosas = (glosasRes.data || []).filter((gl: any) => {
            if (!insuranceCompany) return true;
            return gl.guide_id && matchedGuideIds.has(gl.guide_id);
        });

        let billedValue = 0;
        let approvedValue = 0;
        let glosaValue = 0;
        let glosedGuidesCount = 0;

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

            const isGlosed =
                g.status === 'DENIED' ||
                g.status === 'TOTALLY_GLOSED' ||
                g.status === 'PARTIALLY_GLOSED' ||
                glVal > 0;

            if (isGlosed) {
                glosedGuidesCount++;
            }

            const insId = g.batch?.insurance_company_id || g.health_insurance_id || 'sem-operadora';
            const insName = g.batch?.insurance_company_name || g.health_insurance?.name || 'Não informado';
            if (!byInsurance[insName]) {
                byInsurance[insName] = {
                    id: insId,
                    name: insName,
                    billed: 0,
                    approved: 0,
                    glosa: 0,
                    count: 0,
                    glosed_count: 0,
                };
            }
            byInsurance[insName].billed += reqVal;
            byInsurance[insName].approved += appVal;
            byInsurance[insName].glosa += glVal;
            byInsurance[insName].count++;
            if (isGlosed) {
                byInsurance[insName].glosed_count++;
            }

            if (isGlosed) {
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

        let appealableValue = 0;
        let irrecoverableValue = 0;
        const reasonCounts: Record<string, { code: string; description: string; count: number; total: number; appealable: number; irrecoverable: number }> = {};

        for (const gl of relevantGlosas) {
            const val = Number(gl.glosa_value || 0);
            const isIrrec = Boolean(gl.is_irrecoverable) || gl.can_appeal === false;
            if (isIrrec) {
                irrecoverableValue += val;
            } else {
                appealableValue += val;
            }

            const code = gl.glosa_code || 'SEM-COD';
            const desc = gl.glosa_description || 'Motivo não especificado';
            const key = `${code}::${desc}`;
            if (!reasonCounts[key]) {
                reasonCounts[key] = {
                    code,
                    description: desc,
                    count: 0,
                    total: 0,
                    appealable: 0,
                    irrecoverable: 0,
                };
            }
            reasonCounts[key].count++;
            reasonCounts[key].total += val;
            if (isIrrec) {
                reasonCounts[key].irrecoverable += val;
            } else {
                reasonCounts[key].appealable += val;
            }
        }

        const totalLossForShare = glosaValue > 0
            ? glosaValue
            : Object.values(procedureCounts).reduce((acc, p) => acc + p.total, 0);

        const glosaRate = billedValue > 0 ? (glosaValue / billedValue) * 100 : 0;
        const approvalRate = billedValue > 0 ? (approvedValue / billedValue) * 100 : 0;

        Object.values(byInsurance).forEach((ins: any) => {
            ins.glosa_rate = ins.billed > 0 ? Number(((ins.glosa / ins.billed) * 100).toFixed(2)) : 0;
        });

        const topGlosas = Object.entries(procedureCounts)
            .map(([code, item]) => ({
                code,
                procedure: item.name,
                name: item.name,
                count: item.count,
                total: Number(item.total.toFixed(2)),
                share: totalLossForShare > 0 ? Number(((item.total / totalLossForShare) * 100).toFixed(1)) : 0,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        const totalReasonLoss = Object.values(reasonCounts).reduce((acc, r) => acc + r.total, 0);
        const topReasons = Object.values(reasonCounts)
            .map((r) => ({
                ...r,
                total: Number(r.total.toFixed(2)),
                appealable: Number(r.appealable.toFixed(2)),
                irrecoverable: Number(r.irrecoverable.toFixed(2)),
                share: totalReasonLoss > 0 ? Number(((r.total / totalReasonLoss) * 100).toFixed(1)) : 0,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        return NextResponse.json({
            success: true,
            data: {
                period: {
                    start: startDate,
                    end: endDate,
                    startDate,
                    endDate,
                },
                summary: {
                    total_guides: allGuides.length,
                    glosed_guides: glosedGuidesCount,
                    billed_value: Number(billedValue.toFixed(2)),
                    received_value: Number(approvedValue.toFixed(2)),
                    approved_value: Number(approvedValue.toFixed(2)),
                    glosa_value: Number(glosaValue.toFixed(2)),
                    glosa_rate: Number(glosaRate.toFixed(2)),
                    approval_rate: Number(approvalRate.toFixed(2)),
                    appealable_value: Number(appealableValue.toFixed(2)),
                    irrecoverable_value: Number(irrecoverableValue.toFixed(2)),
                },
                available_insurances: insurancesRes.data || [],
                by_insurance: Object.values(byInsurance).sort((a: any, b: any) => b.glosa - a.glosa),
                top_glosas: topGlosas,
                top_glosed_procedures: topGlosas,
                top_reasons: topReasons,
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
