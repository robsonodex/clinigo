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
        if (!['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '30');
        const today = new Date();

        // 1. Saldo atual (soma de entries de receita pagas - despesa pagas)
        const { data: paidEntries } = await supabase
            .from('financial_entries')
            .select('type, amount')
            .eq('clinic_id', profile.clinic_id)
            .eq('status', 'paid');

        let saldoAtual = 0;
        (paidEntries || []).forEach(e => {
            if (e.type === 'receivable') saldoAtual += (e.amount || 0);
            else if (e.type === 'payable') saldoAtual -= (e.amount || 0);
        });

        // 2. Receitas previstas: lançamentos a receber pendentes nos próximos N dias
        const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const todayStr = today.toISOString().split('T')[0];

        const { data: futureReceivables } = await supabase
            .from('financial_entries')
            .select('amount, due_date, description, category')
            .eq('clinic_id', profile.clinic_id)
            .eq('type', 'receivable')
            .eq('status', 'pending')
            .gte('due_date', todayStr)
            .lte('due_date', futureDate);

        // 3. Despesas previstas: lançamentos a pagar pendentes nos próximos N dias
        const { data: futurePayables } = await supabase
            .from('financial_entries')
            .select('amount, due_date, description, category')
            .eq('clinic_id', profile.clinic_id)
            .eq('type', 'payable')
            .eq('status', 'pending')
            .gte('due_date', todayStr)
            .lte('due_date', futureDate);

        // 4. Agendamentos futuros confirmados como receita estimada
        const { data: futureAppointments } = await supabase
            .from('appointments')
            .select('appointment_date, price')
            .eq('clinic_id', profile.clinic_id)
            .in('status', ['SCHEDULED', 'CONFIRMED'])
            .gte('appointment_date', todayStr)
            .lte('appointment_date', futureDate);

        // 5. Projeção diária
        const dailyProjection: any[] = [];
        let runningBalance = saldoAtual;

        for (let i = 0; i <= days; i++) {
            const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];

            const dayReceivables = (futureReceivables || [])
                .filter(e => e.due_date === dateStr)
                .reduce((s, e) => s + (e.amount || 0), 0);

            const dayAppointments = (futureAppointments || [])
                .filter(a => a.appointment_date === dateStr)
                .reduce((s, a) => s + (a.price || 0), 0);

            const dayPayables = (futurePayables || [])
                .filter(e => e.due_date === dateStr)
                .reduce((s, e) => s + (e.amount || 0), 0);

            const dayRevenue = dayReceivables + dayAppointments;
            runningBalance += dayRevenue - dayPayables;

            dailyProjection.push({
                date: dateStr,
                revenue: dayRevenue,
                expenses: dayPayables,
                balance: runningBalance
            });
        }

        const totalRevenue = dailyProjection.reduce((s, d) => s + d.revenue, 0);
        const totalExpenses = dailyProjection.reduce((s, d) => s + d.expenses, 0);
        const finalBalance = runningBalance;
        const bestDay = dailyProjection.reduce((best, d) => d.revenue > best.revenue ? d : best, dailyProjection[0]);

        return NextResponse.json({
            success: true,
            data: dailyProjection,
            summary: {
                saldo_atual: saldoAtual,
                total_revenue: totalRevenue,
                total_expenses: totalExpenses,
                final_balance: finalBalance,
                best_day: bestDay?.date || null,
                best_day_revenue: bestDay?.revenue || 0,
                days
            }
        });
    } catch (error: any) {
        console.error('[Projection] Erro:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
