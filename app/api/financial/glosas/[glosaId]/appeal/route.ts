import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const putAppealSchema = z.object({
  action: z.enum(['MARK_SENT', 'MARK_APPROVED', 'MARK_DENIED']),
  appeal_response_value: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ glosaId: string }> }
) {
    try {
        const { glosaId } = await context.params;
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

        if (!profile?.clinic_id || !['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            return NextResponse.json({ success: false, error: 'Acesso negado para gerenciar recursos' }, { status: 403 });
        }

        const body = await request.json();
        const validated = putAppealSchema.parse(body);

        let updatePayload: any = {
            updated_at: new Date().toISOString()
        };

        if (validated.notes) {
            updatePayload.notes = validated.notes;
        }

        if (validated.action === 'MARK_SENT') {
            updatePayload.appeal_status = 'APPEAL_SENT';
            updatePayload.appeal_sent_at = new Date().toISOString();
        } else if (validated.action === 'MARK_APPROVED') {
            updatePayload.appeal_status = 'APPEAL_APPROVED';
            updatePayload.appeal_response_at = new Date().toISOString();
            if (validated.appeal_response_value !== undefined) {
                updatePayload.appeal_response_value = validated.appeal_response_value;
            }
        } else if (validated.action === 'MARK_DENIED') {
            updatePayload.appeal_status = 'APPEAL_DENIED';
            updatePayload.appeal_response_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('tiss_glosas')
            .update(updatePayload)
            .eq('id', glosaId)
            .eq('clinic_id', profile.clinic_id)
            .select()
            .single();

        if (error) {
            console.error('[FINANCIAL GLOSAS] Update appeal error:', error);
            return NextResponse.json({ success: false, error: 'Falha ao atualizar status do recurso' }, { status: 500 });
        }

        // Se foi aprovado, podemos querer devolver uma parte do dinheiro na tiss_guides?
        // Em um sistema real massivo sim, mas para esta versão a auditoria da glosa finalizada cobre a operação base.
        if (validated.action === 'MARK_APPROVED' && data) {
            // Fetch guide origin
            await supabase.from('tiss_guides')
                .update({ status: 'PAID' }) // Retornando do limbo
                .eq('id', data.guide_id)
                .eq('clinic_id', profile.clinic_id);
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Validation Error', details: error.errors }, { status: 400 });
        }
        console.error('[FINANCIAL GLOSAS] Erro Interno PUT:', error);
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
    }
}
