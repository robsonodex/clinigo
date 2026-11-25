/**
 * CLINIGO — Motor Anti-Glosa Nativo para Clínicas de Terapias Seriadas (TEA/ABA/Fono/TO/Psico/Fisio)
 * + Caçador de Sessões Executadas Não Faturadas ("Dinheiro na Mesa" — PRE-05)
 * + Radar "Acato Sem Crédito" (KPI-06 / QA-29)
 * + Detector de Subpagamento Silencioso (FIN-08)
 *
 * 100% puro, determinístico, em centavos inteiros e testável em Jest.
 */

import { fromCents, sumCents, toCents } from './money';

export interface CompletedSessionInput {
    id: string;
    appointment_date: string;
    appointment_time?: string | null;
    patient_id?: string | null;
    patient_name?: string | null;
    doctor_id?: string | null;
    doctor_name?: string | null;
    therapy_modality?: string | null;
    health_insurance_name?: string | null;
    send_deadline_days?: number | null;
    estimated_value?: number | string | null;
    has_biometric_or_checkin?: boolean;
    has_signed_evolution?: boolean;
}

export interface UnbilledSessionAlert {
    appointment_id: string;
    appointment_date: string;
    appointment_time: string | null;
    patient_name: string;
    doctor_name: string;
    therapy_modality: string | null;
    health_insurance_name: string;
    estimated_value: number;
    has_biometric_or_checkin: boolean;
    has_signed_evolution: boolean;
    shield_ready: boolean;
    days_since_execution: number;
    days_until_send_deadline: number;
    urgency: 'critical' | 'warning' | 'normal';
}

export interface UnbilledSessionsReport {
    total_count: number;
    ready_to_bill_count: number;
    expiring_soon_count: number;
    total_estimated_value: number;
    items: UnbilledSessionAlert[];
}

export interface TherapyGuideAuditInput {
    id: string;
    guide_number?: string | null;
    patient_id?: string | null;
    patient_name?: string | null;
    doctor_id?: string | null;
    doctor_council?: string | null;
    execution_date?: string | null;
    execution_time?: string | null;
    patient_card_number?: string | null;
    patient_card_validity?: string | null;
    authorization_code?: string | null;
    procedure_code?: string | null;
    total_value?: number | string | null;
    paid_value?: number | string | null;
    contracted_value?: number | string | null;
    glosa_value?: number | string | null;
    status?: string | null;
    has_biometric_or_checkin?: boolean;
    has_signed_evolution?: boolean;
}

export interface TherapyGuideAuditFinding {
    guide_id: string;
    guide_number: string;
    patient_name: string;
    severity: 'blocker' | 'warning';
    code: string;
    category: 'OVERLAP' | 'CARD_EXPIRED' | 'COUNCIL' | 'SHIELD_PROOF' | 'UNDERPAYMENT';
    message: string;
    estimated_risk_value: number;
}

export interface GuideShieldScore {
    guide_id: string;
    score: number; // 0..100
    level: 'blindada' | 'parcial' | 'vulneravel';
    has_presence_proof: boolean;
    has_signed_evolution: boolean;
    has_administrative_ready: boolean;
}

export interface AcceptedUnpaidAppealInput {
    id: string;
    appeal_number: string;
    health_insurance_name?: string | null;
    accepted_value: number | string | null;
    bank_received_value?: number | string | null;
    tax_withheld_value?: number | string | null;
    updated_at?: string | null;
    payment_post_appeal_days?: number | null;
}

export interface AcceptedUnpaidAlert {
    appeal_id: string;
    appeal_number: string;
    health_insurance_name: string;
    accepted_value: number;
    bank_received_value: number;
    tax_withheld_value: number;
    pending_credit_value: number;
    days_waiting: number;
    sla_days: number;
    is_overdue: boolean;
}

