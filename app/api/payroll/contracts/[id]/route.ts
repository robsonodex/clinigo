// app/api/payroll/contracts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateSchema = z.object({
    contract_type: z.enum(['PERCENTAGE_GROSS', 'PERCENTAGE_NET', 'FIXED_VALUE', 'HYBRID', 'FIXED_HOURS']).optional(),
    percentage_private: z.number().min(0).max(100).optional(),
    percentage_insurance: z.number().min(0).max(100).optional(),
    fixed_value_private: z.number().min(0).optional(),
    fixed_value_insurance: z.number().min(0).optional(),
    apply_tax_retention: z.boolean().optional(),
    inss_rate: z.number().min(0).max(100).optional(),
    irrf_rate: z.number().min(0).max(100).optional(),
    iss_rate: z.number().min(0).max(100).optional(),
    weekly_hours_limit: z.number().min(0).optional(),
    fixed_salary: z.number().min(0).optional(),
    extra_per_appointment: z.number().min(0).optional(),
    is_active: z.boolean().optional(),
});

// GET: Detalhes de um contrato
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
    try {
        const supabase = await createClient();
        const supabaseAdmin = createServiceRoleClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const { data: contract, error } = await supabaseAdmin
            .from('doctor_contracts')
            .select(`
                *,
                doctor:doctors(id, crm, specialty, user:users(full_name))
            `)
            .eq('id', params.id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (error || !contract) {
            return NextResponse.json({ success: false, error: 'Contrato não encontrado' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: contract });

    } catch (error: any) {
        console.error('[Payroll] Erro ao buscar contrato:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PATCH: Atualizar contrato
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
    try {
        const supabase = await createClient();
        const supabaseAdmin = createServiceRoleClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id || !['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        // Verificar se contrato existe e pertence à clínica
        const { data: existing } = await supabaseAdmin
            .from('doctor_contracts')
            .select('id')
            .eq('id', params.id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Contrato não encontrado' }, { status: 404 });
        }

        const body = await request.json();
        const validated = updateSchema.parse(body);

        const { data, error } = await supabaseAdmin
            .from('doctor_contracts')
            .update({ ...validated, updated_at: new Date().toISOString() })
            .eq('id', params.id)
            .select(`
                *,
                doctor:doctors(id, crm, specialty, user:users(full_name))
            `)
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('[Payroll] Erro ao atualizar contrato:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Dados inválidos', details: error.errors }, { status: 400 });
        }

        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE: Excluir contrato definitivamente
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
    try {
        const supabase = await createClient();
        const supabaseAdmin = createServiceRoleClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id || !['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
        }

        // Verificar se contrato existe e pertence à clínica
        const { data: existing } = await supabaseAdmin
            .from('doctor_contracts')
            .select('id')
            .eq('id', params.id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Contrato não encontrado' }, { status: 404 });
        }

        const { error } = await supabaseAdmin
            .from('doctor_contracts')
            .delete()
            .eq('id', params.id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Contrato excluído com sucesso' });

    } catch (error: any) {
        console.error('[Payroll] Erro ao excluir contrato:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
