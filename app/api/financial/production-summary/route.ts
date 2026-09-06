// app/api/financial/production-summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { resolveClinicId } from '@/lib/utils/resolve-clinic-id';

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
                appointment_type,
                therapy_modality,
                session_format,
                no_show,
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

        // Filtrar apenas atendimentos efetivamente realizados (exclui cancelados e faltas não cobradas)
        const validAppointments = (appointments || []).filter((appt: any) => {
            if (appt.no_show) return false;
            const st = (appt.status || '').toLowerCase();
            return !st.includes('cancel') && !st.includes('desmarcad');
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

        const defaultPrice = Number(doctorData.consultation_price) || 120.0;
        const defaultContractPercentage = contract ? Number(contract.percentage || contract.percentage_private || 60) : 60;
        const defaultContractFixed = contract?.fixed_value_private ? Number(contract.fixed_value_private) : null;

        let totalGross = 0;
        let totalNetRepasse = 0;
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

            // Determinar o repasse
            let repasseAmount = 0;
            let ruleDescription = '';

            const customRate = customRatesMap.get(patientId);

            if (customRate) {
                if (customRate.rate_type === 'FIXED' && customRate.fixed_value != null) {
                    repasseAmount = Number(customRate.fixed_value);
                    ruleDescription = `Taxa Específica por Paciente: R$ ${repasseAmount.toFixed(2)} (Fixo)`;
                } else if (customRate.rate_type === 'PERCENTAGE' && customRate.percentage != null) {
                    const pct = Number(customRate.percentage);
                    repasseAmount = (grossAmount * pct) / 100;
                    ruleDescription = `Taxa Específica por Paciente: ${pct}%`;
                }
            } else if (defaultContractFixed != null && defaultContractFixed > 0) {
                repasseAmount = defaultContractFixed;
                ruleDescription = `Contrato Padrão: R$ ${repasseAmount.toFixed(2)} (Fixo)`;
            } else {
                repasseAmount = (grossAmount * defaultContractPercentage) / 100;
                ruleDescription = `Contrato Padrão: ${defaultContractPercentage}%`;
            }

            totalGross += grossAmount;
            totalNetRepasse += repasseAmount;

            return {
                appointment_id: appt.id,
                date: appt.appointment_date,
                time: appt.appointment_time ? appt.appointment_time.slice(0, 5) : '',
                patient_name: patientName,
                patient_cpf: appt.patient?.cpf || null,
                procedure: appt.appointment_type || appt.therapy_modality || doctorData.specialty || 'Sessão Terapêutica',
                gross_amount: Number(grossAmount.toFixed(2)),
                repasse_amount: Number(repasseAmount.toFixed(2)),
                rule_description: ruleDescription,
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
                total_appointments: validAppointments.length,
                unique_patients_count: uniquePatients.size,
                total_gross: Number(totalGross.toFixed(2)),
                total_net_repasse: Number(totalNetRepasse.toFixed(2)),
                average_per_session: validAppointments.length > 0 ? Number((totalNetRepasse / validAppointments.length).toFixed(2)) : 0,
            },
            items: detailedItems,
        });
    } catch (err: any) {
        console.error('Erro na rota de resumo de produção:', err);
        return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
    }
}
