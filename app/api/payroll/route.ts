// app/api/payroll/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/payroll - Lista folhas de pagamento
 * Query params:
 *   - month: YYYY-MM (obrigatório)
 *   - doctor_id: UUID (opcional)
 *   - status: string (opcional)
 */
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

        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month'); // 2026-01
        const doctorId = searchParams.get('doctor_id');
        const status = searchParams.get('status');

        let query = supabase
            .from('medical_payroll')
            .select(`
        *,
        doctor:doctors(id, name, crm, specialty, user:users(email, avatar_url))
      `)
            .eq('clinic_id', profile.clinic_id)
            .order('reference_month', { ascending: false });

        if (month) {
            const referenceMonth = `${month}-01`;
            query = query.eq('reference_month', referenceMonth);
        }

        if (doctorId) {
            query = query.eq('doctor_id', doctorId);
        }

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Calcular resumo
        const summary = {
            total_payroll: data?.reduce((sum, p) => sum + (p.net_payroll || 0), 0) || 0,
            total_doctors: new Set(data?.map(p => p.doctor_id)).size,
            pending_count: data?.filter(p => p.status === 'PENDING_APPROVAL').length || 0,
            approved_count: data?.filter(p => p.status === 'APPROVED').length || 0,
            paid_count: data?.filter(p => p.status === 'PAID').length || 0,
        };

        return NextResponse.json({
            success: true,
            data,
            summary,
        });

    } catch (error: any) {
        console.error('[Payroll] Erro ao listar folhas:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/payroll - Calcular/recalcular repasses de um período
 * Body: { month: "2026-01", doctor_id?: UUID }
 */
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

        if (!profile?.clinic_id || !['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const body = await request.json();
        const { month, doctor_id } = body;

        if (!month) {
            return NextResponse.json({ success: false, error: 'Mês obrigatório' }, { status: 400 });
        }

        const startDate = `${month}-01`;
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0); // Último dia do mês

        // Buscar appointments concluídos do período que não têm payroll_item
        let query = supabase
            .from('appointments')
            .select('id')
            .eq('clinic_id', profile.clinic_id)
            .eq('status', 'COMPLETED')
            .gte('appointment_date', startDate)
            .lte('appointment_date', endDate.toISOString().split('T')[0]);

        if (doctor_id) {
            query = query.eq('doctor_id', doctor_id);
        }

        const { data: appointments } = await query;

        if (!appointments || appointments.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'Nenhum agendamento encontrado para o período',
                processed: 0,
            });
        }

        // Calcular repasse para cada appointment
        let processed = 0;
        let errors: string[] = [];

        for (const apt of appointments) {
            const { data: result } = await supabase.rpc('calculate_payroll_item', {
                p_appointment_id: apt.id,
            });

            if (result?.success) {
                processed++;
            } else {
                errors.push(`Appointment ${apt.id}: ${result?.error || 'Erro desconhecido'}`);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Repasses calculados para ${processed} de ${appointments.length} agendamentos`,
            processed,
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (error: any) {
        console.error('[Payroll] Erro ao calcular repasses:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
