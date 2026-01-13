// app/api/financial/dre/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/financial/dre
 * Demonstração de Resultados do Exercício (DRE)
 * Query params:
 *   - month: YYYY-MM (obrigatório)
 *   - unit_id: UUID (opcional - NULL = consolidado)
 */
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

        const startDate = `${month}-01`;
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);

        // Calcular receitas
        const { data: revenueData } = await supabase
            .from('financial_entries')
            .select('payment_type, amount')
            .eq('clinic_id', profile.clinic_id)
            .eq('entry_type', 'INCOME')
            .gte('date', startDate)
            .lte('date', endDate.toISOString().split('T')[0])
            .is('unit_id', unit_id || null);

        const revenuePrivate = revenueData
            ?.filter(e => e.payment_type === 'PRIVATE')
            .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

        const revenueInsurance = revenueData
            ?.filter(e => e.payment_type === 'INSURANCE')
            .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

        const totalRevenue = revenuePrivate + revenueInsurance;

        // Calcular despesas
        const { data: expenseData } = await supabase
            .from('financial_entries')
            .select('category, amount')
            .eq('clinic_id', profile.clinic_id)
            .eq('entry_type', 'EXPENSE')
            .gte('date', startDate)
            .lte('date', endDate.toISOString().split('T')[0])
            .is('unit_id', unit_id || null);

        const expenseByCategory: Record<string, number> = {};
        expenseData?.forEach(e => {
            const cat = e.category || 'Outros';
            expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (e.amount || 0);
        });

        const totalExpenses = Object.values(expenseByCategory).reduce((sum, v) => sum + v, 0);

        // Buscar repasses médicos do mês
        const { data: payrollData } = await supabase
            .from('medical_payroll')
            .select('net_payroll')
            .eq('clinic_id', profile.clinic_id)
            .eq('reference_month', startDate);

        const payrollExpense = payrollData?.reduce((sum, p) => sum + (p.net_payroll || 0), 0) || 0;

        // KPIs
        const { count: totalAppointments } = await supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', profile.clinic_id)
            .eq('status', 'COMPLETED')
            .gte('appointment_date', startDate)
            .lte('appointment_date', endDate.toISOString().split('T')[0])
            .is('unit_id', unit_id || null);

        const avgTicket = totalAppointments ? totalRevenue / totalAppointments : 0;
        const netProfit = totalRevenue - totalExpenses - payrollExpense;
        const profitMargin = totalRevenue ? (netProfit / totalRevenue) * 100 : 0;

        // Salvar fechamento
        const { data: closure } = await supabase
            .from('monthly_closures')
            .upsert({
                clinic_id: profile.clinic_id,
                unit_id: unit_id || null,
                reference_month: startDate,
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

        return NextResponse.json({
            success: true,
            data: {
                period: { start: startDate, end: endDate.toISOString().split('T')[0] },
                revenue: {
                    total: totalRevenue,
                    private: revenuePrivate,
                    insurance: revenueInsurance,
                },
                expenses: {
                    total: totalExpenses + payrollExpense,
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
                closure_id: closure?.id,
            },
        });

    } catch (error: any) {
        console.error('[Financial] Erro ao gerar DRE:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
