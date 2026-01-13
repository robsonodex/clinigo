// app/api/tiss/returns/[id]/parse/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/tiss/returns/[id]/parse
 * Processa arquivo de retorno e atualiza status das guias
 */

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
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

        const return_id = params.id;

        // Buscar registro de retorno
        const { data: returnRecord } = await supabase
            .from('tiss_returns')
            .select('*, batch:tiss_batches(*)')
            .eq('id', return_id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!returnRecord) {
            return NextResponse.json(
                { success: false, error: 'Retorno não encontrado' },
                { status: 404 }
            );
        }

        // Marcar como processando
        await supabase
            .from('tiss_returns')
            .update({ processing_status: 'PROCESSING' })
            .eq('id', return_id);

        // Buscar guias do lote
        const { data: guides } = await supabase
            .from('tiss_guides')
            .select('*')
            .eq('batch_id', returnRecord.batch_id);

        if (!guides || guides.length === 0) {
            throw new Error('Nenhuma guia encontrada no lote');
        }

        // PARSER SIMPLIFICADO (MVP)
        // TODO: Implementar parser real de XML/TXT da operadora
        // Por enquanto, simulamos processamento básico

        const mockReturnData = generateMockReturnData(guides);

        let totalApproved = 0;
        let totalDenied = 0;
        let totalPartial = 0;
        let amountApproved = 0;
        let amountDenied = 0;

        // Processar cada linha do retorno mockado
        for (const returnLine of mockReturnData) {
            const guide = guides.find(g => g.guide_number === returnLine.guide_number);

            if (!guide) continue;

            let guideStatus: string;
            let glosaValue = 0;

            if (returnLine.status === 'APPROVED') {
                guideStatus = 'APPROVED';
                totalApproved++;
                amountApproved += guide.total_value;
            } else if (returnLine.status === 'DENIED') {
                guideStatus = 'DENIED';
                totalDenied++;
                amountDenied += guide.total_value;
                glosaValue = guide.total_value;

                // Criar registro de glosa
                await supabase.from('tiss_glosas').insert({
                    guide_id: guide.id,
                    return_id,
                    clinic_id: profile.clinic_id,
                    glosa_type: 'TOTAL',
                    glosa_code: returnLine.denial_code,
                    glosa_description: returnLine.denial_reason,
                    glosa_value: guide.total_value,
                    original_value: guide.total_value,
                    approved_value: 0,
                    can_appeal: returnLine.can_appeal,
                    category: 'AUTHORIZATION', // Simplificado
                });
            } else { // PARTIAL
                guideStatus = 'PARTIAL';
                totalPartial++;
                const glosedAmount = guide.total_value * 0.3; // Mock: 30% de glosa
                glosaValue = glosedAmount;
                amountApproved += (guide.total_value - glosedAmount);
                amountDenied += glosedAmount;

                // Criar registro de glosa parcial
                await supabase.from('tiss_glosas').insert({
                    guide_id: guide.id,
                    return_id,
                    clinic_id: profile.clinic_id,
                    glosa_type: 'PARTIAL',
                    glosa_code: 'PARTIAL_001',
                    glosa_description: 'Glosa parcial por inconsistência de valores',
                    glosa_value: glosedAmount,
                    original_value: guide.total_value,
                    approved_value: guide.total_value - glosedAmount,
                    can_appeal: true,
                    category: 'PRICING',
                });
            }

            // Atualizar guia
            await supabase
                .from('tiss_guides')
                .update({
                    status: guideStatus,
                    glosa_value,
                    processed_at: new Date().toISOString(),
                })
                .eq('id', guide.id);
        }

        // Atualizar registro de retorno
        await supabase
            .from('tiss_returns')
            .update({
                processing_status: 'COMPLETED',
                processed_at: new Date().toISOString(),
                total_guides_processed: guides.length,
                total_approved: totalApproved,
                total_denied: totalDenied,
                total_partial: totalPartial,
                amount_requested: returnRecord.batch.total_value,
                amount_approved: amountApproved,
                amount_denied: amountDenied,
                parsed_data: mockReturnData,
            })
            .eq('id', return_id);

        // Determinar status final do batch
        let batchStatus: string;
        if (totalDenied === guides.length) {
            batchStatus = 'DENIED';
        } else if (totalApproved === guides.length) {
            batchStatus = 'APPROVED';
        } else {
            batchStatus = 'PARTIAL';
        }

        // Atualizar batch
        await supabase
            .from('tiss_batches')
            .update({
                status: batchStatus,
                return_processed_at: new Date().toISOString(),
            })
            .eq('id', returnRecord.batch_id);

        // Log na timeline
        await supabase.rpc('log_batch_event', {
            p_batch_id: returnRecord.batch_id,
            p_event_type: 'RETURN_PROCESSED',
            p_description: `Retorno processado: ${totalApproved} aprovadas, ${totalDenied} negadas, ${totalPartial} parciais`,
            p_metadata: {
                return_id,
                total_approved: totalApproved,
                total_denied: totalDenied,
                total_partial: totalPartial,
            },
            p_user_id: user.id,
        });

        return NextResponse.json({
            success: true,
            data: {
                return_id,
                batch_id: returnRecord.batch_id,
                total_guides: guides.length,
                total_approved: totalApproved,
                total_denied: totalDenied,
                total_partial: totalPartial,
                amount_approved: amountApproved,
                amount_denied: amountDenied,
            },
            message: 'Retorno processado com sucesso',
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao processar retorno:', error);

        // Marcar retorno como error
        const supabase = await createClient();
        await supabase
            .from('tiss_returns')
            .update({
                processing_status: 'ERROR',
                processing_error: error.message,
            })
            .eq('id', params.id);

        return NextResponse.json(
            { success: false, error: 'Erro ao processar retorno', details: error.message },
            { status: 500 }
        );
    }
}

// ============================================
// HELPER: Gerador de dados mockados de retorno
// (Substituir por parser real de XML/TXT)
// ============================================
function generateMockReturnData(guides: any[]) {
    return guides.map((guide, index) => {
        // Simular: 70% aprovado, 20% glosa parcial, 10% negado
        const rand = Math.random();
        let status: string;
        let denial_code: string | null = null;
        let denial_reason: string | null = null;
        let can_appeal = false;

        if (rand < 0.7) {
            status = 'APPROVED';
        } else if (rand < 0.9) {
            status = 'PARTIAL';
            denial_code = 'PARTIAL_001';
            denial_reason = 'Valor glosado por divergência de tabela';
            can_appeal = true;
        } else {
            status = 'DENIED';
            denial_code = 'DENIED_004';
            denial_reason = 'Paciente sem cobertura para o procedimento';
            can_appeal = false;
        }

        return {
            guide_number: guide.guide_number,
            status,
            denial_code,
            denial_reason,
            can_appeal,
            approved_value: status === 'APPROVED' ? guide.total_value : (status === 'PARTIAL' ? guide.total_value * 0.7 : 0),
        };
    });
}