const VALID_COUNCIL_REGEX = /^(CRM|CRP|CRFA|CREFITO|CRN|CRO|COREN)?[\s/-]*\d{3,8}[\s/-]*[A-Z]{2}$/i;

/**
 * 1. Caçador de Sessões Executadas Não Faturadas ("Dinheiro na Mesa" — PRE-05)
 */
export function detectUnbilledCompletedSessions(
    completedSessions: CompletedSessionInput[],
    billedAppointmentIds: Set<string>,
    referenceNow: Date = new Date()
): UnbilledSessionsReport {
    const items: UnbilledSessionAlert[] = [];
    const nowMs = referenceNow.getTime();

    for (const s of completedSessions || []) {
        if (!s?.id || billedAppointmentIds.has(s.id)) continue;

        const execMs = new Date(`${String(s.appointment_date).split('T')[0]}T12:00:00Z`).getTime();
        const daysSince = Number.isNaN(execMs) ? 0 : Math.max(0, Math.floor((nowMs - execMs) / 86_400_000));
        const sendSla = Number(s.send_deadline_days) > 0 ? Number(s.send_deadline_days) : 60;
        const daysLeft = sendSla - daysSince;

        const urgency: 'critical' | 'warning' | 'normal' =
            daysLeft <= 10 ? 'critical' : daysLeft <= 20 ? 'warning' : 'normal';

        const hasBio = Boolean(s.has_biometric_or_checkin);
        const hasEvo = Boolean(s.has_signed_evolution);

        items.push({
            appointment_id: s.id,
            appointment_date: s.appointment_date,
            appointment_time: s.appointment_time || null,
            patient_name: s.patient_name || 'Paciente',
            doctor_name: s.doctor_name || 'Profissional',
            therapy_modality: s.therapy_modality || null,
            health_insurance_name: s.health_insurance_name || 'Convênio',
            estimated_value: fromCents(toCents(s.estimated_value)),
            has_biometric_or_checkin: hasBio,
            has_signed_evolution: hasEvo,
            shield_ready: hasBio && hasEvo,
            days_since_execution: daysSince,
            days_until_send_deadline: daysLeft,
            urgency,
        });
    }

    items.sort((a, b) => a.days_until_send_deadline - b.days_until_send_deadline);

    return {
        total_count: items.length,
        ready_to_bill_count: items.filter((i) => i.shield_ready).length,
        expiring_soon_count: items.filter((i) => i.urgency !== 'normal').length,
        total_estimated_value: fromCents(sumCents(items.map((i) => i.estimated_value))),
        items,
    };
}

/**
 * 2. Selo "Guia Blindada" em 3 Camadas (Presença 35% + Evolução Assinada 40% + Administrativo 25%)
 */
export function computeGuideShieldScore(guide: TherapyGuideAuditInput): GuideShieldScore {
    const hasPresence = Boolean(guide.has_biometric_or_checkin);
    const hasSignedEvo = Boolean(guide.has_signed_evolution);
    const hasCard = Boolean((guide.patient_card_number || '').trim().length >= 5);
    const hasTuss = Boolean((guide.procedure_code || '').trim().length >= 6);
    const hasAdmin = hasCard && hasTuss && toCents(guide.total_value) > 0;

    const score = (hasPresence ? 35 : 0) + (hasSignedEvo ? 40 : 0) + (hasAdmin ? 25 : 0);
    const level: 'blindada' | 'parcial' | 'vulneravel' =
        score >= 95 ? 'blindada' : score >= 60 ? 'parcial' : 'vulneravel';

    return {
        guide_id: guide.id,
        score,
        level,
        has_presence_proof: hasPresence,
        has_signed_evolution: hasSignedEvo,
        has_administrative_ready: hasAdmin,
    };
}

/**
 * 3. Validador Anti-Glosa para Clínicas Multidisciplinares / TEA (MOD-02 / QA-41 / FIN-08)
 */
