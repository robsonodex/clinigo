// app/api/payroll/contracts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const contractSchema = z.object({
    doctor_id: z.string().uuid(),
    contract_type: z.enum(['PERCENTAGE_GROSS', 'PERCENTAGE_NET', 'FIXED_VALUE', 'HYBRID']),
    percentage_private: z.number().min(0).max(100).default(70),
    percentage_insurance: z.number().min(0).max(100).default(60),
    insurance_specific_rates: z.record(z.number()).optional(),
    fixed_value_private: z.number().min(0).optional(),
    fixed_value_insurance: z.number().min(0).optional(),
    minimum_value: z.number().min(0).optional(),
    deduct_materials: z.boolean().default(false),
    apply_tax_retention: z.boolean().default(true),
    inss_rate: z.number().min(0).max(100).default(11),
    irrf_rate: z.number().min(0).max(100).default(0),
    iss_rate: z.number().min(0).max(100).default(5),
    valid_from: z.string().optional(),
});

// GET: Lista contratos da clínica
export async function GET(request: NextRequest) {
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

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const doctorId = searchParams.get('doctor_id');
        const activeOnly = searchParams.get('active_only') === 'true';

        let query = supabase
            .from('doctor_contracts')
            .select(`
        *,
        doctor:doctors(id, name, crm, specialty)
      `)
            .eq('clinic_id', profile.clinic_id)
            .order('created_at', { ascending: false });

        if (doctorId) {
            query = query.eq('doctor_id', doctorId);
        }

        if (activeOnly) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('[Payroll] Erro ao listar contratos:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Criar novo contrato
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
        const validated = contractSchema.parse(body);

        // Desativar contratos anteriores do médico
        await supabase
            .from('doctor_contracts')
            .update({ is_active: false })
            .eq('clinic_id', profile.clinic_id)
            .eq('doctor_id', validated.doctor_id)
            .eq('is_active', true);

        // Criar novo contrato
        const { data, error } = await supabase
            .from('doctor_contracts')
            .insert({
                clinic_id: profile.clinic_id,
                ...validated,
                created_by: user.id,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('[Payroll] Erro ao criar contrato:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Dados inválidos', details: error.errors }, { status: 400 });
        }

        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
