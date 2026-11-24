import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { evaluateTissBatchHealth } from '@/lib/tiss/batch-health-score';
import { computeOperatorIntelligence } from '@/lib/tiss/operator-intelligence';

export interface GuideImpedimento {
    guide_id: string;
    guide_number: string;
    patient_name?: string;
    issues: string[];
    warnings?: string[];
}

export const GET = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireTissAction(request, 'lote.fechar');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { id: batchId } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const clinicId = profile.clinic_id;

        // 1. Buscar lote
        const { data: batch, error: batchError } = await supabase
            .from('tiss_batches')
            .select('id, batch_number, insurance_company_id, insurance_company_name, status, total_guides, total_value')
            .eq('id', batchId)
            .eq('clinic_id', clinicId)
            .single();

        if (batchError || !batch) {
            return NextResponse.json({ success: false, error: 'Lote não encontrado' }, { status: 404 });
        }

        // 2. Buscar todas as guias vinculadas ao lote (incluindo validade da carteirinha e senha de autorização para Score 0–100%)
        const { data: guides, error: guidesError } = await supabase
            .from('tiss_guides')
            .select('id, guide_number, patient_name, patient_card_number, patient_card_validity, procedure_code, procedure_name, total_value, execution_date, authorization_code, status')
            .eq('batch_id', batchId)
            .eq('clinic_id', clinicId)
            .neq('status', 'CANCELLED');

        if (guidesError) {
            return NextResponse.json({ success: false, error: 'Erro ao analisar guias do lote' }, { status: 500 });
        }

        const guideList = guides || [];
        const evaluation = evaluateTissBatchHealth(guideList, batch.batch_number || 'Lote');
        const totalValue = guideList.reduce((acc, g) => acc + (Number(g.total_value) || 0), 0);

        // 3. Memória Anti-Glosa histórica da operadora deste lote
        let operatorMemoryAlerts: Array<{
            glosaCode: string;
            description: string;
            occurrences: number;
            totalGlosedValue: number;
            recommendation: string;
        }> = [];

        if ((batch as any).insurance_company_id || (batch as any).insurance_company_name) {
            const db = supabase as any;
            let histBatchQ = db
                .from('tiss_batches')
                .select('id, insurance_company_id, insurance_company_name, total_value, approved_value, glosa_value')
                .eq('clinic_id', clinicId)
                .limit(120);
            if ((batch as any).insurance_company_id) {
                histBatchQ = histBatchQ.eq('insurance_company_id', (batch as any).insurance_company_id);
            } else {
                histBatchQ = histBatchQ.eq('insurance_company_name', (batch as any).insurance_company_name);
            }
            const { data: histBatches } = await histBatchQ;
            const histIds = (histBatches || []).map((b: any) => b.id);
            if (histIds.length > 0) {
                const { data: histGlosas } = await db
                    .from('tiss_glosas')
                    .select('id, batch_id, glosa_code, glosa_description, glosa_value, is_irrecoverable, irrecoverable_value')
                    .eq('clinic_id', clinicId)
                    .in('batch_id', histIds)
                    .is('deleted_at', null)
                    .limit(300);

                const intel = computeOperatorIntelligence(histBatches || [], histGlosas || []);
                operatorMemoryAlerts = intel.antiGlosaMemory.slice(0, 4).map((m) => ({
                    glosaCode: m.glosaCode,
                    description: m.description,
                    occurrences: m.occurrences,
                    totalGlosedValue: m.totalGlosedValue,
                    recommendation: m.recommendation,
                }));
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                can_close: evaluation.can_close,
                total_guides: evaluation.total_guides,
                total_value: Number(totalValue.toFixed(2)),
                impedimentos_count: evaluation.impedimentos.length,
                impedimentos: evaluation.impedimentos,
                // Score de Saúde do Lote TISS (0–100%)
                health_score: evaluation.health_score,
                health_level: evaluation.health_level,
                healthy_guides: evaluation.healthy_guides,
                guides_with_blockers: evaluation.guides_with_blockers,
                guides_with_warnings: evaluation.guides_with_warnings,
                checks_summary: evaluation.checks_summary,
                warnings: evaluation.warnings,
                operator_name: (batch as any).insurance_company_name || null,
                operator_memory_alerts: operatorMemoryAlerts,
            }
        });

    } catch (error: any) {
        request.log.error('tiss/batches/[id]/pre-close', { error: error instanceof Error ? error.message : String(error) })
        console.error('[TISS] Erro na verificação pré-fechamento do lote:', error);
        return NextResponse.json({ success: false, error: 'Erro interno ao verificar lote' }, { status: 500 });
    }
})
