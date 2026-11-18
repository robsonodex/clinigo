import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import {
    calculateGuideGlosaSummary,
    recalculateBatchTotals,
    recalculateGuideFromItems,
    roundCurrency,
} from '@/lib/services/tiss/glosa-reconciliation';
import { writeTissAudit } from '@/lib/tiss/audit';

export const dynamic = 'force-dynamic';

const level3Schema = z.object({
    action: z.enum([
        'apply_item_glosa',
        'reverse_glosa_item',
        'glosar_grupo',
        'estornar_glosas_grupo',
        'estornar_glosa_valor_total',
        'save_draft',
        'complete_account_review',
    ]),
    procedure_id: z.string().optional().nullable(),
    glosa_id: z.string().uuid().optional(),
    item_group: z.enum(['HONORARIOS', 'TAXAS', 'MATERIAIS', 'DIAGNOSE', 'ALL']).optional().default('HONORARIOS'),
    glosa_code: z.string().optional(),
    glosa_description: z.string().optional(),
    glosa_type: z.enum(['ADMINISTRATIVA', 'TECNICA', 'VALOR_TABELA']).optional().default('ADMINISTRATIVA'),
    approved_quantity: z.number().min(0).optional(),
    approved_unit_value: z.number().min(0).optional(),
    is_irrecoverable: z.boolean().optional().default(false),
    irrecoverable_quantity: z.number().min(0).optional().default(0),
    irrecoverable_value: z.number().min(0).optional().default(0),
    observation: z.string().max(1500).optional().nullable(),
    control_date: z.string().optional().nullable(),
    force_batimento: z.boolean().optional().default(false),
});

async function loadAccountSnapshot(adminDb: any, clinicId: string, guideId: string) {
    const { data: guide, error: gErr } = await adminDb
        .from('tiss_guides')
        .select(`
            *,
            batch:tiss_batches(id, batch_number, status, review_status, insurance_company_id, insurance_company_name),
            health_insurance:health_insurances(id, name, code),
            doctor:doctors(id, crm, specialty, user:users(full_name)),
            patient:patients(id, full_name, cpf, date_of_birth, phone, insurance_card_number, insurance_validity)
        `)
        .eq('id', guideId)
        .eq('clinic_id', clinicId)
        .is('deleted_at', null)
        .maybeSingle();

    if (gErr || !guide) return null;

    let [{ data: procedures }, { data: glosas }] = await Promise.all([
        adminDb
            .from('tiss_guide_procedures')
            .select('*')
            .eq('guide_id', guideId)
            .neq('status', 'CANCELLED')
            .order('created_at', { ascending: true }),
        adminDb
            .from('tiss_glosas')
            .select('*')
            .eq('guide_id', guideId)
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .neq('status', 'CANCELLED')
            .order('created_at', { ascending: false }),
    ]);

    if (!procedures || procedures.length === 0) {
        procedures = [
            {
                id: `virtual-${guide.id}`,
                clinic_id: clinicId,
                guide_id: guide.id,
                procedure_code: guide.procedure_code,
                procedure_name: guide.procedure_name,
                item_group: 'HONORARIOS',
                unit_measure: 'UN',
                quantity: Number(guide.procedure_quantity || 1),
                unit_value: Number(guide.unit_value || 0),
                total_value: Number(guide.total_value || 0),
                execution_date: guide.execution_date,
                status: 'ACTIVE',
                approved_quantity: guide.paid_value !== null ? Number(guide.procedure_quantity || 1) : null,
                approved_unit_value: guide.paid_value !== null ? Number(guide.paid_value) : null,
                approved_total_value: guide.paid_value !== null ? Number(guide.paid_value) : null,
                glosa_value: Number(guide.glosa_value || 0),
                is_irrecoverable: (glosas || []).some((gl: any) => gl.is_irrecoverable),
                is_virtual: true,
            },
        ];
    }

    let appointmentData: any = null;
    let medicalRecordData: any = null;
    if (guide.appointment_id) {
        const [{ data: appt }, { data: rec }] = await Promise.all([
            adminDb
                .from('appointments')
                .select('id, appointment_date, appointment_time, status, session_status, checked_in_at, checkin_confirmed_at, checkin_method, therapist_start_verified_at, completed_at')
                .eq('id', guide.appointment_id)
                .eq('clinic_id', clinicId)
                .maybeSingle(),
            adminDb
                .from('medical_records')
                .select('id, chief_complaint, history_present_illness, treatment_plan, signed_at, signature_hash, created_at')
                .eq('appointment_id', guide.appointment_id)
                .eq('clinic_id', clinicId)
                .maybeSingle(),
        ]);
        appointmentData = appt;
        medicalRecordData = rec;
    }

    const summary = calculateGuideGlosaSummary({
        guide,
        procedures,
        glosas: glosas || [],
    });

    return {
        guide,
        procedures,
        glosas: glosas || [],
        summary,
        appointment: appointmentData,
        medical_record: medicalRecordData,
    };
}

