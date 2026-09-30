import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const lookupQuerySchema = z.object({
    health_insurance_id: z.string().uuid('ID da operadora inválido'),
    tuss_code: z.string().min(8, 'Código TUSS inválido').max(10),
    plan_id: z.string().uuid('ID do plano inválido').optional().nullable(),
});

/**
 * GET /api/tiss/pricing/lookup?health_insurance_id=...&tuss_code=...&plan_id=...
 * Consulta pontual de preço e regras de autorização de UM procedimento para preenchimento de guia.
 * Ação: 'config.tabelas_preco.consultar_item' (Acessível por RECEPTIONIST, FINANCIAL, ADMIN e READONLY).
 * Não expõe a tabela completa de preços nem valores de outros procedimentos.
 */
export async function GET(request: NextRequest) {
    const guard = await requireTissAction(request, 'config.tabelas_preco.consultar_item');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
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
        const parsedQuery = lookupQuerySchema.safeParse({
            health_insurance_id: searchParams.get('health_insurance_id'),
            tuss_code: searchParams.get('tuss_code'),
            plan_id: searchParams.get('plan_id') || null,
        });

        if (!parsedQuery.success) {
            return NextResponse.json(
                { success: false, error: parsedQuery.error.errors[0]?.message || 'Parâmetros inválidos' },
                { status: 400 }
            );
        }

        const { health_insurance_id, tuss_code, plan_id } = parsedQuery.data;

        let query = supabase
            .from('health_insurance_price_tables')
            .select('tuss_code, procedure_name, price, copay_amount, requires_authorization, max_sessions_per_year, health_insurance_plan_id')
            .eq('clinic_id', profile.clinic_id)
            .eq('health_insurance_id', health_insurance_id)
            .eq('tuss_code', tuss_code)
            .eq('is_active', true);

        if (plan_id) {
            query = query.or(`health_insurance_plan_id.eq.${plan_id},health_insurance_plan_id.is.null`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[PRICING LOOKUP] Erro ao consultar preço de procedimento:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Procedimento não encontrado na tabela de preços da operadora' },
                { status: 404 }
            );
        }

        // Se houver registro específico do plano, priorizá-lo em relação à regra geral da operadora
        const item = (plan_id && data.find(r => r.health_insurance_plan_id === plan_id)) || data[0];

        return NextResponse.json({
            success: true,
            data: {
                tuss_code: item.tuss_code,
                procedure_name: item.procedure_name,
                price: Number(item.price),
                copay_amount: Number(item.copay_amount || 0),
                requires_authorization: Boolean(item.requires_authorization),
                max_sessions_per_year: item.max_sessions_per_year || null,
            },
        });
    } catch (err: any) {
        console.error('[PRICING LOOKUP] Exceção:', err);
        return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
    }
}
