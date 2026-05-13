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
        const minDays = parseInt(searchParams.get('min_days') || '1');
        const maxDays = parseInt(searchParams.get('max_days') || '9999');
        const minValue = parseFloat(searchParams.get('min_value') || '0');

        // Buscar lançamentos pendentes vencidos (receitas a receber)
        const { data: entries, error } = await supabase
            .from('financial_entries')
            .select('id, patient_id, amount, due_date, description, category')
            .eq('clinic_id', profile.clinic_id)
            .eq('status', 'pending')
            .eq('type', 'receivable')
            .lt('due_date', new Date().toISOString().split('T')[0]);

        if (error) throw error;

        // Buscar nomes dos pacientes
        const patientIds = [...new Set((entries || []).map(e => e.patient_id).filter(Boolean))];
        let patientMap: Record<string, string> = {};
        if (patientIds.length > 0) {
            const { data: patients } = await supabase
                .from('patients')
                .select('id, name')
                .in('id', patientIds);
            patients?.forEach(p => { patientMap[p.id] = p.name; });
        }

        // Agrupar por paciente
        const grouped: Record<string, any> = {};
        const today = new Date();
        (entries || []).forEach(entry => {
            const pid = entry.patient_id || 'sem-paciente';
            if (!grouped[pid]) {
                grouped[pid] = {
                    patient_id: pid,
                    patient_name: patientMap[pid] || 'Sem paciente vinculado',
                    total_value: 0,
                    max_days_overdue: 0,
                    entries_count: 0,
                    entries: [],
                    level: 'leve'
                };
            }
            const dueDate = new Date(entry.due_date);
            const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

            grouped[pid].total_value += entry.amount || 0;
            grouped[pid].max_days_overdue = Math.max(grouped[pid].max_days_overdue, daysOverdue);
            grouped[pid].entries_count += 1;
            grouped[pid].entries.push({
                id: entry.id,
                amount: entry.amount,
                due_date: entry.due_date,
                days_overdue: daysOverdue,
                description: entry.description,
                category: entry.category
            });
        });

        // Classificar e filtrar
        let debtors = Object.values(grouped).map((d: any) => {
            if (d.max_days_overdue >= 31) d.level = 'grave';
            else if (d.max_days_overdue >= 16) d.level = 'moderado';
            else d.level = 'leve';
            return d;
        }).filter((d: any) =>
            d.max_days_overdue >= minDays &&
            d.max_days_overdue <= maxDays &&
            d.total_value >= minValue
        ).sort((a: any, b: any) => b.total_value - a.total_value);

        // Resumo
        const totalOverdue = debtors.reduce((s: number, d: any) => s + d.total_value, 0);
        const totalDebtors = debtors.length;

        // Faturamento do mês para calcular % comprometido
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const { data: monthRevenue } = await supabase
            .from('financial_entries')
            .select('amount')
            .eq('clinic_id', profile.clinic_id)
            .eq('type', 'receivable')
            .gte('due_date', monthStart);

        const totalMonthRevenue = (monthRevenue || []).reduce((s, e) => s + (e.amount || 0), 0);
        const percentCompromised = totalMonthRevenue > 0 ? (totalOverdue / totalMonthRevenue) * 100 : 0;

        return NextResponse.json({
            success: true,
            data: debtors,
            summary: {
                total_overdue: totalOverdue,
                total_debtors: totalDebtors,
                percent_compromised: Math.round(percentCompromised * 10) / 10
            }
        });
    } catch (error: any) {
        console.error('[Debtors] Erro:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
