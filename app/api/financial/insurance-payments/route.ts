import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createPaymentSchema = z.object({
    health_insurance_id: z.string().uuid('ID da operadora inválido'),
    tiss_batch_id: z.string().uuid().optional().nullable(),
    competence_month: z.number().min(1).max(12),
    competence_year: z.number().min(2020).max(2050),
    credit_date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data inválida' }),
    gross_amount: z.number().min(0),
    discounts_irrf: z.number().min(0).default(0),
    discounts_iss: z.number().min(0).default(0),
    discounts_other: z.number().min(0).default(0),
    accepted_glosas: z.number().min(0).default(0),
    notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
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

        // RBAC: Receptionist cannot view financial data
        if (profile.role === 'RECEPTIONIST') {
            return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
        }

        const clinic_id = profile.clinic_id;

        const { searchParams } = new URL(request.url);
        const health_insurance_id = searchParams.get('health_insurance_id');
        const status = searchParams.get('status');

        let query = supabase
            .from('insurance_payments')
            .select(`
                *,
                health_insurance:health_insurances(id, name, code)
            `)
            .eq('clinic_id', clinic_id)
            .order('created_at', { ascending: false });

        if (health_insurance_id) {
            query = query.eq('health_insurance_id', health_insurance_id);
        }
        if (status) {
            query = query.eq('status', status);
        }

        const { data: payments, error } = await query;

        if (error) {
            console.error('[FINANCIAL] Erro ao listar pagamentos:', error);
            return NextResponse.json({ success: false, error: 'Erro ao buscar pagamentos' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: payments,
            count: payments.length,
        });

    } catch (error: any) {
        console.error('[FINANCIAL] Erro na listagem de pagamentos:', error);
        return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
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

        if (profile.role !== 'CLINIC_ADMIN' && profile.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ success: false, error: 'Sem permissão para registrar recebimentos' }, { status: 403 });
        }

        const clinic_id = profile.clinic_id;

        const body = await request.json();
        const validated = createPaymentSchema.parse(body);

        // Calcular net_amount
        const net_amount = validated.gross_amount - 
                           validated.discounts_irrf - 
                           validated.discounts_iss - 
                           validated.discounts_other - 
                           validated.accepted_glosas;

        const { data: payment, error: createError } = await supabase
            .from('insurance_payments')
            .insert({
                clinic_id,
                health_insurance_id: validated.health_insurance_id,
                tiss_batch_id: validated.tiss_batch_id || null,
                competence_month: validated.competence_month,
                competence_year: validated.competence_year,
                credit_date: validated.credit_date,
                gross_amount: validated.gross_amount,
                discounts_irrf: validated.discounts_irrf,
                discounts_iss: validated.discounts_iss,
                discounts_other: validated.discounts_other,
                accepted_glosas: validated.accepted_glosas,
                net_amount,
                notes: validated.notes,
                status: 'PENDING',
                created_by: user.id,
            })
            .select()
            .single();

        if (createError) {
            console.error('[FINANCIAL] Erro ao registrar pagamento:', createError);
            return NextResponse.json({ success: false, error: 'Erro ao registrar pagamento' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: payment,
            message: 'Recebimento registrado com sucesso',
        }, { status: 201 });

    } catch (error: any) {
        console.error('[FINANCIAL] Erro ao registrar pagamento:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Dados inválidos', details: error.errors }, { status: 400 });
        }

        return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
    }
}