/**
 * GET /api/tiss/glosas/accounts/[guideId]
 * Nível 3 do Controle de Glosas: Detalhe da Conta com 4 grupos, itens, glosas lançadas e batimento.
 */
export const GET = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ guideId: string }> }) => {
    const guard = await requireTissAction(request, 'glosa.revisar');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { guideId } = await params;
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

        const snapshot = await loadAccountSnapshot(adminDb, clinicId, guideId);
        if (!snapshot) {
            return NextResponse.json({ success: false, error: 'Conta médica não encontrada' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: snapshot });
    } catch (err: any) {
        request.log.error('tiss/glosas/accounts/[guideId] GET', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ success: false, error: err.message || 'Erro ao carregar conta no Nível 3' }, { status: 500 });
    }
});

/**
 * POST /api/tiss/glosas/accounts/[guideId]
 * Ações operacionais Nível 3 (Modal Glosa Parcial/Irrecuperável, Estorno, Grupo, Grava e Conclui + Batimento).
 */
export const POST = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ guideId: string }> }) => {
    const bodyRaw = await request.clone().json().catch(() => ({}));
    const requiredAction = String(bodyRaw?.action || '').startsWith('estornar') || bodyRaw?.action === 'reverse_glosa_item'
        ? 'glosa.estornar'
        : 'glosa.revisar';
    const guard = await requireTissAction(request, requiredAction);
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { guideId } = await params;
        const validated = level3Schema.parse(bodyRaw);

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
            .select('*')
            .eq('id', guideId)
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .maybeSingle();

        if (!guide) {
            return NextResponse.json({ success: false, error: 'Conta médica não encontrada' }, { status: 404 });
        }

        const now = new Date().toISOString();
        const todayDate = validated.control_date || now.split('T')[0];

        // Garante materialização do item em tiss_guide_procedures se guia for legada
        const { count: procCount } = await adminDb
            .from('tiss_guide_procedures')
            .select('id', { count: 'exact', head: true })
            .eq('guide_id', guideId);

        if ((procCount || 0) === 0) {
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

        if (validated.action === 'apply_item_glosa') {
            if (!validated.glosa_code || !validated.glosa_description) {
                return NextResponse.json({ success: false, error: 'Informe o código e motivo da glosa (Tabela 38 ANS).' }, { status: 400 });
            }

            let targetProc: any = null;
            if (validated.procedure_id && !validated.procedure_id.startsWith('virtual-')) {
                const { data: foundProc } = await adminDb
                    .from('tiss_guide_procedures')
                    .select('*')
                    .eq('id', validated.procedure_id)
                    .eq('guide_id', guideId)
                    .maybeSingle();
                targetProc = foundProc;
            }
            if (!targetProc) {
                const { data: firstProc } = await adminDb
                    .from('tiss_guide_procedures')
                    .select('*')
                    .eq('guide_id', guideId)
                    .neq('status', 'CANCELLED')
                    .order('created_at', { ascending: true })
                    .limit(1)
                    .maybeSingle();
                targetProc = firstProc;
            }

            if (!targetProc) {
                return NextResponse.json({ success: false, error: 'Item da conta não encontrado para lançamento de glosa.' }, { status: 404 });
            }

            const billedQty = Number(targetProc.quantity || 1);
            const billedUnit = Number(targetProc.unit_value || 0);
            const billedTotal = roundCurrency(Number(targetProc.total_value || billedQty * billedUnit));

            const approvedQty = validated.approved_quantity !== undefined ? validated.approved_quantity : billedQty;
            const approvedUnit = validated.approved_unit_value !== undefined ? validated.approved_unit_value : billedUnit;
            const approvedTotal = Math.min(billedTotal, roundCurrency(approvedQty * approvedUnit));
            const glosaValue = roundCurrency(Math.max(0, billedTotal - approvedTotal));

            if (glosaValue <= 0) {
                return NextResponse.json(
                    { success: false, error: 'O valor aprovado informado equivale ao total cobrado. Ajuste quantidade/valor aprovado para registrar glosa.' },
                    { status: 422 }
                );
            }

            const irrecVal = validated.is_irrecoverable
                ? roundCurrency(validated.irrecoverable_value > 0 ? Math.min(glosaValue, validated.irrecoverable_value) : glosaValue)
                : 0;
            const irrecQty = validated.is_irrecoverable
                ? validated.irrecoverable_quantity > 0
                    ? validated.irrecoverable_quantity
                    : Math.max(0, billedQty - approvedQty)
                : 0;

            // Cancela glosa aberta anterior deste mesmo procedure_id para evitar duplicação acidental ao reabrir edição do item
            await adminDb
                .from('tiss_glosas')
                .update({ status: 'CANCELLED', deleted_at: now, deleted_by: user.id, updated_at: now })
                .eq('clinic_id', clinicId)
                .eq('guide_id', guideId)
                .eq('procedure_id', targetProc.id)
                .is('deleted_at', null)
                .eq('status', 'OPEN');

            await adminDb.from('tiss_glosas').insert({
                clinic_id: clinicId,
                guide_id: guideId,
                batch_id: guide.batch_id || null,
                guide_number: guide.guide_number,
                procedure_id: targetProc.id,
                item_code: targetProc.procedure_code,
                item_description: targetProc.procedure_name,
                item_group: targetProc.item_group || validated.item_group,
                glosa_code: validated.glosa_code,
                glosa_description: validated.glosa_description,
                glosa_type: validated.glosa_type,
                billed_quantity: billedQty,
                billed_unit_value: billedUnit,
                approved_quantity: approvedQty,
                approved_unit_value: approvedUnit,
                original_value: billedTotal,
                approved_value: approvedTotal,
                glosa_value: glosaValue,
                is_irrecoverable: validated.is_irrecoverable,
                irrecoverable_quantity: irrecQty,
                irrecoverable_value: irrecVal,
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
                .from('tiss_guide_procedures')
                .update({
                    approved_quantity: approvedQty,
                    approved_unit_value: approvedUnit,
                    approved_total_value: approvedTotal,
                    glosa_value: glosaValue,
                    is_irrecoverable: validated.is_irrecoverable,
                    status: 'GLOSADO',
                    updated_at: now,
                })
                .eq('id', targetProc.id);

            await recalculateGuideFromItems(adminDb, clinicId, guideId);
            if (guide.batch_id) {
                await recalculateBatchTotals(adminDb, clinicId, guide.batch_id);
            }

            await writeTissAudit({
                clinicId,
                userId: user.id,
                action: 'TISS_LEVEL3_ITEM_GLOSA_APPLIED',
                entityType: 'tiss_guide',
                entityId: guideId,
                newState: {
                    procedure_id: targetProc.id,
                    glosa_code: validated.glosa_code,
                    glosa_value: glosaValue,
                    is_irrecoverable: validated.is_irrecoverable,
                },
                customSupabase: adminDb,
            });
        } else if (validated.action === 'reverse_glosa_item') {
            if (!validated.glosa_id) {
                return NextResponse.json({ success: false, error: 'Informe o ID da glosa para estornar.' }, { status: 400 });
            }

            const { data: activeAppealItem } = await adminDb
                .from('tiss_appeal_items')
                .select('id, status')
                .eq('glosa_id', validated.glosa_id)
                .eq('clinic_id', clinicId)
                .neq('status', 'CANCELLED')
                .maybeSingle();

            if (activeAppealItem) {
                return NextResponse.json(
                    { success: false, error: 'Esta glosa já está vinculada a um Recurso de Glosa. Cancele o recurso antes de estornar.' },
                    { status: 409 }
                );
            }

            await adminDb
                .from('tiss_glosas')
                .update({ status: 'CANCELLED', deleted_at: now, deleted_by: user.id, updated_at: now })
                .eq('id', validated.glosa_id)
                .eq('guide_id', guideId)
                .eq('clinic_id', clinicId);

            await recalculateGuideFromItems(adminDb, clinicId, guideId);
            if (guide.batch_id) {
                await recalculateBatchTotals(adminDb, clinicId, guide.batch_id);
            }

            await writeTissAudit({
                clinicId,
                userId: user.id,
                action: 'TISS_LEVEL3_ITEM_GLOSA_REVERSED',
                entityType: 'tiss_guide',
                entityId: guideId,
                previousState: { glosa_id: validated.glosa_id },
                customSupabase: adminDb,
            });
        } else if (validated.action === 'glosar_grupo') {
            const targetGroup = validated.item_group === 'ALL' ? 'HONORARIOS' : validated.item_group;
            const glosaCode = validated.glosa_code || '9999';
            const glosaDesc = validated.glosa_description || `Glosa integral do grupo ${targetGroup}`;

            const { data: groupProcs } = await adminDb
                .from('tiss_guide_procedures')
                .select('*')
                .eq('guide_id', guideId)
                .eq('item_group', targetGroup)
                .neq('status', 'CANCELLED');

            for (const p of groupProcs || []) {
                const totalItem = roundCurrency(Number(p.total_value || 0));
                if (totalItem <= 0) continue;

                await adminDb
                    .from('tiss_glosas')
                    .update({ status: 'CANCELLED', deleted_at: now, deleted_by: user.id, updated_at: now })
                    .eq('clinic_id', clinicId)
                    .eq('guide_id', guideId)
                    .eq('procedure_id', p.id)
                    .is('deleted_at', null)
                    .eq('status', 'OPEN');

                await adminDb.from('tiss_glosas').insert({
                    clinic_id: clinicId,
                    guide_id: guideId,
                    batch_id: guide.batch_id || null,
                    guide_number: guide.guide_number,
                    procedure_id: p.id,
                    item_code: p.procedure_code,
                    item_description: p.procedure_name,
                    item_group: targetGroup,
                    glosa_code: glosaCode,
                    glosa_description: glosaDesc,
                    glosa_type: validated.glosa_type,
                    billed_quantity: p.quantity,
                    billed_unit_value: p.unit_value,
                    approved_quantity: 0,
                    approved_unit_value: 0,
                    original_value: totalItem,
                    approved_value: 0,
                    glosa_value: totalItem,
                    is_irrecoverable: validated.is_irrecoverable,
                    irrecoverable_value: validated.is_irrecoverable ? totalItem : 0,
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
            }

            await recalculateGuideFromItems(adminDb, clinicId, guideId);
            if (guide.batch_id) {
                await recalculateBatchTotals(adminDb, clinicId, guide.batch_id);
            }
        } else if (validated.action === 'estornar_glosas_grupo' || validated.action === 'estornar_glosa_valor_total') {
            let glosaQuery = adminDb
                .from('tiss_glosas')
                .select('id')
                .eq('clinic_id', clinicId)
                .eq('guide_id', guideId)
                .is('deleted_at', null)
                .neq('status', 'CANCELLED');

            if (validated.action === 'estornar_glosas_grupo' && validated.item_group !== 'ALL') {
                glosaQuery = glosaQuery.eq('item_group', validated.item_group);
            }

            const { data: targetGlosas } = await glosaQuery;
            const ids = (targetGlosas || []).map((x: any) => x.id);

            if (ids.length > 0) {
                const { data: appealed } = await adminDb
                    .from('tiss_appeal_items')
                    .select('id')
                    .eq('clinic_id', clinicId)
                    .in('glosa_id', ids)
                    .neq('status', 'CANCELLED');

                if ((appealed || []).length > 0) {
                    return NextResponse.json(
                        { success: false, error: 'Existem glosas deste grupo já vinculadas a Recurso de Glosa ativo.' },
                        { status: 409 }
                    );
                }

                await adminDb
                    .from('tiss_glosas')
                    .update({ status: 'CANCELLED', deleted_at: now, deleted_by: user.id, updated_at: now })
                    .in('id', ids)
                    .eq('clinic_id', clinicId);
            }

            await recalculateGuideFromItems(adminDb, clinicId, guideId);
            if (guide.batch_id) {
                await recalculateBatchTotals(adminDb, clinicId, guide.batch_id);
            }
        } else if (validated.action === 'save_draft') {
            await adminDb
                .from('tiss_guides')
                .update({
                    account_notes: validated.observation || guide.account_notes,
                    updated_at: now,
                })
                .eq('id', guideId)
                .eq('clinic_id', clinicId);
        } else if (validated.action === 'complete_account_review') {
            await recalculateGuideFromItems(adminDb, clinicId, guideId);
            const preCheck = await loadAccountSnapshot(adminDb, clinicId, guideId);
            if (preCheck && Math.abs(preCheck.summary.difference) > 0.01 && !validated.force_batimento) {
                return NextResponse.json(
                    {
                        success: false,
                        code: 'BATIMENTO_DIVERGENCE',
                        error: `Divergência no batimento contábil: Glosa Prevista R$ ${preCheck.summary.expected_glosa_total.toFixed(2)} vs Glosa Digitada R$ ${preCheck.summary.entered_glosa_total.toFixed(2)}. Confirme o batimento para concluir.`,
                        summary: preCheck.summary,
                    },
                    { status: 422 }
                );
            }

            await adminDb
                .from('tiss_glosas')
                .update({ review_completed_at: now, updated_at: now })
                .eq('guide_id', guideId)
                .eq('clinic_id', clinicId)
                .is('deleted_at', null);

            await adminDb
                .from('tiss_guides')
                .update({ billing_stage: 'FINALIZADA', updated_at: now })
                .eq('id', guideId)
                .eq('clinic_id', clinicId);

            if (guide.batch_id) {
                await recalculateBatchTotals(adminDb, clinicId, guide.batch_id);
            }

            await writeTissAudit({
                clinicId,
                userId: user.id,
                action: 'TISS_LEVEL3_ACCOUNT_REVIEW_COMPLETED',
                entityType: 'tiss_guide',
                entityId: guideId,
                newState: preCheck?.summary,
                customSupabase: adminDb,
            });
        }

        const updatedSnapshot = await loadAccountSnapshot(adminDb, clinicId, guideId);
        return NextResponse.json({
            success: true,
            data: updatedSnapshot,
            message: 'Operação executada com sucesso na conta médica.',
        });
    } catch (err: any) {
        if (err?.name === 'ZodError') {
            return NextResponse.json({ success: false, error: err.errors?.[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        request.log.error('tiss/glosas/accounts/[guideId] POST', { error: err instanceof Error ? err.message : String(err) });
        return NextResponse.json({ success: false, error: err.message || 'Erro ao processar revisão da conta' }, { status: 500 });
    }
});

