import { AccountItemGroup, GlosaReconciliationSummary } from '@/types/tiss';

export const ACCOUNT_GROUP_LABELS: Record<AccountItemGroup, string> = {
    HONORARIOS: 'Honorários / Sessões',
    TAXAS: 'Taxas e Serviços',
    MATERIAIS: 'Materiais e Medicamentos',
    DIAGNOSE: 'Diagnose e Terapia',
};

const ALL_GROUPS: AccountItemGroup[] = ['HONORARIOS', 'TAXAS', 'MATERIAIS', 'DIAGNOSE'];

export function roundCurrency(value: number): number {
    return Number((Number(value) || 0).toFixed(2));
}

export function calculateGuideGlosaSummary(params: {
    guide: any;
    procedures: any[];
    glosas: any[];
}): GlosaReconciliationSummary {
    const { guide, procedures, glosas } = params;
    const activeProcedures = (procedures || []).filter((p) => p.status !== 'CANCELLED');
    const activeGlosas = (glosas || []).filter((g) => !g.deleted_at && g.status !== 'CANCELLED');

    const billedFromProcs = activeProcedures.reduce((acc, p) => acc + Number(p.total_value || 0), 0);
    const billedTotal = roundCurrency(billedFromProcs > 0 ? billedFromProcs : Number(guide?.total_value || 0));

    const enteredGlosaTotal = roundCurrency(
        activeGlosas.reduce((acc, g) => acc + Number(g.glosa_value || 0), 0)
    );
    const irrecoverableTotal = roundCurrency(
        activeGlosas.reduce(
            (acc, g) => acc + (g.is_irrecoverable ? Number(g.irrecoverable_value || g.glosa_value || 0) : 0),
            0
        )
    );

    const paidRaw = guide?.paid_value !== null && guide?.paid_value !== undefined ? Number(guide.paid_value) : null;
    const expectedFromPaid = paidRaw !== null ? Math.max(0, billedTotal - paidRaw) : Number(guide?.glosa_value || 0);
    const expectedGlosaTotal = roundCurrency(Math.max(expectedFromPaid, Number(guide?.glosa_value || 0) === enteredGlosaTotal ? expectedFromPaid : Number(guide?.glosa_value || 0)));

    const approvedTotal = roundCurrency(Math.max(0, billedTotal - enteredGlosaTotal));
    const overpaymentReceived = paidRaw !== null && paidRaw > billedTotal ? roundCurrency(paidRaw - billedTotal) : 0;
    const difference = roundCurrency(enteredGlosaTotal - expectedGlosaTotal);

    const byGroup = ALL_GROUPS.map((group) => {
        const groupProcs = activeProcedures.filter((p) => (p.item_group || 'HONORARIOS') === group);
        const groupGlosas = activeGlosas.filter((g) => (g.item_group || 'HONORARIOS') === group);

        const billed = roundCurrency(groupProcs.reduce((acc, p) => acc + Number(p.total_value || 0), 0));
        const glosa = roundCurrency(groupGlosas.reduce((acc, g) => acc + Number(g.glosa_value || 0), 0));
        const irrecoverable = roundCurrency(
            groupGlosas.reduce(
                (acc, g) => acc + (g.is_irrecoverable ? Number(g.irrecoverable_value || g.glosa_value || 0) : 0),
                0
            )
        );

        return {
            group,
            label: ACCOUNT_GROUP_LABELS[group],
            billed,
            approved: roundCurrency(Math.max(0, billed - glosa)),
            glosa,
            irrecoverable,
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

    const totalValue =
        activeProcs.length > 0
            ? roundCurrency(activeProcs.reduce((acc: number, p: any) => acc + Number(p.total_value || 0), 0))
            : roundCurrency(Number(guide?.total_value || 0));

    const glosaValue = roundCurrency(
        activeGlosas.reduce((acc: number, g: any) => acc + Number(g.glosa_value || 0), 0)
    );
    const paidValue = roundCurrency(Math.max(0, totalValue - glosaValue));

    // Sincroniza glosa por item se houver vínculo procedure_id
    for (const proc of activeProcs) {
        const procGlosas = activeGlosas.filter((g: any) => g.procedure_id === proc.id);
        const procGlosaSum = roundCurrency(procGlosas.reduce((acc: number, g: any) => acc + Number(g.glosa_value || 0), 0));
        const procTotal = Number(proc.total_value || 0);
        const procApprovedTotal = roundCurrency(Math.max(0, procTotal - procGlosaSum));
        const procHasIrrec = procGlosas.some((g: any) => g.is_irrecoverable === true);
        await supabaseAdmin
            .from('tiss_guide_procedures')
            .update({
                glosa_value: procGlosaSum,
                approved_total_value: procApprovedTotal,
                is_irrecoverable: procHasIrrec,
                status: procGlosaSum > 0 ? 'GLOSADO' : proc.status === 'GLOSADO' ? 'ACTIVE' : proc.status,
                updated_at: new Date().toISOString(),
            })
            .eq('id', proc.id);
    }

    let nextStatus = guide?.status || 'DRAFT';
    const normalizedCurrent = String(nextStatus).toUpperCase();
    const inReviewOrPaid = [
        'SENT',
        'PAID',
        'APPROVED',
        'PARTIAL',
        'PARTIALLY_GLOSED',
        'TOTALLY_GLOSED',
        'DENIED',
        'CLOSED',
    ].includes(normalizedCurrent);

    if (inReviewOrPaid) {
        if (glosaValue <= 0) {
            nextStatus = 'PAID';
        } else if (paidValue > 0) {
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
            paid_value: inReviewOrPaid ? paidValue : Number(guide?.paid_value || 0),
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
    const totalValue = roundCurrency(guideList.reduce((acc: number, g: any) => acc + Number(g.total_value || 0), 0));
    const glosaValue = roundCurrency(guideList.reduce((acc: number, g: any) => acc + Number(g.glosa_value || 0), 0));
    const approvedValue = roundCurrency(
        guideList.reduce((acc: number, g: any) => {
            const p = g.paid_value !== null && g.paid_value !== undefined
                ? Number(g.paid_value)
                : Math.max(0, Number(g.total_value || 0) - Number(g.glosa_value || 0));
            return acc + p;
        }, 0)
    );
    const glosaPercentage = totalValue > 0 ? roundCurrency((glosaValue / totalValue) * 100) : 0;

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

