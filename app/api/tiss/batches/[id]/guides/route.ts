import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { writeTissAudit } from '@/lib/tiss/audit';
import { normalizeBatchStatus, normalizeGuideStatus } from '@/lib/tiss/state-machine';
import { z } from 'zod';

const guideActionSchema = z.object({
    action: z.enum(['link', 'unlink']),
    guide_ids: z.array(z.string().uuid()).min(1, 'Selecione ao menos uma guia'),
});

// GET: Lista guias vinculadas ao lote e guias elegíveis para vinculação (L2)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireTissAction(request, 'lote.ver');
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

        // 1. Buscar dados do lote
        const { data: batch, error: batchError } = await supabase
            .from('tiss_batches')
            .select('id, batch_number, status, insurance_company_id, total_guides, total_value')
            .eq('id', batchId)
            .eq('clinic_id', clinicId)
            .single();

        if (batchError || !batch) {
            return NextResponse.json({ success: false, error: 'Lote não encontrado' }, { status: 404 });
        }

        // 2. Buscar guias atualmente vinculadas ao lote
        const { data: linkedGuides, error: linkedError } = await supabase
            .from('tiss_guides')
            .select('id, guide_number, guide_type, patient_name, procedure_code, procedure_name, total_value, status, created_at')
            .eq('batch_id', batchId)
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false });

        if (linkedError) {
            return NextResponse.json({ success: false, error: 'Erro ao buscar guias do lote' }, { status: 500 });
        }

        // 3. Buscar guias elegíveis para vinculação (mesma clínica, mesma operadora se houver, sem lote, não canceladas)
        let eligibleQuery = supabase
            .from('tiss_guides')
            .select('id, guide_number, guide_type, patient_name, procedure_code, procedure_name, total_value, status, created_at')
            .eq('clinic_id', clinicId)
            .is('batch_id', null)
            .neq('status', 'CANCELLED');

        // Se o lote estiver associado a uma operadora, filtrar guias dessa mesma operadora
        if (batch.insurance_company_id) {
            eligibleQuery = eligibleQuery.or(`operator_id.eq.${batch.insurance_company_id},health_insurance_id.eq.${batch.insurance_company_id}`);
        }

        const { data: eligibleGuides, error: eligibleError } = await eligibleQuery
            .order('created_at', { ascending: false })
            .limit(100);

        if (eligibleError) {
            return NextResponse.json({ success: false, error: 'Erro ao buscar guias elegíveis' }, { status: 500 });
        }

        const linkedList = linkedGuides || [];
        const eligibleList = eligibleGuides || [];

        const totalLinkedValue = linkedList.reduce((acc, g) => acc + (Number(g.total_value) || 0), 0);
        const totalEligibleValue = eligibleList.reduce((acc, g) => acc + (Number(g.total_value) || 0), 0);

        return NextResponse.json({
            success: true,
            data: {
                batch,
                linked_guides: linkedList,
                eligible_guides: eligibleList,
                summary: {
                    linked_count: linkedList.length,
                    linked_value: Number(totalLinkedValue.toFixed(2)),
                    eligible_count: eligibleList.length,
                    eligible_value: Number(totalEligibleValue.toFixed(2)),
                    is_batch_open: ['OPEN', 'DRAFT'].includes(normalizeBatchStatus(batch.status)),
                }
            }
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao listar guias do lote:', error);
        return NextResponse.json({ success: false, error: 'Erro interno ao consultar guias do lote' }, { status: 500 });
    }
}

