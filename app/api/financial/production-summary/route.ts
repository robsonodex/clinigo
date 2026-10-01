import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { resolveClinicId } from '@/lib/utils/resolve-clinic-id';
import { computeAdvancedRepasse, type RepasseRegime, type GlosaPolicy } from '@/lib/services/repasse-calculator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/financial/production-summary?doctor_id=...&month_reference=YYYY-MM
 * 
 * Calcula a produção mensal detalhada de um profissional, cruzando:
 * 1. Atendimentos realizados no mês
 * 2. Valores individuais por paciente (doctor_patient_rates)
 * 3. Contratos de repasse padrão do médico (doctor_contracts)
 * 4. Lançamentos financeiros ou preços base de consulta
 * 
 * Segurança:
 * - CLINIC_ADMIN, FINANCIAL e SUPER_ADMIN podem consultar qualquer profissional da clínica.
 * - DOCTOR só pode consultar a si próprio (sigilo absoluto contra comparação salarial).
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const supabaseAdmin = createServiceRoleClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('id, clinic_id, role')
            .eq('id', user.id)
            .single();

        const { clinicId: resolvedClinicId } = await resolveClinicId({
            profileClinicId: profile?.clinic_id,
            profileRole: profile?.role || '',
        });

        if (!resolvedClinicId) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const requestedDoctorId = searchParams.get('doctor_id') || searchParams.get('doctorId');
        const monthReference = searchParams.get('month_reference') || searchParams.get('month'); // YYYY-MM

        if (!requestedDoctorId) {
            return NextResponse.json({ success: false, error: 'doctor_id é obrigatório' }, { status: 400 });
        }

        if (!monthReference || !monthReference.includes('-')) {
            return NextResponse.json({ success: false, error: 'month_reference inválido (formato: YYYY-MM)' }, { status: 400 });
        }

        // Blindagem RBAC: se for DOCTOR, valida se o requestedDoctorId pertence exclusivamente ao user.id
        if (profile?.role === 'DOCTOR') {
            const { data: docRecord } = await supabaseAdmin
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .eq('clinic_id', resolvedClinicId)
                .single();

            if (!docRecord || docRecord.id !== requestedDoctorId) {
                return NextResponse.json(
                    { success: false, error: 'Acesso negado: você só pode visualizar a sua própria produção' },
                    { status: 403 }
                );
            }
        }

        // 1. Buscar dados do profissional
        const { data: doctorData, error: doctorErr } = await supabaseAdmin
            .from('doctors')
            .select(`
                id,
                specialty,
                crm,
                consultation_price,
                user:users (
                    id,
                    full_name,
                    email,
                    phone
                )
            `)
            .eq('id', requestedDoctorId)
            .eq('clinic_id', resolvedClinicId)
            .single();

        if (doctorErr || !doctorData) {
            return NextResponse.json({ success: false, error: 'Profissional não encontrado' }, { status: 404 });
        }

        // 2. Determinar intervalo de datas do mês
        const [yearStr, monthStr] = monthReference.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const startDate = `${monthReference}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${monthReference}-${String(lastDay).padStart(2, '0')}`;

        // 3. Buscar atendimentos realizados no período
        const { data: appointments, error: apptErr } = await supabaseAdmin
            .from('appointments')
            .select(`
                id,
                appointment_date,
                appointment_time,
                status,
                session_status,
                appointment_type,
                therapy_modality,
                session_format,
                no_show,
                payment_type,
                health_insurance_id,
                patient_id,
                patient:patients (
                    id,
                    full_name,
                    cpf,
                    billing_type
                )
            `)
            .eq('clinic_id', resolvedClinicId)
            .eq('doctor_id', requestedDoctorId)
            .gte('appointment_date', startDate)
            .lte('appointment_date', endDate)
            .order('appointment_date', { ascending: true })
            .order('appointment_time', { ascending: true });

        if (apptErr) {
            console.error('Erro ao buscar atendimentos para produção:', apptErr);
            return NextResponse.json({ success: false, error: 'Erro ao consultar atendimentos' }, { status: 500 });
        }

        // Regra de Negócio CliniGo / World Sensory:
        // Apenas sessões com status 'Presente' ou 'Reposição' entram no cálculo de faturamento e repasse.
        // Faltas justificadas/injustificadas e cancelamentos ficam no prontuário, mas fora do financeiro.
        const validAppointments = (appointments || []).filter((appt: any) => {
            if (appt.no_show) return false;
            if (appt.session_status && appt.session_status !== 'Presente' && appt.session_status !== 'Reposição') {
                return false;
            }
            const st = (appt.status || '').toLowerCase();
            return !st.includes('cancel') && !st.includes('desmarcad') && !st.includes('falt');
        });

        // 4. Buscar regras individuais de repasse por paciente (doctor_patient_rates)
        const { data: customPatientRates } = await supabaseAdmin
            .from('doctor_patient_rates')
            .select('patient_id, rate_type, fixed_value, percentage, notes')
            .eq('doctor_id', requestedDoctorId);

        const customRatesMap = new Map<string, any>();
        customPatientRates?.forEach((r) => {
            customRatesMap.set(r.patient_id, r);
        });

        // 5. Buscar contrato de repasse padrão do profissional (doctor_contracts)
        const { data: contract } = await supabaseAdmin
            .from('doctor_contracts')
            .select('*')
            .eq('doctor_id', requestedDoctorId)
            .eq('is_active', true)
            .maybeSingle();

        // 6. Buscar regras de cobrança de reembolso de pacientes (se houver)
        const { data: reimbursementRules } = await supabaseAdmin
            .from('patient_reimbursement_rules')
            .select('patient_id, therapy_type, billing_amount')
            .eq('clinic_id', resolvedClinicId)
            .eq('is_active', true);

        const reimbursementMap = new Map<string, number>();
        reimbursementRules?.forEach((rule) => {
            reimbursementMap.set(rule.patient_id, Number(rule.billing_amount) || 0);
        });

        // 7. Buscar lançamentos financeiros de entrada vinculados aos agendamentos
        const appointmentIds = validAppointments.map((a: any) => a.id);
        const financialMap = new Map<string, number>();

        if (appointmentIds.length > 0) {
            const { data: entries } = await supabaseAdmin
                .from('financial_entries')
                .select('appointment_id, amount')
                .in('appointment_id', appointmentIds)
                .eq('clinic_id', resolvedClinicId);

            entries?.forEach((entry) => {
                if (entry.appointment_id) {
                    financialMap.set(entry.appointment_id, Number(entry.amount) || 0);
                }
            });
        }

        // 8. Buscar regime de repasse e política de glosas da clínica
        const { data: clinicSettings } = await supabaseAdmin
            .from('clinics')
            .select('repasse_regime, glosa_policy')
            .eq('id', resolvedClinicId)
            .maybeSingle();

        const repasseRegime: RepasseRegime = (clinicSettings?.repasse_regime as any) || 'PRODUCAO';
        const glosaPolicy: GlosaPolicy = (clinicSettings?.glosa_policy as any) || 'CLINICA_ABSORVE';

        // 9. Buscar guias TISS associadas aos agendamentos para regime de recebimento e desconto de glosa
        const guidesMap = new Map<string, any>();
        if (appointmentIds.length > 0) {
            const { data: guidesList } = await supabaseAdmin
                .from('tiss_guides')
                .select('id, appointment_id, status, total_value, paid_value, glosa_value, appeal_status')
                .in('appointment_id', appointmentIds)
                .eq('clinic_id', resolvedClinicId);

            guidesList?.forEach((g: any) => {
                if (g.appointment_id) guidesMap.set(g.appointment_id, g);
            });
        }

        const defaultPrice = Number(doctorData.consultation_price) || 120.0;
        const defaultContractPercentage = contract ? Number(contract.percentage || contract.percentage_private || 60) : 60;
        const defaultContractFixed = contract?.fixed_value_private ? Number(contract.fixed_value_private) : null;

        let totalGross = 0;
        let totalNetRepasse = 0;
        let totalDiscounts = 0;
        let totalPendingRecebimento = 0;
        const uniquePatients = new Set<string>();

        const detailedItems = validAppointments.map((appt: any) => {
            const patientName = appt.patient?.full_name || 'Paciente Não Identificado';
            const patientId = appt.patient_id;
            if (patientId) uniquePatients.add(patientId);

            // Determinar o valor bruto da sessão
            let grossAmount = 0;
            if (financialMap.has(appt.id)) {
                grossAmount = financialMap.get(appt.id)!;
            } else if (reimbursementMap.has(patientId)) {
                grossAmount = reimbursementMap.get(patientId)!;
            } else {
                grossAmount = defaultPrice;
            }

            const customRate = customRatesMap.get(patientId);
            const isInsurance = appt.payment_type === 'CONVENIO' || !!appt.health_insurance_id;
            const guide = guidesMap.get(appt.id);

            const guideInfo = guide ? {
                guideStatus: guide.status,
                guideTotalValue: Number(guide.total_value) || grossAmount,
                guidePaidValue: Number(guide.paid_value) || 0,
                glosaValue: Number(guide.glosa_value) || 0,
                glosaMaintained: guide.appeal_status === 'REJECTED' || guide.appeal_status === 'CLOSED' || guide.appeal_status === 'PARTIAL',
            } : null;

            const repasseCalc = computeAdvancedRepasse({
                appointmentValue: grossAmount,
                override: customRate ? {
                    id: customRate.id || '',
                    clinic_id: resolvedClinicId,
                    doctor_id: requestedDoctorId,
                    patient_id: patientId,
                    rate_type: customRate.rate_type,
                    fixed_value: customRate.fixed_value,
                    percentage: customRate.percentage,
                    active: true,
                } : null,
                contract: contract || null,
                doctorFallbackPercentage: defaultContractPercentage,
                isInsurance,
                regime: repasseRegime,
                glosaPolicy,
                guideInfo,
            });

            totalGross += grossAmount;
            totalNetRepasse += repasseCalc.amount;
            if (repasseCalc.discountAmount > 0) {
                totalDiscounts += repasseCalc.discountAmount;
            }
            if (!repasseCalc.isEligibleForPayment) {
                totalPendingRecebimento += repasseCalc.originalRepasseAmount;
            }

            let ruleDesc = '';
            if (customRate) {
                ruleDesc = customRate.rate_type === 'FIXED'
                    ? `Taxa Específica por Paciente: R$ ${Number(customRate.fixed_value).toFixed(2)} (Fixo)`
                    : `Taxa Específica por Paciente: ${customRate.percentage}%`;
            } else if (defaultContractFixed != null && defaultContractFixed > 0) {
                ruleDesc = `Contrato Padrão: R$ ${defaultContractFixed.toFixed(2)} (Fixo)`;
            } else {
                ruleDesc = `Contrato Padrão: ${defaultContractPercentage}%`;
            }

            if (repasseCalc.discountReason) {
                ruleDesc += ` [${repasseCalc.discountReason}]`;
            }
            if (repasseCalc.ineligibleReason) {
                ruleDesc = repasseCalc.ineligibleReason;
            }

            return {
                appointment_id: appt.id,
                date: appt.appointment_date,
                time: appt.appointment_time ? appt.appointment_time.slice(0, 5) : '',
                patient_name: patientName,
                patient_cpf: appt.patient?.cpf || null,
                procedure: appt.appointment_type || appt.therapy_modality || doctorData.specialty || 'Sessão Terapêutica',
                gross_amount: Number(grossAmount.toFixed(2)),
                repasse_amount: Number(repasseCalc.amount.toFixed(2)),
                original_repasse_amount: Number(repasseCalc.originalRepasseAmount.toFixed(2)),
                discount_amount: Number(repasseCalc.discountAmount.toFixed(2)),
                discount_reason: repasseCalc.discountReason || null,
                is_eligible: repasseCalc.isEligibleForPayment,
                rule_description: ruleDesc,
                is_custom_rate: !!customRate,
            };
        });

        const doctorFullName = (doctorData.user as any)?.full_name || 'Profissional';

        return NextResponse.json({
            success: true,
            summary: {
                doctor_id: doctorData.id,
                doctor_name: doctorFullName,
                specialty: doctorData.specialty || 'Terapeuta',
                crm: doctorData.crm || null,
                month_reference: monthReference,
                repasse_regime: repasseRegime,
                glosa_policy: glosaPolicy,
                total_appointments: validAppointments.length,
                unique_patients_count: uniquePatients.size,
                total_gross: Number(totalGross.toFixed(2)),
                total_net_repasse: Number(totalNetRepasse.toFixed(2)),
                total_discounts_glosa: Number(totalDiscounts.toFixed(2)),
                total_pending_recebimento: Number(totalPendingRecebimento.toFixed(2)),
                average_per_session: validAppointments.length > 0 ? Number((totalNetRepasse / validAppointments.length).toFixed(2)) : 0,
            },
            items: detailedItems,
        });
    } catch (err: any) {
        console.error('Erro na rota de resumo de produção:', err);
        return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
    }
}
