import { enforceTissAdministrativeGuard } from '@/lib/auth/tiss-role-guard';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';
interface ParsedReturnGuide {
    guide_number: string;
    protocol_number?: string;
    status: 'APPROVED' | 'DENIED' | 'PARTIAL';
    requested_value: number;
    approved_value: number;
    denied_value: number;
    glosa_code?: string;
    glosa_description?: string;
}

/**
 * Parser auxiliar para CSV de retorno de operadora
 * Formato esperado de cabeçalho: numero_guia;status;valor_apresentado;valor_pago;valor_glosado;codigo_glosa;motivo_glosa
 */
function parseCsvReturn(csvText: string): ParsedReturnGuide[] {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
    const guideNumIdx = headers.findIndex(h => h.includes('guia') || h.includes('numero'));
    const statusIdx = headers.findIndex(h => h.includes('status') || h.includes('situacao'));
    const reqValIdx = headers.findIndex(h => h.includes('apresentado') || h.includes('solicitado') || h.includes('total'));
    const paidValIdx = headers.findIndex(h => h.includes('pago') || h.includes('liberado') || h.includes('aprovado'));
    const glosaValIdx = headers.findIndex(h => h.includes('glosa') || h.includes('negado'));
    const glosaCodeIdx = headers.findIndex(h => h.includes('codigo') || h.includes('motivo_codigo'));
    const glosaDescIdx = headers.findIndex(h => h.includes('motivo') || h.includes('descricao') || h.includes('justificativa'));

    const results: ParsedReturnGuide[] = [];

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(delimiter).map(p => p.trim());
        if (parts.length <= 1) continue;

        const guideNumber = guideNumIdx >= 0 ? parts[guideNumIdx] : parts[0];
        const statusRaw = (statusIdx >= 0 ? parts[statusIdx] : '').toUpperCase();
        const reqVal = reqValIdx >= 0 ? parseFloat(parts[reqValIdx].replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0;
        const paidVal = paidValIdx >= 0 ? parseFloat(parts[paidValIdx].replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0;
        const glosaVal = glosaValIdx >= 0 ? parseFloat(parts[glosaValIdx].replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0;

        let status: 'APPROVED' | 'DENIED' | 'PARTIAL' = 'APPROVED';
        if (statusRaw.includes('NEG') || statusRaw.includes('RECUS') || (paidVal === 0 && glosaVal > 0)) {
            status = 'DENIED';
        } else if (statusRaw.includes('PARC') || glosaVal > 0) {
            status = 'PARTIAL';
        }

        results.push({
            guide_number: guideNumber,
            status,
            requested_value: reqVal,
            approved_value: paidVal,
            denied_value: glosaVal,
            glosa_code: glosaCodeIdx >= 0 ? parts[glosaCodeIdx] : (glosaVal > 0 ? '1001' : undefined),
            glosa_description: glosaDescIdx >= 0 ? parts[glosaDescIdx] : (glosaVal > 0 ? 'Glosa informada em demonstrativo' : undefined),
        });
    }

    return results;
}

/**
 * POST /api/tiss/returns/[id]/parse?dry_run=true
 * Processa arquivo de retorno (XML ou CSV) com suporte a preview (dry-run) e conciliação financeira.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await enforceTissAdministrativeGuard(request);
    if (!guard.authorized) {
        return guard.response;
    }
    const { id: return_id } = await params;
    try {

        const supabase: any = await createClient();

        // 1. Auth & Permissão
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = (await supabase
            .from('users')
            .select('clinic_id, role, full_name')
            .eq('id', user.id)
            .single()) as { data: any; error: any };

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        if (!['CLINIC_ADMIN', 'SUPER_ADMIN', 'FINANCIAL'].includes(profile.role)) {
            return NextResponse.json({ success: false, error: 'Acesso negado: apenas administradores e financeiro podem conciliar retornos' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const isDryRun = searchParams.get('dry_run') === 'true';

        // 2. Buscar registro de retorno
        const { data: returnRecord } = await supabase
            .from('tiss_returns')
            .select('*, batch:tiss_batches(*)')
            .eq('id', return_id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!returnRecord) {
            return NextResponse.json({ success: false, error: 'Registro de retorno não encontrado' }, { status: 404 });
        }

        // 3. Buscar guias do lote
        const { data: guides } = await supabase
            .from('tiss_guides')
            .select('*')
            .eq('batch_id', returnRecord.batch_id);

        if (!guides || guides.length === 0) {
            return NextResponse.json({ success: false, error: 'Nenhuma guia encontrada no lote associado' }, { status: 400 });
        }

        // 4. Download do arquivo a partir do Storage (resiliente entre buckets)
        let fileContent = '';
        const storagePath = returnRecord.file_path || (returnRecord.return_file_url ? returnRecord.return_file_url.split('/documents/')[1] : null);

        // Tentar baixar do bucket 'documents' primeiro
        if (storagePath) {
            const { data: docData } = await supabase.storage
                .from('documents')
                .download(storagePath);
            if (docData) {
                fileContent = await docData.text();
            }
        }

        // Fallback para bucket 'tiss-returns' se não encontrado
        if (!fileContent && storagePath) {
            const { data: tissData } = await supabase.storage
                .from('tiss-returns')
                .download(storagePath);
            if (tissData) {
                fileContent = await tissData.text();
            }
        }

        if (!fileContent) {
            return NextResponse.json({
                success: false,
                error: 'Arquivo de retorno não localizado no storage. Reenvie o arquivo.'
            }, { status: 404 });
        }

        // 5. Cálculo do hash idempotente do arquivo
        const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');

        // Se não for dry-run, validar se já foi importado
        if (!isDryRun) {
            const { data: existingImport } = await supabase
                .from('tiss_return_imports')
                .select('id, created_at')
                .eq('clinic_id', profile.clinic_id)
                .eq('file_hash', fileHash)
                .neq('status', 'CANCELLED')
                .maybeSingle();

            if (existingImport) {
                return NextResponse.json({
                    success: false,
                    code: 'FILE_ALREADY_IMPORTED',
                    error: `Este arquivo de retorno já foi importado e conciliado em ${new Date(existingImport.created_at).toLocaleDateString('pt-BR')}. Operação cancelada para evitar duplicidade.`,
                }, { status: 409 });
            }
        }

        // 6. Fazer o parse do arquivo (XML ou CSV)
        let parsedGuides: ParsedReturnGuide[] = [];

        if (returnRecord.file_type === 'CSV' || fileContent.trim().startsWith('numero_guia') || fileContent.includes(';')) {
            parsedGuides = parseCsvReturn(fileContent);
        } else {
            // Parser XML
            const { parseTISSReturn } = await import('@/lib/services/tiss/tiss-xml-parser');
            const operatorName = returnRecord.batch?.insurance_company_name || 'UNIMED';
            try {
                const xmlParsed = parseTISSReturn(fileContent, operatorName);
                parsedGuides = (xmlParsed.guides || []).map((g: any) => ({
                    guide_number: g.guide_number,
                    protocol_number: g.protocol_number,
                    status: g.status,
                    requested_value: g.requested_value || 0,
                    approved_value: g.approved_value || 0,
                    denied_value: g.denied_value || 0,
                    glosa_code: g.glosa_code || '1001',
                    glosa_description: g.glosa_description || g.denial_reason || 'Glosa de retorno',
                }));
            } catch (err: any) {
                console.error('[TISS] Erro no parser XML:', err);
                return NextResponse.json({
                    success: false,
                    error: `Falha ao interpretar XML da operadora: ${err.message}. Você pode converter o demonstrativo para CSV e importar.`
                }, { status: 422 });
            }
        }

        // 7. Casamento com as guias do lote
        const matched: any[] = [];
        const unmatched: any[] = [];
        let totalApproved = 0;
        let totalDenied = 0;
        let totalPartial = 0;
        let amountApproved = 0;
        let amountGlosa = 0;

        for (const returnLine of parsedGuides) {
            const guide = guides.find(g =>
                g.guide_number === returnLine.guide_number ||
                g.guide_number.endsWith(returnLine.guide_number)
            );

            if (!guide) {
                unmatched.push(returnLine);
                continue;
            }

            const reqVal = Number(guide.total_value) || returnLine.requested_value;
            let approvedVal = returnLine.approved_value;
            let glosaVal = returnLine.denied_value;

            if (returnLine.status === 'APPROVED') {
                approvedVal = reqVal;
                glosaVal = 0;
                totalApproved++;
            } else if (returnLine.status === 'DENIED') {
                approvedVal = 0;
                glosaVal = reqVal;
                totalDenied++;
            } else {
                totalPartial++;
                if (approvedVal === 0 && glosaVal > 0) {
                    approvedVal = Math.max(0, reqVal - glosaVal);
                }
            }

            amountApproved += approvedVal;
            amountGlosa += glosaVal;

            matched.push({
                guide_id: guide.id,
                guide_number: guide.guide_number,
                patient_name: guide.patient_name,
                procedure_name: guide.procedure_name,
                status: returnLine.status,
                requested_value: reqVal,
                approved_value: approvedVal,
                glosa_value: glosaVal,
                glosa_code: returnLine.glosa_code,
                glosa_description: returnLine.glosa_description,
            });
        }

        // 8. Se for DRY-RUN (Pré-visualização), retornar sem gravar no banco
        if (isDryRun) {
            return NextResponse.json({
                success: true,
                dry_run: true,
                preview: {
                    file_name: returnRecord.return_file_name,
                    file_type: returnRecord.file_type,
                    total_guides_file: parsedGuides.length,
                    total_matched: matched.length,
                    total_unmatched: unmatched.length,
                    total_approved: totalApproved,
                    total_denied: totalDenied,
                    total_partial: totalPartial,
                    amount_requested: returnRecord.batch?.total_value || (amountApproved + amountGlosa),
                    amount_approved: amountApproved,
                    amount_glosa: amountGlosa,
                    matched_guides: matched,
                    unmatched_guides: unmatched,
                }
            });
        }

        // 9. EXECUÇÃO REAL: Persistir alterações
        for (const item of matched) {
            // Atualizar status da guia
            await supabase
                .from('tiss_guides')
                .update({
                    status: item.status,
                    paid_value: item.approved_value,
                    glosa_value: item.glosa_value,
                    glosa_code: item.glosa_code || null,
                    glosa_description: item.glosa_description || null,
                    processed_at: new Date().toISOString(),
                })
                .eq('id', item.guide_id);

            // Registrar glosa se houver
            if (item.glosa_value > 0) {
                await supabase.from('tiss_glosas').insert({
                    clinic_id: profile.clinic_id,
                    guide_id: item.guide_id,
                    batch_id: returnRecord.batch_id,
                    guide_number: item.guide_number,
                    glosa_code: item.glosa_code || '1001',
                    glosa_description: item.glosa_description || 'Glosa apurada em retorno',
                    glosa_value: item.glosa_value,
                    received_at: new Date().toISOString().split('T')[0],
                });
            }
        }

        // Atualizar status do Lote
        let batchStatus = 'APPROVED';
        if (totalDenied === matched.length) {
            batchStatus = 'DENIED';
        } else if (amountGlosa > 0) {
            batchStatus = 'PARTIAL';
        }

        await supabase
            .from('tiss_batches')
            .update({
                status: batchStatus,
                approved_value: amountApproved,
                glosa_value: amountGlosa,
                return_processed_at: new Date().toISOString(),
            })
            .eq('id', returnRecord.batch_id);

        // Registrar no log de importações para idempotência
        await supabase
            .from('tiss_return_imports')
            .insert({
                clinic_id: profile.clinic_id,
                batch_id: returnRecord.batch_id,
                file_name: returnRecord.return_file_name,
                file_hash: fileHash,
                file_type: returnRecord.file_type,
                total_guides_file: parsedGuides.length,
                total_matched: matched.length,
                total_unmatched: unmatched.length,
                amount_paid: amountApproved,
                amount_glosa: amountGlosa,
                imported_by: user.id,
            });

        // Conciliação no Módulo Financeiro: Lançamento em financial_entries
        if (amountApproved > 0) {
            await supabase.from('financial_entries').insert({
                clinic_id: profile.clinic_id,
                type: 'INCOME',
                category: 'CONVENIO',
                description: `Recebimento Lote TISS nº ${returnRecord.batch?.batch_number || ''} - ${returnRecord.batch?.insurance_company_name || 'Operadora'}`,
                amount: amountApproved,
                status: 'RECEIVED',
                payment_method: 'TRANSFERENCIA',
                payment_date: new Date().toISOString(),
                notes: `Conciliação automática via retorno TISS. Total glosado: R$ ${amountGlosa.toFixed(2)}`,
            });
        }

        // Marcar retorno como concluído
        await supabase
            .from('tiss_returns')
            .update({
                processing_status: 'COMPLETED',
                processed_at: new Date().toISOString(),
                total_guides_processed: matched.length,
                total_approved: totalApproved,
                total_denied: totalDenied,
                total_partial: totalPartial,
                amount_approved: amountApproved,
                amount_denied: amountGlosa,
            })
            .eq('id', return_id);

        return NextResponse.json({
            success: true,
            message: `Retorno processado com sucesso! ${matched.length} guias conciliadas, R$ ${amountApproved.toFixed(2)} aprovados e R$ ${amountGlosa.toFixed(2)} em glosas.`,
            summary: {
                total_matched: matched.length,
                total_unmatched: unmatched.length,
                amount_approved: amountApproved,
                amount_glosa: amountGlosa,
                batch_status: batchStatus,
            },
        });

    } catch (err: any) {
        console.error('[TISS] Erro no processamento do retorno:', err);
        return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
    }
}
