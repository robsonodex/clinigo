import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { writeTissAudit } from '@/lib/tiss/audit';
import { assertAppealTransition } from '@/lib/tiss/state-machine';
import { z } from 'zod';

const submitAppealSchema = z.object({
    protocol_number: z.string().min(3, 'O número de protocolo deve ter ao menos 3 caracteres'),
    submission_channel: z.enum(['PORTAL', 'CORREIOS', 'EMAIL'], {
        errorMap: () => ({ message: 'Canal inválido. Opções: PORTAL, CORREIOS, EMAIL' })
    }),
    submission_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD obrigatória'),
});

// POST /api/tiss/appeals/[id]/submit - Registrar envio formal do recurso (C7) com trava de prazo (C5)
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
        const body = await request.json();
        const validated = submitAppealSchema.parse(body);

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

        // 2. Trava de Prazo Vencido (C5)
        if (appeal.deadline_at) {
            const todayStr = new Date().toISOString().split('T')[0];
            if (todayStr > appeal.deadline_at) {
                return NextResponse.json({
                    success: false,
                    error: `O prazo legal deste recurso expirou em ${appeal.deadline_at}. O envio está bloqueado. Registre a perda definitiva com justificativa.`,
                    code: 'APPEAL_DEADLINE_EXPIRED',
                    deadline_at: appeal.deadline_at,
                    can_register_loss: true
                }, { status: 422 });
            }
        }

        // 3. Validar transição de estado via state-machine
        assertAppealTransition(appeal.status, 'SENT');

        const now = new Date().toISOString();

        // 4. Atualizar recurso para status SENT
        const { data: updatedAppeal, error: updateError } = await supabase
            .from('tiss_appeals')
            .update({
                status: 'SENT',
                protocol_number: validated.protocol_number.trim(),
                submission_channel: validated.submission_channel,
                submission_date: validated.submission_date,
                updated_at: now
            })
            .eq('id', appealId)
            .eq('clinic_id', clinicId)
            .select()
            .single();

        if (updateError) {
            return NextResponse.json({ success: false, error: 'Erro ao registrar envio do recurso' }, { status: 500 });
        }

        // 5. Atualizar itens para SENT
        await supabase
            .from('tiss_appeal_items')
            .update({ status: 'SENT' })
            .eq('appeal_id', appealId)
            .eq('clinic_id', clinicId);

        // 6. Gravar auditoria oficial
        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: 'recurso.liberar_envio',
            entityType: 'tiss_appeal',
            entityId: appealId,
            previousState: { status: appeal.status },
            newState: { status: 'SENT', protocol_number: validated.protocol_number, submission_channel: validated.submission_channel },
            metadata: {
                protocol_number: validated.protocol_number,
                submission_channel: validated.submission_channel,
                submission_date: validated.submission_date,
                appeal_number: appeal.appeal_number
            }
        });

        return NextResponse.json({
            success: true,
            data: updatedAppeal,
            message: `Envio do recurso ${appeal.appeal_number} registrado com sucesso sob o protocolo ${validated.protocol_number}.`
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao registrar envio do recurso:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message || 'Erro interno ao registrar envio' }, { status: 500 });
    }
}
