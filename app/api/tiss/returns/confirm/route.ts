import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { writeTissAudit } from '@/lib/tiss/audit';
import { z } from 'zod';

const confirmSchema = z.object({
    batch_id: z.string().uuid('ID do lote inválido'),
    dry_run_token: z.string().min(10, 'Token de prévia obrigatório'),
    file_hash: z.string().length(64, 'Hash do arquivo inválido'),
    file_name: z.string().min(1, 'Nome do arquivo obrigatório'),
    file_type: z.enum(['CSV', 'XML', 'TXT']),
    records: z.array(z.object({
        numero_guia: z.string(),
        status: z.enum(['APROVADO', 'PARCIAL', 'NEGADO']),
        valor_apresentado: z.number(),
        valor_pago: z.number(),
        valor_glosado: z.number(),
        codigo_glosa: z.string().optional(),
        motivo_glosa: z.string().optional(),
    })).min(1, 'Lista de registros obrigatória'),
    manual_links: z.array(z.object({
        file_guide_number: z.string(),
        guide_id: z.string().uuid(),
    })).optional(),
});

export async function POST(request: NextRequest) {
    const guard = await requireTissAction(request, 'retorno.conciliar');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const body = await request.json();
        const validated = confirmSchema.parse(body);

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

        // 1. Checar idempotência estrita pelo hash do arquivo
        const { data: existingImport } = await supabase
            .from('tiss_return_imports')
            .select('id, created_at')
            .eq('clinic_id', clinicId)
            .eq('file_hash', validated.file_hash)
            .neq('status', 'CANCELLED')
            .maybeSingle();

        if (existingImport) {
            return NextResponse.json({
                success: false,
                error: `Este arquivo de retorno já foi importado e processado anteriormente em ${existingImport.created_at}. Duplicação barrada.`,
                code: 'DUPLICATE_IMPORT'
            }, { status: 409 });
        }

        // 2. Buscar lote
        const { data: batch, error: batchError } = await supabase
            .from('tiss_batches')
            .select('*')
            .eq('id', validated.batch_id)
            .eq('clinic_id', clinicId)
            .single();

        if (batchError || !batch) {
            return NextResponse.json({ success: false, error: 'Lote não encontrado' }, { status: 404 });
        }

        // 3. Buscar guias do lote
        const { data: batchGuides } = await supabase
            .from('tiss_guides')
            .select('id, guide_number, total_value, status')
            .eq('batch_id', validated.batch_id)
            .eq('clinic_id', clinicId);

        const guidesMap = new Map<string, any>();
        (batchGuides || []).forEach(g => {
            if (g.guide_number) guidesMap.set(g.guide_number.trim(), g);
        });

        // Mapeamento manual
        const manualMap = new Map<string, string>();
        (validated.manual_links || []).forEach(ml => {
            manualMap.set(ml.file_guide_number.trim(), ml.guide_id);
        });

        let totalPaid = 0;
        let totalGlosa = 0;
        let matchedCount = 0;
        let unmatchedCount = 0;

        const now = new Date().toISOString();

        // 4. Processar conciliação atômica de cada guia
        for (const record of validated.records) {
            let targetGuideId: string | null = null;
            const cleanNum = record.numero_guia.trim();

            if (manualMap.has(cleanNum)) {
                targetGuideId = manualMap.get(cleanNum)!;
            } else if (guidesMap.has(cleanNum)) {
                targetGuideId = guidesMap.get(cleanNum).id;
            }

            if (targetGuideId) {
                matchedCount++;
                totalPaid += record.valor_pago;
                totalGlosa += record.valor_glosado;

                if (record.valor_glosado > 0) {
                    // Gravar glosa
                    await supabase
                        .from('tiss_glosas')
                        .insert({
                            clinic_id: clinicId,
                            guide_id: targetGuideId,
                            batch_id: validated.batch_id,
                            glosa_code: record.codigo_glosa || 'OUTRAS',
                            glosa_description: record.motivo_glosa || 'Glosa apontada em retorno de operadora',
                            glosa_type: 'ADMINISTRATIVA',
                            glosa_value: record.valor_glosado,
                            status: 'GLOSADA',
                            created_at: now
                        });

                    // Atualizar guia
                    const newStatus = record.valor_pago > 0 ? 'PARTIALLY_GLOSED' : 'TOTALLY_GLOSED';
                    await supabase
                        .from('tiss_guides')
                        .update({
                            paid_value: record.valor_pago,
                            glosa_value: record.valor_glosado,
                            glosa_code: record.codigo_glosa || null,
                            glosa_description: record.motivo_glosa || null,
                            status: newStatus,
                            updated_at: now
                        })
                        .eq('id', targetGuideId)
                        .eq('clinic_id', clinicId);
                } else {
                    // Paga integral
                    await supabase
                        .from('tiss_guides')
                        .update({
                            paid_value: record.valor_pago,
                            glosa_value: 0,
                            status: 'PAID',
                            updated_at: now
                        })
                        .eq('id', targetGuideId)
                        .eq('clinic_id', clinicId);
                }
            } else {
                unmatchedCount++;
            }
        }

        // 5. Atualizar Lote para RETURNED
        const { data: updatedBatch } = await supabase
            .from('tiss_batches')
            .update({
                status: 'RETURNED',
                approved_value: Number(totalPaid.toFixed(2)),
                glosa_value: Number(totalGlosa.toFixed(2)),
                return_processed_at: now,
                updated_at: now
            })
            .eq('id', validated.batch_id)
            .eq('clinic_id', clinicId)
            .select()
            .single();

        // 6. Persistir registro formal de importação com file_hash e dry_run_token
        await supabase
            .from('tiss_return_imports')
            .insert({
                clinic_id: clinicId,
                batch_id: validated.batch_id,
                file_name: validated.file_name,
                file_hash: validated.file_hash,
                file_type: validated.file_type,
                total_guides_file: validated.records.length,
                total_matched: matchedCount,
                total_unmatched: unmatchedCount,
                amount_paid: Number(totalPaid.toFixed(2)),
                amount_glosa: Number(totalGlosa.toFixed(2)),
                dry_run_token: validated.dry_run_token,
                imported_by: user.id,
                status: 'COMPLETED',
                created_at: now
            });

        // 7. Gravar auditoria
        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: 'retorno.conciliar',
            entityType: 'tiss_batch',
            entityId: validated.batch_id,
            previousState: { status: batch.status },
            newState: { status: 'RETURNED', approved_value: totalPaid, glosa_value: totalGlosa },
            metadata: {
                file_name: validated.file_name,
                file_hash: validated.file_hash,
                dry_run_token: validated.dry_run_token,
                matched_count: matchedCount,
                unmatched_count: unmatchedCount,
                total_paid: totalPaid,
                total_glosa: totalGlosa
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                batch: updatedBatch,
                matched_count: matchedCount,
                unmatched_count: unmatchedCount,
                total_paid: Number(totalPaid.toFixed(2)),
                total_glosa: Number(totalGlosa.toFixed(2)),
            },
            message: `Retorno do lote ${batch.batch_number} confirmado com sucesso. ${matchedCount} guia(s) conciliada(s).`
        });

    } catch (error: any) {
        console.error('[TISS] Erro na confirmação atômica do retorno:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Erro interno ao confirmar retorno' }, { status: 500 });
    }
}
