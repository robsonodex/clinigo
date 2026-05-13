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

        // Buscar doctor vinculado ao user
        const { data: doctor } = await supabase
            .from('doctors')
            .select('id, name, specialty')
            .eq('user_id', user.id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!doctor) return NextResponse.json({ success: false, error: 'Perfil profissional não encontrado' }, { status: 403 });

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Mês atual
        const monthStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
        const monthEnd = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

        // Mês anterior
        const lastMonthStart = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
        const lastMonthEnd = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

        // Appointments mês atual
        const { data: currentApts } = await supabase
            .from('appointments')
            .select('status, price, appointment_date')
            .eq('clinic_id', profile.clinic_id)
            .eq('doctor_id', doctor.id)
            .gte('appointment_date', monthStart)
            .lte('appointment_date', monthEnd);

        // Appointments mês anterior
        const { data: lastApts } = await supabase
            .from('appointments')
            .select('status, price')
            .eq('clinic_id', profile.clinic_id)
            .eq('doctor_id', doctor.id)
            .gte('appointment_date', lastMonthStart)
            .lte('appointment_date', lastMonthEnd);

        // Contrato de repasse
        const { data: contract } = await supabase
            .from('doctor_contracts')
            .select('percentage')
            .eq('doctor_id', doctor.id)
            .eq('is_active', true)
            .single();

        const percentage = contract?.percentage || 0;

        // Calcular métricas mês atual
        const currentCompleted = (currentApts || []).filter(a => a.status === 'COMPLETED');
        const currentNoShow = (currentApts || []).filter(a => a.status === 'NO_SHOW');
        const currentRevenue = currentCompleted.reduce((s, a) => s + (a.price || 0), 0);
        const currentRepasse = currentRevenue * (percentage / 100);

        // Calcular métricas mês anterior
        const lastCompleted = (lastApts || []).filter(a => a.status === 'COMPLETED');
        const lastRevenue = lastCompleted.reduce((s, a) => s + (a.price || 0), 0);
        const lastRepasse = lastRevenue * (percentage / 100);

        // Variação
        const variation = lastRepasse > 0 ? ((currentRepasse - lastRepasse) / lastRepasse) * 100 : 0;

        // Dias trabalhados no mês
        const workedDays = [...new Set(currentCompleted.map(a => a.appointment_date))];

        // Últimos 6 meses para gráfico
        const monthlyEvolution = [];
        for (let i = 5; i >= 0; i--) {
            const m = new Date(currentYear, currentMonth - i, 1);
            const mStart = m.toISOString().split('T')[0];
            const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0).toISOString().split('T')[0];

            const { data: mApts } = await supabase
                .from('appointments')
                .select('price')
                .eq('clinic_id', profile.clinic_id)
                .eq('doctor_id', doctor.id)
                .eq('status', 'COMPLETED')
                .gte('appointment_date', mStart)
                .lte('appointment_date', mEnd);

            const mRevenue = (mApts || []).reduce((s, a) => s + (a.price || 0), 0);
            monthlyEvolution.push({
                month: `${String(m.getMonth() + 1).padStart(2, '0')}/${m.getFullYear()}`,
                revenue: mRevenue,
                repasse: mRevenue * (percentage / 100)
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                doctor_name: doctor.name,
                specialty: doctor.specialty,
                percentage,
                current_month: {
                    total_atendimentos: currentCompleted.length,
                    receita_gerada: currentRevenue,
                    repasse_calculado: currentRepasse,
                    faltas_recebidas: currentNoShow.length,
                    worked_days: workedDays
                },
                last_month: {
                    total_atendimentos: lastCompleted.length,
                    receita_gerada: lastRevenue,
                    repasse_calculado: lastRepasse
                },
                variation_percentage: Math.round(variation * 10) / 10,
                monthly_evolution: monthlyEvolution
            }
        });
    } catch (error: any) {
        console.error('[MySummary] Erro:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
