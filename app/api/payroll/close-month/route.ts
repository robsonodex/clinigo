// app/api/payroll/close-month/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/payroll/close-month
 * Fecha todas as folhas de um mês (muda status para PENDING_APPROVAL)
 * Body: { month: "2026-01" }
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
        const { month } = body;

        if (!month) {
            return NextResponse.json({ success: false, error: 'Mês obrigatório' }, { status: 400 });
        }

        const referenceMonth = `${month}-01`;

        // Chamar função que fecha as folhas
        const { data, error } = await supabase.rpc('close_monthly_payroll', {
            p_clinic_id: profile.clinic_id,
            p_reference_month: referenceMonth,
        });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: `${data || 0} folha(s) fechada(s) para aprovação`,
            closed_count: data || 0,
        });

    } catch (error: any) {
        console.error('[Payroll] Erro ao fechar mês:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
