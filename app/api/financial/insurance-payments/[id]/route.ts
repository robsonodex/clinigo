import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updatePaymentSchema = z.object({
    status: z.enum(['PENDING', 'CONCILIATED', 'CANCELLED']).optional(),
    gross_amount: z.number().min(0).optional(),
    discounts_irrf: z.number().min(0).optional(),
    discounts_iss: z.number().min(0).optional(),
    discounts_other: z.number().min(0).optional(),
    accepted_glosas: z.number().min(0).optional(),
    notes: z.string().optional().nullable(),
});

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
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

        if (profile.role === 'RECEPTIONIST') {
            return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
        }

        const { data: payment, error } = await supabase
            .from('insurance_payments')
            .select(`
                *,
                health_insurance:health_insurances(id, name, code)
            `)
            .eq('id', id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (error || !payment) {
            return NextResponse.json({ success: false, error: 'Pagamento não encontrado' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: payment });

    } catch (error: any) {
        console.error('[FINANCIAL] Erro ao buscar pagamento:', error);
        return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
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

        if (!profile?.clinic_id || (profile.role !== 'CLINIC_ADMIN' && profile.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        const body = await request.json();
        const validated = updatePaymentSchema.parse(body);

        // Fetch current to calculate new net_amount if amounts changed
        const { data: current } = await supabase
            .from('insurance_payments')
            .select('*')
            .eq('id', id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!current) {
            return NextResponse.json({ success: false, error: 'Pagamento não encontrado' }, { status: 404 });
        }

        const gross = validated.gross_amount ?? current.gross_amount;
        const irrf = validated.discounts_irrf ?? current.discounts_irrf;
        const iss = validated.discounts_iss ?? current.discounts_iss;
        const other = validated.discounts_other ?? current.discounts_other;
        const glosas = validated.accepted_glosas ?? current.accepted_glosas;

        const net_amount = gross - irrf - iss - other - glosas;

        const updates: any = {
            ...validated,
            net_amount,
            updated_at: new Date().toISOString()
        };

        const { data: updated, error } = await supabase
            .from('insurance_payments')
            .update(updates)
            .eq('id', id)
            .eq('clinic_id', profile.clinic_id)
            .select()
            .single();

        if (error) {
            console.error('[FINANCIAL] Erro ao atualizar:', error);
            return NextResponse.json({ success: false, error: 'Erro ao atualizar pagamento' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: updated });

    } catch (error: any) {
        console.error('[FINANCIAL] Erro no PUT:', error);
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
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

        if (!profile?.clinic_id || (profile.role !== 'CLINIC_ADMIN' && profile.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
        }

        const { error } = await supabase
            .from('insurance_payments')
            .delete()
            .eq('id', id)
            .eq('clinic_id', profile.clinic_id);

        if (error) {
            console.error('[FINANCIAL] Erro ao deletar:', error);
            return NextResponse.json({ success: false, error: 'Erro ao deletar' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Excluído com sucesso' });

    } catch (error: any) {
        console.error('[FINANCIAL] Erro no DELETE:', error);
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
    }
}
