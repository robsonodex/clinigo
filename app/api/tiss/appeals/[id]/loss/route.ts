import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { writeTissAudit } from '@/lib/tiss/audit';
import { z } from 'zod';

const lossSchema = z.object({
    loss_reason: z.string().min(10, 'A justificativa do registro de perda deve ter ao menos 10 caracteres'),
});

// POST /api/tiss/appeals/[id]/loss - Registrar perda quando prazo expira ou operadora nega definitivamente (C5)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireTissAction(request, 'recurso.justificar');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { id: appealId } = await params;
        const body = await request.json();
        const validated = lossSchema.parse(body);

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

        // 1. Buscar recurso
        const { data: appeal, error: appealError } = await supabase
            .from('tiss_appeals')
            .select('*')
            .eq('id', appealId)
            .eq('clinic_id', clinicId)
            .single();

        if (appealError || !appeal) {
            return NextResponse.json({ success: false, error: 'Recurso não encontrado' }, { status: 404 });
        }

        const now = new Date().toISOString();

        // 2. Atualizar recurso para FINISHED e registrar dados da perda
        const { data: updatedAppeal, error: updateError } = await supabase
            .from('tiss_appeals')
            .update({
                status: 'FINISHED',
                is_loss_registered: true,
                loss_reason: validated.loss_reason,
                loss_registered_at: now,
                loss_registered_by: user.id,
                total_recovered_value: 0.00,
                updated_at: now
            })
            .eq('id', appealId)
            .eq('clinic_id', clinicId)
            .select()
            .single();

        if (updateError) {
            return NextResponse.json({ success: false, error: 'Erro ao registrar perda no recurso' }, { status: 500 });
        }

        // 3. Atualizar itens para DENIED
        const { data: items } = await supabase
            .from('tiss_appeal_items')
            .update({
                status: 'DENIED',
                recovered_value: 0.00
            })
            .eq('appeal_id', appealId)
            .eq('clinic_id', clinicId)
            .select('guide_id');

        // 4. Atualizar guias para DEFINITIVE_LOSS
        const guideIds = Array.from(new Set((items || []).map(i => i.guide_id).filter(Boolean)));
        if (guideIds.length > 0) {
            await supabase
                .from('tiss_guides')
                .update({ status: 'DEFINITIVE_LOSS', updated_at: now })
                .in('id', guideIds)
                .eq('clinic_id', clinicId);
        }

        // 5. Gravar auditoria oficial
        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: 'recurso.registrar_perda',
            entityType: 'tiss_appeal',
            entityId: appealId,
            previousState: { status: appeal.status },
            newState: { status: 'FINISHED', is_loss_registered: true, loss_reason: validated.loss_reason },
            metadata: {
                loss_reason: validated.loss_reason,
                appeal_number: appeal.appeal_number,
                total_glosa_value: appeal.total_glosa_value,
                guide_ids: guideIds
            }
        });

        return NextResponse.json({
            success: true,
            data: updatedAppeal,
            message: `Perda registrada com sucesso para o recurso ${appeal.appeal_number}. As guias foram atualizadas para perda definitiva.`
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao registrar perda de recurso:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Erro interno ao registrar perda' }, { status: 500 });
    }
}
