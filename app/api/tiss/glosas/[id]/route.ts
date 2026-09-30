import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { writeTissAudit } from '@/lib/tiss/audit';

// DELETE /api/tiss/glosas/[id] - Desfazer glosa manual (R3)
// Regra: Desfazer só se não houver recurso ativo ou vinculado
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireTissAction(request, 'retorno.desfazer');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { id: glosaId } = await params;
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

        // 1. Buscar a glosa
        const { data: glosa, error: glosaError } = await supabase
            .from('tiss_glosas')
            .select('*')
            .eq('id', glosaId)
            .eq('clinic_id', clinicId)
            .single();

        if (glosaError || !glosa) {
            return NextResponse.json({ success: false, error: 'Glosa não encontrada' }, { status: 404 });
        }

        if (glosa.deleted_at || glosa.status === 'CANCELLED') {
            return NextResponse.json({ success: false, error: 'Esta glosa já foi cancelada anteriormente' }, { status: 400 });
        }

        // 2. Trava Inviolável: verificar se existe recurso vinculado à glosa
        // Checagem em tiss_appeal_items (C1-C8)
        const { data: appealItem } = await supabase
            .from('tiss_appeal_items')
            .select('id, appeal_id, status')
            .eq('glosa_id', glosaId)
            .eq('clinic_id', clinicId)
            .maybeSingle();

        if (appealItem) {
            return NextResponse.json({
                success: false,
                error: 'Não é possível desfazer a glosa pois ela possui um recurso de glosa formal em andamento ou vinculado.',
                code: 'APPEAL_EXISTS_FOR_GLOSA',
                appeal_item_id: appealItem.id
            }, { status: 409 });
        }

        // Checagem em tiss_glosa_contests (legado)
        const { data: contestItem } = await supabase
            .from('tiss_glosa_contests')
            .select('id, contest_status')
            .eq('glosa_id', glosaId)
            .neq('contest_status', 'CANCELLED')
            .maybeSingle();

        if (contestItem) {
            return NextResponse.json({
                success: false,
                error: 'Não é possível desfazer a glosa pois ela possui uma contestação ativa registrada.',
                code: 'CONTEST_EXISTS_FOR_GLOSA',
                contest_id: contestItem.id
            }, { status: 409 });
        }

        const now = new Date().toISOString();

        // 3. Cancelar a glosa (soft-delete seguro)
        await supabase
            .from('tiss_glosas')
            .update({
                status: 'CANCELLED',
                deleted_at: now
            })
            .eq('id', glosaId)
            .eq('clinic_id', clinicId);

        // 4. Recalcular saldo e status da guia associada
        if (glosa.guide_id) {
            const { data: remainingGlosas } = await supabase
                .from('tiss_glosas')
                .select('glosa_value')
                .eq('guide_id', glosa.guide_id)
                .eq('clinic_id', clinicId)
                .is('deleted_at', null)
                .neq('status', 'CANCELLED');

            const { data: guide } = await supabase
                .from('tiss_guides')
                .select('id, total_value, batch_id')
                .eq('id', glosa.guide_id)
                .single();

            if (guide) {
                const totalGlosasRestantes = (remainingGlosas || []).reduce((acc, g) => acc + (Number(g.glosa_value) || 0), 0);
                const guideTotal = Number(guide.total_value) || 0;
                const novoValorPago = Math.max(0, guideTotal - totalGlosasRestantes);

                let statusRestaurado = 'SENT';
                if (totalGlosasRestantes === 0) {
                    statusRestaurado = novoValorPago > 0 ? 'PAID' : (guide.batch_id ? 'IN_BATCH' : 'VALIDATED');
                } else {
                    statusRestaurado = novoValorPago > 0 ? 'PARTIALLY_GLOSED' : 'TOTALLY_GLOSED';
                }

                await supabase
                    .from('tiss_guides')
                    .update({
                        glosa_value: totalGlosasRestantes,
                        paid_value: novoValorPago,
                        status: statusRestaurado,
                        updated_at: now
                    })
                    .eq('id', glosa.guide_id);
            }
        }

        // 5. Cancelar lançamento financeiro pendente se houver
        await supabase
            .from('financial_entries')
            .update({ status: 'CANCELLED' })
            .eq('clinic_id', clinicId)
            .eq('category', 'GLOSA_CONVENIO')
            .ilike('description', `%${glosa.glosa_code}%`)
            .eq('status', 'PENDING');

        // 6. Gravar auditoria oficial
        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: 'retorno.desfazer_glosa_manual',
            entityType: 'tiss_glosa',
            entityId: glosaId,
            previousState: { status: glosa.status, glosa_value: glosa.glosa_value },
            newState: { status: 'CANCELLED', deleted_at: now },
            metadata: {
                glosa_code: glosa.glosa_code,
                glosa_value: glosa.glosa_value,
                guide_id: glosa.guide_id,
            }
        });

        return NextResponse.json({
            success: true,
            message: `Glosa ${glosa.glosa_code} estornada com sucesso e saldo da guia restaurado.`
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao desfazer glosa manual:', error);
        return NextResponse.json({ success: false, error: 'Erro interno ao desfazer glosa' }, { status: 500 });
    }
}
