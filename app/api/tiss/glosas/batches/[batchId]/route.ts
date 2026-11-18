import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { recalculateBatchTotals, recalculateGuideFromItems, roundCurrency } from '@/lib/services/tiss/glosa-reconciliation';
import { writeTissAudit } from '@/lib/tiss/audit';

export const dynamic = 'force-dynamic';

const level2ActionSchema = z.object({
    action: z.enum([
        'start_review',
        'finalize_batch_review',
        'glosa_total_fatura',
        'auto_liberate_accounts',
        'auto_glosa_total_accounts',
        'return_to_revision',
    ]),
    guide_ids: z.array(z.string().uuid()).optional(),
    glosa_code: z.string().optional(),
    glosa_description: z.string().optional(),
    glosa_type: z.enum(['ADMINISTRATIVA', 'TECNICA', 'VALOR_TABELA']).optional().default('ADMINISTRATIVA'),
    is_irrecoverable: z.boolean().optional().default(false),
    observation: z.string().max(1000).optional(),
    force: z.boolean().optional().default(false),
});

/**
 * GET /api/tiss/glosas/batches/[batchId]
 * Nível 2 do Controle de Glosas: Detalhamento de todas as Contas da Remessa com totalizadores e contadores em tempo real.
 */
export const GET = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ batchId: string }> }) => {
    const guard = await requireTissAction(request, 'glosa.revisar');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { batchId } = await params;
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

        const { data: batch, error: batchErr } = await adminDb
            .from('tiss_batches')
            .select('*')
            .eq('id', batchId)
            .eq('clinic_id', clinicId)
            .maybeSingle();

        if (batchErr || !batch) {
            return NextResponse.json({ success: false, error: 'Remessa não encontrada' }, { status: 404 });
        }

        const { data: guides, error: guidesErr } = await adminDb
            .from('tiss_guides')
            .select(`
                id,
                guide_number,
                guide_type,
                patient_name,
                patient_card_number,
                procedure_code,
                procedure_name,
                total_value,
                paid_value,
                glosa_value,
                glosa_code,
                glosa_description,
                status,
                billing_stage,
                appeal_status,
                execution_date,
                updated_at,
                doctor:doctors(id, user:users(full_name))
            `)
            .eq('clinic_id', clinicId)
            .eq('batch_id', batchId)
            .is('deleted_at', null)
            .not('status', 'in', '("CANCELLED","CANCELED")')
            .order('guide_number', { ascending: true });

        if (guidesErr) {
            return NextResponse.json({ success: false, error: guidesErr.message }, { status: 500 });
        }

        const guideList = guides || [];
        const guideIds = guideList.map((g: any) => g.id);

        const [{ data: glosas }, { data: appealItems }] = await Promise.all([
            guideIds.length > 0
                ? adminDb
                      .from('tiss_glosas')
                      .select('id, guide_id, glosa_value, is_irrecoverable, status, glosa_code, glosa_description')
                      .eq('clinic_id', clinicId)
                      .in('guide_id', guideIds)
                      .is('deleted_at', null)
                      .neq('status', 'CANCELLED')
                : Promise.resolve({ data: [] }),
            guideIds.length > 0
                ? adminDb
                      .from('tiss_appeal_items')
                      .select('id, guide_id, contested_value, recovered_value, status')
                      .eq('clinic_id', clinicId)
                      .in('guide_id', guideIds)
                : Promise.resolve({ data: [] }),
        ]);

        const glosasByGuide = new Map<string, any[]>();
        for (const gl of glosas || []) {
            const arr = glosasByGuide.get(gl.guide_id) || [];
            arr.push(gl);
            glosasByGuide.set(gl.guide_id, arr);
        }

        const appealsByGuide = new Map<string, any[]>();
        for (const ap of appealItems || []) {
            const arr = appealsByGuide.get(ap.guide_id) || [];
            arr.push(ap);
            appealsByGuide.set(ap.guide_id, arr);
        }

        const accounts = guideList.map((g: any) => {
            const gGlosas = glosasByGuide.get(g.id) || [];
            const gAppeals = appealsByGuide.get(g.id) || [];
            const billed = Number(g.total_value || 0);
            const enteredGlosa = gGlosas.length > 0
                ? roundCurrency(gGlosas.reduce((acc, x) => acc + Number(x.glosa_value || 0), 0))
                : roundCurrency(Number(g.glosa_value || 0));
            const irrecTotal = roundCurrency(
                gGlosas.reduce((acc, x) => acc + (x.is_irrecoverable ? Number(x.glosa_value || 0) : 0), 0)
            );
            const approved = g.paid_value !== null && g.paid_value !== undefined
                ? Number(g.paid_value)
                : Math.max(0, billed - enteredGlosa);

            const stUpper = String(g.status || '').toUpperCase();
            let accountCategory: 'PAGAS' | 'GLOSA_PARCIAL' | 'GLOSA_TOTAL' | 'SEM_PAGAMENTO' | 'PENDENTES' = 'PENDENTES';
            if (enteredGlosa <= 0 && (stUpper === 'PAID' || stUpper === 'APPROVED' || stUpper === 'CLOSED')) {
                accountCategory = 'PAGAS';
            } else if (enteredGlosa > 0 && approved > 0) {
                accountCategory = 'GLOSA_PARCIAL';
            } else if (enteredGlosa > 0 && approved <= 0) {
                accountCategory = 'GLOSA_TOTAL';
            } else if (stUpper === 'SENT' || stUpper === 'IN_BATCH') {
                accountCategory = 'SEM_PAGAMENTO';
            }

            const isReviewed = ['PAID', 'APPROVED', 'PARTIALLY_GLOSED', 'TOTALLY_GLOSED', 'CLOSED', 'APPEAL_ACCEPTED', 'APPEAL_PARTIAL', 'DEFINITIVE_LOSS'].includes(stUpper);

            return {
                ...g,
                doctor_name: g.doctor?.user?.full_name || 'Não informado',
                total_value: roundCurrency(billed),
                approved_value: roundCurrency(approved),
                glosa_value: roundCurrency(enteredGlosa),
                irrecoverable_value: irrecTotal,
                recoverable_glosa_value: roundCurrency(Math.max(0, enteredGlosa - irrecTotal)),
                glosas_count: gGlosas.length,
                appeals_count: gAppeals.length,
                account_category: accountCategory,
                is_reviewed: isReviewed,
            };
        });

        const totalBilled = roundCurrency(accounts.reduce((acc: number, a: any) => acc + a.total_value, 0));
        const totalApproved = roundCurrency(accounts.reduce((acc: number, a: any) => acc + a.approved_value, 0));
        const totalGlosa = roundCurrency(accounts.reduce((acc: number, a: any) => acc + a.glosa_value, 0));
        const totalIrrec = roundCurrency(accounts.reduce((acc: number, a: any) => acc + a.irrecoverable_value, 0));
        const totalAppealable = roundCurrency(Math.max(0, totalGlosa - totalIrrec));

        const counts = {
            ALL: accounts.length,
            PENDENTES: accounts.filter((a: any) => !a.is_reviewed).length,
            PAGAS: accounts.filter((a: any) => a.account_category === 'PAGAS').length,
            GLOSA_PARCIAL: accounts.filter((a: any) => a.account_category === 'GLOSA_PARCIAL').length,
            GLOSA_TOTAL: accounts.filter((a: any) => a.account_category === 'GLOSA_TOTAL').length,
            SEM_PAGAMENTO: accounts.filter((a: any) => a.account_category === 'SEM_PAGAMENTO').length,
        };

        return NextResponse.json({
            success: true,
            data: {
                batch,
                accounts,
                counts,
                summary: {
                    total_billed: totalBilled,
                    total_approved: totalApproved,
                    total_glosa: totalGlosa,
                    total_irrecoverable: totalIrrec,
                    total_receivable_or_appeal: totalAppealable,
                },
            },
        });
    } catch (err: any) {
        request.log.error('tiss/glosas/batches/[batchId] GET', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ success: false, error: err.message || 'Erro ao carregar contas da remessa' }, { status: 500 });
    }
});

