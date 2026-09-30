import { requireTissAction, enforceTissAdministrativeGuard } from '@/lib/auth/tiss-role-guard';
// app/api/tiss/batches/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { TissBatch, TissBatchStats } from '@/types/tiss';

// ============================================
// GET /api/tiss/batches/[id] - Detalhes do Lote
// ============================================

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireTissAction(request, 'lote.ver');
    if (!guard.authorized) {
        return guard.response;
    }
    try {
        const { id } = await params
        const supabase = await createClient();

        // Verificar autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Não autenticado' },
                { status: 401 }
            );
        }

        // Obter clinic_id do usuário
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json(
                { success: false, error: 'Clínica não encontrada' },
                { status: 403 }
            );
        }

        const batch_id = id;

        // Buscar lote com relacionamentos
        const { data: batch, error: batchError } = await supabase
            .from('tiss_batches')
            .select(`
        *,
        health_insurance:health_insurances(id, name, code),
        created_by_user:users!tiss_batches_created_by_fkey(id, full_name),
        submitted_by_user:users!tiss_batches_submitted_by_fkey(id, full_name)
      `)
            .eq('id', batch_id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (batchError || !batch) {
            return NextResponse.json(
                { success: false, error: 'Lote não encontrado' },
                { status: 404 }
            );
        }

        // Buscar guias do lote com estatísticas
        const { data: guides } = await supabase
            .from('tiss_guides')
            .select(`
        *,
        patient:patients(id, full_name, cpf),
        doctor:doctors(id, user:users(full_name), crm, specialty)
      `)
            .eq('batch_id', batch_id)
            .order('created_at', { ascending: false });

        // Calcular estatísticas
        const stats: TissBatchStats = {
            batch_id: batch.id,
            batch_number: batch.batch_number,
            status: batch.status,
            total_guides: guides?.length || 0,
            total_value: batch.total_value || 0,

            // Breakdown por status
            pending_count: guides?.filter(g => g.status === 'PENDING').length || 0,
            sent_count: guides?.filter(g => g.status === 'SENT').length || 0,
            approved_count: guides?.filter(g => g.status === 'APPROVED').length || 0,
            denied_count: guides?.filter(g => g.status === 'DENIED').length || 0,

            // Financeiro
            approved_value: batch.approved_value || 0,
            denied_value: batch.denied_value || 0,
            glosa_value: batch.glosa_value || 0,
            glosa_percentage: batch.glosa_percentage || 0,

            // Datas
            created_at: batch.created_at,
            sent_at: batch.submitted_at,
            processed_at: batch.return_processed_at,
        };

        // Buscar erros de validação
        const { data: validationErrors } = await supabase
            .from('tiss_validation_errors')
            .select('*')
            .eq('batch_id', batch_id)
            .eq('resolved', false)
            .order('severity', { ascending: false });

        return NextResponse.json({
            success: true,
            data: {
                batch,
                guides: guides || [],
                stats,
                validation_errors: validationErrors || [],
            },
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao buscar detalhes do lote:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

// ============================================
// PUT /api/tiss/batches/[id] - Atualizar Lote
// ============================================

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireTissAction(request, 'lote.fechar');
    if (!guard.authorized) {
        return guard.response;
    }
    try {
        const { id } = await params
        const supabase = await createClient();

        // Verificar autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Não autenticado' },
                { status: 401 }
            );
        }

        // Obter clinic_id do usuário
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json(
                { success: false, error: 'Clínica não encontrada' },
                { status: 403 }
            );
        }

        // Verificar permissão
        // Permissão validada via requireTissAction('lote.fechar')

        const batch_id = id;
        const body = await request.json();

        // Campos permitidos para atualização
        const allowedFields = ['notes', 'status'];
        const updates: any = {};

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { success: false, error: 'Nenhum campo para atualizar' },
                { status: 400 }
            );
        }

        // Se for reabertura de lote (status = DRAFT com lote previamente fechado)
        if (updates.status === 'DRAFT') {
            const { data: currentBatch } = await supabase
                .from('tiss_batches')
                .select('status, batch_number')
                .eq('id', batch_id)
                .single();

            if (currentBatch && currentBatch.status !== 'DRAFT') {
                await supabase.from('audit_logs').insert({
                    user_id: user.id,
                    action: 'TISS_BATCH_REOPEN',
                    entity_type: 'tiss_batch',
                    entity_id: batch_id,
                    metadata: {
                        previous_status: currentBatch.status,
                        new_status: 'DRAFT',
                        reason: body.reason || body.reopen_reason || 'Reabertura de lote solicitada pelo faturamento',
                        batch_number: currentBatch.batch_number,
                    }
                });
            }
        }

        // Atualizar lote
        const { data: batch, error: updateError } = await supabase
            .from('tiss_batches')
            .update(updates)
            .eq('id', batch_id)
            .eq('clinic_id', profile.clinic_id)
            .select()
            .single();

        if (updateError) {
            console.error('[TISS] Erro ao atualizar lote:', updateError);
            return NextResponse.json(
                { success: false, error: 'Erro ao atualizar lote' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: batch,
            message: 'Lote atualizado com sucesso',
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao atualizar lote:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

// ============================================
// DELETE /api/tiss/batches/[id] - Deletar Lote
// ============================================

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireTissAction(request, 'lote.reabrir');
    if (!guard.authorized) {
        return guard.response;
    }
    try {
        const { id } = await params
        const supabase = await createClient();

        // Verificar autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Não autenticado' },
                { status: 401 }
            );
        }

        // Obter clinic_id do usuário
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json(
                { success: false, error: 'Clínica não encontrada' },
                { status: 403 }
            );
        }

        // Verificar permissão
        // Permissão validada via requireTissAction('lote.reabrir')

        const batch_id = id;

        // Verificar se lote pode ser deletado (apenas DRAFT)
        const { data: batch } = await supabase
            .from('tiss_batches')
            .select('status')
            .eq('id', batch_id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!batch) {
            return NextResponse.json(
                { success: false, error: 'Lote não encontrado' },
                { status: 404 }
            );
        }

        if (batch.status !== 'DRAFT') {
            return NextResponse.json(
                { success: false, error: 'Apenas lotes em rascunho podem ser deletados' },
                { status: 400 }
            );
        }

        // Deletar lote (CASCADE deleta guias automaticamente)
        const { error: deleteError } = await supabase
            .from('tiss_batches')
            .delete()
            .eq('id', batch_id)
            .eq('clinic_id', profile.clinic_id);

        if (deleteError) {
            console.error('[TISS] Erro ao deletar lote:', deleteError);
            return NextResponse.json(
                { success: false, error: 'Erro ao deletar lote' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Lote deletado com sucesso',
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao deletar lote:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
