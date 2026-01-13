// app/api/tiss/reports/loss-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/tiss/reports/loss-analysis
 * Relatório de Perda Financeira TISS
 * Query params:
 *   - start_date: YYYY-MM-DD (obrigatório)
 *   - end_date: YYYY-MM-DD (obrigatório)
 *   - insurance_company: string (opcional)
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
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const insuranceCompany = searchParams.get('insurance_company');

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, error: 'start_date e end_date obrigatórios' }, { status: 400 });
        }

        // Buscar todas as guias do período
        let query = supabase
            .from('tiss_guides')
            .select(`
        id,
        guide_number,
        procedure_code,
        procedure_name,
        requested_value,
        approved_value,
        status,
        denial_reason,
        batch:tiss_batches!inner(insurance_company)
      `)
            .gte('execution_date', startDate)
            .lte('execution_date', endDate);

        if (insuranceCompany) {
            query = query.eq('batch.insurance_company', insuranceCompany);
        }

        const { data: guides, error: guidesError } = await query;

        if (guidesError) throw guidesError;

        // Calcular totalizadores
        const billedValue = guides?.reduce((sum, g) => sum + (g.requested_value || 0), 0) || 0;
        const approvedValue = guides?.reduce((sum, g) => sum + (g.approved_value || 0), 0) || 0;
        const glosaValue = billedValue - approvedValue;
        const glosaRate = billedValue > 0 ? (glosaValue / billedValue) * 100 : 0;

        // Agrupar por operadora
        const byInsurance: Record<string, any> = {};
        guides?.forEach(g => {
            const ins = g.batch?.insurance_company || 'Não informado';
            if (!byInsurance[ins]) {
                byInsurance[ins] = {
                    name: ins,
                    billed: 0,
                    approved: 0,
                    glosa: 0,
                    count: 0,
                };
            }
            byInsurance[ins].billed += g.requested_value || 0;
            byInsurance[ins].approved += g.approved_value || 0;
            byInsurance[ins].glosa += (g.requested_value || 0) - (g.approved_value || 0);
            byInsurance[ins].count++;
        });

        Object.values(byInsurance).forEach((ins: any) => {
            ins.glosa_rate = ins.billed > 0 ? (ins.glosa / ins.billed) * 100 : 0;
        });

        // Top glosas (procedimentos mais glosados)
        const procedureCounts: Record<string, { count: number; total: number; name: string }> = {};
        guides?.
            filter(g => g.status === 'DENIED' || (g.approved_value || 0) < (g.requested_value || 0))
            .forEach(g => {
                const proc = g.procedure_code || 'N/A';
                if (!procedureCounts[proc]) {
                    procedureCounts[proc] = {
                        count: 0,
                        total: 0,
                        name: g.procedure_name || proc,
                    };
                }
                procedureCounts[proc].count++;
                procedureCounts[proc].total += (g.requested_value || 0) - (g.approved_value || 0);
            });

        const topGlosas = Object.entries(procedureCounts)
            .map(([code, data]) => ({ procedure: data.name, code, ...data }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        return NextResponse.json({
            success: true,
            data: {
                period: { start: startDate, end: endDate },
                summary: {
                    billed_value: billedValue,
                    received_value: approvedValue,
                    glosa_value: glosaValue,
                    glosa_rate: glosaRate,
                    total_guides: guides?.length || 0,
                },
                by_insurance: Object.values(byInsurance).sort((a: any, b: any) => b.glosa_rate - a.glosa_rate),
                top_glosas: topGlosas,
            },
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao gerar relatório de perda:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
