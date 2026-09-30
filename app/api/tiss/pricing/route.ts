import { requireTissAction, enforceTissAdministrativeGuard } from '@/lib/auth/tiss-role-guard';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const priceTableSchema = z.object({
    health_insurance_id: z.string().uuid('ID da operadora inválido'),
    health_insurance_plan_id: z.string().uuid().optional().nullable().or(z.literal('')).transform(v => v || null),
    tuss_code: z.string().min(8, 'Código TUSS obrigatório').max(10),
    procedure_name: z.string().min(2, 'Nome do procedimento obrigatório'),
    price: z.number().min(0, 'Valor deve ser maior ou igual a zero'),
    copay_amount: z.number().min(0).optional().default(0),
    valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de início inválida (AAAA-MM-DD)').optional(),
    valid_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de término inválida (AAAA-MM-DD)').optional().nullable().or(z.literal('')).transform(v => v || null),
    requires_authorization: z.boolean().optional().default(false),
    max_sessions_per_year: z.number().int().positive().optional().nullable(),
});

/**
 * GET /api/tiss/pricing?health_insurance_id=...&plan_id=...
 * Lista regras de preços contratadas por operadora e plano.
 */
export async function GET(request: NextRequest) {
    const guard = await requireTissAction(request, 'config.tabelas_preco.ver');
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
        const insuranceId = searchParams.get('health_insurance_id');
        const planId = searchParams.get('plan_id');

        if (!insuranceId) {
            return NextResponse.json({ success: false, error: 'health_insurance_id é obrigatório' }, { status: 400 });
        }

        let query = supabase
            .from('health_insurance_price_tables')
            .select(`
                *,
                insurance:health_insurances(id, name, code),
                plan:health_insurance_plans(id, name)
            `)
            .eq('clinic_id', profile.clinic_id)
            .eq('health_insurance_id', insuranceId)
            .eq('is_active', true);

        if (planId) {
            query = query.or(`health_insurance_plan_id.eq.${planId},health_insurance_plan_id.is.null`);
        }

        const { data, error } = await query.order('procedure_name', { ascending: true });

        if (error) {
            console.error('[PRICING] Erro ao buscar tabela de preços:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: data || [] });

    } catch (err: any) {
        console.error('[PRICING] Exceção:', err);
        return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
    }
}

/**
 * POST /api/tiss/pricing
 * Cadastra ou atualiza preço de procedimento TUSS para operadora/plano.
 */
export async function POST(request: NextRequest) {
    const guard = await requireTissAction(request, 'config.tabelas_preco.editar');
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

        // Permissão validada via requireTissAction('config.tabelas_preco.editar') - FINANCIAL bloqueado para escrita

        const body = await request.json();
        const validated = priceTableSchema.parse(body);

        // Se o plano foi fornecido, validar se existe e pertence à clínica/operadora (anti 23503)
        if (validated.health_insurance_plan_id) {
            const { data: planExists } = await supabase
                .from('health_insurance_plans')
                .select('id')
                .eq('id', validated.health_insurance_plan_id)
                .eq('health_insurance_id', validated.health_insurance_id)
                .maybeSingle();

            if (!planExists) {
                return NextResponse.json({ success: false, error: 'Plano de saúde não encontrado para esta operadora' }, { status: 400 });
            }
        }

        const insertPayload: Record<string, any> = {
            clinic_id: profile.clinic_id,
            health_insurance_id: validated.health_insurance_id,
            health_insurance_plan_id: validated.health_insurance_plan_id,
            tuss_code: validated.tuss_code,
            procedure_name: validated.procedure_name,
            price: validated.price,
            copay_amount: validated.copay_amount || 0,
            valid_from: validated.valid_from || new Date().toISOString().split('T')[0],
            valid_to: validated.valid_to,
            requires_authorization: validated.requires_authorization,
            max_sessions_per_year: validated.max_sessions_per_year || null,
            is_active: true,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('health_insurance_price_tables')
            .upsert(insertPayload, {
                onConflict: 'clinic_id,health_insurance_id,health_insurance_plan_id,tuss_code'
            })
            .select()
            .single();

        if (error) {
            console.error('[PRICING] Erro no upsert de preço:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Regra de precificação salva com sucesso',
            data,
        });

    } catch (err: any) {
        console.error('[PRICING] Erro ao salvar precificação:', err);
        if (err instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: err.errors[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
    }
}

/**
 * DELETE /api/tiss/pricing?id=...
 * Inativa/exclui regra de precificação.
 */
export async function DELETE(request: NextRequest) {
    const guard = await requireTissAction(request, 'config.tabelas_preco.editar');
    if (!guard.authorized) {
        return guard.response;
    }
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

        // Permissão validada via requireTissAction('config.tabelas_preco.editar')

        const { searchParams } = new URL(request.url);
        const priceRuleId = searchParams.get('id');

        if (!priceRuleId) {
            return NextResponse.json({ success: false, error: 'ID da regra obrigatório' }, { status: 400 });
        }

        const { error } = await supabase
            .from('health_insurance_price_tables')
            .update({ is_active: false })
            .eq('id', priceRuleId)
            .eq('clinic_id', profile.clinic_id);

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Regra de precificação desativada com sucesso' });

    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
    }
}
