// app/api/tiss/batches/[id]/errors/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/tiss/batches/[id]/errors
 * Lista erros de importação de um lote TISS (guias órfãs, erros de update, etc)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();

        // Autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Não autenticado' },
                { status: 401 }
            );
        }

        // Clinic ID
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

        const batch_id = params.id;

        // Verificar se batch pertence à clínica
        const { data: batch } = await supabase
            .from('tiss_batches')
            .select('id, batch_number')
            .eq('id', batch_id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!batch) {
            return NextResponse.json(
                { success: false, error: 'Lote não encontrado' },
                { status: 404 }
            );
        }

        // Buscar resumo de erros
        const { data: summary } = await supabase
            .from('v_tiss_batch_errors_summary')
            .select('*')
            .eq('batch_id', batch_id)
            .single();

        // Buscar erros detalhados
        const { data: errors, error: errorsError } = await supabase
            .from('tiss_import_errors')
            .select(`
        id,
        guide_number_from_xml,
        error_type,
        error_code,
        error_message,
        error_details,
        resolution_status,
        resolved_at,
        created_at
      `)
            .eq('batch_id', batch_id)
            .order('created_at', { ascending: false });

        if (errorsError) {
            throw errorsError;
        }

        // Agrupar por tipo
        const grouped = {
            orphan_guides: errors?.filter(e => e.error_type === 'ORPHAN_GUIDE') || [],
            update_failures: errors?.filter(e => e.error_type === 'UPDATE_FAILED') || [],
            validation_errors: errors?.filter(e => e.error_type === 'VALIDATION_ERROR') || [],
            other: errors?.filter(e => !['ORPHAN_GUIDE', 'UPDATE_FAILED', 'VALIDATION_ERROR'].includes(e.error_type)) || [],
        };

        return NextResponse.json({
            success: true,
            data: {
                batch: {
                    id: batch.id,
                    batch_number: batch.batch_number,
                },
                summary: summary || {
                    total_errors: 0,
                    orphan_guides: 0,
                    update_errors: 0,
                    validation_errors: 0,
                    pending_errors: 0,
                    resolved_errors: 0,
                },
                errors: grouped,
                total_errors: errors?.length || 0,
            },
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao buscar erros do lote:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/tiss/batches/[id]/errors/[errorId]
 * Marca erro como resolvido ou ignorado
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string; errorId: string } }
) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const body: any = await request.json();
        const { resolution_status, resolution_notes } = body;

        if (!['RESOLVED', 'IGNORED'].includes(resolution_status)) {
            return NextResponse.json(
                { success: false, error: 'Status inválido' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('tiss_import_errors')
            .update({
                resolution_status,
                resolution_notes,
                resolved_at: new Date().toISOString(),
                resolved_by: user.id,
            })
            .eq('id', params.errorId);

        if (error) throw error;

        // Atualizar contadores do batch
        await supabase.rpc('update_batch_error_counts', {
            p_batch_id: params.id,
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[TISS] Erro ao atualizar erro:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno' },
            { status: 500 }
        );
    }
}
