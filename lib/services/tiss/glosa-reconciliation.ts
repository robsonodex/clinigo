import { AccountItemGroup, GlosaReconciliationSummary } from '@/types/tiss';
import { fromCents, sumCents, toCents } from '@/lib/tiss/money';

export const ACCOUNT_GROUP_LABELS: Record<AccountItemGroup, string> = {
    HONORARIOS: 'Honorários / Sessões',
    TAXAS: 'Taxas e Serviços',
    MATERIAIS: 'Materiais e Medicamentos',
    DIAGNOSE: 'Diagnose e Terapia',
};

const ALL_GROUPS: AccountItemGroup[] = ['HONORARIOS', 'TAXAS', 'MATERIAIS', 'DIAGNOSE'];

export function roundCurrency(value: number): number {
    return fromCents(toCents(value));
}

/**
 * Soma glosas protegendo contra dupla contagem de múltiplos códigos ANS no mesmo item (QA-06 / FIN-04).
 * Quando múltiplos motivos referenciam o mesmo `procedure_id`, o teto da glosa do item nunca excede o valor cobrado do item.
 */
function sumGlosasCappedCents(activeGlosas: any[], activeProcedures: any[]): number {
    const procValueById = new Map<string, number>();
    for (const p of activeProcedures || []) {
        if (p?.id) procValueById.set(p.id, toCents(p.total_value));
    }

    const byProc = new Map<string, number>();
    let unlinkedCents = 0;

    for (const g of activeGlosas || []) {
        const gCents = Math.max(0, toCents(g.glosa_value));
        if (g.procedure_id && procValueById.has(g.procedure_id)) {
            byProc.set(g.procedure_id, (byProc.get(g.procedure_id) || 0) + gCents);
        } else {
            unlinkedCents += gCents;
        }
    }

    let linkedCapped = 0;
    for (const [procId, sumForProc] of byProc.entries()) {
        const cap = procValueById.get(procId) ?? sumForProc;
        linkedCapped += Math.min(sumForProc, cap);
    }

    return linkedCapped + unlinkedCents;
}

export function calculateGuideGlosaSummary(params: {
    guide: any;
    procedures: any[];
    glosas: any[];
}): GlosaReconciliationSummary {
    const { guide, procedures, glosas } = params;
    const activeProcedures = (procedures || []).filter((p) => p.status !== 'CANCELLED');
    const activeGlosas = (glosas || []).filter((g) => !g.deleted_at && g.status !== 'CANCELLED');

    const billedFromProcsCents = sumCents(activeProcedures.map((p) => p.total_value));
    const billedTotalCents = billedFromProcsCents > 0 ? billedFromProcsCents : toCents(guide?.total_value);
    const billedTotal = fromCents(billedTotalCents);

    const enteredGlosaCents = Math.min(billedTotalCents > 0 ? billedTotalCents : Number.MAX_SAFE_INTEGER, sumGlosasCappedCents(activeGlosas, activeProcedures));
    const enteredGlosaTotal = fromCents(enteredGlosaCents);

    const irrecoverableCents = sumCents(
        activeGlosas.map((g) => (g.is_irrecoverable ? (g.irrecoverable_value ?? g.glosa_value) : 0))
    );
    const irrecoverableTotal = fromCents(Math.min(enteredGlosaCents, irrecoverableCents));

    const paidRawCents =
        guide?.paid_value !== null && guide?.paid_value !== undefined ? toCents(guide.paid_value) : null;
    const expectedFromPaidCents =
        paidRawCents !== null ? Math.max(0, billedTotalCents - paidRawCents) : toCents(guide?.glosa_value);
    const guideGlosaCents = toCents(guide?.glosa_value);
    const expectedGlosaCents = Math.max(
        expectedFromPaidCents,
        guideGlosaCents === enteredGlosaCents ? expectedFromPaidCents : guideGlosaCents
    );
    const expectedGlosaTotal = fromCents(expectedGlosaCents);

    const approvedTotal = fromCents(Math.max(0, billedTotalCents - enteredGlosaCents));
    const overpaymentReceived =
        paidRawCents !== null && paidRawCents > billedTotalCents
            ? fromCents(paidRawCents - billedTotalCents)
            : 0;
    const difference = fromCents(enteredGlosaCents - expectedGlosaCents);

    const byGroup = ALL_GROUPS.map((group) => {
        const groupProcs = activeProcedures.filter((p) => (p.item_group || 'HONORARIOS') === group);
        const groupGlosas = activeGlosas.filter((g) => (g.item_group || 'HONORARIOS') === group);

        const billedCents = sumCents(groupProcs.map((p) => p.total_value));
        const glosaCents = sumGlosasCappedCents(groupGlosas, groupProcs);
        const irrecCents = sumCents(
            groupGlosas.map((g) => (g.is_irrecoverable ? (g.irrecoverable_value ?? g.glosa_value) : 0))
        );

        return {
            group,
            label: ACCOUNT_GROUP_LABELS[group],
            billed: fromCents(billedCents),
            approved: fromCents(Math.max(0, billedCents - glosaCents)),
            glosa: fromCents(glosaCents),
            irrecoverable: fromCents(Math.min(glosaCents, irrecCents)),
        };
    });

    return {
        guide_id: guide.id,
        guide_number: guide.guide_number,
        patient_name: guide.patient_name,
        billed_total: billedTotal,
        approved_total: approvedTotal,
        expected_glosa_total: expectedGlosaTotal,
        entered_glosa_total: enteredGlosaTotal,
        irrecoverable_total: irrecoverableTotal,
        difference,
        overpayment_received: overpaymentReceived,
        by_group: byGroup,
    };
}

