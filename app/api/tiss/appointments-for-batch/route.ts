// app/api/tiss/appointments-for-batch/route.ts
// CliniGo - API para buscar appointments elegíveis para lote TISS

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const insuranceId = searchParams.get('insurance_id');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        const supabase = await createClient();

        // Verificar autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Buscar clinic_id do usuário
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!userData?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 });
        }

        // Montar query base
        let query = supabase
            .from('appointments')
            .select(`
                id,
                appointment_date,
                appointment_time,
                status,
                patient:patients(id, full_name, cpf),
                doctor:doctors(id, user:users(full_name)),
                health_insurance_id,
                health_insurance:health_insurances(id, name),
                procedure_id,
                tiss_guides(id)
            `)
            .eq('clinic_id', userData.clinic_id)
            .eq('status', 'COMPLETED')
            .not('health_insurance_id', 'is', null)
            .order('appointment_date', { ascending: false });

        // Filtros opcionais
        if (insuranceId) {
            query = query.eq('health_insurance_id', insuranceId);
        }
        if (startDate) {
            query = query.gte('appointment_date', startDate);
        }
        if (endDate) {
            query = query.lte('appointment_date', endDate);
        }

        const { data: appointments, error } = await query;

        if (error) {
            console.error('Error fetching appointments for TISS:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Filtrar apenas os que NÃO têm guia TISS
        const withoutGuide = appointments?.filter(
            apt => !apt.tiss_guides || apt.tiss_guides.length === 0
        ) || [];

        return NextResponse.json({
            appointments: withoutGuide,
            total: withoutGuide.length
        });

    } catch (error: any) {
        console.error('Error in appointments-for-batch:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
