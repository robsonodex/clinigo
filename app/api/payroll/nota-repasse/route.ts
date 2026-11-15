import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const adminClient = createServiceRoleClient() as any;

        const { data: profile } = await adminClient
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .maybeSingle();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        // Apenas CLINIC_ADMIN, SUPER_ADMIN ou o próprio DOCTOR podem emitir
        if (!['CLINIC_ADMIN', 'SUPER_ADMIN', 'DOCTOR'].includes(profile.role)) {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const body = await request.json();
        let { doctor_id, period_start, period_end } = body;

        // Se for doctor, só pode ver a si mesmo
        if (profile.role === 'DOCTOR') {
            const { data: doctorRecord } = await adminClient
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .eq('clinic_id', profile.clinic_id)
                .maybeSingle();

            if (!doctorRecord) {
                return NextResponse.json({ success: false, error: 'Perfil não encontrado' }, { status: 403 });
            }
            // Força o ID para o seu próprio
            doctor_id = doctorRecord.id;
        }

        if (!doctor_id || !period_start || !period_end) {
            return NextResponse.json({ success: false, error: 'Parâmetros insuficientes' }, { status: 400 });
        }

        // 1. Busca dados do doctor
        const { data: doctor } = await adminClient
            .from('doctors')
            .select('id, crm, specialty, consultation_price, user:users(full_name, email)')
            .eq('id', doctor_id)
            .eq('clinic_id', profile.clinic_id)
            .maybeSingle();

        if (!doctor) {
            return NextResponse.json({ success: false, error: 'Profissional não encontrado' }, { status: 404 });
        }

        // 2. Busca contratos
        const { data: contracts } = await adminClient
            .from('doctor_contracts')
            .select('*')
            .eq('clinic_id', profile.clinic_id)
            .eq('doctor_id', doctor_id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1);
        
        const contract = contracts?.[0];
        const defaultPercentage = Number(contract?.percentage_private ?? contract?.percentage ?? 0);
        const insurancePercentage = Number(contract?.percentage_insurance ?? defaultPercentage);

        // Regras de reembolso e entradas financeiras da clínica
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

        // 3. Busca appointments concluídos no período
        const { data: appointments } = await adminClient
            .from('appointments')
            .select(`
                id, appointment_date, appointment_time, appointment_type, status, patient_id, health_insurance_plan_id,
                patient:patients(id, full_name)
            `)
            .eq('doctor_id', doctor_id)
            .eq('clinic_id', profile.clinic_id)
            .eq('status', 'COMPLETED')
            .gte('appointment_date', period_start)
            .lte('appointment_date', period_end)
            .order('appointment_date', { ascending: true });

        // Calcula repasse por atendimento
        let total_bruto = 0;
        let total_repasse = 0;
        
        const details = (appointments || []).map((apt: any) => {
            const valor = getAppointmentPrice(apt);
            total_bruto += valor;
            
            const isInsurance = Boolean(apt.health_insurance_plan_id);
            const percentual = isInsurance ? insurancePercentage : defaultPercentage;
            
            const repasse = valor * (percentual / 100);
            total_repasse += repasse;

            const pat = Array.isArray(apt.patient) ? apt.patient[0] : apt.patient;

            return {
                data: `${apt.appointment_date} ${apt.appointment_time || ''}`.trim(),
                paciente: pat?.full_name || 'Não informado',
                convenio: isInsurance ? 'Convênio' : 'Particular',
                valor_bruto: valor,
                percentual: percentual,
                valor_repasse: repasse
            };
        });

        // 4. Busca deduções (doctor_expenses)
        const [year, month] = period_start.split('-');
        const { data: expenses } = await adminClient
            .from('doctor_expenses')
            .select('id, description, amount, expense_category')
            .eq('doctor_id', doctor_id)
            .eq('clinic_id', profile.clinic_id)
            .eq('year', parseInt(year))
            .eq('month', parseInt(month))
            .eq('deduct_from_payroll', true);

        let total_deducoes = 0;
        expenses?.forEach((e: any) => {
            total_deducoes += e.amount || 0;
        });

        const valor_liquido = total_repasse - total_deducoes;
        const docUser = Array.isArray(doctor.user) ? doctor.user[0] : doctor.user;

        // 5. Retorna dados estruturados
        return NextResponse.json({
            success: true,
            data: {
                profissional: {
                    nome: docUser?.full_name || 'Profissional',
                    documento: doctor.crm || 'N/A',
                    especialidade: doctor.specialty || 'N/A',
                    email: docUser?.email || ''
                },
                periodo: { start: period_start, end: period_end },
                atendimentos: details,
                resumo: {
                    total_bruto,
                    percentual_medio: total_bruto > 0 ? (total_repasse / total_bruto) * 100 : 0,
                    total_repasse,
                    deducoes: expenses || [],
                    total_deducoes,
                    valor_liquido
                }
            }
        });

    } catch (error: any) {
        request.log.error('payroll/nota-repasse', { error: error instanceof Error ? error.message : String(error) })
        console.error('[NotaRepasse] Erro ao gerar:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
})
