import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        const clinicId = profile?.clinic_id;
        if (!clinicId) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 });

        const searchParams = request.nextUrl.searchParams;
        const startDate = searchParams.get('start_date') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];

        // 1. Receita do Mês (PAID INCOME)
        const { data: incomeData } = await supabase
            .from('financial_entries')
            .select('amount')
            .eq('clinic_id', clinicId)
            .eq('entry_type', 'INCOME')
            .eq('status', 'PAID')
            .gte('due_date', startDate)
            .lte('due_date', endDate);
        
        let totalIncome = incomeData?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;

        // FALLBACK: If no financial_entries for this period, calculate from reimbursement rules
        if (totalIncome === 0) {
            const { data: completedAppts } = await supabase
                .from('appointments')
                .select('id, patient_id, appointment_type')
                .eq('clinic_id', clinicId)
                .eq('status', 'COMPLETED')
                .gte('appointment_date', startDate)
                .lte('appointment_date', endDate);

            if (completedAppts && completedAppts.length > 0) {
                const { data: rules } = await supabase
                    .from('patient_reimbursement_rules')
                    .select('patient_id, therapy_type, billing_amount')
                    .eq('clinic_id', clinicId)
                    .eq('is_active', true);

                if (rules && rules.length > 0) {
                    const rulesMap = new Map<string, any[]>();
                    for (const rule of rules) {
                        if (!rulesMap.has(rule.patient_id)) rulesMap.set(rule.patient_id, []);
                        rulesMap.get(rule.patient_id)!.push(rule);
                    }

                    for (const appt of completedAppts) {
                        const patientRules = rulesMap.get(appt.patient_id);
                        if (patientRules && patientRules.length > 0) {
                            const matchedRule = patientRules.find(
                                (r: any) => r.therapy_type?.toLowerCase() === (appt.appointment_type || '').toLowerCase()
                            ) || patientRules[0];
                            totalIncome += Number(matchedRule.billing_amount) || 0;
                        }
                    }
                }
            }
        }

        // 2. Glosas do Mês (from tiss_guides)
        const { data: glosasData } = await supabase
            .from('tiss_guides')
            .select('glosa_amount')
            .eq('clinic_id', clinicId)
            .gt('glosa_amount', 0)
            .gte('execution_date', startDate)
            .lte('execution_date', endDate);
        
        const totalGlosas = glosasData?.reduce((acc, curr) => acc + (Number(curr.glosa_amount) || 0), 0) || 0;

        // 3. A Receber (PENDING INCOME financial_entries + PENDING tiss_guides?)
        // Let's just use pending from financial_entries for now, representing billed amounts
        const { data: aReceberData } = await supabase
            .from('financial_entries')
            .select('amount')
            .eq('clinic_id', clinicId)
            .eq('entry_type', 'INCOME')
            .in('status', ['PENDING', 'OVERDUE'])
            .gte('due_date', startDate)
            .lte('due_date', endDate);
        
        const totalAReceber = aReceberData?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;

        // 4. Despesas (PAID EXPENSE) to calculate Resultado
        const { data: expenseData } = await supabase
            .from('financial_entries')
            .select('amount')
            .eq('clinic_id', clinicId)
            .eq('entry_type', 'EXPENSE')
            .eq('status', 'PAID')
            .gte('due_date', startDate)
            .lte('due_date', endDate);

        const totalExpense = expenseData?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;
        const result = totalIncome - totalExpense;

        // 5. Top Convênios por Receita
        const { data: topInsuranceIncome } = await supabase
            .from('insurance_payments')
            .select(`
                net_amount,
                health_insurances(name)
            `)
            .eq('clinic_id', clinicId)
            .gte('credit_date', startDate)
            .lte('credit_date', endDate);

        const insuranceIncomeMap: Record<string, number> = {};
        for (const payment of (topInsuranceIncome || [])) {
            const name = (payment.health_insurances as any)?.name || 'Desconhecido';
            insuranceIncomeMap[name] = (insuranceIncomeMap[name] || 0) + Number(payment.net_amount);
        }
        const topIncomeArr = Object.entries(insuranceIncomeMap)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        // 6. Top Convênios por Taxa de Glosa
        const { data: topGlosaGuides } = await supabase
            .from('tiss_guides')
            .select(`
                total_amount,
                glosa_amount,
                tiss_batches(
                    operator:insurance_operators(name)
                )
            `)
            .eq('clinic_id', clinicId)
            .gte('execution_date', startDate)
            .lte('execution_date', endDate);

        const glosaStatsMap: Record<string, { total: number, glosa: number }> = {};
        for(const guide of (topGlosaGuides || [])) {
             const operatorName = (guide.tiss_batches as any)?.operator?.name || 'Desconhecido';
             if (!glosaStatsMap[operatorName]) glosaStatsMap[operatorName] = { total: 0, glosa: 0 };
             glosaStatsMap[operatorName].total += Number(guide.total_amount) || 0;
             glosaStatsMap[operatorName].glosa += Number(guide.glosa_amount) || 0;
        }

        const topGlosaRateArr = Object.entries(glosaStatsMap)
            .map(([name, stats]) => ({
                name,
                rate: stats.total > 0 ? (stats.glosa / stats.total) * 100 : 0
            }))
            .sort((a, b) => b.rate - a.rate)
            .slice(0, 5);

        // Monthly Evolution (Simulated last 6 months grouping to simplify here, in production we'd do a group by over date)
        const evolution = []; // Could use a DB rpc for this, or just return mock format for UI implementation

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    total_income: totalIncome,
                    total_glosas: totalGlosas,
                    total_receivables: totalAReceber,
                    net_result: result
                },
                top_income_insurances: topIncomeArr,
                top_glosa_rate_insurances: topGlosaRateArr
            }
        });

    } catch (error) {
        console.error('[FINANCIAL EXEC] Error:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
