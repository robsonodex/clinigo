import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { writeTissAudit } from '@/lib/tiss/audit';

export const dynamic = 'force-dynamic';

const releaseActionSchema = z.object({
    action: z.enum(['release', 'reverse']).default('release'),
    force: z.boolean().optional().default(false),
    reason: z.string().max(400).optional(),
});

/**
 * POST /api/tiss/accounts/[id]/release
 * Encerrar e Liberar Conta (Ctrl+L) ou Estornar Liberação
 */
export const POST = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    const bodyRaw = await request.clone().json().catch(() => ({}));
    const actionType = bodyRaw?.action === 'reverse' ? 'conta.estornar' : 'conta.liberar';
    const guard = await requireTissAction(request, actionType);
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { id: guideId } = await params;
        const validated = releaseActionSchema.parse(bodyRaw);

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

        const { data: guide, error: guideErr } = await adminDb
            .from('tiss_guides')
            .select('*')
            .eq('id', guideId)
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .maybeSingle();

        if (guideErr || !guide) {
            return NextResponse.json({ success: false, error: 'Conta médica não encontrada' }, { status: 404 });
        }

        const now = new Date().toISOString();

        if (validated.action === 'release') {
            if (guide.billing_stage && guide.billing_stage !== 'ELABORACAO') {
                return NextResponse.json(
                    { success: false, error: `A conta já se encontra no estágio "${guide.billing_stage}".` },
                    { status: 409 }
                );
            }

            const blockers: string[] = [];
            if (!guide.patient_card_number || guide.patient_card_number === 'PENDENTE') {
                blockers.push('Número da carteirinha não preenchido');
            }
            if (Number(guide.total_value || 0) <= 0) {
                blockers.push('Conta com valor total zerado');
            }
            if (!guide.health_insurance_id) {
                blockers.push('Operadora não vinculada à conta');
            }

            if (blockers.length > 0 && !validated.force) {
                return NextResponse.json(
                    {
                        success: false,
                        code: 'ANTI_GLOSA_BLOCKERS',
                        error: `Não é possível liberar a conta: ${blockers.join('; ')}.`,
                        blockers,
                    },
                    { status: 422 }
                );
            }

            const history = Array.isArray(guide.status_history) ? guide.status_history : [];
            const { data: updated, error: upErr } = await adminDb
                .from('tiss_guides')
                .update({
                    billing_stage: 'LIBERADA',
                    status: 'VALIDATED',
                    validation_status: blockers.length === 0 ? 'VALID' : 'WARNING',
                    released_at: now,
                    released_by: user.id,
                    status_history: [
                        ...history,
                        {
                            status: 'VALIDATED',
                            billing_stage: 'LIBERADA',
                            at: now,
                            by: user.id,
                            note: 'Conta encerrada e liberada para faturamento (Ctrl+L)',
                        },
                    ],
                    updated_at: now,
                })
                .eq('id', guideId)
                .eq('clinic_id', clinicId)
                .select()
                .single();

            if (upErr) {
                return NextResponse.json({ success: false, error: upErr.message }, { status: 500 });
            }

            await writeTissAudit({
                clinicId,
                userId: user.id,
                action: 'TISS_ACCOUNT_RELEASED',
                entityType: 'tiss_guide',
                entityId: guideId,
                previousState: { billing_stage: guide.billing_stage, status: guide.status },
                newState: { billing_stage: 'LIBERADA', status: 'VALIDATED' },
                customSupabase: adminDb,
            });

            return NextResponse.json({
                success: true,
                data: updated,
                message: 'Conta médica encerrada e liberada para faturamento.',
            });
        }

        // Estornar Liberação
        if (guide.batch_id) {
            return NextResponse.json(
                { success: false, error: 'Não é possível estornar uma conta já vinculada a uma remessa. Remova-a do lote primeiro.' },
                { status: 409 }
            );
        }

        const history = Array.isArray(guide.status_history) ? guide.status_history : [];
        const { data: reverted, error: revErr } = await adminDb
            .from('tiss_guides')
            .update({
                billing_stage: 'ELABORACAO',
                status: 'DRAFT',
                released_at: null,
                released_by: null,
                status_history: [
                    ...history,
                    {
                        status: 'DRAFT',
                        billing_stage: 'ELABORACAO',
                        at: now,
                        by: user.id,
                        note: validated.reason || 'Liberação estornada para revisão em Elaboração de Contas',
                    },
                ],
                updated_at: now,
            })
            .eq('id', guideId)
            .eq('clinic_id', clinicId)
            .select()
            .single();

        if (revErr) {
            return NextResponse.json({ success: false, error: revErr.message }, { status: 500 });
        }

        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: 'TISS_ACCOUNT_RELEASE_REVERSED',
            entityType: 'tiss_guide',
            entityId: guideId,
            previousState: { billing_stage: guide.billing_stage },
            newState: { billing_stage: 'ELABORACAO' },
            reason: validated.reason,
            customSupabase: adminDb,
        });

        return NextResponse.json({
            success: true,
            data: reverted,
            message: 'Liberação estornada. A conta retornou para Em Elaboração.',
        });
    } catch (err: any) {
        if (err?.name === 'ZodError') {
            return NextResponse.json({ success: false, error: err.errors?.[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        request.log.error('tiss/accounts/[id]/release POST', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ success: false, error: err.message || 'Erro ao processar liberação' }, { status: 500 });
    }
});

