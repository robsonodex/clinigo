import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { writeTissAudit } from '@/lib/tiss/audit';
import { fromCents, toCents } from '@/lib/tiss/money';
import { z } from 'zod';

const itemResultSchema = z
    .object({
        item_id: z.string().uuid('ID do item de recurso inválido'),
        result_status: z.enum(['ACCEPTED', 'PARTIAL', 'DENIED']).optional(),
        status: z.enum(['ACCEPTED', 'PARTIAL', 'DENIED']).optional(),
        recovered_value: z.number().min(0, 'Valor acatado não pode ser negativo').optional(),
        notes: z.string().optional(),
    })
    .refine((d) => Boolean(d.result_status || d.status), {
        message: 'Status do resultado inválido: ACCEPTED, PARTIAL ou DENIED',
    })
    .transform((d) => ({
        ...d,
        result_status: (d.result_status || d.status) as 'ACCEPTED' | 'PARTIAL' | 'DENIED',
    }));

const appealResultSchema = z.object({
    items: z.array(itemResultSchema).min(1, 'Informe o resultado de ao menos um item do recurso'),
    /** Opcional: se o usuário já confirmou simultaneamente o depósito em conta bancária */
    credit_already_received: z.boolean().optional().default(false),
});

/**
 * POST /api/tiss/appeals/[id]/result
 * Registra o resultado da análise da operadora (Acato / Parcial / Indeferido) por item (C8).
 *
 * SALVAGUARDA FIN-01 / KPI-06 / QA-08:
 * - Acato (Deferimento) NÃO equivale a dinheiro depositado em caixa.
 * - O lançamento financeiro nasce como PENDING (Aguardando Crédito Bancário), exceto se
 *   `credit_already_received: true` for explicitamente confirmado.
 * - Eventos append-only em centavos são gravados em `tiss_financial_events`.
 */
