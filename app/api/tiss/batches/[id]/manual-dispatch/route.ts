import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { writeTissAudit } from '@/lib/tiss/audit';
import { normalizeBatchStatus } from '@/lib/tiss/state-machine';
import { z } from 'zod';

const manualDispatchSchema = z.object({
    protocol_number: z.string().min(3, 'Número do protocolo deve ter ao menos 3 caracteres'),
    submission_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de envio deve estar no formato AAAA-MM-DD'),
    dispatch_channel: z.enum(['PORTAL', 'CORREIOS', 'MENSAGEIRO', 'EMAIL'], {
        errorMap: () => ({ message: 'Canal inválido. Opções: PORTAL, CORREIOS, MENSAGEIRO, EMAIL' })
    }),
    proof_storage_path: z.string().optional(),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireTissAction(request, 'lote.registrar_envio');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { id: batchId } = await params;
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

        // 1. Buscar lote
        const { data: batch, error: batchError } = await supabase
            .from('tiss_batches')
            .select('*')
            .eq('id', batchId)
            .eq('clinic_id', clinicId)
            .single();

        if (batchError || !batch) {
            return NextResponse.json({ success: false, error: 'Lote não encontrado' }, { status: 404 });
        }

        // L7 (envio manual): só para lote VALID/CLOSED, nunca DRAFT/OPEN, pela state-machine (409)
        const batchStatus = normalizeBatchStatus(batch.status);
        if (batchStatus !== 'CLOSED' && batch.status !== 'VALID') {
            return NextResponse.json({
                success: false,
                error: `O lote está com status "${batch.status}" e não pode ser despachado manualmente. O lote precisa estar fechado (VALID/CLOSED) antes do envio manual.`,
                code: 'INVALID_STATUS'
            }, { status: 409 });
        }

        // Processar payload (JSON ou FormData com arquivo de comprovante)
        let protocolNumber = '';
        let submissionDate = '';
        let dispatchChannel: 'PORTAL' | 'CORREIOS' | 'MENSAGEIRO' | 'EMAIL' = 'PORTAL';
        let proofStoragePath = '';

        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            protocolNumber = (formData.get('protocol_number') as string) || '';
            submissionDate = (formData.get('submission_date') as string) || new Date().toISOString().split('T')[0];
            dispatchChannel = ((formData.get('dispatch_channel') as string) || 'PORTAL') as any;

            const file = formData.get('proof_file') as File | null;
            if (file && file.size > 0) {
                const buffer = Buffer.from(await file.arrayBuffer());
                const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const filePath = `${clinicId}/proofs/${batchId}/${Date.now()}_${cleanName}`;

                const { error: uploadError } = await supabase.storage
                    .from('documents')
                    .upload(filePath, buffer, {
                        contentType: file.type || 'application/octet-stream',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('[TISS Storage] Erro no upload de comprovante:', uploadError);
                    return NextResponse.json({ success: false, error: 'Erro ao armazenar comprovante de envio em bucket privado' }, { status: 500 });
                }
                proofStoragePath = filePath;
            }
        } else {
            const body = await request.json();
            const validated = manualDispatchSchema.parse(body);
            protocolNumber = validated.protocol_number;
            submissionDate = validated.submission_date;
            dispatchChannel = validated.dispatch_channel;
            proofStoragePath = validated.proof_storage_path || '';
        }

        // Validar campos mínimos
        if (!protocolNumber || protocolNumber.trim().length < 3) {
            return NextResponse.json({ success: false, error: 'Protocolo de envio é obrigatório (mínimo 3 caracteres)' }, { status: 400 });
        }

        const now = new Date().toISOString();

        // 2. Atualizar lote para status SENT
        const { data: updatedBatch, error: updateError } = await supabase
            .from('tiss_batches')
            .update({
                status: 'SENT',
                protocol_number: protocolNumber.trim(),
                submission_date: submissionDate,
                dispatch_channel: dispatchChannel,
                receipt_proof_url: proofStoragePath || batch.receipt_proof_url || null,
                submitted_by: user.id,
                submitted_at: now,
                updated_at: now
            })
            .eq('id', batchId)
            .eq('clinic_id', clinicId)
            .select()
            .single();

        if (updateError) {
            console.error('[TISS] Erro ao atualizar status do lote:', updateError);
            return NextResponse.json({ success: false, error: 'Erro ao registrar envio do lote' }, { status: 500 });
        }

        // 3. Atualizar guias do lote para status SENT
        await supabase
            .from('tiss_guides')
            .update({
                status: 'SENT',
                sent_at: now,
                updated_at: now
            })
            .eq('batch_id', batchId)
            .eq('clinic_id', clinicId)
            .in('status', ['IN_BATCH', 'VALIDATED', 'VALID', 'PENDING']);

        // 4. Se houver caminho de comprovante no bucket privado, gerar URL assinada temporária (60s)
        let signedProofUrl: string | null = null;
        const targetPath = proofStoragePath || updatedBatch.receipt_proof_url;
        if (targetPath) {
            const { data: signedData } = await supabase.storage
                .from('documents')
                .createSignedUrl(targetPath, 60);
            if (signedData?.signedUrl) {
                signedProofUrl = signedData.signedUrl;
            }
        }

        // 5. Gravar auditoria oficial
        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: 'lote.registrar_envio',
            entityType: 'tiss_batch',
            entityId: batchId,
            previousState: { status: batch.status },
            newState: { status: 'SENT', protocol_number: protocolNumber, dispatch_channel: dispatchChannel },
            metadata: {
                protocol_number: protocolNumber,
                submission_date: submissionDate,
                dispatch_channel: dispatchChannel,
                proof_storage_path: targetPath,
                submitted_by: user.id
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                batch: updatedBatch,
                signed_proof_url: signedProofUrl
            },
            message: `Envio manual do lote ${batch.batch_number} registrado com sucesso sob o protocolo ${protocolNumber}.`
        });

    } catch (error: any) {
        console.error('[TISS] Erro no registro de envio manual:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Erro interno ao registrar envio manual' }, { status: 500 });
    }
}
