import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { writeTissAudit } from '@/lib/tiss/audit';

// POST /api/tiss/appeals/[id]/attachments - Anexar comprovante ou vincular do prontuário (C4)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireTissAction(request, 'recurso.anexar');
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
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const clinicId = profile.clinic_id;

        // 1. Verificar se o recurso existe e pertence à clínica
        const { data: appeal, error: appealError } = await supabase
            .from('tiss_appeals')
            .select('id, appeal_number, status')
            .eq('id', appealId)
            .eq('clinic_id', clinicId)
            .single();

        if (appealError || !appeal) {
            return NextResponse.json({ success: false, error: 'Recurso de glosa não encontrado' }, { status: 404 });
        }

        const contentType = request.headers.get('content-type') || '';
        let fileName = '';
        let storagePath = '';
        let fileSize = 0;
        let sourceType: 'UPLOAD' | 'PRONTUARIO' = 'UPLOAD';
        let sourceDocumentId: string | null = null;

        if (contentType.includes('multipart/form-data')) {
            // Upload direto de arquivo em bucket privado
            const formData = await request.formData();
            const file = formData.get('file') as File | null;

            if (!file || file.size === 0) {
                return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado' }, { status: 400 });
            }

            fileName = file.name;
            fileSize = file.size;
            sourceType = 'UPLOAD';

            const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            storagePath = `${clinicId}/appeals/${appealId}/${Date.now()}_${cleanName}`;
            const buffer = Buffer.from(await file.arrayBuffer());

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(storagePath, buffer, {
                    contentType: file.type || 'application/octet-stream',
                    upsert: false
                });

            if (uploadError) {
                console.error('[TISS Storage] Erro no upload de anexo de recurso:', uploadError);
                return NextResponse.json({ success: false, error: 'Erro ao salvar anexo no bucket privado' }, { status: 500 });
            }

        } else {
            // Vínculo explícito de documento do prontuário
            const body = await request.json();
            if (!body.source_document_id) {
                return NextResponse.json({ success: false, error: 'ID do documento do prontuário é obrigatório' }, { status: 400 });
            }

            sourceType = 'PRONTUARIO';
            sourceDocumentId = body.source_document_id;
            fileName = body.file_name || 'Documento do Prontuário';
            storagePath = body.storage_path || `prontuarios/${clinicId}/${sourceDocumentId}`;
            fileSize = body.file_size || 0;
        }

        const now = new Date().toISOString();

        // 2. Inserir anexo em tiss_appeal_attachments
        const { data: attachment, error: attachError } = await supabase
            .from('tiss_appeal_attachments')
            .insert({
                clinic_id: clinicId,
                appeal_id: appealId,
                file_name: fileName,
                storage_path: storagePath,
                file_size: fileSize,
                source_type: sourceType,
                source_document_id: sourceDocumentId,
                uploaded_by: user.id,
                created_at: now
            })
            .select()
            .single();

        if (attachError || !attachment) {
            console.error('[TISS] Erro ao registrar anexo no banco:', attachError);
            return NextResponse.json({ success: false, error: 'Erro ao registrar anexo de recurso' }, { status: 500 });
        }

        // 3. Gerar link assinado curto (60s)
        let signedUrl: string | null = null;
        if (storagePath) {
            const { data: signedData } = await supabase.storage
                .from('documents')
                .createSignedUrl(storagePath, 60);
            if (signedData?.signedUrl) {
                signedUrl = signedData.signedUrl;
            }
        }

        // 4. Gravar auditoria oficial
        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: 'recurso.anexar',
            entityType: 'tiss_appeal',
            entityId: appealId,
            metadata: {
                attachment_id: attachment.id,
                file_name: fileName,
                source_type: sourceType,
                source_document_id: sourceDocumentId,
                storage_path: storagePath
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                attachment,
                signed_url: signedUrl,
            },
            message: `Documento "${fileName}" anexado ao recurso com sucesso.`
        }, { status: 201 });

    } catch (error: any) {
        console.error('[TISS] Erro ao anexar documento ao recurso:', error);
        return NextResponse.json({ success: false, error: 'Erro interno ao anexar documento' }, { status: 500 });
    }
}
