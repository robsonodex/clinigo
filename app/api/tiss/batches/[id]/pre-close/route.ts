import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';

export interface GuideImpedimento {
    guide_id: string;
    guide_number: string;
    patient_name?: string;
    issues: string[];
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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
            .select('id, batch_number, status, total_guides, total_value')
            .eq('id', batchId)
            .eq('clinic_id', clinicId)
            .single();

        if (batchError || !batch) {
            return NextResponse.json({ success: false, error: 'Lote não encontrado' }, { status: 404 });
        }

        // 2. Buscar todas as guias vinculadas ao lote
        const { data: guides, error: guidesError } = await supabase
            .from('tiss_guides')
            .select('id, guide_number, patient_name, patient_card_number, procedure_code, procedure_name, total_value, execution_date, status')
            .eq('batch_id', batchId)
            .eq('clinic_id', clinicId)
            .neq('status', 'CANCELLED');

        if (guidesError) {
            return NextResponse.json({ success: false, error: 'Erro ao analisar guias do lote' }, { status: 500 });
        }

        const guideList = guides || [];
        const impedimentos: GuideImpedimento[] = [];

        // Validar lote vazio
        if (guideList.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    can_close: false,
                    total_guides: 0,
                    total_value: 0,
                    impedimentos: [{
                        guide_id: 'batch',
                        guide_number: batch.batch_number,
                        issues: ['O lote não possui nenhuma guia vinculada para fechamento.']
                    }]
                }
            });
        }

        // 3. Analisar cada guia individualmente
        for (const guide of guideList) {
            const issues: string[] = [];

            // Validação de procedimento TUSS
            const procCode = (guide.procedure_code || '').trim();
            if (!procCode || procCode === '00000000' || procCode.length < 6) {
                issues.push('Código de procedimento TUSS ausente ou inválido.');
            }

            // Validação de carteira do paciente
            const cardNum = (guide.patient_card_number || '').trim();
            if (!cardNum || cardNum.length < 3) {
                issues.push('Número da carteira do beneficiário ausente ou inválido.');
            }

            // Validação de valor financeiro
            const totalVal = Number(guide.total_value) || 0;
            if (totalVal <= 0) {
                issues.push('Valor total da guia menor ou igual a zero.');
            }

            // Validação de data de atendimento
            if (!guide.execution_date) {
                issues.push('Data de execução do atendimento não informada.');
            }

            if (issues.length > 0) {
                impedimentos.push({
                    guide_id: guide.id,
                    guide_number: guide.guide_number || 'Sem número',
                    patient_name: guide.patient_name || 'Paciente',
                    issues
                });
            }
        }

        const totalValue = guideList.reduce((acc, g) => acc + (Number(g.total_value) || 0), 0);
        const canClose = impedimentos.length === 0;

        return NextResponse.json({
            success: true,
            data: {
                can_close: canClose,
                total_guides: guideList.length,
                total_value: Number(totalValue.toFixed(2)),
                impedimentos_count: impedimentos.length,
                impedimentos,
            }
        });

    } catch (error: any) {
        console.error('[TISS] Erro na verificação pré-fechamento do lote:', error);
        return NextResponse.json({ success: false, error: 'Erro interno ao verificar lote' }, { status: 500 });
    }
}
