// app/api/financial/backfill/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { backfillPayrollFromAppointments } from '@/lib/services/financial-backfill';

/**
 * POST /api/financial/backfill
 * Executa backfill retroativo de repasses médicos
 * Body: { start_month: "2025-11", end_month: "2026-05" }
 * Apenas CLINIC_ADMIN e SUPER_ADMIN
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
            return NextResponse.json({ success: false, error: 'Sem permissão — apenas administradores' }, { status: 403 });
        }

        const body = await request.json();
        const { start_month, end_month } = body;

        if (!start_month || !end_month) {
            return NextResponse.json({ 
                success: false, 
                error: 'start_month e end_month obrigatórios (formato YYYY-MM)' 
            }, { status: 400 });
        }

        // Validar formato
        const monthRegex = /^\d{4}-\d{2}$/;
        if (!monthRegex.test(start_month) || !monthRegex.test(end_month)) {
            return NextResponse.json({ 
                success: false, 
                error: 'Formato inválido. Use YYYY-MM' 
            }, { status: 400 });
        }

        // Executar backfill
        const result = await backfillPayrollFromAppointments(
            profile.clinic_id,
            start_month,
            end_month
        );

        return NextResponse.json({
            success: result.success,
            data: result,
            message: `Backfill concluído: ${result.summary.totalProcessed} repasses processados, ${result.summary.totalErrors} erros`,
        });

    } catch (error: any) {
        console.error('[Financial Backfill] Erro:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
