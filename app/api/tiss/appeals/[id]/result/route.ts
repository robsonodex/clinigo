import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { writeTissAudit } from '@/lib/tiss/audit';
import { z } from 'zod';

const itemResultSchema = z.object({
    item_id: z.string().uuid('ID do item de recurso inválido'),
    result_status: z.enum(['ACCEPTED', 'PARTIAL', 'DENIED'], {
        errorMap: () => ({ message: 'Status do resultado inválido: ACCEPTED, PARTIAL ou DENIED' })
    }),
    recovered_value: z.number().min(0, 'Valor recuperado não pode ser negativo').optional(),
    notes: z.string().optional(),
});

const appealResultSchema = z.object({
    items: z.array(itemResultSchema).min(1, 'Informe o resultado de ao menos um item do recurso'),
});

// POST /api/tiss/appeals/[id]/result - Registrar resultado de recurso por item e liquidação (C8)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireTissAction(request, 'recurso.registrar_resultado');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { id: appealId } = await params;
        const body = await request.json();
        const validated = appealResultSchema.parse(body);

        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const clinicId = profile.clinic_id;

        // 1. Buscar recurso
        const { data: appeal, error: appealError } = await supabase
            .from('tiss_appeals')
            .select('*')
            .eq('id', appealId)
            .eq('clinic_id', clinicId)
            .single();

        if (appealError || !appeal) {
            return NextResponse.json({ success: false, error: 'Recurso não encontrado' }, { status: 404 });
        }

        // 2. Buscar política de glosa da clínica
        const { data: clinicData } = await supabase
            .from('clinics')
            .select('glosa_policy, repasse_regime')
            .eq('id', clinicId)
            .single();

        const glosaPolicy = clinicData?.glosa_policy || 'CLINICA_ABSORVE';

        // 3. Buscar todos os itens existentes deste recurso
        const { data: currentItems, error: itemsFetchError } = await supabase
            .from('tiss_appeal_items')
            .select('*')
            .eq('appeal_id', appealId)
            .eq('clinic_id', clinicId);

        if (itemsFetchError || !currentItems || currentItems.length === 0) {
            return NextResponse.json({ success: false, error: 'Itens do recurso não encontrados' }, { status: 404 });
        }

        const itemsMap = new Map<string, any>();
        currentItems.forEach(i => itemsMap.set(i.id, i));

        let totalRecoveredOnAppeal = 0;
        const processedItemsSummary: any[] = [];
        const now = new Date().toISOString();

        // 4. Processar resultado de cada item
        for (const inputItem of validated.items) {
            const dbItem = itemsMap.get(inputItem.item_id);
            if (!dbItem) continue;

            const contestedVal = Number(dbItem.contested_value) || 0;
            let recoveredVal = 0;

            if (inputItem.result_status === 'ACCEPTED') {
                recoveredVal = contestedVal;
            } else if (inputItem.result_status === 'PARTIAL') {
                recoveredVal = Math.min(contestedVal, Math.max(0, inputItem.recovered_value || 0));
            } else {
                recoveredVal = 0;
            }

            totalRecoveredOnAppeal += recoveredVal;

            let financialEntryId = dbItem.financial_entry_id;

            // 5. Lançamento Financeiro do Recuperado (sem duplicar)
            if (recoveredVal > 0 && !financialEntryId) {
                const { data: newEntry } = await supabase
                    .from('financial_entries')
                    .insert({
                        clinic_id: clinicId,
                        type: 'INCOME',
                        category: 'RECUPERACAO_GLOSA',
                        description: `Recuperação de Glosa - Recurso ${appeal.appeal_number} (Item ${dbItem.item_code || 'Procedimento'})`,
                        amount: Number(recoveredVal.toFixed(2)),
                        status: 'CONFIRMED',
                        notes: `Recuperação formalizada de glosa recursada. Status: ${inputItem.result_status}`,
                        created_at: now
                    })
                    .select('id')
                    .single();

                if (newEntry) {
                    financialEntryId = newEntry.id;
                }
            }

            // 6. Atualizar o item do recurso
            await supabase
                .from('tiss_appeal_items')
                .update({
                    status: inputItem.result_status,
                    recovered_value: Number(recoveredVal.toFixed(2)),
                    financial_entry_id: financialEntryId,
                    repasse_adjusted: true,
                })
                .eq('id', inputItem.item_id)
                .eq('clinic_id', clinicId);

            // 7. Atualizar a guia associada
            if (dbItem.guide_id) {
                const { data: guide } = await supabase
                    .from('tiss_guides')
                    .select('id, paid_value, glosa_value, total_value')
                    .eq('id', dbItem.guide_id)
                    .single();

                if (guide) {
                    const currentPaid = Number(guide.paid_value) || 0;
                    const currentGlosa = Number(guide.glosa_value) || 0;

                    const newPaid = Number((currentPaid + recoveredVal).toFixed(2));
                    const newGlosa = Math.max(0, Number((currentGlosa - recoveredVal).toFixed(2)));

                    let newGuideStatus = 'APPEAL_PARTIAL';
                    if (newGlosa === 0 && recoveredVal > 0) {
                        newGuideStatus = 'APPEAL_ACCEPTED';
                    } else if (recoveredVal === 0) {
                        newGuideStatus = 'DEFINITIVE_LOSS';
                    }

                    await supabase
                        .from('tiss_guides')
                        .update({
                            paid_value: newPaid,
                            glosa_value: newGlosa,
                            status: newGuideStatus,
                            updated_at: now
                        })
                        .eq('id', dbItem.guide_id);
                }
            }

            processedItemsSummary.push({
                item_id: inputItem.item_id,
                result_status: inputItem.result_status,
                contested_value: contestedVal,
                recovered_value: Number(recoveredVal.toFixed(2)),
                financial_entry_id: financialEntryId
            });
        }

        // 8. Determinar status final do recurso mestre
        const allAccepted = validated.items.every(i => i.result_status === 'ACCEPTED');
        const allDenied = validated.items.every(i => i.result_status === 'DENIED');
        const masterStatus = allAccepted ? 'ACCEPTED' : (allDenied ? 'DENIED' : 'PARTIAL');

        const { data: updatedAppeal } = await supabase
            .from('tiss_appeals')
            .update({
                status: masterStatus,
                total_recovered_value: Number(totalRecoveredOnAppeal.toFixed(2)),
                updated_at: now
            })
            .eq('id', appealId)
            .eq('clinic_id', clinicId)
            .select()
            .single();

        // 9. Gravar auditoria oficial
        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: 'recurso.registrar_resultado',
            entityType: 'tiss_appeal',
            entityId: appealId,
            previousState: { status: appeal.status, total_recovered_value: appeal.total_recovered_value },
            newState: { status: masterStatus, total_recovered_value: totalRecoveredOnAppeal },
            metadata: {
                glosa_policy: glosaPolicy,
                total_recovered: totalRecoveredOnAppeal,
                processed_items_count: processedItemsSummary.length,
                processed_items: processedItemsSummary,
                appeal_number: appeal.appeal_number
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                appeal: updatedAppeal,
                glosa_policy: glosaPolicy,
                total_recovered_value: Number(totalRecoveredOnAppeal.toFixed(2)),
                items: processedItemsSummary,
            },
            message: `Resultado do recurso ${appeal.appeal_number} registrado com sucesso. Total recuperado: R$ ${totalRecoveredOnAppeal.toFixed(2)}.`
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao registrar resultado do recurso:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Erro interno ao registrar resultado do recurso' }, { status: 500 });
    }
}