export function auditTherapyGuidesForGlosa(guides: TherapyGuideAuditInput[]): {
    findings: TherapyGuideAuditFinding[];
    shieldScores: GuideShieldScore[];
    totalRiskValue: number;
} {
    const findings: TherapyGuideAuditFinding[] = [];
    const shieldScores: GuideShieldScore[] = [];

    // Índices para detecção de sobreposição de horário (mesmo paciente ou mesmo terapeuta no mesmo dia/hora)
    const patientSlotMap = new Map<string, TherapyGuideAuditInput[]>();
    const doctorSlotMap = new Map<string, TherapyGuideAuditInput[]>();

    for (const g of guides || []) {
        shieldScores.push(computeGuideShieldScore(g));
        const valCents = toCents(g.total_value);
        const guideNum = g.guide_number || 'Sem número';
        const patName = g.patient_name || 'Beneficiário';

        // 3a. Sobreposição de horário
        if (g.execution_date && g.execution_time) {
            const slotTime = String(g.execution_time).slice(0, 5);
            const day = String(g.execution_date).split('T')[0];

            if (g.patient_id) {
                const pKey = `${g.patient_id}|${day}|${slotTime}`;
                const arr = patientSlotMap.get(pKey) || [];
                arr.push(g);
                patientSlotMap.set(pKey, arr);
            }
            if (g.doctor_id) {
                const dKey = `${g.doctor_id}|${day}|${slotTime}`;
                const arr = doctorSlotMap.get(dKey) || [];
                arr.push(g);
                doctorSlotMap.set(dKey, arr);
            }
        }

        // 3b. Carteirinha vencida na data da sessão (ANS 1017)
        if (g.patient_card_validity && g.execution_date) {
            const vMs = new Date(`${String(g.patient_card_validity).split('T')[0]}T23:59:59Z`).getTime();
            const eMs = new Date(`${String(g.execution_date).split('T')[0]}T00:00:00Z`).getTime();
            if (!Number.isNaN(vMs) && !Number.isNaN(eMs) && vMs < eMs) {
                findings.push({
                    guide_id: g.id,
                    guide_number: guideNum,
                    patient_name: patName,
                    severity: 'blocker',
                    code: '1017',
                    category: 'CARD_EXPIRED',
                    message: 'Carteirinha vencida na data da sessão (alto risco de glosa ANS 1017).',
                    estimated_risk_value: fromCents(valCents),
                });
            }
        }

        // 3c. Conselho profissional executante (CRP / CRFa / CREFITO / CRM + UF)
        if (g.doctor_council && !VALID_COUNCIL_REGEX.test(g.doctor_council.trim())) {
            findings.push({
                guide_id: g.id,
                guide_number: guideNum,
                patient_name: patName,
                severity: 'warning',
                code: '1218',
                category: 'COUNCIL',
                message: `Registro de conselho "${g.doctor_council}" fora do padrão (ex.: CRP 06/12345 ou CREFITO 12345-SP).`,
                estimated_risk_value: fromCents(valCents),
            });
        }

        // 3d. Subpagamento silencioso (FIN-08): guia marcada como paga sem código de glosa, mas pago < contratado
        const normStatus = String(g.status || '').toUpperCase();
        const contractedCents = toCents(g.contracted_value);
        const paidCents = toCents(g.paid_value);
        const glosaCents = toCents(g.glosa_value);
        if (
            (normStatus === 'PAID' || normStatus === 'APPROVED') &&
            contractedCents > 0 &&
            paidCents > 0 &&
            glosaCents === 0 &&
            paidCents < contractedCents
        ) {
            const diffCents = contractedCents - paidCents;
            findings.push({
                guide_id: g.id,
                guide_number: guideNum,
                patient_name: patName,
                severity: 'warning',
                code: 'FIN_08',
                category: 'UNDERPAYMENT',
                message: `Subpagamento silencioso detectado: pago R$ ${fromCents(paidCents).toFixed(2)} vs. tabela vigente R$ ${fromCents(contractedCents).toFixed(2)} (diferença de R$ ${fromCents(diffCents).toFixed(2)} sem código de glosa).`,
                estimated_risk_value: fromCents(diffCents),
            });
        }
    }

    // Registrar conflitos de sobreposição encontrados (QA-41)
    for (const [, collided] of patientSlotMap.entries()) {
        if (collided.length > 1) {
            for (const g of collided) {
                findings.push({
                    guide_id: g.id,
                    guide_number: g.guide_number || 'Sem número',
                    patient_name: g.patient_name || 'Beneficiário',
                    severity: 'blocker',
                    code: '1720',
                    category: 'OVERLAP',
                    message: `Sobreposição de horário: ${collided.length} sessões para o mesmo beneficiário em ${g.execution_date} às ${String(g.execution_time).slice(0, 5)} (glosa ANS 1720).`,
                    estimated_risk_value: fromCents(toCents(g.total_value)),
                });
            }
        }
    }

    for (const [, collided] of doctorSlotMap.entries()) {
        if (collided.length > 1) {
            const uniquePatients = new Set(collided.map((c) => c.patient_id).filter(Boolean));
            if (uniquePatients.size > 1) {
                for (const g of collided) {
                    findings.push({
                        guide_id: g.id,
                        guide_number: g.guide_number || 'Sem número',
                        patient_name: g.patient_name || 'Beneficiário',
                        severity: 'warning',
                        code: '1720',
                        category: 'OVERLAP',
                        message: `Conflito de agenda do terapeuta: ${uniquePatients.size} pacientes distintos no mesmo horário (${g.execution_date} ${String(g.execution_time).slice(0, 5)}).`,
                        estimated_risk_value: fromCents(toCents(g.total_value)),
                    });
                }
            }
        }
    }

    const totalRiskCents = sumCents(findings.map((f) => f.estimated_risk_value));
    return {
        findings,
        shieldScores,
        totalRiskValue: fromCents(totalRiskCents),
    };
}