export async function recalculateGuideFromItems(
    supabaseAdmin: any,
    clinicId: string,
    guideId: string
): Promise<{ totalValue: number; glosaValue: number; paidValue: number; status: string }> {
    const [{ data: guide }, { data: procs }, { data: glosas }] = await Promise.all([
        supabaseAdmin
            .from('tiss_guides')
            .select('id, status, total_value, unit_value, procedure_quantity, glosa_value, paid_value, batch_id')
            .eq('id', guideId)
            .eq('clinic_id', clinicId)
            .single(),
        supabaseAdmin
            .from('tiss_guide_procedures')
            .select('id, quantity, unit_value, total_value, status, glosa_value, is_irrecoverable')
            .eq('guide_id', guideId),
        supabaseAdmin
            .from('tiss_glosas')
            .select('id, procedure_id, glosa_value, status, is_irrecoverable, deleted_at')
            .eq('guide_id', guideId)
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .neq('status', 'CANCELLED'),
    ]);

    const activeProcs = (procs || []).filter((p: any) => p.status !== 'CANCELLED');
    const activeGlosas = (glosas || []).filter((g: any) => !g.deleted_at && g.status !== 'CANCELLED');

    const totalCents =
        activeProcs.length > 0
            ? sumCents(activeProcs.map((p: any) => p.total_value))
            : toCents(guide?.total_value);
    const totalValue = fromCents(totalCents);

    const glosaCents = Math.min(
        totalCents > 0 ? totalCents : Number.MAX_SAFE_INTEGER,
        sumGlosasCappedCents(activeGlosas, activeProcs)
    );
    const glosaValue = fromCents(glosaCents);

    // FIN-01: Nunca fabricar pagamento em caixa (PAID) a partir de guia apenas ENVIADA (SENT) sem retorno/crédito real
    const existingPaidCents = toCents(guide?.paid_value);
    const normalizedCurrent = String(guide?.status || 'DRAFT').toUpperCase();
    const hasConfirmedPaymentOrReturn = [
        'PAID',
        'APPROVED',
        'PARTIAL',
        'PARTIALLY_GLOSED',
        'TOTALLY_GLOSED',
        'DENIED',
        'CLOSED',
    ].includes(normalizedCurrent);

    const calculatedApprovedCents = Math.max(0, totalCents - glosaCents);
    const paidValue = hasConfirmedPaymentOrReturn
        ? fromCents(calculatedApprovedCents)
        : fromCents(existingPaidCents);

    for (const proc of activeProcs) {
        const procGlosas = activeGlosas.filter((g: any) => g.procedure_id === proc.id);
        const procTotalCents = toCents(proc.total_value);
        const procGlosaCents = Math.min(procTotalCents, sumCents(procGlosas.map((g: any) => g.glosa_value)));
        const procApprovedCents = Math.max(0, procTotalCents - procGlosaCents);
        const procHasIrrec = procGlosas.some((g: any) => g.is_irrecoverable === true);
        await supabaseAdmin
            .from('tiss_guide_procedures')
            .update({
                glosa_value: fromCents(procGlosaCents),
                approved_total_value: fromCents(procApprovedCents),
                is_irrecoverable: procHasIrrec,
                status: procGlosaCents > 0 ? 'GLOSADO' : proc.status === 'GLOSADO' ? 'ACTIVE' : proc.status,
                updated_at: new Date().toISOString(),
            })
            .eq('id', proc.id);
    }

    let nextStatus = guide?.status || 'DRAFT';
    if (normalizedCurrent === 'SENT') {
        if (glosaCents > 0 && glosaCents < totalCents) {
            nextStatus = 'PARTIALLY_GLOSED';
        } else if (glosaCents >= totalCents && totalCents > 0) {
            nextStatus = 'TOTALLY_GLOSED';
        } else {
            // Permanece SENT (não promove para PAID sem demonstrativo/crédito)
            nextStatus = 'SENT';
        }
    } else if (hasConfirmedPaymentOrReturn) {
        if (glosaCents <= 0) {
            nextStatus = existingPaidCents > 0 || normalizedCurrent === 'PAID' || normalizedCurrent === 'APPROVED' ? 'PAID' : 'SENT';
        } else if (calculatedApprovedCents > 0) {
            nextStatus = 'PARTIALLY_GLOSED';
        } else {
            nextStatus = 'TOTALLY_GLOSED';
        }
    }

    await supabaseAdmin
        .from('tiss_guides')
        .update({
            total_value: totalValue,
            glosa_value: glosaValue,
            paid_value: paidValue,
            status: nextStatus,
            updated_at: new Date().toISOString(),
        })
        .eq('id', guideId)
        .eq('clinic_id', clinicId);

    return { totalValue, glosaValue, paidValue, status: nextStatus };
}

