import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        if (!['CLINIC_ADMIN', 'SUPER_ADMIN', 'DOCTOR'].includes(profile.role)) {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        let doctorId = searchParams.get('doctor_id');
        const periodStart = searchParams.get('period_start');
        const periodEnd = searchParams.get('period_end');

        // Se for DOCTOR, obriga a usar o seu próprio ID
        if (profile.role === 'DOCTOR') {
            const { data: doctorRecord } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .eq('clinic_id', profile.clinic_id)
                .single();

            if (!doctorRecord) {
                return NextResponse.json({ success: false, error: 'Perfil não encontrado' }, { status: 403 });
            }
            doctorId = doctorRecord.id;
        }

        if (!periodStart || !periodEnd) {
            return NextResponse.json({ success: false, error: 'Período é obrigatório' }, { status: 400 });
        }

        // 1. Buscar todos os doctors relevantes
        let doctorQuery = supabase
            .from('doctors')
            .select('id, name, specialty')
            .eq('clinic_id', profile.clinic_id)
            .eq('is_active', true);

        if (doctorId) {
            doctorQuery = doctorQuery.eq('id', doctorId);
        }

        const { data: doctors } = await doctorQuery;

        if (!doctors || doctors.length === 0) {
            return NextResponse.json({ success: true, data: [] });
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

        // 2. Buscar agendamentos do período
        let aptQuery = supabase
            .from('appointments')
            .select('id, doctor_id, status, patient_id, appointment_type, health_insurance_plan_id')
            .eq('clinic_id', profile.clinic_id)
            .gte('appointment_date', periodStart)
            .lte('appointment_date', periodEnd);
            
        if (doctorId) {
            aptQuery = aptQuery.eq('doctor_id', doctorId);
        }
        
        const { data: appointments } = await aptQuery;

        // 3. Buscar contratos para repasse estimado
        let contractQuery = supabase
            .from('doctor_contracts')
            .select('doctor_id, percentage')
            .eq('is_active', true);
            
        if (doctorId) {
            contractQuery = contractQuery.eq('doctor_id', doctorId);
        }
        const { data: contracts } = await contractQuery;
        const contractMap = new Map();
        contracts?.forEach(c => contractMap.set(c.doctor_id, c.percentage));

        // 4. Calcular métricas por doctor
        const results = doctors.map(doc => {
            const docApts = (appointments || []).filter(a => a.doctor_id === doc.id);
            
            const total_atendimentos = docApts.filter(a => a.status === 'COMPLETED').length;
            const total_faltas = docApts.filter(a => a.status === 'NO_SHOW').length;
            
            let receita_total = 0;
            let receita_particular = 0;
            let receita_convenio = 0;
            
            docApts.filter(a => a.status === 'COMPLETED').forEach(a => {
                const val = getAppointmentPrice(a);
                receita_total += val;
                if (a.health_insurance_plan_id) {
                    receita_convenio += val;
                } else {
                    receita_particular += val;
                }
            });
            
            const taxa_noshow = (total_atendimentos + total_faltas) > 0 
                ? (total_faltas / (total_atendimentos + total_faltas)) * 100 
                : 0;
                
            const ticket_medio = total_atendimentos > 0 ? receita_total / total_atendimentos : 0;
            
            const percentual = contractMap.get(doc.id) || 0;
            const repasse_calculado = receita_total * (percentual / 100);

            return {
                doctor_id: doc.id,
                doctor_name: doc.name,
                specialty: doc.specialty,
                total_atendimentos,
                total_faltas,
                taxa_noshow,
                receita_total,
                receita_particular,
                receita_convenio,
                ticket_medio,
                repasse_calculado
            };
        });

        // Sumarização global (Apenas se for CLINIC_ADMIN, caso contrário null)
        let globalSummary = null;
        if (profile.role === 'CLINIC_ADMIN' || profile.role === 'SUPER_ADMIN') {
            globalSummary = {
                total_atendimentos: results.reduce((sum, r) => sum + r.total_atendimentos, 0),
                receita_total: results.reduce((sum, r) => sum + r.receita_total, 0),
                ticket_medio_geral: 0
            };
            if (globalSummary.total_atendimentos > 0) {
                globalSummary.ticket_medio_geral = globalSummary.receita_total / globalSummary.total_atendimentos;
            }
        }

        return NextResponse.json({
            success: true,
            data: results,
            summary: globalSummary
        });

    } catch (error: any) {
        console.error('[FinancialProducao] Erro:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