/**
 * POST /api/tiss/glosas/batches/[batchId]
 * Ações operacionais de Nível 1 e Nível 2 (TOTVS RM Saúde)
 */
export const POST = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ batchId: string }> }) => {
    const guard = await requireTissAction(request, 'glosa.revisar');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { batchId } = await params;
        const body = await request.json();
        const validated = level2ActionSchema.parse(body);

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
            .select('*')
            .eq('id', batchId)
            .eq('clinic_id', clinicId)
            .maybeSingle();

        if (!batch) {
            return NextResponse.json({ success: false, error: 'Remessa não encontrada' }, { status: 404 });
        }

        const now = new Date().toISOString();

        if (validated.action === 'start_review') {
            await adminDb
                .from('tiss_batches')
                .update({
                    review_status: 'EM_ANDAMENTO',
                    last_reviewed_at: now,
                    last_reviewed_by: user.id,
                    updated_at: now,
                })
                .eq('id', batchId)
                .eq('clinic_id', clinicId);

            await adminDb
                .from('tiss_guides')
                .update({
                    billing_stage: 'EM_REVISAO_GLOSA',
                    updated_at: now,
                })
                .eq('batch_id', batchId)
                .eq('clinic_id', clinicId)
                .is('deleted_at', null);

            await writeTissAudit({
                clinicId,
                userId: user.id,
                action: 'TISS_BATCH_GLOSA_REVIEW_STARTED',
                entityType: 'tiss_batch',
                entityId: batchId,
                customSupabase: adminDb,
            });

            return NextResponse.json({
                success: true,
                review_status: 'EM_ANDAMENTO',
                message: 'Revisão de glosas da remessa iniciada.',
            });
        }

        if (validated.action === 'finalize_batch_review') {
            const { data: guides } = await adminDb
                .from('tiss_guides')
                .select('id, status')
                .eq('batch_id', batchId)
                .eq('clinic_id', clinicId)
                .is('deleted_at', null)
                .not('status', 'in', '("CANCELLED","CANCELED")');

            const pendingGuides = (guides || []).filter(
                (g: any) => !['PAID', 'APPROVED', 'PARTIALLY_GLOSED', 'TOTALLY_GLOSED', 'CLOSED', 'APPEAL_ACCEPTED', 'APPEAL_PARTIAL', 'DEFINITIVE_LOSS'].includes(String(g.status).toUpperCase())
            );

            if (pendingGuides.length > 0 && !validated.force) {
                return NextResponse.json(
                    {
                        success: false,
                        error: `Ainda existem ${pendingGuides.length} conta(s) sem definição (paga ou glosada). Revise-as ou utilize Liberação Automática antes de finalizar a remessa.`,
                        pending_count: pendingGuides.length,
                    },
                    { status: 422 }
                );
            }

            const totals = await recalculateBatchTotals(adminDb, clinicId, batchId);

            await adminDb
                .from('tiss_batches')
                .update({
                    review_status: 'FINALIZADA',
                    last_reviewed_at: now,
                    last_reviewed_by: user.id,
                    updated_at: now,
                })
                .eq('id', batchId)
                .eq('clinic_id', clinicId);

            await adminDb
                .from('tiss_guides')
                .update({
                    billing_stage: 'FINALIZADA',
                    updated_at: now,
                })
                .eq('batch_id', batchId)
                .eq('clinic_id', clinicId)
                .is('deleted_at', null);

            await writeTissAudit({
                clinicId,
                userId: user.id,
                action: 'TISS_BATCH_GLOSA_REVIEW_FINALIZED',
                entityType: 'tiss_batch',
                entityId: batchId,
                newState: totals,
                customSupabase: adminDb,
            });

            return NextResponse.json({
                success: true,
                review_status: 'FINALIZADA',
                totals,
                message: 'Contas revisadas com sucesso. Remessa marcada como Já Finalizada.',
            });
        }

        if (validated.action === 'auto_liberate_accounts') {
            const targetIds = validated.guide_ids || [];
            if (targetIds.length === 0) {
                return NextResponse.json({ success: false, error: 'Selecione ao menos uma conta para liberação automática.' }, { status: 400 });
            }

            // Verifica se alguma guia possui glosa em recurso ativo
            const { data: activeAppeals } = await adminDb
                .from('tiss_appeal_items')
                .select('id, guide_id')
                .eq('clinic_id', clinicId)
                .in('guide_id', targetIds);

            if ((activeAppeals || []).length > 0) {
                return NextResponse.json(
                    { success: false, error: 'Uma ou mais contas selecionadas já possuem item vinculado a Recurso de Glosa.' },
                    { status: 409 }
                );
            }

            await adminDb
                .from('tiss_glosas')
                .update({ status: 'CANCELLED', deleted_at: now, deleted_by: user.id, updated_at: now })
                .eq('clinic_id', clinicId)
                .in('guide_id', targetIds)
                .is('deleted_at', null);

            for (const gid of targetIds) {
                const { data: g } = await adminDb
                    .from('tiss_guides')
                    .select('id, total_value')
                    .eq('id', gid)
                    .eq('batch_id', batchId)
                    .eq('clinic_id', clinicId)
                    .maybeSingle();
                if (!g) continue;

                await adminDb
                    .from('tiss_guides')
                    .update({
                        status: 'PAID',
                        paid_value: Number(g.total_value || 0),
                        glosa_value: 0,
                        glosa_code: null,
                        glosa_description: null,
                        billing_stage: 'FINALIZADA',
                        updated_at: now,
                    })
                    .eq('id', gid)
                    .eq('clinic_id', clinicId);

                await recalculateGuideFromItems(adminDb, clinicId, gid);
            }

            await adminDb
                .from('tiss_batches')
                .update({ review_status: 'EM_ANDAMENTO', last_reviewed_at: now, last_reviewed_by: user.id, updated_at: now })
                .eq('id', batchId)
                .eq('clinic_id', clinicId);

            const totals = await recalculateBatchTotals(adminDb, clinicId, batchId);

            await writeTissAudit({
                clinicId,
                userId: user.id,
                action: 'TISS_GLOSA_AUTO_LIBERATION',
                entityType: 'tiss_batch',
                entityId: batchId,
                newState: { guide_ids: targetIds, totals },
                customSupabase: adminDb,
            });

            return NextResponse.json({
                success: true,
                totals,
                message: `${targetIds.length} conta(s) liberada(s) integralmente como pagas sem glosa.`,
            });
        }

        if (validated.action === 'glosa_total_fatura' || validated.action === 'auto_glosa_total_accounts') {
            const glosaCode = validated.glosa_code || '9999';
            const glosaDesc = validated.glosa_description || 'Glosa integral aplicada em revisão';

            let guidesQuery = adminDb
                .from('tiss_guides')
                .select('id, guide_number, total_value, procedure_code, procedure_name')
                .eq('clinic_id', clinicId)
                .eq('batch_id', batchId)
                .is('deleted_at', null)
                .not('status', 'in', '("CANCELLED","CANCELED")');

            if (validated.action === 'auto_glosa_total_accounts') {
                if (!validated.guide_ids || validated.guide_ids.length === 0) {
                    return NextResponse.json({ success: false, error: 'Selecione ao menos uma conta para glosa total.' }, { status: 400 });
                }
                guidesQuery = guidesQuery.in('id', validated.guide_ids);
            }

            const { data: targetGuides } = await guidesQuery;
            const guidesToGlose = targetGuides || [];
            if (guidesToGlose.length === 0) {
                return NextResponse.json({ success: false, error: 'Nenhuma conta elegível encontrada na remessa.' }, { status: 404 });
            }

            const todayDate = now.split('T')[0];

            for (const g of guidesToGlose) {
                const totalVal = roundCurrency(Number(g.total_value || 0));
                if (totalVal <= 0) continue;

                // Remove glosas anteriores abertas desta guia para não duplicar o valor integral
                await adminDb
                    .from('tiss_glosas')
                    .update({ status: 'CANCELLED', deleted_at: now, deleted_by: user.id, updated_at: now })
                    .eq('clinic_id', clinicId)
                    .eq('guide_id', g.id)
                    .is('deleted_at', null)
                    .eq('status', 'OPEN');

                await adminDb.from('tiss_glosas').insert({
                    clinic_id: clinicId,
                    guide_id: g.id,
                    batch_id: batchId,
                    guide_number: g.guide_number,
                    glosa_code: glosaCode,
                    glosa_description: glosaDesc,
                    glosa_type: validated.glosa_type,
                    item_code: g.procedure_code,
                    item_description: g.procedure_name,
                    item_group: 'HONORARIOS',
                    glosa_value: totalVal,
                    original_value: totalVal,
                    approved_value: 0,
                    is_irrecoverable: validated.is_irrecoverable,
                    irrecoverable_value: validated.is_irrecoverable ? totalVal : 0,
                    observation: validated.observation || null,
                    control_date: todayDate,
                    reviewer_user_id: user.id,
                    can_appeal: !validated.is_irrecoverable,
                    contest_status: validated.is_irrecoverable ? 'IRRECUPERAVEL' : 'PENDENTE',
                    status: 'OPEN',
                    received_at: todayDate,
                    created_at: now,
                    updated_at: now,
                });

                await adminDb
                    .from('tiss_guides')
                    .update({
                        status: 'TOTALLY_GLOSED',
                        paid_value: 0,
                        glosa_value: totalVal,
                        glosa_code: glosaCode,
                        glosa_description: glosaDesc,
                        can_appeal: !validated.is_irrecoverable,
                        updated_at: now,
                    })
                    .eq('id', g.id)
                    .eq('clinic_id', clinicId);
            }

            await adminDb
                .from('tiss_batches')
                .update({ review_status: 'EM_ANDAMENTO', last_reviewed_at: now, last_reviewed_by: user.id, updated_at: now })
                .eq('id', batchId)
                .eq('clinic_id', clinicId);

            const totals = await recalculateBatchTotals(adminDb, clinicId, batchId);

            await writeTissAudit({
                clinicId,
                userId: user.id,
                action: validated.action === 'glosa_total_fatura' ? 'TISS_BATCH_TOTAL_GLOSA' : 'TISS_ACCOUNTS_AUTO_TOTAL_GLOSA',
                entityType: 'tiss_batch',
                entityId: batchId,
                newState: { affected_guides: guidesToGlose.length, glosa_code: glosaCode, totals },
                customSupabase: adminDb,
            });

            return NextResponse.json({
                success: true,
                totals,
                affected_count: guidesToGlose.length,
                message: `Glosa total aplicada em ${guidesToGlose.length} conta(s).`,
            });
        }

        if (validated.action === 'return_to_revision') {
            const targetIds = validated.guide_ids || [];
            if (targetIds.length === 0) {
                return NextResponse.json({ success: false, error: 'Selecione ao menos uma conta para retornar à revisão.' }, { status: 400 });
            }

            await adminDb
                .from('tiss_guides')
                .update({
                    batch_id: null,
                    status: 'DRAFT',
                    billing_stage: 'ELABORACAO',
                    updated_at: now,
                })
                .eq('clinic_id', clinicId)
                .eq('batch_id', batchId)
                .in('id', targetIds);

            await adminDb
                .from('tiss_batches')
                .update({
                    review_status: 'COM_RETORNO_CORRECAO',
                    last_reviewed_at: now,
                    last_reviewed_by: user.id,
                    updated_at: now,
                })
                .eq('id', batchId)
                .eq('clinic_id', clinicId);

            const totals = await recalculateBatchTotals(adminDb, clinicId, batchId);

            await writeTissAudit({
                clinicId,
                userId: user.id,
                action: 'TISS_ACCOUNTS_RETURNED_FOR_CORRECTION',
                entityType: 'tiss_batch',
                entityId: batchId,
                newState: { guide_ids: targetIds, review_status: 'COM_RETORNO_CORRECAO' },
                customSupabase: adminDb,
            });

            return NextResponse.json({
                success: true,
                totals,
                review_status: 'COM_RETORNO_CORRECAO',
                message: `${targetIds.length} conta(s) devolvida(s) para Elaboração para correção.`,
            });
        }

        return NextResponse.json({ success: false, error: 'Ação não reconhecida' }, { status: 400 });
    } catch (err: any) {
        if (err?.name === 'ZodError') {
            return NextResponse.json({ success: false, error: err.errors?.[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        request.log.error('tiss/glosas/batches/[batchId] POST', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ success: false, error: err.message || 'Erro ao executar ação na remessa' }, { status: 500 });
    }
});

