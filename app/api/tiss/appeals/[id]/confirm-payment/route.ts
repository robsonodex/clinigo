import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { writeTissAudit } from '@/lib/tiss/audit';
import { fromCents, toCents } from '@/lib/tiss/money';
import { z } from 'zod';

const confirmPaymentSchema = z.object({
    bank_received_value: z.number().min(0.01, 'Informe o valor líquido creditado em conta'),
    /** Campo opcional de retenção tributária na fonte pela operadora (ISS/IRRF/CSRF) — sem emissão de NFS-e */
    tax_withheld_value: z.number().min(0).optional().default(0),
    bank_received_at: z.string().optional(),
    bank_reference: z.string().max(120).optional(),
    notes: z.string().max(500).optional(),
});

/**
 * POST /api/tiss/appeals/[id]/confirm-payment
 * Liquidação Bancária Real de Acato de Glosa (FIN-01 / KPI-06 / QA-08 / QA-29).
 * Separa rigorosamente "Acatado pela operadora" de "Recebido efetivamente em conta",
 * registrando também eventual retenção tributária na fonte sem confundir com glosa.
 */
export const POST = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireTissAction(request, 'recurso.registrar_resultado');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { id: appealId } = await params;
        const body = await request.json();
        const validated = confirmPaymentSchema.parse(body);

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

        const { data: appeal, error: appealErr } = await supabase
            .from('tiss_appeals')
            .select('*, items:tiss_appeal_items(id, guide_id, glosa_id, recovered_value, financial_entry_id)')
            .eq('id', appealId)
            .eq('clinic_id', clinicId)
            .single();

        if (appealErr || !appeal) {
            return NextResponse.json({ success: false, error: 'Recurso não encontrado' }, { status: 404 });
        }

        const acceptedCents = toCents(appeal.accepted_value || appeal.total_recovered_value);
        if (acceptedCents <= 0) {
            return NextResponse.json(
                { success: false, error: 'Este recurso não possui valor acatado/deferido para liquidar.' },
                { status: 422 }
            );
        }

        const prevReceivedCents = toCents(appeal.bank_received_value);
        const prevTaxCents = toCents(appeal.tax_withheld_value);
        const addReceivedCents = toCents(validated.bank_received_value);
        const addTaxCents = toCents(validated.tax_withheld_value);

        const newReceivedCents = prevReceivedCents + addReceivedCents;
        const newTaxCents = prevTaxCents + addTaxCents;

        if (newReceivedCents + newTaxCents > acceptedCents) {
            return NextResponse.json(
                {
                    success: false,
                    error: `A soma do valor recebido + retenções (R$ ${fromCents(newReceivedCents + newTaxCents).toFixed(2)}) excede o valor acatado (R$ ${fromCents(acceptedCents).toFixed(2)}).`,
                },
                { status: 422 }
            );
        }

        const paidAt = validated.bank_received_at || new Date().toISOString();
        const isFullySettled = newReceivedCents + newTaxCents >= acceptedCents;
        const nextStatus = isFullySettled ? 'FINISHED' : appeal.status;

        const { data: updatedAppeal, error: updErr } = await supabase
            .from('tiss_appeals')
            .update({
                bank_received_value: fromCents(newReceivedCents),
                tax_withheld_value: fromCents(newTaxCents),
                bank_received_at: paidAt,
                status: nextStatus,
                updated_at: new Date().toISOString(),
            })
            .eq('id', appealId)
            .eq('clinic_id', clinicId)
            .select()
            .single();

        if (updErr) {
            return NextResponse.json({ success: false, error: 'Erro ao atualizar liquidação do recurso' }, { status: 500 });
        }

        // Confirmar lançamentos financeiros pendentes vinculados aos itens do recurso
        const entryIds = (appeal.items || [])
            .map((i: any) => i.financial_entry_id)
            .filter(Boolean);

        if (entryIds.length > 0 && isFullySettled) {
            await supabase
                .from('financial_entries')
                .update({
                    status: 'CONFIRMED',
                    notes: `Crédito bancário confirmado em ${paidAt.split('T')[0]}${validated.bank_reference ? ` (Ref: ${validated.bank_reference})` : ''}${addTaxCents > 0 ? ` | Retenção na fonte: R$ ${fromCents(addTaxCents).toFixed(2)}` : ''}`,
                })
                .in('id', entryIds)
                .eq('clinic_id', clinicId);
        }

        // Gravar eventos append-only em tiss_financial_events
        const eventSuffix = `${Date.now()}`;
        await supabase.from('tiss_financial_events').insert({
            clinic_id: clinicId,
            event_type: 'BANK_CREDIT_RECEIVED',
            amount_cents: addReceivedCents,
            appeal_id: appealId,
            idempotency_key: `bank-credit:${appealId}:${validated.bank_reference || eventSuffix}`,
            notes: validated.notes || `Crédito bancário do recurso ${appeal.appeal_number}`,
            metadata: { bank_reference: validated.bank_reference || null, bank_received_at: paidAt },
            created_by: user.id,
        });

        if (addTaxCents > 0) {
            await supabase.from('tiss_financial_events').insert({
                clinic_id: clinicId,
                event_type: 'TAX_WITHHELD',
                amount_cents: addTaxCents,
                appeal_id: appealId,
                idempotency_key: `tax-withheld:${appealId}:${validated.bank_reference || eventSuffix}`,
                notes: 'Retenção tributária na fonte pela operadora (ISS/IRRF/CSRF) — não configura glosa',
                created_by: user.id,
            });
        }

        // Atualizar guias vinculadas como pagas se liquidação integral
        if (isFullySettled) {
            const guideIds = Array.from(new Set((appeal.items || []).map((i: any) => i.guide_id).filter(Boolean))) as string[];
            for (const gId of guideIds) {
                const itemSumCents = (appeal.items || [])
                    .filter((i: any) => i.guide_id === gId)
                    .reduce((acc: number, i: any) => acc + toCents(i.recovered_value), 0);

                const { data: gRow } = await supabase
                    .from('tiss_guides')
                    .select('paid_value, glosa_value')
                    .eq('id', gId)
                    .eq('clinic_id', clinicId)
                    .maybeSingle();

                if (gRow) {
                    await supabase
                        .from('tiss_guides')
                        .update({
                            paid_value: fromCents(toCents(gRow.paid_value) + itemSumCents),
                            status: toCents(gRow.glosa_value) === 0 ? 'PAID' : 'APPEAL_PARTIAL',
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', gId)
                        .eq('clinic_id', clinicId);
                }
            }
        }

        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: 'recurso.confirmar_credito_bancario',
            entityType: 'tiss_appeal',
            entityId: appealId,
            previousState: {
                bank_received_value: fromCents(prevReceivedCents),
                tax_withheld_value: fromCents(prevTaxCents),
                status: appeal.status,
            },
            newState: {
                bank_received_value: fromCents(newReceivedCents),
                tax_withheld_value: fromCents(newTaxCents),
                status: nextStatus,
            },
            metadata: {
                bank_reference: validated.bank_reference || null,
                pending_balance: fromCents(Math.max(0, acceptedCents - newReceivedCents - newTaxCents)),
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                appeal: updatedAppeal,
                accepted_value: fromCents(acceptedCents),
                bank_received_value: fromCents(newReceivedCents),
                tax_withheld_value: fromCents(newTaxCents),
                pending_credit_value: fromCents(Math.max(0, acceptedCents - newReceivedCents - newTaxCents)),
                fully_settled: isFullySettled,
            },
            message: isFullySettled
                ? `Crédito bancário de R$ ${fromCents(addReceivedCents).toFixed(2)} confirmado e recurso encerrado.`
                : `Crédito parcial de R$ ${fromCents(addReceivedCents).toFixed(2)} registrado. Saldo restante de acato: R$ ${fromCents(acceptedCents - newReceivedCents - newTaxCents).toFixed(2)}.`,
        });
    } catch (error: any) {
        request.log.error('tiss/appeals/[id]/confirm-payment', {
            error: error instanceof Error ? error.message : String(error),
        });
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0]?.message || 'Dados inválidos' },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { success: false, error: 'Erro interno ao confirmar crédito bancário' },
            { status: 500 }
        );
    }
});

