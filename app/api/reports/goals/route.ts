import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns';

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

        if (!['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

        // 1. Obter ou criar a meta para o mês
        let { data: goal } = await supabase
            .from('financial_goals')
            .select('*')
            .eq('clinic_id', profile.clinic_id)
            .eq('year', year)
            .eq('month', month)
            .single();

        if (!goal) {
            // Cria um registro de meta zerado caso não exista
            const { data: newGoal, error: insertError } = await supabase
                .from('financial_goals')
                .insert([{ clinic_id: profile.clinic_id, year, month, target_revenue: 0, target_expenses: 0 }])
                .select()
                .single();
                
            // Se falhar o insert por causa de conflito ou tabela nao existir, ignoramos silenciosamente para nao quebrar
            goal = newGoal || { target_revenue: 0, target_expenses: 0, year, month };
        }

        // 2. Calcular Realizado do mês usando financial_entries
        const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const startDate = parseISO(startDateStr);
        const endDate = endOfMonth(startDate);

        const { data: entries } = await supabase
            .from('financial_entries')
            .select('entry_type, amount')
            .eq('clinic_id', profile.clinic_id)
            .eq('status', 'PAID')
            .gte('due_date', format(startDate, 'yyyy-MM-dd'))
            .lte('due_date', format(endDate, 'yyyy-MM-dd'));

        let actual_revenue = 0;
        let actual_expenses = 0;

        (entries || []).forEach(entry => {
            if (entry.entry_type === 'INCOME') actual_revenue += Number(entry.amount);
            if (entry.entry_type === 'EXPENSE') actual_expenses += Number(entry.amount);
        });

        return NextResponse.json({
            success: true,
            data: {
                year,
                month,
                target_revenue: Number(goal.target_revenue) || 0,
                actual_revenue,
                target_expenses: Number(goal.target_expenses) || 0,
                actual_expenses,
            }
        });
    } catch (error: any) {
        console.error('[FinancialGoals] Erro ao buscar metas:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
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

        if (!['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(profile?.role || '')) {
            return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
        }

        const { year, month, target_revenue, target_expenses } = await request.json();

        const { data, error } = await supabase
            .from('financial_goals')
            .upsert(
                { 
                    clinic_id: profile?.clinic_id, 
                    year: Number(year), 
                    month: Number(month), 
                    target_revenue: Number(target_revenue), 
                    target_expenses: Number(target_expenses) 
                },
                { onConflict: 'clinic_id,year,month' }
            )
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('[FinancialGoals] Erro ao salvar metas:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
