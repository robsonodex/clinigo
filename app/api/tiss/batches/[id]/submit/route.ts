// app/api/tiss/batches/[id]/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * POST /api/tiss/batches/[id]/submit
 * Marca lote como enviado para a operadora
 */

const submitSchema = z.object({
    protocol_number: z.string().optional(),
    submission_date: z.string().optional(), // ISO date
    notes: z.string().optional(),
});

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();

        // Verificar autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Não autenticado' },
                { status: 401 }
            );
        }

        // Obter clinic_id do usuário
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json(
                { success: false, error: 'Clínica não encontrada' },
                { status: 403 }
            );
        }

        // Verificar permissão
        if (profile.role !== 'CLINIC_ADMIN' && profile.role !== 'SUPER_ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Sem permissão para enviar lotes' },
                { status: 403 }
            );
        }

        const batch_id = params.id;

        // Parse body
        const body = await request.json();
        const validated = submitSchema.parse(body);

        // Buscar lote
        const { data: batch } = await supabase
            .from('tiss_batches')
            .select('status, xml_file_url')
            .eq('id', batch_id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!batch) {
            return NextResponse.json(
                { success: false, error: 'Lote não encontrado' },
                { status: 404 }
            );
        }

        // Verificar se XML foi gerado
        if (!batch.xml_file_url) {
            return NextResponse.json(
                { success: false, error: 'Gere o XML antes de marcar como enviado' },
                { status: 400 }
            );
        }

        // Verificar se lote não foi enviado ainda
        if (batch.status !== 'DRAFT' && batch.status !== 'VALID') {
            return NextResponse.json(
                { success: false, error: 'Lote já foi enviado anteriormente' },
                { status: 400 }
            );
        }

        // Atualizar lote
        const { data: updatedBatch, error: updateError } = await supabase
            .from('tiss_batches')
            .update({
                status: 'SENT',
                submission_date: validated.submission_date || new Date().toISOString().split('T')[0],
                protocol_number: validated.protocol_number || null,
                notes: validated.notes || null,
                submitted_by: user.id,
                submitted_at: new Date().toISOString(),
            })
            .eq('id', batch_id)
            .select()
            .single();

        if (updateError) {
            console.error('[TISS] Erro ao marcar lote como enviado:', updateError);
            return NextResponse.json(
                { success: false, error: 'Erro ao atualizar lote' },
                { status: 500 }
            );
        }

        // Atualizar status das guias
        await supabase
            .from('tiss_guides')
            .update({ status: 'SENT', sent_at: new Date().toISOString() })
            .eq('batch_id', batch_id)
            .eq('status', 'PENDING');

        return NextResponse.json({
            success: true,
            data: updatedBatch,
            message: 'Lote marcado como enviado com sucesso',
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao submeter lote:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Dados inválidos', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
