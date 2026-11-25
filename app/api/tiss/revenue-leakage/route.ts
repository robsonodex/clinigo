import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import {
    auditTherapyGuidesForGlosa,
    computeAcceptedUnpaidRadar,
    detectUnbilledCompletedSessions,
} from '@/lib/tiss/therapy-antiglosa-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tiss/revenue-leakage
 * Radar Unificado de Receita & Blindagem TEA/Terapias (PRE-05 / MOD-02 / KPI-06 / FIN-08):
 * 1. Sessões concluídas de convênio nos últimos 90 dias SEM guia TISS gerada ("Dinheiro na Mesa").
 * 2. Acatos de recurso deferidos pela operadora que ainda aguardam depósito bancário (KPI-06).
 * 3. Alertas pré-envio de terapias seriadas (sobreposição de horário, carteirinha vencida, conselho).
 */
export const GET = withAxiom(async (request: AxiomRequest) => {
    const guard = await requireTissAction(request, 'conta.ver');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
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
        const sinceDate = new Date(Date.now() - 90 * 86_400_000).toISOString().split('T')[0];

        const [
            { data: completedAppts },
            { data: existingGuides },
            { data: acceptedAppeals },
        ] = await Promise.all([
            supabase
                .from('appointments')
                .select(`
                    id,
                    appointment_date,
                    appointment_time,
                    patient_id,
                    doctor_id,
                    therapy_modality,
                    checked_in_at,
                    checkin_confirmed_at,
                    therapist_start_verified_at,
                    digital_signature_hash,
                    health_insurance_plan:health_insurance_plans(
                        id,
                        name,
                        health_insurance:health_insurances(id, name, send_deadline_days)
                    ),
                    patient:patients(full_name),
                    doctor:doctors!appointments_doctor_id_fkey(user:users(full_name), consultation_price)
                `)
                .eq('clinic_id', clinicId)
                .eq('status', 'COMPLETED')
                .not('health_insurance_plan_id', 'is', null)
                .gte('appointment_date', sinceDate)
                .order('appointment_date', { ascending: false })
                .limit(250),
            supabase
                .from('tiss_guides')
                .select(`
                    id,
                    appointment_id,
                    guide_number,
                    patient_id,
                    patient_name,
                    doctor_id,
                    execution_date,
                    patient_card_number,
                    patient_card_validity,
                    authorization_code,
                    procedure_code,
                    total_value,
                    paid_value,
                    glosa_value,
                    status,
                    biometric_proof_id
                `)
                .eq('clinic_id', clinicId)
                .is('deleted_at', null)
                .not('status', 'in', '("CANCELLED","CANCELED")')
                .gte('execution_date', sinceDate)
                .limit(500),
            supabase
                .from('tiss_appeals')
                .select(`
                    id,
                    appeal_number,
                    accepted_value,
                    total_recovered_value,
                    bank_received_value,
                    tax_withheld_value,
                    status,
                    updated_at,
                    health_insurance:health_insurances(name, payment_post_appeal_days)
                `)
                .eq('clinic_id', clinicId)
                .in('status', ['ACCEPTED', 'PARTIAL']),
        ]);

        const billedApptIds = new Set<string>(
            (existingGuides || []).map((g: any) => g.appointment_id).filter(Boolean)
        );

        const apptIdsForRecords = (completedAppts || []).map((a: any) => a.id).filter(Boolean);
        let signedApptIds = new Set<string>();
        if (apptIdsForRecords.length > 0) {
            const { data: signedRecs } = await supabase
                .from('medical_records')
                .select('appointment_id, signed_at, signature_hash')
                .eq('clinic_id', clinicId)
                .in('appointment_id', apptIdsForRecords);
            signedApptIds = new Set<string>(
                (signedRecs || [])
                    .filter((r: any) => Boolean(r.signed_at || r.signature_hash))
                    .map((r: any) => r.appointment_id)
            );
        }

        const unbilledReport = detectUnbilledCompletedSessions(
            (completedAppts || []).map((a: any) => ({
                id: a.id,
                appointment_date: a.appointment_date,
                appointment_time: a.appointment_time,
                patient_id: a.patient_id,
                patient_name: a.patient?.full_name || 'Paciente',
                doctor_id: a.doctor_id,
                doctor_name: a.doctor?.user?.full_name || 'Profissional',
                therapy_modality: a.therapy_modality || null,
                health_insurance_name: a.health_insurance_plan?.health_insurance?.name || a.health_insurance_plan?.name || 'Convênio',
                send_deadline_days: a.health_insurance_plan?.health_insurance?.send_deadline_days || 60,
                estimated_value: a.doctor?.consultation_price || 0,
                has_biometric_or_checkin: Boolean(a.checked_in_at || a.checkin_confirmed_at || a.therapist_start_verified_at),
                has_signed_evolution: Boolean(a.digital_signature_hash || signedApptIds.has(a.id)),
            })),
            billedApptIds
        );

        const apptTimeMap = new Map<string, string>(
            (completedAppts || []).map((a: any) => [a.id, a.appointment_time || ''])
        );

        const openGuides = (existingGuides || []).filter((g: any) =>
            ['DRAFT', 'VALIDATED', 'PENDING', 'IN_BATCH', 'PAID', 'APPROVED'].includes(String(g.status || '').toUpperCase())
        );

        const therapyAudit = auditTherapyGuidesForGlosa(
            openGuides.map((g: any) => ({
                id: g.id,
                guide_number: g.guide_number,
                patient_id: g.patient_id,
                patient_name: g.patient_name,
                doctor_id: g.doctor_id,
                execution_date: g.execution_date,
                execution_time: g.appointment_id ? apptTimeMap.get(g.appointment_id) || null : null,
                patient_card_number: g.patient_card_number,
                patient_card_validity: g.patient_card_validity,
                authorization_code: g.authorization_code,
                procedure_code: g.procedure_code,
                total_value: g.total_value,
                paid_value: g.paid_value,
                glosa_value: g.glosa_value,
                status: g.status,
                has_biometric_or_checkin: Boolean(g.biometric_proof_id),
                has_signed_evolution: Boolean(g.appointment_id && signedApptIds.has(g.appointment_id)),
            }))
        );

        const acceptedUnpaid = computeAcceptedUnpaidRadar(
            (acceptedAppeals || []).map((ap: any) => ({
                id: ap.id,
                appeal_number: ap.appeal_number,
                health_insurance_name: ap.health_insurance?.name || 'Operadora',
                accepted_value: ap.accepted_value || ap.total_recovered_value || 0,
                bank_received_value: ap.bank_received_value || 0,
                tax_withheld_value: ap.tax_withheld_value || 0,
                updated_at: ap.updated_at,
                payment_post_appeal_days: ap.health_insurance?.payment_post_appeal_days || 30,
            }))
        );

        return NextResponse.json({
            success: true,
            data: {
                unbilled_sessions: unbilledReport,
                accepted_unpaid_appeals: acceptedUnpaid,
                therapy_audit: {
                    findings_count: therapyAudit.findings.length,
                    blockers_count: therapyAudit.findings.filter((f) => f.severity === 'blocker').length,
                    total_risk_value: therapyAudit.totalRiskValue,
                    findings: therapyAudit.findings.slice(0, 50),
                },
            },
        });
    } catch (error: any) {
        request.log.error('tiss/revenue-leakage', { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json(
            { success: false, error: 'Erro ao apurar radar de receita e blindagem TISS' },
            { status: 500 }
        );
    }
});

