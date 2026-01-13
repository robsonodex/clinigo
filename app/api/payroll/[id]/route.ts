// app/api/payroll/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const approveSchema = z.object({
    action: z.enum(['approve', 'reject', 'pay']),
    notes: z.string().optional(),
    payment_method: z.string().optional(),
    payment_reference: z.string().optional(),
    payment_date: z.string().optional(),
});

// GET: Detalhes de uma folha com itens
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        // Buscar folha
        const { data: payroll, error: payrollError } = await supabase
            .from('medical_payroll')
            .select(`
        *,
        doctor:doctors(id, name, crm, specialty, user:users(email, avatar_url)),
        approved_by_user:users!approved_by(name, email),
        paid_by_user:users!paid_by(name, email)
      `)
            .eq('id', params.id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (payrollError || !payroll) {
            return NextResponse.json({ success: false, error: 'Folha não encontrada' }, { status: 404 });
        }

        // Buscar itens
        const { data: items } = await supabase
            .from('payroll_items')
            .select('*')
            .eq('payroll_id', params.id)
            .order('appointment_date', { ascending: false });

        return NextResponse.json({
            success: true,
            data: {
                ...payroll,
                items: items || [],
            },
        });

    } catch (error: any) {
        console.error('[Payroll] Erro ao buscar folha:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PUT: Aprovar, rejeitar ou marcar como pago
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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
        const validated = approveSchema.parse(body);

        // Verificar se folha existe e pertence à clínica
        const { data: payroll } = await supabase
            .from('medical_payroll')
            .select('id, status')
            .eq('id', params.id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!payroll) {
            return NextResponse.json({ success: false, error: 'Folha não encontrada' }, { status: 404 });
        }

        let updateData: Record<string, any> = {};

        switch (validated.action) {
            case 'approve':
                if (payroll.status !== 'PENDING_APPROVAL' && payroll.status !== 'OPEN') {
                    return NextResponse.json({
                        success: false,
                        error: `Não é possível aprovar folha com status ${payroll.status}`
                    }, { status: 400 });
                }
                updateData = {
                    status: 'APPROVED',
                    approved_by: user.id,
                    approved_at: new Date().toISOString(),
                    approval_notes: validated.notes,
                };
                break;

            case 'reject':
                updateData = {
                    status: 'OPEN',
                    approval_notes: validated.notes,
                };
                break;

            case 'pay':
                if (payroll.status !== 'APPROVED') {
                    return NextResponse.json({
                        success: false,
                        error: 'Só é possível pagar folhas aprovadas'
                    }, { status: 400 });
                }
                updateData = {
                    status: 'PAID',
                    paid_by: user.id,
                    paid_at: new Date().toISOString(),
                    payment_method: validated.payment_method,
                    payment_reference: validated.payment_reference,
                    payment_date: validated.payment_date || new Date().toISOString().split('T')[0],
                };
                break;
        }

        const { error } = await supabase
            .from('medical_payroll')
            .update(updateData)
            .eq('id', params.id);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: `Folha ${validated.action === 'approve' ? 'aprovada' : validated.action === 'pay' ? 'marcada como paga' : 'reaberta'}`,
        });

    } catch (error: any) {
        console.error('[Payroll] Erro ao atualizar folha:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Dados inválidos' }, { status: 400 });
        }

        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
