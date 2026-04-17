import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createReimbursementSchema = z.object({
  patient_id: z.string().uuid(),
  amount: z.number().min(0.01),
  reason: z.string().min(5),
  pix_key: z.string().min(3),
  pix_key_type: z.enum(['CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'CHAVE_ALEATORIA'])
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

        const { data: reimbursements, error } = await supabase
            .from('patient_reimbursements')
            .select(`
                id,
                amount,
                reason,
                status,
                pix_key,
                pix_key_type,
                created_at,
                patient:patients(id, full_name, cpf),
                creator:users!patient_reimbursements_created_by_fkey(full_name),
                approver:users!patient_reimbursements_approved_by_fkey(full_name)
            `)
            .eq('clinic_id', profile.clinic_id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[FINANCIAL REIMBURSEMENTS] Erro GET:', error);
            return NextResponse.json({ success: false, error: 'Erro ao buscar reembolsos' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: reimbursements });

    } catch (error: any) {
        console.error('[FINANCIAL REIMBURSEMENTS] GET catch:', error);
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
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

        // Both Receptionist and Admin can create requests
        const body = await request.json();
        const validated = createReimbursementSchema.parse(body);

        const { data: reimbursement, error: insertError } = await supabase
            .from('patient_reimbursements')
            .insert({
                clinic_id: profile.clinic_id,
                patient_id: validated.patient_id,
                amount: validated.amount,
                reason: validated.reason,
                pix_key: validated.pix_key,
                pix_key_type: validated.pix_key_type,
                status: 'PENDING',
                created_by: user.id
            })
            .select()
            .single();

        if (insertError) {
            console.error('[FINANCIAL REIMBURSEMENTS] Erro insert:', insertError);
            return NextResponse.json({ success: false, error: 'Erro ao criar solicitação de reembolso' }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Solicitação de reembolso criada com sucesso. Aguardando aprovação.',
            data: reimbursement 
        }, { status: 201 });

    } catch (error: any) {
        console.error('[FINANCIAL REIMBURSEMENTS] POST catch:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Dados inválidos', details: error.errors }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
    }
}
