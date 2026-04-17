import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const reconciliationItemSchema = z.object({
  guide_id: z.string().uuid(),
  paid_amount: z.number().min(0),
  glosa_amount: z.number().min(0).default(0),
  glosa_reason: z.string().optional().nullable(),
});

const reconciliationPayloadSchema = z.object({
  reconciliations: z.array(reconciliationItemSchema).min(1),
  tiss_batch_id: z.string().uuid()
});

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ batchId: string }> }
) {
    try {
        const { batchId } = await context.params;
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

        if (!profile?.clinic_id || profile.role === 'RECEPTIONIST') {
            return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
        }

        // Fetch all guides of this batch
        const { data: guides, error } = await supabase
            .from('tiss_guides')
            .select(`
                id,
                guide_number,
                patient_name,
                patient_cpf,
                execution_date,
                total_amount,
                paid_amount,
                glosa_amount,
                glosa_reason,
                status,
                tiss_guide_procedures (
                    id,
                    procedure_code,
                    procedure_description,
                    total_price,
                    glosa_amount
                )
            `)
            .eq('batch_id', batchId)
            .eq('clinic_id', profile.clinic_id)
            .order('execution_date', { ascending: false });

        if (error) {
            console.error('[FINANCIAL CONCILIATION] Erro GET:', error);
            return NextResponse.json({ success: false, error: 'Erro ao buscar guias' }, { status: 500 });
        }

        // Fetch batch details
        const { data: batch } = await supabase
            .from('tiss_batches')
            .select('id, batch_number, status, total_amount')
            .eq('id', batchId)
            .single();

        return NextResponse.json({
            success: true, 
            data: {
                batch,
                guides
            }
        });

    } catch (error: any) {
        console.error('[FINANCIAL CONCILIATION] GET catch:', error);
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ batchId: string }> }
) {
    try {
        const { batchId } = await context.params;
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
            return NextResponse.json({ success: false, error: 'Sem permissão para conciliar' }, { status: 403 });
        }

        const body = await request.json();
        const validated = reconciliationPayloadSchema.parse({ ...body, tiss_batch_id: batchId });

        // Update each guide iteratively (or using RPC for bulk, but since guides limit per batch is usually ~100 max, iter is ok)
        for (const rec of validated.reconciliations) {
            // Determine guide status
            // Se pagou o valor inteiro -> PAID
            // Se glosou tudo -> DENIED
            // Se pagou parcial -> PARTIALLY_APPROVED
            
            let newStatus = 'PARTIALLY_APPROVED';
            if (rec.paid_amount === 0 && rec.glosa_amount > 0) {
                 newStatus = 'DENIED';
            } else if (rec.glosa_amount === 0 && rec.paid_amount > 0) {
                 newStatus = 'PAID';
            }

            await supabase
                .from('tiss_guides')
                .update({
                    paid_amount: rec.paid_amount,
                    glosa_amount: rec.glosa_amount,
                    glosa_reason: rec.glosa_reason || null,
                    paid_at: new Date().toISOString(),
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', rec.guide_id)
                .eq('clinic_id', profile.clinic_id);
        }

        // Calculate totals for batch
        const totalApproved = validated.reconciliations.reduce((acc, obj) => acc + obj.paid_amount, 0);
        const totalGlosa = validated.reconciliations.reduce((acc, obj) => acc + obj.glosa_amount, 0);

        // Atualizar o lote 
        // O status do lote geralmente pode ir pra pago dependendo da regra, não irei alterar o status_batch, usaremos na guides
        await supabase
            .from('tiss_batches')
            .update({
                approved_amount: totalApproved,
                glosa_amount: totalGlosa,
                processed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', batchId)
            .eq('clinic_id', profile.clinic_id);

        return NextResponse.json({ success: true, message: 'Guias conciliadas com sucesso' });

    } catch (error: any) {
        console.error('[FINANCIAL CONCILIATION] PUT catch:', error);
        
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Dados inválidos', details: error.errors }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Erro ao conciliar' }, { status: 500 });
    }
}
