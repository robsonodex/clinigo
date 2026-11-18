import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { recalculateGuideFromItems, roundCurrency } from '@/lib/services/tiss/glosa-reconciliation';
import { writeTissAudit } from '@/lib/tiss/audit';

export const dynamic = 'force-dynamic';

const addItemSchema = z.object({
    procedure_code: z.string().min(2, 'Informe o código TUSS/item'),
    procedure_name: z.string().min(2, 'Informe a descrição do item'),
    item_group: z.enum(['HONORARIOS', 'TAXAS', 'MATERIAIS', 'DIAGNOSE']).default('HONORARIOS'),
    unit_measure: z.string().max(20).default('UN'),
    quantity: z.number().positive('Quantidade deve ser maior que zero'),
    unit_value: z.number().min(0, 'Valor unitário não pode ser negativo'),
    execution_date: z.string().optional().nullable(),
});

const reverseItemSchema = z.object({
    item_id: z.string().uuid('ID do item inválido'),
    reason: z.string().max(300).optional(),
});

/**
 * POST /api/tiss/accounts/[id]/items - Incluir Item (+ Incluir) na conta médica em Elaboração
 */
export const POST = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireTissAction(request, 'conta.editar');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { id: guideId } = await params;
        const body = await request.json();
        const validated = addItemSchema.parse(body);

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

        const { data: guide } = await adminDb
            .from('tiss_guides')
            .select('id, billing_stage, execution_date, procedure_code, procedure_name, procedure_quantity, unit_value, total_value')
            .eq('id', guideId)
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .maybeSingle();

        if (!guide) {
            return NextResponse.json({ success: false, error: 'Conta médica não encontrada' }, { status: 404 });
        }

        if (guide.billing_stage && guide.billing_stage !== 'ELABORACAO') {
            return NextResponse.json(
                { success: false, error: 'Conta já liberada. Estorne a liberação antes de incluir novos itens.' },
                { status: 409 }
            );
        }

        // Materializa item inicial caso a guia legada não possuísse registros em tiss_guide_procedures
        const { count: existingProcCount } = await adminDb
            .from('tiss_guide_procedures')
            .select('id', { count: 'exact', head: true })
            .eq('guide_id', guideId);

        if ((existingProcCount || 0) === 0 && Number(guide.total_value || 0) > 0) {
            await adminDb.from('tiss_guide_procedures').insert({
                clinic_id: clinicId,
                guide_id: guideId,
                procedure_code: guide.procedure_code,
                procedure_name: guide.procedure_name,
                item_group: 'HONORARIOS',
                unit_measure: 'UN',
                quantity: Number(guide.procedure_quantity || 1),
                unit_value: Number(guide.unit_value || 0),
                total_value: Number(guide.total_value || 0),
                execution_date: guide.execution_date,
                status: 'ACTIVE',
            });
        }

        const lineTotal = roundCurrency(validated.quantity * validated.unit_value);
        const { data: inserted, error: insErr } = await adminDb
            .from('tiss_guide_procedures')
            .insert({
                clinic_id: clinicId,
                guide_id: guideId,
                procedure_code: validated.procedure_code.trim(),
                procedure_name: validated.procedure_name.trim(),
                item_group: validated.item_group,
                unit_measure: validated.unit_measure,
                quantity: validated.quantity,
                unit_value: validated.unit_value,
                total_value: lineTotal,
                execution_date: validated.execution_date || guide.execution_date,
                status: 'ACTIVE',
            })
            .select()
            .single();

        if (insErr) {
            return NextResponse.json({ success: false, error: insErr.message }, { status: 500 });
        }

        const totals = await recalculateGuideFromItems(adminDb, clinicId, guideId);

        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: 'TISS_ACCOUNT_ITEM_ADDED',
            entityType: 'tiss_guide',
            entityId: guideId,
            newState: { item: inserted, total_value: totals.totalValue },
            customSupabase: adminDb,
        });

        return NextResponse.json({
            success: true,
            data: inserted,
            totals,
            message: 'Item incluído na conta médica.',
        }, { status: 201 });
    } catch (err: any) {
        if (err?.name === 'ZodError') {
            return NextResponse.json({ success: false, error: err.errors?.[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        request.log.error('tiss/accounts/[id]/items POST', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ success: false, error: err.message || 'Erro ao incluir item' }, { status: 500 });
    }
});

/**
 * DELETE /api/tiss/accounts/[id]/items - Estornar Item (Estorno) sem excluir rastro histórico
 */
export const DELETE = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireTissAction(request, 'conta.editar');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { id: guideId } = await params;
        const body = await request.json().catch(() => ({}));
        const itemIdFromQuery = new URL(request.url).searchParams.get('item_id');
        const validated = reverseItemSchema.parse({
            ...body,
            item_id: body?.item_id || itemIdFromQuery || undefined,
        });

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

        const { data: guide } = await adminDb
            .from('tiss_guides')
            .select('id, billing_stage')
            .eq('id', guideId)
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .maybeSingle();

        if (!guide) {
            return NextResponse.json({ success: false, error: 'Conta médica não encontrada' }, { status: 404 });
        }

        if (guide.billing_stage && guide.billing_stage !== 'ELABORACAO') {
            return NextResponse.json(
                { success: false, error: 'Conta já liberada. Estorne a liberação antes de estornar itens.' },
                { status: 409 }
            );
        }

        const { error: upErr } = await adminDb
            .from('tiss_guide_procedures')
            .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
            .eq('id', validated.item_id)
            .eq('guide_id', guideId)
            .eq('clinic_id', clinicId);

        if (upErr) {
            return NextResponse.json({ success: false, error: upErr.message }, { status: 500 });
        }

        const totals = await recalculateGuideFromItems(adminDb, clinicId, guideId);

        await writeTissAudit({
            clinicId,
            userId: user.id,
            action: 'TISS_ACCOUNT_ITEM_REVERSED',
            entityType: 'tiss_guide',
            entityId: guideId,
            previousState: { item_id: validated.item_id },
            newState: { status: 'CANCELLED', total_value: totals.totalValue },
            reason: validated.reason || 'Estorno operacional em Elaboração de Contas',
            customSupabase: adminDb,
        });

        return NextResponse.json({
            success: true,
            totals,
            message: 'Item estornado com sucesso.',
        });
    } catch (err: any) {
        if (err?.name === 'ZodError') {
            return NextResponse.json({ success: false, error: err.errors?.[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        request.log.error('tiss/accounts/[id]/items DELETE', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ success: false, error: err.message || 'Erro ao estornar item' }, { status: 500 });
    }
});

