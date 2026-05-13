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

        const { data: doctor } = await supabase
            .from('doctors')
            .select('id, name')
            .eq('user_id', user.id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!doctor) return NextResponse.json({ success: false, error: 'Perfil não encontrado' }, { status: 403 });

        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

        // Contrato
        const { data: contract } = await supabase
            .from('doctor_contracts')
            .select('percentage')
            .eq('doctor_id', doctor.id)
            .eq('is_active', true)
            .single();

        const percentage = contract?.percentage || 0;

        // Buscar todos os appointments do ano
        const yearStart = `${year}-01-01`;
        const yearEnd = `${year}-12-31`;

        const { data: appointments } = await supabase
            .from('appointments')
            .select('status, price, appointment_date, patients(name), health_insurance_id')
            .eq('clinic_id', profile.clinic_id)
            .eq('doctor_id', doctor.id)
            .eq('status', 'COMPLETED')
            .gte('appointment_date', yearStart)
            .lte('appointment_date', yearEnd)
            .order('appointment_date', { ascending: true });

        // Agrupar por mês
        const monthlyMap: Record<string, any[]> = {};
        (appointments || []).forEach(apt => {
            const month = apt.appointment_date?.substring(0, 7); // YYYY-MM
            if (!monthlyMap[month]) monthlyMap[month] = [];
            monthlyMap[month].push(apt);
        });

        const history = Object.entries(monthlyMap).map(([month, apts]) => {
            const totalBruto = apts.reduce((s, a) => s + (a.price || 0), 0);
            const totalRepasse = totalBruto * (percentage / 100);
            return {
                month,
                month_label: `${month.split('-')[1]}/${month.split('-')[0]}`,
                total_atendimentos: apts.length,
                total_bruto: totalBruto,
                total_repasse: totalRepasse,
                status: 'pendente', // TODO: integrar com status real de pagamento
                appointments: apts.map(a => ({
                    date: a.appointment_date,
                    patient: (a as any).patients?.name || 'Paciente',
                    value: a.price || 0,
                    insurance: a.health_insurance_id ? 'Convênio' : 'Particular'
                }))
            };
        }).sort((a, b) => b.month.localeCompare(a.month));

        const totalYear = history.reduce((s, h) => s + h.total_repasse, 0);
        const bestMonth = history.length > 0 ? history.reduce((best, h) => h.total_repasse > best.total_repasse ? h : best) : null;

        return NextResponse.json({
            success: true,
            data: history,
            summary: {
                year,
                total_year: totalYear,
                percentage,
                best_month: bestMonth?.month_label || '-',
                best_month_value: bestMonth?.total_repasse || 0,
                months_count: history.length
            }
        });
    } catch (error: any) {
        console.error('[MyHistory] Erro:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
