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
        const periodStart = searchParams.get('period_start');
        const periodEnd = searchParams.get('period_end');

        if (!periodStart || !periodEnd) {
            return NextResponse.json({ success: false, error: 'Período obrigatório' }, { status: 400 });
        }

        // Buscar entries de receita no período com convênio
        const { data: entries, error } = await supabase
            .from('financial_entries')
            .select('amount, health_insurance_id')
            .eq('clinic_id', profile.clinic_id)
            .eq('type', 'receivable')
            .gte('created_at', periodStart)
            .lte('created_at', periodEnd);

        if (error) throw error;

        // Buscar appointments completados no período
        const { data: appointments } = await supabase
            .from('appointments')
            .select('price, health_insurance_id')
            .eq('clinic_id', profile.clinic_id)
            .eq('status', 'COMPLETED')
            .gte('appointment_date', periodStart)
            .lte('appointment_date', periodEnd);

        // Buscar nomes dos convênios
        const { data: insurances } = await supabase
            .from('health_insurances')
            .select('id, name')
            .eq('clinic_id', profile.clinic_id);

        const insuranceMap: Record<string, string> = {};
        insurances?.forEach(i => { insuranceMap[i.id] = i.name; });

        // Agrupar por fonte (particular / cada convênio)
        const mixMap: Record<string, { label: string; value: number; count: number }> = {};

        const processItem = (amount: number, insuranceId: string | null) => {
            const key = insuranceId || 'particular';
            const label = insuranceId ? (insuranceMap[insuranceId] || 'Convênio') : 'Particular';
            if (!mixMap[key]) mixMap[key] = { label, value: 0, count: 0 };
            mixMap[key].value += amount || 0;
            mixMap[key].count += 1;
        };

        (entries || []).forEach(e => processItem(e.amount, e.health_insurance_id));
        (appointments || []).forEach(a => processItem(a.price, a.health_insurance_id));

        const totalValue = Object.values(mixMap).reduce((s, m) => s + m.value, 0);
        const totalCount = Object.values(mixMap).reduce((s, m) => s + m.count, 0);

        const mix = Object.values(mixMap).map(m => ({
            ...m,
            percentage: totalValue > 0 ? Math.round((m.value / totalValue) * 1000) / 10 : 0,
            ticket_medio: m.count > 0 ? m.value / m.count : 0
        })).sort((a, b) => b.value - a.value);

        return NextResponse.json({
            success: true,
            data: mix,
            summary: {
                total_value: totalValue,
                total_count: totalCount,
                sources: mix.length
            }
        });
    } catch (error: any) {
        console.error('[RevenueMix] Erro:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
