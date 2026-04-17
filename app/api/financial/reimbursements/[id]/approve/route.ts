import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
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
            return NextResponse.json({ success: false, error: 'Sem permissão para aprovar reembolsos' }, { status: 403 });
        }

        const { data: reimbursement } = await supabase
            .from('patient_reimbursements')
            .select('*')
            .eq('id', id)
            .eq('clinic_id', profile.clinic_id)
            .single();
            
        if (!reimbursement) {
            return NextResponse.json({ success: false, error: 'Reembolso não encontrado' }, { status: 404 });
        }

        if (reimbursement.status !== 'PENDING') {
            return NextResponse.json({ success: false, error: 'Reembolso já foi processado ou está em andamento.' }, { status: 400 });
        }

        // --- INTEGRAÇÃO MOCK BANCO INTER PIX ---
        // Aqui simularíamos a chamada para a API do Banco Inter para fazer a transferência via PIX
        // Ex: InterAPI.pixTransfer({ valor, chavePix: pix_key, document: ... })
        console.log(`[PIX MOCK] Iniciando transferência de R$${reimbursement.amount} para ${reimbursement.pix_key_type} ${reimbursement.pix_key}`);
        
        const isPixSuccess = true; // Simulando sucesso do Pix

        if (!isPixSuccess) {
             await supabase
                .from('patient_reimbursements')
                .update({ status: 'FAILED', updated_at: new Date().toISOString() })
                .eq('id', id);
             return NextResponse.json({ success: false, error: 'Falha ao processar PIX no Banco Inter' }, { status: 500 });
        }
        // ----------------------------------------

        const { error: updateError } = await supabase
            .from('patient_reimbursements')
            .update({
                status: 'COMPLETED',
                approved_by: user.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) {
             console.error('[FINANCIAL REIMBURSEMENTS] Erro update:', updateError);
             return NextResponse.json({ success: false, error: 'Erro ao aprovar reembolso no banco (PIX foi enviado)' }, { status: 500 });
        }

        // Criar um financial_entry atestando a saída financeira
        await supabase.from('financial_entries').insert({
            clinic_id: profile.clinic_id,
            patient_id: reimbursement.patient_id,
            entry_type: 'EXPENSE',
            category: 'REEMBOLSO_PACIENTE',
            description: `Reembolso PIX para Paciente - Motivo: ${reimbursement.reason}`,
            amount: reimbursement.amount,
            status: 'PAID',
            date: new Date().toISOString().split('T')[0],
            created_by: user.id
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Reembolso aprovado e PIX enviado com sucesso.' 
        });

    } catch (error: any) {
        console.error('[FINANCIAL REIMBURSEMENTS] POST approve catch:', error);
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
    }
}
