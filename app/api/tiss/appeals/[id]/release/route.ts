import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { writeTissAudit } from '@/lib/tiss/audit';
import { assertAppealTransition } from '@/lib/tiss/state-machine';

// POST /api/tiss/appeals/[id]/release - Liberar recurso para envio (C6) com trava de prazo (C5)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireTissAction(request, 'recurso.liberar_envio');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { id: appealId } = await params;
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

        // 2. Trava de Prazo Vencido (C5): prazo vindo de appeal_deadline_days da operadora
        if (appeal.deadline_at) {
            const todayStr = new Date().toISOString().split('T')[0];
            if (todayStr > appeal.deadline_at) {
                return NextResponse.json({
                    success: false,
                    error: `O prazo legal para envio deste recurso expirou em ${appeal.deadline_at}. O envio está bloqueado. Registre a perda com a respectiva justificativa.`,
                    code: 'APPEAL_DEADLINE_EXPIRED',
                    deadline_at: appeal.deadline_at,
                    can_register_loss: true
                }, { status: 422 });
            }
        }

        // 3. Validar transição de estado via state-machine
        assertAppealTransition(appeal.status, 'RELEASED');

        const now = new Date().toISOString();

        // 4. Atualizar status
        const { data: updatedAppeal, error: updateError } = await supabase
            .from('tiss_appeals')
            .update({
                status: 'RELEASED',
                updated_at: now
            })
            .eq('id', appealId)
            .eq('clinic_id', clinicId)
            .select()
            .single();

        if (updateError) {
            return NextResponse.json({ success: false, error: 'Erro ao atualizar status do recurso' }, { status: 500 });
        }

        // 5. Atualizar itens
        await supabase
            .from('tiss_appeal_items')
            .update({ status: 'RELEASED' })
            .eq('appeal_id', appealId)
            .eq('clinic_id', clinicId);

        // 6. Gravar auditoria
        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: 'recurso.liberar_envio',
            entityType: 'tiss_appeal',
            entityId: appealId,
            previousState: { status: appeal.status },
            newState: { status: 'RELEASED' },
            metadata: {
                deadline_at: appeal.deadline_at,
                appeal_number: appeal.appeal_number
            }
        });

        return NextResponse.json({
            success: true,
            data: updatedAppeal,
            message: `Recurso ${appeal.appeal_number} liberado para envio com sucesso.`
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao liberar envio de recurso:', error);
        return NextResponse.json({ success: false, error: error.message || 'Erro interno ao liberar recurso' }, { status: 500 });
    }
}
