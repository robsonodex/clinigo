import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { writeTissAudit } from '@/lib/tiss/audit';
import { normalizeBatchStatus } from '@/lib/tiss/state-machine';
import crypto from 'crypto';

export async function POST(
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
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const clinicId = profile.clinic_id;

        // 1. Buscar lote
        const { data: batch, error: batchError } = await supabase
            .from('tiss_batches')
            .select('*')
            .eq('id', batchId)
            .eq('clinic_id', clinicId)
            .single();

        if (batchError || !batch) {
            return NextResponse.json({ success: false, error: 'Lote não encontrado' }, { status: 404 });
        }

        const batchStatus = normalizeBatchStatus(batch.status);
        if (batchStatus !== 'OPEN') {
            return NextResponse.json({
                success: false,
                error: `O lote está com status "${batch.status}" e não pode ser fechado. Apenas lotes abertos podem ser fechados.`,
                code: 'INVALID_STATUS'
            }, { status: 409 });
        }

        // 2. Buscar guias vinculadas ao lote para validação
        const { data: guides, error: guidesError } = await supabase
            .from('tiss_guides')
            .select('id, guide_number, patient_name, patient_card_number, procedure_code, procedure_name, total_value, execution_date, status')
            .eq('batch_id', batchId)
            .eq('clinic_id', clinicId)
            .neq('status', 'CANCELLED')
            .order('id', { ascending: true });

        if (guidesError) {
            return NextResponse.json({ success: false, error: 'Erro ao verificar guias do lote' }, { status: 500 });
        }

        const guideList = guides || [];

        if (guideList.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Não é possível fechar o lote pois não há nenhuma guia vinculada.',
                code: 'EMPTY_BATCH',
                impedimentos: [{ guide_id: 'batch', guide_number: batch.batch_number, issues: ['Lote sem guias.'] }]
            }, { status: 422 });
        }

        // 3. Checagem de impeditivos por guia
        const impedimentos: Array<{ guide_id: string; guide_number: string; issues: string[] }> = [];

        for (const guide of guideList) {
            const issues: string[] = [];
            const procCode = (guide.procedure_code || '').trim();
            if (!procCode || procCode === '00000000' || procCode.length < 6) {
                issues.push('Código TUSS ausente ou inválido.');
            }
            const cardNum = (guide.patient_card_number || '').trim();
            if (!cardNum || cardNum.length < 3) {
                issues.push('Carteira do beneficiário ausente ou inválida.');
            }
            const totalVal = Number(guide.total_value) || 0;
            if (totalVal <= 0) {
                issues.push('Valor total menor ou igual a zero.');
            }
            if (!guide.execution_date) {
                issues.push('Data de execução ausente.');
            }

            if (issues.length > 0) {
                impedimentos.push({
                    guide_id: guide.id,
                    guide_number: guide.guide_number || 'Sem número',
                    issues
                });
            }
        }

        if (impedimentos.length > 0) {
            return NextResponse.json({
                success: false,
                error: 'Não é possível fechar o lote pois existem pendências impeditivas nas guias.',
                code: 'BATCH_IMPEDIMENTS_FOUND',
                impedimentos_count: impedimentos.length,
                impedimentos
            }, { status: 422 });
        }

        // 4. Calcular checksum oficial (SHA-256 sobre dados das guias)
        const checksumPayload = guideList
            .map(g => `${g.id}:${g.guide_number}:${Number(g.total_value).toFixed(2)}:${g.procedure_code}`)
            .join('|');
        const calculatedChecksum = crypto.createHash('sha256').update(checksumPayload).digest('hex');

        const closedAt = new Date().toISOString();
        const totalValue = guideList.reduce((acc, g) => acc + (Number(g.total_value) || 0), 0);

        // 5. Atualizar lote para VALID (compatibilidade com enum do banco) e registrar fechamento
        const { data: updatedBatch, error: updateError } = await supabase
            .from('tiss_batches')
            .update({
                status: 'VALID',
                closed_at: closedAt,
                closed_by: user.id,
                checksum: calculatedChecksum,
                total_guides: guideList.length,
                total_value: Number(totalValue.toFixed(2)),
                updated_at: closedAt
            })
            .eq('id', batchId)
            .eq('clinic_id', clinicId)
            .select()
            .single();

        if (updateError) {
            console.error('[TISS] Erro ao fechar lote:', updateError);
            return NextResponse.json({ success: false, error: 'Erro ao atualizar dados de fechamento do lote' }, { status: 500 });
        }

        // 6. Atualizar status de guias para IN_BATCH
        await supabase
            .from('tiss_guides')
            .update({ status: 'IN_BATCH', updated_at: closedAt })
            .eq('batch_id', batchId)
            .eq('clinic_id', clinicId);

        // 7. Gravar auditoria oficial
        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: 'lote.fechar',
            entityType: 'tiss_batch',
            entityId: batchId,
            previousState: { status: batch.status },
            newState: { status: 'VALID', closed_at: closedAt, checksum: calculatedChecksum },
            metadata: {
                total_guides: guideList.length,
                total_value: Number(totalValue.toFixed(2)),
                checksum: calculatedChecksum,
                closed_by: user.id,
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                batch: updatedBatch,
                checksum: calculatedChecksum,
                closed_at: closedAt,
                total_guides: guideList.length,
                total_value: Number(totalValue.toFixed(2)),
            },
            message: `Lote ${batch.batch_number} fechado com sucesso sem impeditivos.`
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao fechar lote:', error);
        return NextResponse.json({ success: false, error: 'Erro interno ao fechar o lote' }, { status: 500 });
    }
}
