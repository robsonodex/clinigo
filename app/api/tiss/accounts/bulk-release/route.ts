import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { writeTissAudit } from '@/lib/tiss/audit';

export const dynamic = 'force-dynamic';

const bulkReleaseSchema = z.object({
    guide_ids: z.array(z.string().uuid()).min(1, 'Selecione ao menos uma conta'),
});

/**
 * POST /api/tiss/accounts/bulk-release - Liberar Selecionadas em Lote
 */
export const POST = withAxiom(async (request: AxiomRequest) => {
    const guard = await requireTissAction(request, 'conta.liberar');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const body = await request.json();
        const validated = bulkReleaseSchema.parse(body);

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

        const { data: guides } = await adminDb
            .from('tiss_guides')
            .select('id, guide_number, billing_stage, patient_card_number, total_value, health_insurance_id, status_history')
            .in('id', validated.guide_ids)
            .eq('clinic_id', clinicId)
            .is('deleted_at', null);

        const now = new Date().toISOString();
        const releasedIds: string[] = [];
        const skipped: Array<{ guide_id: string; guide_number: string; reason: string }> = [];

        for (const g of guides || []) {
            if (g.billing_stage && g.billing_stage !== 'ELABORACAO') {
                skipped.push({ guide_id: g.id, guide_number: g.guide_number, reason: 'Já liberada ou em lote' });
                continue;
            }
            const reasons: string[] = [];
            if (!g.patient_card_number || g.patient_card_number === 'PENDENTE') reasons.push('Sem carteirinha');
            if (Number(g.total_value || 0) <= 0) reasons.push('Valor zerado');
            if (!g.health_insurance_id) reasons.push('Sem operadora');

            if (reasons.length > 0) {
                skipped.push({ guide_id: g.id, guide_number: g.guide_number, reason: reasons.join(', ') });
                continue;
            }

            const history = Array.isArray(g.status_history) ? g.status_history : [];
            const { error: upErr } = await adminDb
                .from('tiss_guides')
                .update({
                    billing_stage: 'LIBERADA',
                    status: 'VALIDATED',
                    validation_status: 'VALID',
                    released_at: now,
                    released_by: user.id,
                    status_history: [
                        ...history,
                        {
                            status: 'VALIDATED',
                            billing_stage: 'LIBERADA',
                            at: now,
                            by: user.id,
                            note: 'Liberação em lote na tela Elaboração de Contas',
                        },
                    ],
                    updated_at: now,
                })
                .eq('id', g.id)
                .eq('clinic_id', clinicId);

            if (!upErr) {
                releasedIds.push(g.id);
            }
        }

        if (releasedIds.length > 0) {
            await writeTissAudit({
                clinicId,
                userId: user.id,
                action: 'TISS_ACCOUNTS_BULK_RELEASED',
                entityType: 'tiss_guide',
                entityId: releasedIds[0],
                newState: { count: releasedIds.length, guide_ids: releasedIds },
                customSupabase: adminDb,
            });
        }

        return NextResponse.json({
            success: true,
            released_count: releasedIds.length,
            skipped_count: skipped.length,
            released_ids: releasedIds,
            skipped,
            message: `${releasedIds.length} conta(s) liberada(s) para faturamento.${skipped.length > 0 ? ` ${skipped.length} ignorada(s) por pendência.` : ''}`,
        });
    } catch (err: any) {
        if (err?.name === 'ZodError') {
            return NextResponse.json({ success: false, error: err.errors?.[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        request.log.error('tiss/accounts/bulk-release POST', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ success: false, error: err.message || 'Erro ao liberar contas em lote' }, { status: 500 });
    }
});