// POST: Vincular ou desvincular guias do lote com recálculo ao vivo (L2)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: batchId } = await params;
        const body = await request.json();
        const validated = guideActionSchema.parse(body);

        const requiredAction = validated.action === 'link' ? 'lote.vincular_guias' : 'lote.remover_guias';
        const guard = await requireTissAction(request, requiredAction);
        if (!guard.authorized) {
            return guard.response;
        }

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

        // 1. Verificar lote e seu status
        const { data: batch, error: batchError } = await supabase
            .from('tiss_batches')
            .select('id, batch_number, status, insurance_company_id, total_guides, total_value')
            .eq('id', batchId)
            .eq('clinic_id', clinicId)
            .single();

        if (batchError || !batch) {
            return NextResponse.json({ success: false, error: 'Lote não encontrado' }, { status: 404 });
        }

        const currentStatusNormalized = normalizeBatchStatus(batch.status);
        if (currentStatusNormalized !== 'OPEN') {
            return NextResponse.json({
                success: false,
                error: 'Não é possível alterar guias de um lote fechado ou enviado. Reabra o lote antes de modificar.',
                code: 'BATCH_NOT_OPEN'
            }, { status: 409 });
        }

        // 2. Executar ação de vincular ou desvincular
        if (validated.action === 'link') {
            // Verificar se as guias pertencem à mesma clínica e operadora
            const { data: guidesToLink } = await supabase
                .from('tiss_guides')
                .select('id, guide_number, status, total_value, operator_id, health_insurance_id')
                .in('id', validated.guide_ids)
                .eq('clinic_id', clinicId)
                .neq('status', 'CANCELLED');

            if (!guidesToLink || guidesToLink.length === 0) {
                return NextResponse.json({ success: false, error: 'Nenhuma guia elegível encontrada para vincular' }, { status: 400 });
            }

            // Validar operadora se o lote tiver restrição
            if (batch.insurance_company_id) {
                const invalidOpGuide = guidesToLink.find(g => {
                    const op = g.operator_id || g.health_insurance_id;
                    return op && op !== batch.insurance_company_id;
                });
                if (invalidOpGuide) {
                    return NextResponse.json({
                        success: false,
                        error: `A guia ${invalidOpGuide.guide_number} pertence a operadora diferente do lote.`
                    }, { status: 400 });
                }
            }

            // Atualizar guias para batch_id e status IN_BATCH
            await supabase
                .from('tiss_guides')
                .update({
                    batch_id: batchId,
                    status: 'IN_BATCH',
                    updated_at: new Date().toISOString()
                })
                .in('id', validated.guide_ids)
                .eq('clinic_id', clinicId);

        } else {
            // Unlink: remover guias do lote e retornar para VALIDATED
            await supabase
                .from('tiss_guides')
                .update({
                    batch_id: null,
                    status: 'VALIDATED',
                    updated_at: new Date().toISOString()
                })
                .in('id', validated.guide_ids)
                .eq('batch_id', batchId)
                .eq('clinic_id', clinicId);
        }

        // 3. Recalcular contadores e valor total do lote
        const { data: updatedGuides } = await supabase
            .from('tiss_guides')
            .select('id, total_value')
            .eq('batch_id', batchId)
            .eq('clinic_id', clinicId)
            .neq('status', 'CANCELLED');

        const newTotalGuides = updatedGuides?.length || 0;
        const newTotalValue = (updatedGuides || []).reduce((acc, g) => acc + (Number(g.total_value) || 0), 0);

        const { data: updatedBatch } = await supabase
            .from('tiss_batches')
            .update({
                total_guides: newTotalGuides,
                total_value: Number(newTotalValue.toFixed(2)),
                updated_at: new Date().toISOString()
            })
            .eq('id', batchId)
            .eq('clinic_id', clinicId)
            .select()
            .single();

        // 4. Gravar auditoria
        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: validated.action === 'link' ? 'lote.vincular_guias' : 'lote.remover_guias',
            entityType: 'tiss_batch',
            entityId: batchId,
            metadata: {
                action: validated.action,
                guide_count_affected: validated.guide_ids.length,
                new_total_guides: newTotalGuides,
                new_total_value: Number(newTotalValue.toFixed(2)),
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                batch: updatedBatch,
                total_guides: newTotalGuides,
                total_value: Number(newTotalValue.toFixed(2)),
                affected_guides: validated.guide_ids.length,
            },
            message: validated.action === 'link'
                ? `${validated.guide_ids.length} guia(s) vinculada(s) ao lote com sucesso.`
                : `${validated.guide_ids.length} guia(s) desvinculada(s) do lote com sucesso.`
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao vincular/desvincular guias do lote:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Erro interno ao processar guias do lote' }, { status: 500 });
    }
}