/**
 * 4. Radar "Acato Sem Crédito" (KPI-06 / QA-29)
 */
export function computeAcceptedUnpaidRadar(
    appeals: AcceptedUnpaidAppealInput[],
    referenceNow: Date = new Date()
): {
    total_pending_credit_value: number;
    overdue_count: number;
    items: AcceptedUnpaidAlert[];
} {
    const nowMs = referenceNow.getTime();
    const items: AcceptedUnpaidAlert[] = [];

    for (const a of appeals || []) {
        const acceptedCents = toCents(a.accepted_value);
        const receivedCents = toCents(a.bank_received_value);
        const taxCents = toCents(a.tax_withheld_value);
        const pendingCents = Math.max(0, acceptedCents - receivedCents - taxCents);
        if (pendingCents <= 0) continue;

        const updatedMs = a.updated_at ? new Date(a.updated_at).getTime() : nowMs;
        const daysWaiting = Number.isNaN(updatedMs) ? 0 : Math.max(0, Math.floor((nowMs - updatedMs) / 86_400_000));
        const slaDays = Number(a.payment_post_appeal_days) > 0 ? Number(a.payment_post_appeal_days) : 30;

        items.push({
            appeal_id: a.id,
            appeal_number: a.appeal_number,
            health_insurance_name: a.health_insurance_name || 'Operadora',
            accepted_value: fromCents(acceptedCents),
            bank_received_value: fromCents(receivedCents),
            tax_withheld_value: fromCents(taxCents),
            pending_credit_value: fromCents(pendingCents),
            days_waiting: daysWaiting,
            sla_days: slaDays,
            is_overdue: daysWaiting > slaDays,
        });
    }

    items.sort((a, b) => b.days_waiting - a.days_waiting);

    return {
        total_pending_credit_value: fromCents(sumCents(items.map((i) => i.pending_credit_value))),
        overdue_count: items.filter((i) => i.is_overdue).length,
        items,
    };
}

