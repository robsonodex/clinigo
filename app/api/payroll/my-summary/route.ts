import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });

        const adminClient = createServiceRoleClient() as any;

        const { data: profile } = await adminClient
            .from('users')
            .select('clinic_id, role, full_name')
            .eq('id', user.id)
            .maybeSingle();

        if (!profile?.clinic_id) return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });

        // Buscar doctor vinculado ao user
        const { data: doctor, error: doctorError } = await adminClient
            .from('doctors')
            .select('id, specialty, consultation_price, user:users(full_name)')
            .eq('user_id', user.id)
            .eq('clinic_id', profile.clinic_id)
            .maybeSingle();

        if (doctorError) throw doctorError;
        if (!doctor) return NextResponse.json({ success: false, error: 'Perfil profissional não encontrado' }, { status: 403 });

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Mês atual
        const monthStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
        const monthEnd = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

        // Mês anterior
        const lastMonthStart = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
        const lastMonthEnd = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

        // Regras de reembolso e entradas financeiras da clínica para precificação
        const { data: reimbursementRules } = await adminClient
            .from('patient_reimbursement_rules')
            .select('patient_id, therapy_type, billing_amount')
            .eq('clinic_id', profile.clinic_id)
            .eq('is_active', true);

        const rulesMap = new Map<string, any[]>();
        for (const rule of reimbursementRules || []) {
            if (!rulesMap.has(rule.patient_id)) rulesMap.set(rule.patient_id, []);
            rulesMap.get(rule.patient_id)!.push(rule);
        }

        const { data: financialEntries } = await adminClient
            .from('financial_entries')
            .select('appointment_id, amount')
            .eq('clinic_id', profile.clinic_id)
            .eq('entry_type', 'INCOME')
            .not('appointment_id', 'is', null);

        const financialMap = new Map<string, number>();
        financialEntries?.forEach((e: any) => {
            if (e.appointment_id) {
                financialMap.set(e.appointment_id, Number(e.amount) || 0);
            }
        });

        const defaultPrice = Number(doctor.consultation_price) || 0;
        const getAppointmentPrice = (appt: any) => {
            if (financialMap.has(appt.id)) {
                return financialMap.get(appt.id)!;
            }
            const patientRules = rulesMap.get(appt.patient_id);
            if (patientRules && patientRules.length > 0) {
                const matchedRule = patientRules.find(
                    (r: any) => r.therapy_type?.toLowerCase() === (appt.appointment_type || '').toLowerCase()
                ) || patientRules[0];
                return Number(matchedRule.billing_amount) || defaultPrice;
            }
            return defaultPrice;
        };

        // Appointments mês atual (inclui nome do paciente para lista "Aguardando Evolução Assinada")
        const { data: currentApts } = await adminClient
            .from('appointments')
            .select('id, status, patient_id, appointment_type, appointment_date, patients:patient_id(full_name)')
            .eq('clinic_id', profile.clinic_id)
            .eq('doctor_id', doctor.id)
            .gte('appointment_date', monthStart)
            .lte('appointment_date', monthEnd);

        // Appointments mês anterior
        const { data: lastApts } = await adminClient
            .from('appointments')
            .select('id, status, patient_id, appointment_type')
            .eq('clinic_id', profile.clinic_id)
            .eq('doctor_id', doctor.id)
            .gte('appointment_date', lastMonthStart)
            .lte('appointment_date', lastMonthEnd);

        // Contrato de repasse
        const { data: contract, error: contractError } = await adminClient
            .from('doctor_contracts')
            .select('contract_type, percentage_private, percentage_insurance, fixed_value_private, fixed_value_insurance, fixed_salary')
            .eq('clinic_id', profile.clinic_id)
            .eq('doctor_id', doctor.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (contractError) throw contractError;

        const percentage = contract ? Number(contract.percentage_private) || 0 : 0;

        // Calcular métricas mês atual
        const currentCompleted = (currentApts || []).filter((a: any) => a.status === 'COMPLETED');
        const currentNoShow = (currentApts || []).filter((a: any) => a.status === 'NO_SHOW');
        const currentRevenue = currentCompleted.reduce((s: number, a: any) => s + getAppointmentPrice(a), 0);
        const currentRepasse = currentRevenue * (percentage / 100);

        // Cruzar atendimentos concluídos do mês com evoluções assinadas (medical_records + planos_sessao)
        const [{ data: monthRecords }, { data: monthSessionPlans }] = await Promise.all([
            adminClient
                .from('medical_records')
                .select('appointment_id, patient_id, signed_at, created_at')
                .eq('clinic_id', profile.clinic_id)
                .eq('doctor_id', doctor.id)
                .gte('created_at', `${monthStart}T00:00:00Z`),
            adminClient
                .from('planos_sessao')
                .select('paciente_id, data_sessao, status')
                .eq('clinica_id', profile.clinic_id)
                .eq('status', 'assinado')
                .gte('data_sessao', monthStart)
                .lte('data_sessao', monthEnd),
        ]);

        const signedAptIds = new Set<string>();
        const signedPatientDates = new Set<string>();

        for (const rec of monthRecords || []) {
            if (!rec.signed_at) continue;
            if (rec.appointment_id) signedAptIds.add(rec.appointment_id);
            if (rec.patient_id && rec.created_at) {
                signedPatientDates.add(`${rec.patient_id}_${String(rec.created_at).split('T')[0]}`);
            }
        }
        for (const sp of monthSessionPlans || []) {
            if (sp.paciente_id && sp.data_sessao) {
                signedPatientDates.add(`${sp.paciente_id}_${String(sp.data_sessao).split('T')[0]}`);
            }
        }

        let repasseLiberado = 0;
        let repasseAguardando = 0;
        let signedCount = 0;
        const pendingAppointments: Array<{
            appointment_id: string;
            patient_id: string;
            patient_name: string;
            appointment_date: string;
            estimated_repasse: number;
        }> = [];

        for (const apt of currentCompleted) {
            const aptRepasse = getAppointmentPrice(apt) * (percentage / 100);
            const hasSigned =
                signedAptIds.has(apt.id) ||
                signedPatientDates.has(`${apt.patient_id}_${apt.appointment_date}`);

            if (hasSigned) {
                signedCount++;
                repasseLiberado += aptRepasse;
            } else {
                repasseAguardando += aptRepasse;
                const pObj = Array.isArray(apt.patients) ? apt.patients[0] : apt.patients;
                pendingAppointments.push({
                    appointment_id: apt.id,
                    patient_id: apt.patient_id,
                    patient_name: pObj?.full_name || 'Paciente',
                    appointment_date: apt.appointment_date,
                    estimated_repasse: Number(aptRepasse.toFixed(2)),
                });
            }
        }

        const complianceRate =
            currentCompleted.length > 0
                ? Math.round((signedCount / currentCompleted.length) * 100)
                : 100;

        // Calcular métricas mês anterior
        const lastCompleted = (lastApts || []).filter((a: any) => a.status === 'COMPLETED');
        const lastRevenue = lastCompleted.reduce((s: number, a: any) => s + getAppointmentPrice(a), 0);
        const lastRepasse = lastRevenue * (percentage / 100);

        // Variação
        const variation = lastRepasse > 0 ? ((currentRepasse - lastRepasse) / lastRepasse) * 100 : 0;

        // Dias trabalhados no mês
        const workedDays = [...new Set(currentCompleted.map((a: any) => a.appointment_date))];

        // Últimos 6 meses para gráfico
        const monthlyEvolution = [];
        for (let i = 5; i >= 0; i--) {
            const m = new Date(currentYear, currentMonth - i, 1);
            const mStart = m.toISOString().split('T')[0];
            const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0).toISOString().split('T')[0];

            const { data: mApts } = await adminClient
                .from('appointments')
                .select('id, patient_id, appointment_type')
                .eq('clinic_id', profile.clinic_id)
                .eq('doctor_id', doctor.id)
                .eq('status', 'COMPLETED')
                .gte('appointment_date', mStart)
                .lte('appointment_date', mEnd);

            const mRevenue = (mApts || []).reduce((s: number, a: any) => s + getAppointmentPrice(a), 0);
            monthlyEvolution.push({
                month: `${String(m.getMonth() + 1).padStart(2, '0')}/${m.getFullYear()}`,
                revenue: mRevenue,
                repasse: mRevenue * (percentage / 100)
            });
        }

        const docUser = Array.isArray(doctor.user) ? doctor.user[0] : doctor.user;

        return NextResponse.json({
            success: true,
            data: {
                doctor_name: docUser?.full_name || profile.full_name || '',
                specialty: doctor.specialty,
                percentage,
                current_month: {
                    total_atendimentos: currentCompleted.length,
                    receita_gerada: currentRevenue,
                    repasse_calculado: currentRepasse,
                    faltas_recebidas: currentNoShow.length,
                    worked_days: workedDays
                },
                last_month: {
                    total_atendimentos: lastCompleted.length,
                    receita_gerada: lastRevenue,
                    repasse_calculado: lastRepasse
                },
                variation_percentage: Math.round(variation * 10) / 10,
                monthly_evolution: monthlyEvolution,
                evolution_compliance: {
                    total_completed: currentCompleted.length,
                    with_signed_evolution: signedCount,
                    pending_evolution_count: pendingAppointments.length,
                    compliance_rate: complianceRate,
                    repasse_liberado: Number(repasseLiberado.toFixed(2)),
                    repasse_aguardando_evolucao: Number(repasseAguardando.toFixed(2)),
                    pending_appointments: pendingAppointments
                        .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date))
                        .slice(0, 15),
                },
            }
        });
    } catch (error: any) {
        request.log.error('payroll/my-summary', { error: error instanceof Error ? error.message : String(error) })
        console.error('[MySummary] Erro:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
})
