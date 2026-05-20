import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

        // Apenas CLINIC_ADMIN, SUPER_ADMIN ou o próprio DOCTOR podem visualizar
        if (!['CLINIC_ADMIN', 'SUPER_ADMIN', 'DOCTOR'].includes(profile.role)) {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        let doctorId = searchParams.get('doctor_id');
        const year = searchParams.get('year') || new Date().getFullYear().toString();
        const statusParam = searchParams.get('status');

        // Se for DOCTOR, força o ID para ser o dele mesmo
        if (profile.role === 'DOCTOR') {
            const { data: doctorRecord } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .eq('clinic_id', profile.clinic_id)
                .single();

            if (!doctorRecord) {
                return NextResponse.json({ success: false, error: 'Perfil não encontrado' }, { status: 403 });
            }
            doctorId = doctorRecord.id;
        }

        let query = supabase
            .from('medical_payroll')
            .select(`
                id, reference_month, status, 
                gross_production, net_payroll, deductions, 
                created_at, updated_at,
                doctor:doctors(id, specialty, user:users(full_name))
            `)
            .eq('clinic_id', profile.clinic_id)
            .like('reference_month', `${year}-%`)
            .order('reference_month', { ascending: false });

        if (doctorId) {
            query = query.eq('doctor_id', doctorId);
        }

        if (statusParam) {
            query = query.eq('status', statusParam);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Processar sumarização
        let total_ano = 0;
        let maior_mes = 0;
        let menor_mes = Infinity;

        const processedData = data?.map(item => {
            const val = item.net_payroll || 0;
            total_ano += val;
            if (val > maior_mes) maior_mes = val;
            if (val < menor_mes) menor_mes = val;

            return {
                id: item.id,
                month: item.reference_month,
                doctor_name: (item.doctor as any)?.user?.full_name || (item.doctor as any)?.name || 'Sem nome',
                doctor_id: item.doctor?.id,
                gross_production: item.gross_production,
                net_payroll: item.net_payroll,
                deductions: item.deductions,
                status: item.status,
                created_at: item.created_at
            };
        });

        if (menor_mes === Infinity) menor_mes = 0;

        return NextResponse.json({
            success: true,
            data: processedData,
            summary: {
                total_ano,
                maior_mes,
                menor_mes
            }
        });

    } catch (error: any) {
        console.error('[PayrollHistory] Erro ao listar:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
