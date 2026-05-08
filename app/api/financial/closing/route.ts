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
        const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

        // Date range for selected month
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        // Previous month for comparison
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
        const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
        const prevEndDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${prevLastDay}`;

        // === 1. RECEITAS DO MÊS (PAID INCOME) ===
        const { data: incomeEntries } = await supabase
            .from('financial_entries')
            .select('amount, payment_method, doctor_id, category_id, category:financial_categories(name)')
            .eq('clinic_id', clinicId)
            .eq('entry_type', 'INCOME')
            .eq('status', 'PAID')
            .gte('due_date', startDate)
            .lte('due_date', endDate);

        const totalIncome = incomeEntries?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;

        // === 2. DESPESAS DO MÊS (PAID EXPENSE) ===
        const { data: expenseEntries } = await supabase
            .from('financial_entries')
            .select('amount, category_id, category:financial_categories(name)')
            .eq('clinic_id', clinicId)
            .eq('entry_type', 'EXPENSE')
            .eq('status', 'PAID')
            .gte('due_date', startDate)
            .lte('due_date', endDate);

        const totalExpense = expenseEntries?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;

        // === 3. SESSÕES REALIZADAS (COMPLETED appointments) ===
        const { data: completedSessions } = await supabase
            .from('appointments')
            .select('id, doctor_id, appointment_type, patient_id')
            .eq('clinic_id', clinicId)
            .in('status', ['COMPLETED', 'CONFIRMED'])
            .gte('appointment_date', startDate)
            .lte('appointment_date', endDate);

        const totalSessions = completedSessions?.length || 0;

        // === 4. PENDÊNCIAS (PENDING/OVERDUE entries) ===
        const { data: pendingEntries } = await supabase
            .from('financial_entries')
            .select('id, description, amount, due_date, status, entry_type, category:financial_categories(name)')
            .eq('clinic_id', clinicId)
            .in('status', ['PENDING', 'OVERDUE'])
            .gte('due_date', startDate)
            .lte('due_date', endDate)
            .order('due_date', { ascending: true });

        const totalPending = pendingEntries?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;

        // === 5. MÊS ANTERIOR (para comparativo) ===
        const { data: prevIncomeData } = await supabase
            .from('financial_entries')
            .select('amount')
            .eq('clinic_id', clinicId)
            .eq('entry_type', 'INCOME')
            .eq('status', 'PAID')
            .gte('due_date', prevStartDate)
            .lte('due_date', prevEndDate);

        const prevIncome = prevIncomeData?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;

        const { data: prevExpenseData } = await supabase
            .from('financial_entries')
            .select('amount')
            .eq('clinic_id', clinicId)
            .eq('entry_type', 'EXPENSE')
            .eq('status', 'PAID')
            .gte('due_date', prevStartDate)
            .lte('due_date', prevEndDate);

        const prevExpense = prevExpenseData?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;

        const { data: prevSessions } = await supabase
            .from('appointments')
            .select('id')
            .eq('clinic_id', clinicId)
            .in('status', ['COMPLETED', 'CONFIRMED'])
            .gte('appointment_date', prevStartDate)
            .lte('appointment_date', prevEndDate);

        // === 6. BREAKDOWN POR PROFISSIONAL ===
        const doctorIds = [...new Set([
            ...(incomeEntries || []).map(e => e.doctor_id).filter(Boolean),
            ...(completedSessions || []).map(s => s.doctor_id).filter(Boolean)
        ])];

        let doctorNames: Record<string, string> = {};
        if (doctorIds.length > 0) {
            const { data: doctors } = await supabase
                .from('doctors')
                .select('id, user:users(full_name)')
                .in('id', doctorIds);

            if (doctors) {
                for (const d of doctors) {
                    doctorNames[d.id] = (d.user as any)?.full_name || 'Sem nome';
                }
            }
        }

        const byProfessional: Record<string, { name: string; sessions: number; revenue: number }> = {};
        for (const session of (completedSessions || [])) {
            if (!session.doctor_id) continue;
            if (!byProfessional[session.doctor_id]) {
                byProfessional[session.doctor_id] = {
                    name: doctorNames[session.doctor_id] || 'Sem nome',
                    sessions: 0,
                    revenue: 0,
                };
            }
            byProfessional[session.doctor_id].sessions++;
        }

        for (const entry of (incomeEntries || [])) {
            if (!entry.doctor_id) continue;
            if (!byProfessional[entry.doctor_id]) {
                byProfessional[entry.doctor_id] = {
                    name: doctorNames[entry.doctor_id] || 'Sem nome',
                    sessions: 0,
                    revenue: 0,
                };
            }
            byProfessional[entry.doctor_id].revenue += Number(entry.amount) || 0;
        }

        const professionalBreakdown = Object.values(byProfessional)
            .sort((a, b) => b.revenue - a.revenue);

        // === 7. BREAKDOWN POR FORMA DE PAGAMENTO ===
        const byPayment: Record<string, number> = {};
        for (const entry of (incomeEntries || [])) {
            const method = entry.payment_method || 'Não informado';
            byPayment[method] = (byPayment[method] || 0) + (Number(entry.amount) || 0);
        }

        const paymentBreakdown = Object.entries(byPayment)
            .map(([method, amount]) => ({ method, amount }))
            .sort((a, b) => b.amount - a.amount);

        // === 8. BREAKDOWN POR CATEGORIA (Receitas) ===
        const byCategory: Record<string, number> = {};
        for (const entry of (incomeEntries || [])) {
            const catName = (entry.category as any)?.name || 'Sem categoria';
            byCategory[catName] = (byCategory[catName] || 0) + (Number(entry.amount) || 0);
        }

        const categoryBreakdown = Object.entries(byCategory)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);

        // === 9. BREAKDOWN POR CATEGORIA (Despesas) ===
        const byExpenseCategory: Record<string, number> = {};
        for (const entry of (expenseEntries || [])) {
            const catName = (entry.category as any)?.name || 'Sem categoria';
            byExpenseCategory[catName] = (byExpenseCategory[catName] || 0) + (Number(entry.amount) || 0);
        }

        const expenseCategoryBreakdown = Object.entries(byExpenseCategory)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);

        // === CALCULOS FINAIS ===
        const netResult = totalIncome - totalExpense;
        const prevNetResult = prevIncome - prevExpense;
        const ticketMedio = totalSessions > 0 ? totalIncome / totalSessions : 0;

        const incomeVariation = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;
        const expenseVariation = prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense) * 100 : 0;
        const resultVariation = prevNetResult !== 0 ? ((netResult - prevNetResult) / Math.abs(prevNetResult)) * 100 : 0;
        const sessionVariation = (prevSessions?.length || 0) > 0
            ? ((totalSessions - (prevSessions?.length || 0)) / (prevSessions?.length || 1)) * 100
            : 0;

        return NextResponse.json({
            success: true,
            data: {
                period: { month, year, startDate, endDate },
                summary: {
                    total_income: totalIncome,
                    total_expense: totalExpense,
                    net_result: netResult,
                    total_sessions: totalSessions,
                    ticket_medio: ticketMedio,
                    total_pending: totalPending,
                    pending_count: pendingEntries?.length || 0,
                },
                comparison: {
                    prev_income: prevIncome,
                    prev_expense: prevExpense,
                    prev_result: prevNetResult,
                    prev_sessions: prevSessions?.length || 0,
                    income_variation: incomeVariation,
                    expense_variation: expenseVariation,
                    result_variation: resultVariation,
                    session_variation: sessionVariation,
                },
                breakdown: {
                    by_professional: professionalBreakdown,
                    by_payment_method: paymentBreakdown,
                    by_income_category: categoryBreakdown,
                    by_expense_category: expenseCategoryBreakdown,
                },
                pending_items: (pendingEntries || []).slice(0, 20),
            }
        });

    } catch (error) {
        console.error('[FINANCIAL CLOSING] Error:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
