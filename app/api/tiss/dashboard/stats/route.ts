// app/api/tiss/dashboard/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/tiss/dashboard/stats
 * Retorna estatísticas consolidadas para o dashboard TISS
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Verificar autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Não autenticado' },
                { status: 401 }
            );
        }

        // Obter clinic_id
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json(
                { success: false, error: 'Clínica não encontrada' },
                { status: 403 }
            );
        }

        const clinic_id = profile.clinic_id;
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Buscar lotes ativos
        const { data: batches } = await supabase
            .from('tiss_batches')
            .select('*')
            .eq('clinic_id', clinic_id);

        const activeBatches = batches?.filter(b =>
            ['DRAFT', 'VALID', 'SENT', 'PROCESSING'].includes(b.status)
        ).length || 0;

        const draftBatches = batches?.filter(b => b.status === 'DRAFT').length || 0;

        // Buscar dados do mês atual
        const { data: currentMonthBatches } = await supabase
            .from('tiss_batches')
            .select('total_value, approved_value, glosa_value, status')
            .eq('clinic_id', clinic_id)
            .eq('reference_month', currentMonth)
            .eq('reference_year', currentYear);

        const currentMonthBilled = currentMonthBatches?.reduce(
            (sum, b) => sum + (b.total_value || 0), 0
        ) || 0;

        const currentMonthGlosa = currentMonthBatches?.reduce(
            (sum, b) => sum + (b.glosa_value || 0), 0
        ) || 0;

        // Buscar guias para calcular aprovação
        const { data: allGuides } = await supabase
            .from('tiss_guides')
            .select('status')
            .eq('clinic_id', clinic_id);

        const approvedGuides = allGuides?.filter(g => g.status === 'APPROVED').length || 0;
        const totalGuides = allGuides?.length || 1; // Evitar divisão por zero
        const approvalRate = Math.round((approvedGuides / totalGuides) * 100);

        // Taxa de glosa
        const glosaRate = currentMonthBilled > 0
            ? ((currentMonthGlosa / currentMonthBilled) * 100).toFixed(1)
            : 0;

        // Mês anterior para comparação
        const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        const { data: lastMonthBatches } = await supabase
            .from('tiss_batches')
            .select('total_value')
            .eq('clinic_id', clinic_id)
            .eq('reference_month', lastMonth)
            .eq('reference_year', lastMonthYear);

        const lastMonthBilled = lastMonthBatches?.reduce(
            (sum, b) => sum + (b.total_value || 0), 0
        ) || 1;

        const growthPercentage = lastMonthBilled > 0
            ? ((currentMonthBilled - lastMonthBilled) / lastMonthBilled * 100).toFixed(1)
            : 0;

        // Lotes recentes
        const { data: recentBatches } = await supabase
            .from('tiss_batches')
            .select('id, batch_number, insurance_company_name, total_guides, total_value, status')
            .eq('clinic_id', clinic_id)
            .order('created_at', { ascending: false })
            .limit(5);

        // Alertas (exemplo)
        const alerts = [];

        // Verificar lotes com erros de validação
        const { data: invalidBatches } = await supabase
            .from('tiss_batches')
            .select('id, batch_number')
            .eq('clinic_id', clinic_id)
            .eq('status', 'INVALID');

        if (invalidBatches && invalidBatches.length > 0) {
            alerts.push({
                title: `${invalidBatches.length} lote(s) com erros de validação`,
                description: 'Corrija os erros antes de gerar o XML',
                action: 'Corrigir',
            });
        }

        // Verificar lotes aguardando retorno há mais de 30 dias
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: pendingBatches } = await supabase
            .from('tiss_batches')
            .select('id, batch_number')
            .eq('clinic_id', clinic_id)
            .eq('status', 'SENT')
            .lt('submitted_at', thirtyDaysAgo.toISOString());

        if (pendingBatches && pendingBatches.length > 0) {
            alerts.push({
                title: `${pendingBatches.length} lote(s) aguardando retorno há mais de 30 dias`,
                description: 'Entre em contato com a operadora',
                action: 'Ver Lotes',
            });
        }

        // Retornar estatísticas
        return NextResponse.json({
            success: true,
            data: {
                active_batches: activeBatches,
                draft_batches: draftBatches,
                current_month_billed: currentMonthBilled,
                current_month_glosa: currentMonthGlosa,
                approval_rate: approvalRate,
                approved_guides: approvedGuides,
                glosa_rate: parseFloat(glosaRate),
                growth_percentage: parseFloat(growthPercentage),
                recent_batches: recentBatches || [],
                alerts,
            },
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao buscar estatísticas:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