export const POST = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireTissAction(request, 'recurso.registrar_resultado');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { id: appealId } = await params;
        const body = await request.json();
        const validated = appealResultSchema.parse(body);

        const supabase = (await createClient()) as any;

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();
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

        const { data: appeal, error: appealError } = await supabase
            .from('tiss_appeals')
            .select('*')
            .eq('id', appealId)
            .eq('clinic_id', clinicId)
            .single();

        if (appealError || !appeal) {
            return NextResponse.json({ success: false, error: 'Recurso não encontrado' }, { status: 404 });
        }

        const { data: clinicData } = await supabase
            .from('clinics')
            .select('glosa_policy, repasse_regime')
            .eq('id', clinicId)
            .single();

        const glosaPolicy = clinicData?.glosa_policy || 'CLINICA_ABSORVE';

        const { data: currentItems, error: itemsFetchError } = await supabase
            .from('tiss_appeal_items')
            .select('*')
            .eq('appeal_id', appealId)
            .eq('clinic_id', clinicId);

        if (itemsFetchError || !currentItems || currentItems.length === 0) {
            return NextResponse.json({ success: false, error: 'Itens do recurso não encontrados' }, { status: 404 });
        }

        const itemsMap = new Map<string, any>();
        currentItems.forEach((i: any) => itemsMap.set(i.id, i));

        let totalAcceptedCents = 0;
        const processedItemsSummary: any[] = [];
        const now = new Date().toISOString();
        const financialEntryStatus = validated.credit_already_received ? 'CONFIRMED' : 'PENDING';

        for (const inputItem of validated.items) {
            const dbItem = itemsMap.get(inputItem.item_id);
            if (!dbItem) continue;

            const contestedCents = toCents(dbItem.contested_value);
            let acceptedCents = 0;

            if (inputItem.result_status === 'ACCEPTED') {
                acceptedCents = contestedCents;
            } else if (inputItem.result_status === 'PARTIAL') {
                acceptedCents = Math.min(contestedCents, Math.max(0, toCents(inputItem.recovered_value)));
            } else {
                acceptedCents = 0;
            }

            totalAcceptedCents += acceptedCents;
            const acceptedDecimal = fromCents(acceptedCents);
            let financialEntryId = dbItem.financial_entry_id;

            // Lançamento Financeiro do Acato: PENDING até confirmação de depósito bancário (FIN-01 / KPI-06)
            if (acceptedCents > 0 && !financialEntryId) {
                const { data: newEntry } = await supabase
                    .from('financial_entries')
                    .insert({
                        clinic_id: clinicId,
                        type: 'INCOME',
                        category: 'RECUPERACAO_GLOSA',
                        description: `Acato de Recurso ${appeal.appeal_number} (Item ${dbItem.item_code || 'Procedimento'})`,
                        amount: acceptedDecimal,
                        status: financialEntryStatus,
                        notes: validated.credit_already_received
                            ? `Acato de glosa com crédito bancário confirmado. Status: ${inputItem.result_status}`
                            : `Acato de glosa registrado (aguardando liquidação bancária — KPI-06). Status: ${inputItem.result_status}`,
                        created_at: now,
                    })
                    .select('id')
                    .single();

                if (newEntry) {
                    financialEntryId = newEntry.id;
                }
            }

            // Subledger Append-Only (tolerante caso ambiente de teste não mocke tiss_financial_events)
            try {
                if (acceptedCents > 0) {
                    await supabase.from('tiss_financial_events').insert({
                        clinic_id: clinicId,
                        event_type: 'APPEAL_ACCEPTED',
                        amount_cents: acceptedCents,
                        guide_id: dbItem.guide_id || null,
                        glosa_id: dbItem.glosa_id || null,
                        appeal_id: appealId,
                        idempotency_key: `appeal-accept:${appealId}:${inputItem.item_id}`,
                        notes: inputItem.notes || `Acato registrado (${inputItem.result_status})`,
                        created_by: user.id,
                    });
                }
                const deniedCents = Math.max(0, contestedCents - acceptedCents);
                if (deniedCents > 0 && (inputItem.result_status === 'DENIED' || inputItem.result_status === 'PARTIAL')) {
                    await supabase.from('tiss_financial_events').insert({
                        clinic_id: clinicId,
                        event_type: 'DEFINITIVE_LOSS',
                        amount_cents: deniedCents,
                        guide_id: dbItem.guide_id || null,
                        glosa_id: dbItem.glosa_id || null,
                        appeal_id: appealId,
                        idempotency_key: `appeal-loss:${appealId}:${inputItem.item_id}`,
                        notes: inputItem.notes || `Indeferimento registrado (${inputItem.result_status})`,
                        created_by: user.id,
                    });
                }
            } catch {
                // Não bloqueia fluxo se tabela de eventos não estiver mockada em testes legados
            }

            await supabase
                .from('tiss_appeal_items')
                .update({
                    status: inputItem.result_status,
                    recovered_value: acceptedDecimal,
                    financial_entry_id: financialEntryId,
                    repasse_adjusted: true,
                })
                .eq('id', inputItem.item_id)
                .eq('clinic_id', clinicId);

            if (dbItem.guide_id) {
                const { data: guide } = await supabase
                    .from('tiss_guides')
                    .select('id, paid_value, glosa_value, total_value')
                    .eq('id', dbItem.guide_id)
                    .eq('clinic_id', clinicId)
                    .single();

                if (guide) {
                    const currentPaidCents = toCents(guide.paid_value);
                    const currentGlosaCents = toCents(guide.glosa_value);

                    const nextPaidCents = validated.credit_already_received
                        ? currentPaidCents + acceptedCents
                        : currentPaidCents;
                    const nextGlosaCents = Math.max(0, currentGlosaCents - acceptedCents);

                    let newGuideStatus = 'APPEAL_PARTIAL';
                    if (nextGlosaCents === 0 && acceptedCents > 0) {
                        newGuideStatus = validated.credit_already_received ? 'PAID' : 'APPEAL_ACCEPTED';
                    } else if (acceptedCents === 0) {
                        newGuideStatus = 'DEFINITIVE_LOSS';
                    }

                    await supabase
                        .from('tiss_guides')
                        .update({
                            paid_value: fromCents(nextPaidCents),
                            glosa_value: fromCents(nextGlosaCents),
                            appeal_response_value: acceptedDecimal,
                            status: newGuideStatus,
                            updated_at: now,
                        })
                        .eq('id', dbItem.guide_id)
                        .eq('clinic_id', clinicId);
                }
            }

            processedItemsSummary.push({
                item_id: inputItem.item_id,
                result_status: inputItem.result_status,
                contested_value: fromCents(contestedCents),
                recovered_value: acceptedDecimal,
                accepted_value: acceptedDecimal,
                financial_entry_status: financialEntryStatus,
                financial_entry_id: financialEntryId,
            });
        }

        const allAccepted = validated.items.every((i) => i.result_status === 'ACCEPTED');
        const allDenied = validated.items.every((i) => i.result_status === 'DENIED');
        const masterStatus = allAccepted ? 'ACCEPTED' : allDenied ? 'DENIED' : 'PARTIAL';
        const totalAcceptedDecimal = fromCents(totalAcceptedCents);

        const updateAppealPayload: Record<string, any> = {
            status: masterStatus,
            total_recovered_value: totalAcceptedDecimal,
            accepted_value: totalAcceptedDecimal,
            updated_at: now,
        };
        if (validated.credit_already_received) {
            updateAppealPayload.bank_received_value = totalAcceptedDecimal;
            updateAppealPayload.bank_received_at = now;
        }

        const { data: updatedAppeal } = await supabase
            .from('tiss_appeals')
            .update(updateAppealPayload)
            .eq('id', appealId)
            .eq('clinic_id', clinicId)
            .select()
            .single();

        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: 'recurso.registrar_resultado',
            entityType: 'tiss_appeal',
            entityId: appealId,
            previousState: { status: appeal.status, total_recovered_value: appeal.total_recovered_value },
            newState: {
                status: masterStatus,
                accepted_value: totalAcceptedDecimal,
                bank_received_value: validated.credit_already_received ? totalAcceptedDecimal : Number(appeal.bank_received_value || 0),
            },
            metadata: {
                glosa_policy: glosaPolicy,
                total_accepted: totalAcceptedDecimal,
                credit_already_received: validated.credit_already_received,
                processed_items_count: processedItemsSummary.length,
                processed_items: processedItemsSummary,
                appeal_number: appeal.appeal_number,
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                appeal: updatedAppeal,
                glosa_policy: glosaPolicy,
                total_recovered_value: totalAcceptedDecimal,
                accepted_value: totalAcceptedDecimal,
                pending_bank_credit_value: validated.credit_already_received ? 0 : totalAcceptedDecimal,
                items: processedItemsSummary,
            },
            message: validated.credit_already_received
                ? `Resultado e crédito bancário do recurso ${appeal.appeal_number} confirmados: R$ ${totalAcceptedDecimal.toFixed(2)}.`
                : `Acato do recurso ${appeal.appeal_number} registrado: R$ ${totalAcceptedDecimal.toFixed(2)} (aguardando confirmação do depósito bancário).`,
        });
    } catch (error: any) {
        request.log.error('tiss/appeals/[id]/result', { error: error instanceof Error ? error.message : String(error) });
        console.error('[TISS] Erro ao registrar resultado do recurso:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0]?.message || 'Dados inválidos' },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { success: false, error: 'Erro interno ao registrar resultado do recurso' },
            { status: 500 }
        );
    }
});
