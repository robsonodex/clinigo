// app/api/tiss/returns/generate-upload-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import crypto from 'crypto';

/**
 * POST /api/tiss/returns/generate-upload-url
 * Gera URL assinada para upload DIRETO ao Supabase Storage (bucket privado)
 * Cliente faz upload sem passar pelo servidor Next.js
 */

const generateUrlSchema = z.object({
    batch_id: z.string().uuid('ID do lote inválido'),
    file_name: z.string().min(1, 'Nome do arquivo obrigatório'),
    file_type: z.enum(['XML', 'TXT', 'CSV']),
    file_size: z.number().positive('Tamanho deve ser positivo').max(100 * 1024 * 1024, 'Arquivo muito grande (máx 100MB)'), // Max 100MB
    checksum: z.string().optional(), // SHA-256 do arquivo (cliente calcula)
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
        const validated = generateUrlSchema.parse(body);

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

        // Gerar nome único do arquivo no storage
        const timestamp = Date.now();
        const randomId = crypto.randomBytes(8).toString('hex');
        const extension = validated.file_type.toLowerCase();
        const storagePath = `tiss-returns/${clinic_id}/${batch.batch_number}_${timestamp}_${randomId}.${extension}`;

        // Criar registro no banco (status PENDING)
        const { data: returnRecord, error: insertError } = await supabase
            .from('tiss_returns')
            .insert({
                batch_id: validated.batch_id,
                clinic_id,
                return_file_name: validated.file_name,
                file_type: validated.file_type,
                file_size: validated.file_size,
                processing_status: 'PENDING',
                storage_path: storagePath,
                checksum: validated.checksum || null,
                uploaded_by: user.id,
            })
            .select()
            .single();

        if (insertError) {
            console.error('[TISS] Erro ao criar registro de retorno:', insertError);
            return NextResponse.json(
                { success: false, error: 'Erro ao registrar retorno' },
                { status: 500 }
            );
        }

        // Gerar presigned URL para upload (válido por 15 minutos)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('tiss-private') // Bucket PRIVADO
            .createSignedUploadUrl(storagePath, {
                upsert: false, // Não permitir sobrescrever
            });

        if (signedUrlError || !signedUrlData) {
            console.error('[TISS] Erro ao gerar presigned URL:', signedUrlError);

            // Deletar registro criado
            await supabase
                .from('tiss_returns')
                .delete()
                .eq('id', returnRecord.id);

            return NextResponse.json(
                { success: false, error: 'Erro ao gerar URL de upload' },
                { status: 500 }
            );
        }

        // Log inicial
        await supabase.rpc('add_processing_log', {
            p_return_id: returnRecord.id,
            p_level: 'INFO',
            p_message: 'Presigned URL gerada. Aguardando upload do cliente.',
            p_metadata: {
                file_name: validated.file_name,
                file_size: validated.file_size,
                storage_path: storagePath,
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                return_id: returnRecord.id,
                upload_url: signedUrlData.signedUrl, // Cliente usa essa URL
                token: signedUrlData.token, // Token necessário para upload
                storage_path: storagePath,
                expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
            },
            message: 'URL de upload gerada. Válida por 15 minutos.',
        }, { status: 201 });

    } catch (error: any) {
        console.error('[TISS] Erro ao gerar URL de upload:', error);

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
