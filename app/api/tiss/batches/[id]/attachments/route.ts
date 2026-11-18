import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { writeTissAudit } from '@/lib/tiss/audit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tiss/batches/[id]/attachments - Lista os Anexos TISS-ANS da remessa
 */
export const GET = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireTissAction(request, 'lote.ver');
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

        const adminDb = createServiceRoleClient() as any;
        const { data: profile } = await adminDb
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        const clinicId = profile?.clinic_id || guard.session.clinicId;
        if (!clinicId) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const { data: batch } = await adminDb
            .from('tiss_batches')
            .select('id, batch_number, xml_file_url, xml_generated_at, return_file_url, return_processed_at, return_analysis_xml_url, return_payment_xml_url, receipt_proof_url, protocol_number, submitted_at, hash_value, hash_algorithm')
            .eq('id', batchId)
            .eq('clinic_id', clinicId)
            .maybeSingle();

        if (!batch) {
            return NextResponse.json({ success: false, error: 'Remessa não encontrada' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                batch_number: batch.batch_number,
                attachments: [
                    {
                        key: 'cobranca_xml',
                        label: 'XML de Cobrança (ENVIO_LOTE_GUIAS)',
                        present: Boolean(batch.xml_file_url),
                        url: batch.xml_file_url,
                        timestamp: batch.xml_generated_at,
                        meta: batch.hash_value ? `${batch.hash_algorithm || 'SHA256'}: ${String(batch.hash_value).slice(0, 12)}...` : null,
                    },
                    {
                        key: 'demonstrativo_analise',
                        label: 'XML Demonstrativo de Análise de Conta',
                        present: Boolean(batch.return_analysis_xml_url || batch.return_file_url),
                        url: batch.return_analysis_xml_url || batch.return_file_url,
                        timestamp: batch.return_processed_at,
                    },
                    {
                        key: 'demonstrativo_pagamento',
                        label: 'XML Demonstrativo de Pagamento',
                        present: Boolean(batch.return_payment_xml_url),
                        url: batch.return_payment_xml_url,
                        timestamp: batch.return_processed_at,
                    },
                    {
                        key: 'recibo_protocolo',
                        label: 'Recibo / Protocolo de Envio na Operadora',
                        present: Boolean(batch.receipt_proof_url || batch.protocol_number),
                        url: batch.receipt_proof_url,
                        timestamp: batch.submitted_at,
                        meta: batch.protocol_number ? `Protocolo: ${batch.protocol_number}` : null,
                    },
                ],
            },
        });
    } catch (err: any) {
        request.log.error('tiss/batches/[id]/attachments GET', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ success: false, error: err.message || 'Erro ao carregar anexos TISS-ANS' }, { status: 500 });
    }
});

/**
 * POST /api/tiss/batches/[id]/attachments - Anexa XML de Análise ou Pagamento / Comprovante
 */
export const POST = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
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

        const adminDb = createServiceRoleClient() as any;
        const { data: profile } = await adminDb
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        const clinicId = profile?.clinic_id || guard.session.clinicId;
        if (!clinicId) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const formData = await request.formData().catch(() => null);
        if (!formData) {
            return NextResponse.json({ success: false, error: 'Envio multipart/form-data obrigatório com tipo e arquivo.' }, { status: 400 });
        }
        const kind = String(formData.get('kind') || '');
        const file = formData.get('file') as File | null;

        if (!['demonstrativo_analise', 'demonstrativo_pagamento', 'recibo_protocolo'].includes(kind)) {
            return NextResponse.json({ success: false, error: 'Tipo de anexo inválido.' }, { status: 400 });
        }
        if (!file || file.size === 0) {
            return NextResponse.json({ success: false, error: 'Selecione um arquivo válido.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${clinicId}/tiss-attachments/${batchId}/${Date.now()}_${kind}_${cleanName}`;

        const { error: uploadError } = await adminDb.storage
            .from('documents')
            .upload(filePath, buffer, {
                contentType: file.type || 'application/xml',
                upsert: false,
            });

        if (uploadError) {
            return NextResponse.json({ success: false, error: `Falha ao salvar anexo: ${uploadError.message}` }, { status: 500 });
        }

        const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
        if (kind === 'demonstrativo_analise') updatePayload.return_analysis_xml_url = filePath;
        if (kind === 'demonstrativo_pagamento') updatePayload.return_payment_xml_url = filePath;
        if (kind === 'recibo_protocolo') updatePayload.receipt_proof_url = filePath;

        const { error: upErr } = await adminDb
            .from('tiss_batches')
            .update(updatePayload)
            .eq('id', batchId)
            .eq('clinic_id', clinicId);

        if (upErr) {
            return NextResponse.json({ success: false, error: upErr.message }, { status: 500 });
        }

        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: 'TISS_BATCH_ATTACHMENT_ADDED',
            entityType: 'tiss_batch',
            entityId: batchId,
            newState: { kind, file_name: file.name, storage_path: filePath },
            customSupabase: adminDb,
        });

        return NextResponse.json({
            success: true,
            storage_path: filePath,
            message: 'Anexo TISS-ANS registrado com sucesso na remessa.',
        });
    } catch (err: any) {
        request.log.error('tiss/batches/[id]/attachments POST', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ success: false, error: err.message || 'Erro ao anexar arquivo na remessa' }, { status: 500 });
    }
});

