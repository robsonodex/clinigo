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

        const { data: doctor, error: doctorError } = await adminClient
            .from('doctors')
            .select('id, specialty, consultation_price, user:users(full_name)')
            .eq('user_id', user.id)
            .eq('clinic_id', profile.clinic_id)
            .maybeSingle();

        if (doctorError) throw doctorError;
        if (!doctor) return NextResponse.json({ success: false, error: 'Perfil não encontrado' }, { status: 403 });

        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

        // Contrato vigente do profissional
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

        // Buscar todos os appointments do ano
        const yearStart = `${year}-01-01`;
        const yearEnd = `${year}-12-31`;

        const { data: appointments } = await adminClient
            .from('appointments')
            .select('id, status, patient_id, appointment_type, appointment_date, health_insurance_plan_id, patients(full_name)')
            .eq('clinic_id', profile.clinic_id)
            .eq('doctor_id', doctor.id)
            .eq('status', 'COMPLETED')
            .gte('appointment_date', yearStart)
            .lte('appointment_date', yearEnd)
            .order('appointment_date', { ascending: true });

        // Agrupar por mês
        const monthlyMap: Record<string, any[]> = {};
        (appointments || []).forEach((apt: any) => {
            const month = apt.appointment_date?.substring(0, 7); // YYYY-MM
            if (!monthlyMap[month]) monthlyMap[month] = [];
            monthlyMap[month].push(apt);
        });

        const history = Object.entries(monthlyMap).map(([month, apts]) => {
            const totalBruto = apts.reduce((s, a) => s + getAppointmentPrice(a), 0);
            const totalRepasse = Number((totalBruto * (percentage / 100)).toFixed(2));
            return {
                month,
                month_label: `${month.split('-')[1]}/${month.split('-')[0]}`,
                total_atendimentos: apts.length,
                total_bruto: totalBruto,
                total_repasse: totalRepasse,
                status: 'pendente',
                appointments: apts.map((a: any) => {
                    const pat = Array.isArray(a.patients) ? a.patients[0] : a.patients;
                    return {
                        date: a.appointment_date,
                        patient: pat?.full_name || 'Paciente',
                        value: getAppointmentPrice(a),
                        insurance: a.health_insurance_plan_id ? 'Convênio' : 'Particular'
                    };
                })
            };
        }).sort((a, b) => b.month.localeCompare(a.month));

        const totalYear = history.reduce((s, h) => s + h.total_repasse, 0);
        const bestMonth = history.length > 0 ? history.reduce((best, h) => h.total_repasse > best.total_repasse ? h : best) : null;

        return NextResponse.json({
            success: true,
            data: history,
            summary: {
                year,
                total_year: totalYear,
                percentage,
                best_month: bestMonth?.month_label || '-',
                best_month_value: bestMonth?.total_repasse || 0,
                months_count: history.length
            }
        });
    } catch (error: any) {
        request.log.error('payroll/my-history', { error: error instanceof Error ? error.message : String(error) })
        console.error('[MyHistory] Erro:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
})
