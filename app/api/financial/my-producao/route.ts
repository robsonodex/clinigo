import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });

        const { data: doctor } = await supabase
            .from('doctors')
            .select('id, name, specialty')
            .eq('user_id', user.id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!doctor) return NextResponse.json({ success: false, error: 'Perfil não encontrado' }, { status: 403 });

        const { searchParams } = new URL(request.url);
        const periodStart = searchParams.get('period_start');
        const periodEnd = searchParams.get('period_end');

        if (!periodStart || !periodEnd) {
            return NextResponse.json({ success: false, error: 'Período obrigatório' }, { status: 400 });
        }

        // Buscar todas as regras de reembolso de pacientes ativas da clínica
        const { data: reimbursementRules } = await supabase
            .from('patient_reimbursement_rules')
            .select('patient_id, therapy_type, billing_amount')
            .eq('clinic_id', profile.clinic_id)
            .eq('is_active', true);

        const rulesMap = new Map<string, any[]>();
        for (const rule of reimbursementRules || []) {
            if (!rulesMap.has(rule.patient_id)) rulesMap.set(rule.patient_id, []);
            rulesMap.get(rule.patient_id)!.push(rule);
        }

        // Buscar lançamentos financeiros vinculados
        const { data: financialEntries } = await supabase
            .from('financial_entries')
            .select('appointment_id, amount')
            .eq('clinic_id', profile.clinic_id)
            .eq('entry_type', 'INCOME')
            .not('appointment_id', 'is', null);

        const financialMap = new Map<string, number>();
        financialEntries?.forEach(e => {
            if (e.appointment_id) {
                financialMap.set(e.appointment_id, Number(e.amount) || 0);
            }
        });

        const getAppointmentPrice = (appt: any) => {
            if (financialMap.has(appt.id)) {
                return financialMap.get(appt.id)!;
            }
            const patientRules = rulesMap.get(appt.patient_id);
            if (patientRules && patientRules.length > 0) {
                const matchedRule = patientRules.find(
                    (r: any) => r.therapy_type?.toLowerCase() === (appt.appointment_type || '').toLowerCase()
                ) || patientRules[0];
                return Number(matchedRule.billing_amount) || 0;
            }
            return 0;
        };

        // Buscar appointments do profissional
        const { data: appointments } = await supabase
            .from('appointments')
            .select('id, status, patient_id, appointment_type, health_insurance_plan_id, appointment_date')
            .eq('clinic_id', profile.clinic_id)
            .eq('doctor_id', doctor.id)
            .gte('appointment_date', periodStart)
            .lte('appointment_date', periodEnd);

        const completed = (appointments || []).filter(a => a.status === 'COMPLETED');
        const noShow = (appointments || []).filter(a => a.status === 'NO_SHOW');

        const receitaTotal = completed.reduce((s, a) => s + getAppointmentPrice(a), 0);
        const receitaParticular = completed.filter(a => !a.health_insurance_plan_id).reduce((s, a) => s + getAppointmentPrice(a), 0);
        const receitaConvenio = completed.filter(a => !!a.health_insurance_plan_id).reduce((s, a) => s + getAppointmentPrice(a), 0);

        const taxaNoShow = (completed.length + noShow.length) > 0
            ? (noShow.length / (completed.length + noShow.length)) * 100
            : 0;

        const ticketMedio = completed.length > 0 ? receitaTotal / completed.length : 0;

        // Contrato
        const { data: contract } = await supabase
            .from('doctor_contracts')
            .select('percentage')
            .eq('doctor_id', doctor.id)
            .eq('is_active', true)
            .single();

        const percentage = contract?.percentage || 0;

        // Média da clínica (sem identificar nomes)
        const { data: allClinicApts } = await supabase
            .from('appointments')
            .select('id, patient_id, appointment_type, status')
            .eq('clinic_id', profile.clinic_id)
            .eq('status', 'COMPLETED')
            .gte('appointment_date', periodStart)
            .lte('appointment_date', periodEnd);

        const clinicAvgTicket = (allClinicApts && allClinicApts.length > 0)
            ? allClinicApts.reduce((s, a) => s + getAppointmentPrice(a), 0) / allClinicApts.length
            : 0;

        // Evolução mensal (últimos 12 meses)
        const evolution = [];
        const today = new Date();
        for (let i = 11; i >= 0; i--) {
            const m = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const mStart = m.toISOString().split('T')[0];
            const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0).toISOString().split('T')[0];

            const { data: mApts } = await supabase
                .from('appointments')
                .select('id, patient_id, appointment_type, status')
                .eq('clinic_id', profile.clinic_id)
                .eq('doctor_id', doctor.id)
                .eq('status', 'COMPLETED')
                .gte('appointment_date', mStart)
                .lte('appointment_date', mEnd);

            evolution.push({
                month: `${String(m.getMonth() + 1).padStart(2, '0')}/${m.getFullYear()}`,
                atendimentos: (mApts || []).length,
                receita: (mApts || []).reduce((s, a) => s + getAppointmentPrice(a), 0)
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                doctor_name: doctor.name,
                specialty: doctor.specialty,
                total_atendimentos: completed.length,
                total_faltas: noShow.length,
                taxa_noshow: Math.round(taxaNoShow * 10) / 10,
                receita_total: receitaTotal,
                receita_particular: receitaParticular,
                receita_convenio: receitaConvenio,
                ticket_medio: ticketMedio,
                repasse_calculado: receitaTotal * (percentage / 100),
                percentage,
                clinic_avg_ticket: clinicAvgTicket,
                evolution
            }
        });
    } catch (error: any) {
        console.error('[MyProducao] Erro:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
