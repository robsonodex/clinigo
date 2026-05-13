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
            .select('id, name, specialty')
            .eq('user_id', user.id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!doctor) return NextResponse.json({ success: false, error: 'Perfil não encontrado' }, { status: 403 });

        const { searchParams } = new URL(request.url);
        const periodStart = searchParams.get('period_start');
        const periodEnd = searchParams.get('period_end');

        if (!periodStart || !periodEnd) {
            return NextResponse.json({ success: false, error: 'Período obrigatório' }, { status: 400 });
        }

        // Buscar appointments do profissional
        const { data: appointments } = await supabase
            .from('appointments')
            .select('status, price, health_insurance_id, appointment_date')
            .eq('clinic_id', profile.clinic_id)
            .eq('doctor_id', doctor.id)
            .gte('appointment_date', periodStart)
            .lte('appointment_date', periodEnd);

        const completed = (appointments || []).filter(a => a.status === 'COMPLETED');
        const noShow = (appointments || []).filter(a => a.status === 'NO_SHOW');

        const receitaTotal = completed.reduce((s, a) => s + (a.price || 0), 0);
        const receitaParticular = completed.filter(a => !a.health_insurance_id).reduce((s, a) => s + (a.price || 0), 0);
        const receitaConvenio = completed.filter(a => !!a.health_insurance_id).reduce((s, a) => s + (a.price || 0), 0);

        const taxaNoShow = (completed.length + noShow.length) > 0
            ? (noShow.length / (completed.length + noShow.length)) * 100
            : 0;

        const ticketMedio = completed.length > 0 ? receitaTotal / completed.length : 0;

        // Contrato
        const { data: contract } = await supabase
            .from('doctor_contracts')
            .select('percentage')
            .eq('doctor_id', doctor.id)
            .eq('is_active', true)
            .single();

        const percentage = contract?.percentage || 0;

        // Média da clínica (sem identificar nomes)
        const { data: allClinicApts } = await supabase
            .from('appointments')
            .select('price')
            .eq('clinic_id', profile.clinic_id)
            .eq('status', 'COMPLETED')
            .gte('appointment_date', periodStart)
            .lte('appointment_date', periodEnd);

        const clinicAvgTicket = (allClinicApts && allClinicApts.length > 0)
            ? allClinicApts.reduce((s, a) => s + (a.price || 0), 0) / allClinicApts.length
            : 0;

        // Evolução mensal (últimos 12 meses)
        const evolution = [];
        const today = new Date();
        for (let i = 11; i >= 0; i--) {
            const m = new Date(today.getFullYear(), today.getMonth() - i, 1);
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

            evolution.push({
                month: `${String(m.getMonth() + 1).padStart(2, '0')}/${m.getFullYear()}`,
                atendimentos: (mApts || []).length,
                receita: (mApts || []).reduce((s, a) => s + (a.price || 0), 0)
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                doctor_name: doctor.name,
                specialty: doctor.specialty,
                total_atendimentos: completed.length,
                total_faltas: noShow.length,
                taxa_noshow: Math.round(taxaNoShow * 10) / 10,
                receita_total: receitaTotal,
                receita_particular: receitaParticular,
                receita_convenio: receitaConvenio,
                ticket_medio: ticketMedio,
                repasse_calculado: receitaTotal * (percentage / 100),
                percentage,
                clinic_avg_ticket: clinicAvgTicket,
                evolution
            }
        });
    } catch (error: any) {
        console.error('[MyProducao] Erro:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
