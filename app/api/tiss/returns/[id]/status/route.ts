// app/api/tiss/returns/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/tiss/returns/[id]/status
 * Verifica status do processamento de um retorno (para polling do cliente)
 */
export async function GET(
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

        // Obter clinic_id
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json(
                { success: false, error: 'Clínica não encontrada' },
                { status: 403 }
            );
        }

        const return_id = params.id;

        // Buscar status do retorno
        const { data: returnRecord, error } = await supabase
            .from('tiss_returns')
            .select(`
        id,
        processing_status,
        processing_error,
        error_details,
        total_guides_processed,
        total_approved,
        total_denied,
        total_partial,
        processing_started_at,
        processing_completed_at,
        processing_duration_ms,
        retry_count,
        parser_strategy,
        file_encoding,
        processing_logs
      `)
            .eq('id', return_id)
            .eq('clinic_id', profile.clinic_id) // Verificar ownership
            .single();

        if (error || !returnRecord) {
            return NextResponse.json(
                { success: false, error: 'Retorno não encontrado' },
                { status: 404 }
            );
        }

        //Calcular progresso estimado
        let progressPercentage = 0;
        if (returnRecord.processing_status === 'PENDING') progressPercentage = 0;
        else if (returnRecord.processing_status === 'PROCESSING') progressPercentage = 50;
        else if (returnRecord.processing_status === 'COMPLETED') progressPercentage = 100;
        else if (returnRecord.processing_status === 'ERROR') progressPercentage = 0;
        else if (returnRecord.processing_status === 'RETRY') progressPercentage = 25;

        return NextResponse.json({
            success: true,
            data: {
                return_id: returnRecord.id,
                processing_status: returnRecord.processing_status,
                progress_percentage: progressPercentage,
                processing_error: returnRecord.processing_error,
                error_details: returnRecord.error_details,
                total_guides_processed: returnRecord.total_guides_processed || 0,
                total_approved: returnRecord.total_approved || 0,
                total_denied: returnRecord.total_denied || 0,
                total_partial: returnRecord.total_partial || 0,
                processing_started_at: returnRecord.processing_started_at,
                processing_completed_at: returnRecord.processing_completed_at,
                processing_duration_ms: returnRecord.processing_duration_ms,
                retry_count: returnRecord.retry_count,
                parser_used: returnRecord.parser_strategy,
                encoding_detected: returnRecord.file_encoding,
                logs: returnRecord.processing_logs || [],
            },
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao buscar status:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
