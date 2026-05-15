// app/api/financial/dre/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/financial/dre
 * Demonstração de Resultados do Exercício (DRE)
 * Body params:
 *   - month: YYYY-MM (obrigatório)
 *   - unit_id: UUID (opcional - NULL = consolidado)
 * 
 * O período é calculado com base no financial_cutoff_day da clínica:
 *   - cutoff=1 (padrão): dia 01 ao último dia do mês
 *   - cutoff=11 (Espaço Incluir): dia 11 do mês anterior ao dia 10 do mês referência
 */

/**
 * Calcula o período financeiro com base no dia de corte da clínica.
 * @param month - Formato "YYYY-MM"
 * @param cutoffDay - Dia de corte (1 = calendário, 11 = 11→10)
 */
function calculateFinancialPeriod(month: string, cutoffDay: number): { startDate: string; endDate: string } {
    const [year, monthNum] = month.split('-').map(Number);

    if (cutoffDay === 1) {
        // Período calendário padrão: dia 1 ao último dia do mês
        const start = new Date(year, monthNum - 1, 1);
        const end = new Date(year, monthNum, 0); // último dia do mês
        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
        };
    }

    // Período customizado: dia [cutoff] do mês anterior ao dia [cutoff-1] do mês referência
    // Ex: cutoff=11, mês=04 → 11/03 a 10/04
    const start = new Date(year, monthNum - 2, cutoffDay);
    const end = new Date(year, monthNum - 1, cutoffDay - 1);
    return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
    };
}

export async function POST(request: NextRequest) {
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

        if (!profile?.clinic_id || !['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const body = await request.json();
        const { month, unit_id } = body;

        if (!month) {
            return NextResponse.json({ success: false, error: 'Mês obrigatório' }, { status: 400 });
        }

        // Buscar dia de corte financeiro da clínica
        const { data: clinicConfig } = await supabase
            .from('clinics')
            .select('financial_cutoff_day')
            .eq('id', profile.clinic_id)
            .single();

        const cutoffDay = clinicConfig?.financial_cutoff_day || 1;
        const { startDate, endDate } = calculateFinancialPeriod(month, cutoffDay);

        // Calcular receitas
        const { data: revenueData } = await supabase
            .from('financial_entries')
            .select('category, amount, description')
            .eq('clinic_id', profile.clinic_id)
            .eq('entry_type', 'INCOME')
            .gte('due_date', startDate)
            .lte('due_date', endDate);

        // Categorize revenue - entries with insurance-related descriptions go to insurance
        const revenuePrivate = revenueData
            ?.filter(e => {
                const desc = (e.description || '').toLowerCase();
                const cat = (e.category || '').toLowerCase();
                return !desc.includes('convênio') && !desc.includes('convenio') && !cat.includes('convenio') && !cat.includes('insurance');
            })
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0;

        const revenueInsurance = revenueData
            ?.filter(e => {
                const desc = (e.description || '').toLowerCase();
                const cat = (e.category || '').toLowerCase();
                return desc.includes('convênio') || desc.includes('convenio') || cat.includes('convenio') || cat.includes('insurance');
            })
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0;

        const totalRevenue = revenuePrivate + revenueInsurance;

        // Calcular despesas (EXCLUINDO categorias de repasse médico para não duplicar)
        const { data: expenseData } = await supabase
            .from('financial_entries')
            .select('category, amount')
            .eq('clinic_id', profile.clinic_id)
            .eq('entry_type', 'EXPENSE')
            .gte('due_date', startDate)
            .lte('due_date', endDate);

        // Filtrar despesas removendo itens que são repasses médicos (evita duplicação com medical_payroll)
        const PAYROLL_CATEGORIES = ['repasse', 'repasse médico', 'repasse medico', 'payroll', 'folha', 'honorários médicos'];
        const filteredExpenses = expenseData?.filter(e => {
            const cat = (e.category || '').toLowerCase();
            return !PAYROLL_CATEGORIES.some(pc => cat.includes(pc));
        }) || [];

        const expenseByCategory: Record<string, number> = {};
        filteredExpenses.forEach(e => {
            const cat = e.category || 'Outros';
            expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (Number(e.amount) || 0);
        });

        const totalExpenses = Object.values(expenseByCategory).reduce((sum, v) => sum + v, 0);

        // Buscar repasses médicos do período (usando reference_month como chave)
        const referenceMonth = `${month}-01`;
        const { data: payrollData } = await supabase
            .from('medical_payroll')
            .select('net_payroll')
            .eq('clinic_id', profile.clinic_id)
            .eq('reference_month', referenceMonth);

        const payrollExpense = payrollData?.reduce((sum, p) => sum + (p.net_payroll || 0), 0) || 0;

        // KPIs - usar período calculado
        const { count: totalAppointments } = await supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', profile.clinic_id)
            .eq('status', 'COMPLETED')
            .gte('appointment_date', startDate)
            .lte('appointment_date', endDate);

        const avgTicket = totalAppointments ? totalRevenue / totalAppointments : 0;
        const netProfit = totalRevenue - totalExpenses - payrollExpense;
        const profitMargin = totalRevenue ? (netProfit / totalRevenue) * 100 : 0;

        // Salvar fechamento
        let closureId = null;
        try {
            const { data: closure } = await supabase
                .from('monthly_closures')
                .upsert({
                    clinic_id: profile.clinic_id,
                    unit_id: unit_id || null,
                    reference_month: referenceMonth,
                    total_revenue: totalRevenue,
                    revenue_private: revenuePrivate,
                    revenue_insurance: revenueInsurance,
                    total_expenses: totalExpenses,
                    expense_payroll: payrollExpense,
                    net_profit: netProfit,
                    profit_margin: profitMargin,
                    total_appointments: totalAppointments || 0,
                    average_ticket: avgTicket,
                }, {
                    onConflict: 'clinic_id,unit_id,reference_month',
                })
                .select()
                .single();
            closureId = closure?.id;
        } catch (e) {
            console.warn('[DRE] Could not save monthly closure:', e);
        }

        return NextResponse.json({
            success: true,
            data: {
                period: {
                    start: startDate,
                    end: endDate,
                    cutoff_day: cutoffDay,
                    label: cutoffDay === 1
                        ? `01/${month.split('-')[1]} a ${endDate.split('-')[2]}/${month.split('-')[1]}`
                        : `${cutoffDay}/${String(Number(month.split('-')[1]) - 1).padStart(2, '0')} a ${cutoffDay - 1}/${month.split('-')[1]}`,
                },
                revenue: {
                    total: totalRevenue,
                    private: revenuePrivate,
                    insurance: revenueInsurance,
                },
                expenses: {
                    total: totalExpenses + payrollExpense,
                    operational: totalExpenses,
                    payroll: payrollExpense,
                    by_category: expenseByCategory,
                },
                result: {
                    net_profit: netProfit,
                    profit_margin: profitMargin,
                },
                kpis: {
                    total_appointments: totalAppointments || 0,
                    average_ticket: avgTicket,
                },
                closure_id: closureId,
            },
        });

    } catch (error: any) {
        console.error('[Financial] Erro ao gerar DRE:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
