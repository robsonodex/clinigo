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

        // 1. Buscar todos os doctors relevantes com dados de usuário
        let doctorQuery = supabase
            .from('doctors')
            .select(`
                id,
                specialty,
                consultation_price,
                user:users (
                    full_name,
                    email
                )
            `)
            .eq('clinic_id', profile.clinic_id)
            .eq('is_active', true);

        if (doctorId) {
            doctorQuery = doctorQuery.eq('id', doctorId);
        }

        const { data: doctorsData, error: docErr } = await doctorQuery;

        if (docErr) {
            console.error('[FinancialProducao] Erro ao buscar profissionais:', docErr);
            throw docErr;
        }

        if (!doctorsData || doctorsData.length === 0) {
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

        // Buscar taxas específicas por paciente (doctor_patient_rates)
        const { data: customPatientRates } = await supabase
            .from('doctor_patient_rates')
            .select('doctor_id, patient_id, rate_type, fixed_value, percentage')
            .eq('clinic_id', profile.clinic_id)
            .eq('active', true);

        const customRatesMap = new Map<string, any>();
        customPatientRates?.forEach(r => {
            const key = `${r.doctor_id}_${r.patient_id}`;
            customRatesMap.set(key, r);
        });

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

        // 2. Buscar agendamentos do período
        let aptQuery = supabase
            .from('appointments')
            .select(`
                id,
                doctor_id,
                status,
                session_status,
                patient_id,
                appointment_type,
                health_insurance_plan_id,
                no_show
            `)
            .eq('clinic_id', profile.clinic_id)
            .gte('appointment_date', periodStart)
            .lte('appointment_date', periodEnd);
            
        if (doctorId) {
            aptQuery = aptQuery.eq('doctor_id', doctorId);
        }
        
        const { data: appointments, error: aptErr } = await aptQuery;
        if (aptErr) {
            console.error('[FinancialProducao] Erro ao buscar agendamentos:', aptErr);
            throw aptErr;
        }

        // 3. Buscar contratos vigentes para repasse estimado
        let contractQuery = supabase
            .from('doctor_contracts')
            .select('doctor_id, percentage_private, percentage_insurance, fixed_value_private, fixed_value_insurance, contract_type')
            .eq('clinic_id', profile.clinic_id)
            .eq('is_active', true);
            
        if (doctorId) {
            contractQuery = contractQuery.eq('doctor_id', doctorId);
        }
        const { data: contracts } = await contractQuery;
        const contractMap = new Map<string, any>();
        contracts?.forEach(c => contractMap.set(c.doctor_id, c));

        // 4. Calcular métricas por doctor
        const results = doctorsData.map((doc: any) => {
            const docApts = (appointments || []).filter((a: any) => a.doctor_id === doc.id);
            
            const completedApts = docApts.filter((a: any) => {
                if (a.no_show) return false;
                const statusLower = (a.status || '').toLowerCase();
                const sessionLower = (a.session_status || '').toLowerCase();
                if (statusLower.includes('cancel') || statusLower.includes('desmarcad') || statusLower.includes('falt')) return false;
                return a.status === 'COMPLETED' || sessionLower === 'presente' || sessionLower === 'reposição' || sessionLower === 'reposicao';
            });

            const total_atendimentos = completedApts.length;
            const total_faltas = docApts.filter((a: any) => a.status === 'NO_SHOW' || a.no_show === true).length;
            
            let receita_total = 0;
            let receita_particular = 0;
            let receita_convenio = 0;
            let repasse_calculado = 0;

            const contract = contractMap.get(doc.id);
            const defaultPrice = Number(doc.consultation_price) || 120.0;
            const contractPercentage = contract ? Number(contract.percentage_private || 60) : 60;
            const contractFixed = contract?.fixed_value_private ? Number(contract.fixed_value_private) : null;
            
            completedApts.forEach((a: any) => {
                // Determinar valor bruto do atendimento
                let val = 0;
                if (financialMap.has(a.id)) {
                    val = financialMap.get(a.id)!;
                } else {
                    const patientRules = rulesMap.get(a.patient_id);
                    if (patientRules && patientRules.length > 0) {
                        const matchedRule = patientRules.find(
                            (r: any) => r.therapy_type?.toLowerCase() === (a.appointment_type || '').toLowerCase()
                        ) || patientRules[0];
                        val = Number(matchedRule.billing_amount) || defaultPrice;
                    } else {
                        val = defaultPrice;
                    }
                }

                receita_total += val;
                if (a.health_insurance_plan_id) {
                    receita_convenio += val;
                } else {
                    receita_particular += val;
                }

                // Cálculo do repasse para este atendimento
                const customRateKey = `${doc.id}_${a.patient_id}`;
                const customRate = customRatesMap.get(customRateKey);

                if (customRate) {
                    if (customRate.rate_type === 'FIXED' && customRate.fixed_value != null) {
                        repasse_calculado += Number(customRate.fixed_value);
                    } else if (customRate.rate_type === 'PERCENTAGE' && customRate.percentage != null) {
                        repasse_calculado += (val * Number(customRate.percentage)) / 100;
                    } else {
                        repasse_calculado += (val * contractPercentage) / 100;
                    }
                } else if (contractFixed != null && contractFixed > 0) {
                    repasse_calculado += contractFixed;
                } else {
                    repasse_calculado += (val * contractPercentage) / 100;
                }
            });
            
            const taxa_noshow = (total_atendimentos + total_faltas) > 0 
                ? (total_faltas / (total_atendimentos + total_faltas)) * 100 
                : 0;
                
            const ticket_medio = total_atendimentos > 0 ? receita_total / total_atendimentos : 0;

            const docUser = Array.isArray(doc.user) ? doc.user[0] : doc.user;
            const docName = docUser?.full_name || docUser?.email || 'Profissional';

            return {
                doctor_id: doc.id,
                doctor_name: docName,
                specialty: doc.specialty || 'Não informada',
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

        // Ordenar por maior número de atendimentos / receita
        results.sort((a, b) => b.total_atendimentos - a.total_atendimentos || b.repasse_calculado - a.repasse_calculado);

        // Sumarização global (Apenas se for CLINIC_ADMIN, caso contrário null)
        let globalSummary = null;
        if (profile.role === 'CLINIC_ADMIN' || profile.role === 'SUPER_ADMIN') {
            const totalRepasse = results.reduce((sum, r) => sum + r.repasse_calculado, 0);
            globalSummary = {
                total_atendimentos: results.reduce((sum, r) => sum + r.total_atendimentos, 0),
                receita_total: results.reduce((sum, r) => sum + r.receita_total, 0),
                total_repasse: totalRepasse,
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
