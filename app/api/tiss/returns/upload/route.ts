// app/api/tiss/returns/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * POST /api/tiss/returns/upload
 * Faz upload de arquivo de retorno da operadora
 */

const uploadSchema = z.object({
    batch_id: z.string().uuid('ID do lote inválido'),
    file_name: z.string().min(1, 'Nome do arquivo obrigatório'),
    file_type: z.enum(['XML', 'TXT', 'CSV']),
    file_content: z.string().min(1, 'Conteúdo do arquivo obrigatório'), // Base64 encoded
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
                { success: false, error: 'Sem permissão para fazer upload de retornos' },
                { status: 403 }
            );
        }

        const clinic_id = profile.clinic_id;

        // Parse body
        const body = await request.json();
        const validated = uploadSchema.parse(body);

        // Verificar se batch existe e pertence à clínica
        const { data: batch } = await supabase
            .from('tiss_batches')
            .select('id, batch_number, status')
            .eq('id', validated.batch_id)
            .eq('clinic_id', clinic_id)
            .single();

        if (!batch) {
            return NextResponse.json(
                { success: false, error: 'Lote não encontrado' },
                { status: 404 }
            );
        }

        // Verificar se lote foi enviado
        if (batch.status !== 'SENT' && batch.status !== 'PROCESSING') {
            return NextResponse.json(
                { success: false, error: 'Lote deve estar enviado antes de processar retorno' },
                { status: 400 }
            );
        }

        // Decodificar conteúdo do arquivo
        const fileBuffer = Buffer.from(validated.file_content, 'base64');

        // Upload do arquivo para Supabase Storage
        const filePath = `tiss-returns/${clinic_id}/${batch.batch_number}_${Date.now()}.${validated.file_type.toLowerCase()}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, fileBuffer, {
                contentType: validated.file_type === 'XML' ? 'application/xml' : 'text/plain',
                upsert: false,
            });

        if (uploadError) {
            console.error('[TISS] Erro ao fazer upload de retorno:', uploadError);
            return NextResponse.json(
                { success: false, error: 'Erro ao salvar arquivo de retorno' },
                { status: 500 }
            );
        }

        // Obter URL pública
        const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

        const returnFileUrl = urlData.publicUrl;

        // Criar registro de retorno
        const { data: returnRecord, error: returnError } = await supabase
            .from('tiss_returns')
            .insert({
                batch_id: validated.batch_id,
                clinic_id,
                return_file_url: returnFileUrl,
                return_file_name: validated.file_name,
                return_file_size: fileBuffer.length,
                file_type: validated.file_type,
                processing_status: 'PENDING',
                uploaded_by: user.id,
            })
            .select()
            .single();

        if (returnError) {
            console.error('[TISS] Erro ao criar registro de retorno:', returnError);
            return NextResponse.json(
                { success: false, error: 'Erro ao registrar retorno' },
                { status: 500 }
            );
        }

        // Atualizar status do batch
        await supabase
            .from('tiss_batches')
            .update({
                status: 'PROCESSING',
                return_file_url: returnFileUrl,
                return_processed_at: null, // Resetar, processamento pendente
            })
            .eq('id', validated.batch_id);

        // Log na timeline
        await supabase.rpc('log_batch_event', {
            p_batch_id: validated.batch_id,
            p_event_type: 'RETURN_UPLOADED',
            p_description: `Arquivo de retorno enviado: ${validated.file_name}`,
            p_metadata: {
                file_type: validated.file_type,
                file_size: fileBuffer.length,
                return_id: returnRecord.id,
            },
            p_user_id: user.id,
        });

        return NextResponse.json({
            success: true,
            data: returnRecord,
            message: 'Arquivo de retorno enviado com sucesso',
        }, { status: 201 });

    } catch (error: any) {
        console.error('[TISS] Erro no upload de retorno:', error);

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
