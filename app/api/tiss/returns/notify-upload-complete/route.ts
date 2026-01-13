// app/api/tiss/returns/notify-upload-complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * POST /api/tiss/returns/notify-upload-complete
 * Cliente notifica que terminou o upload direto ao Storage
 * API dispara evento assíncrono para processar o arquivo
 */

const notifySchema = z.object({
    return_id: z.string().uuid('ID do retorno inválido'),
    storage_path: z.string().min(1, 'Caminho de storage obrigatório'),
    actual_file_size: z.number().positive().optional(), // Tamanho real após upload
});

export async function POST(request: NextRequest) {
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

        // Parse body
        const body = await request.json();
        const validated = notifySchema.parse(body);

        // Buscar registro de retorno
        const { data: returnRecord } = await supabase
            .from('tiss_returns')
            .select('*, batch:tiss_batches(batch_number)')
            .eq('id', validated.return_id)
            .eq('clinic_id', profile.clinic_id) // Verificar ownership
            .single();

        if (!returnRecord) {
            return NextResponse.json(
                { success: false, error: 'Retorno não encontrado ou sem permissão' },
                { status: 404 }
            );
        }

        // Verificar se ainda está PENDING
        if (returnRecord.processing_status !== 'PENDING') {
            return NextResponse.json(
                { success: false, error: `Retorno já está ${returnRecord.processing_status}` },
                { status: 400 }
            );
        }

        // Verificar se arquivo existe no storage
        const { data: fileData, error: fileError } = await supabase.storage
            .from('tiss-private')
            .list(validated.storage_path.split('/').slice(0, -1).join('/'), {
                search: validated.storage_path.split('/').pop(),
            });

        if (fileError || !fileData || fileData.length === 0) {
            console.error('[TISS] Arquivo não encontrado no storage:', fileError);

            // Marcar como erro
            await supabase.rpc('mark_return_error', {
                p_return_id: validated.return_id,
                p_error_message: 'Arquivo não encontrado no storage após upload',
                p_error_details: { storage_path: validated.storage_path },
            });

            return NextResponse.json(
                { success: false, error: 'Arquivo não encontrado no storage' },
                { status: 400 }
            );
        }

        // Atualizar tamanho real se fornecido
        if (validated.actual_file_size) {
            await supabase
                .from('tiss_returns')
                .update({ file_size: validated.actual_file_size })
                .eq('id', validated.return_id);
        }

        // Obter URL pública temporária (TTL 15 min) para o worker baixar
        const { data: urlData } = await supabase.storage
            .from('tiss-private')
            .createSignedUrl(validated.storage_path, 900); // 15 min

        if (!urlData) {
            return NextResponse.json(
                { success: false, error: 'Erro ao gerar URL de download interna' },
                { status: 500 }
            );
        }

        // DISPARAR EDGE FUNCTION V3 (ASYNC)
        const workerPayload = {
            return_id: validated.return_id,
            batch_id: returnRecord.batch_id,
            clinic_id: profile.clinic_id,
            storage_path: validated.storage_path,
            download_url: urlData.signedUrl,
            file_type: returnRecord.file_type,
        };

        // Invocar Edge Function assincronamente (não esperar resposta)
        supabase.functions.invoke('process-tiss-return-v3', {
            body: workerPayload
        }).catch((err: Error) => {
            console.error('[TISS] Erro ao invocar worker:', err.message);
        });

        // Log de upload concluído
        await supabase.rpc('add_processing_log', {
            p_return_id: validated.return_id,
            p_level: 'INFO',
            p_message: 'Upload concluído. Worker v3 acionado.',
            p_metadata: {
                file_size: validated.actual_file_size || returnRecord.file_size,
                storage_path: validated.storage_path,
                worker_version: 'v3',
            },
        });

        // Log na timeline do batch
        await supabase.rpc('log_batch_event', {
            p_batch_id: returnRecord.batch_id,
            p_event_type: 'RETURN_UPLOADED',
            p_description: `Arquivo de retorno enviado: ${returnRecord.return_file_name}`,
            p_metadata: {
                return_id: validated.return_id,
                file_size: validated.actual_file_size || returnRecord.file_size,
            },
            p_user_id: user.id,
        });

        return NextResponse.json({
            success: true,
            data: {
                return_id: validated.return_id,
                status: 'PROCESSING',
                message: 'Upload confirmado. Processamento iniciado.',
            },
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao notificar upload:', error);

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