export async function recalculateBatchTotals(
    supabaseAdmin: any,
    clinicId: string,
    batchId: string
): Promise<{
    totalGuides: number;
    totalValue: number;
    approvedValue: number;
    glosaValue: number;
    reviewStatus: string;
}> {
    const { data: guides } = await supabaseAdmin
        .from('tiss_guides')
        .select('id, status, total_value, paid_value, glosa_value, billing_stage')
        .eq('clinic_id', clinicId)
        .eq('batch_id', batchId)
        .is('deleted_at', null)
        .not('status', 'in', '("CANCELLED","CANCELED")');

    const guideList = guides || [];
    const totalGuides = guideList.length;
    const totalCents = sumCents(guideList.map((g: any) => g.total_value));
    const glosaCents = sumCents(guideList.map((g: any) => g.glosa_value));
    const approvedCents = sumCents(
        guideList.map((g: any) => {
            if (g.paid_value !== null && g.paid_value !== undefined) {
                return g.paid_value;
            }
            return fromCents(Math.max(0, toCents(g.total_value) - toCents(g.glosa_value)));
        })
    );

    const totalValue = fromCents(totalCents);
    const glosaValue = fromCents(glosaCents);
    const approvedValue = fromCents(approvedCents);
    const glosaPercentage = totalCents > 0 ? roundCurrency((glosaCents / totalCents) * 100) : 0;

    const { data: batch } = await supabaseAdmin
        .from('tiss_batches')
        .select('review_status')
        .eq('id', batchId)
        .eq('clinic_id', clinicId)
        .maybeSingle();

    const reviewStatus = batch?.review_status || 'NAO_INICIADA';

    await supabaseAdmin
        .from('tiss_batches')
        .update({
            total_guides: totalGuides,
            total_value: totalValue,
            approved_value: approvedValue,
            glosa_value: glosaValue,
            denied_value: glosaValue,
            entered_glosa_total: glosaValue,
            glosa_percentage: glosaPercentage,
            updated_at: new Date().toISOString(),
        })
        .eq('id', batchId)
        .eq('clinic_id', clinicId);

    return { totalGuides, totalValue, approvedValue, glosaValue, reviewStatus };
}
