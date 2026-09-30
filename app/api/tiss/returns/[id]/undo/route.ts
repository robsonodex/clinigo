import { requireTissAction, enforceTissAdministrativeGuard } from '@/lib/auth/tiss-role-guard';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
/**
 * POST /api/tiss/returns/[id]/undo
 * Desfaz com segurança uma importação de retorno de lote:
 * 1. Valida se existem recursos de glosa ativos (IN_APPEAL, ACCEPTED) - se houver, bloqueia.
 * 2. Valida se existem lançamentos conciliados definitivamente / fechados - se houver, bloqueia.
 * 3. Aplica estorno contábil (soft-delete) em financial_entries e cria lançamento de contrapartida.
 * 4. Aplica soft-delete (status = 'CANCELLED') nas glosas criadas a partir do retorno.
 * 5. Restaura o status das guias para SENT e limpa paid_value com histórico.
 * 6. Restaura o status do lote para SENT.
 * 7. Inativa o registro em tiss_return_imports sem deleção física.
 * 8. Registra trilha de auditoria formal em audit_logs.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireTissAction(request, 'retorno.desfazer');
    if (!guard.authorized) {
        return guard.response;
    }
    try {

        const { id: returnOrBatchId } = await params;
        const supabase: any = await createClient();

        // 1. Auth & Permissão
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = (await supabase
            .from('users')
            .select('clinic_id, role, full_name')
            .eq('id', user.id)
            .single()) as { data: any; error: any };

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        // Permissão validada via requireTissAction('retorno.desfazer') - Apenas administradores

        // 2. Buscar o registro de retorno (por ID de retorno ou por batch_id)
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(returnOrBatchId);
        if (!isUuid) {
            return NextResponse.json({ success: false, error: 'Identificador inválido' }, { status: 400 });
        }

        const { data: returnRecord, error: returnErr } = await supabase
            .from('tiss_returns')
            .select(`
                *,
                batch:tiss_batches(id, batch_number, status)
            `)
            .or(`id.eq.${returnOrBatchId},batch_id.eq.${returnOrBatchId}`)
            .eq('clinic_id', profile.clinic_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (returnErr || !returnRecord) {
            return NextResponse.json({ success: false, error: 'Registro de retorno não encontrado para este lote' }, { status: 404 });
        }

        if (returnRecord.processing_status !== 'COMPLETED') {
            return NextResponse.json({ success: false, error: 'Este retorno ainda não foi concluído ou já foi estornado' }, { status: 400 });
        }

        const batchId = returnRecord.batch_id;
        const batchNumber = returnRecord.batch?.batch_number || '';

        // 3. BLOQUEIO 1: Verificar se existem recursos de glosa ativos ou deferidos
        const { data: activeAppeals } = await supabase
            .from('tiss_glosas')
            .select('id, guide_number, status')
            .eq('clinic_id', profile.clinic_id)
            .eq('batch_id', batchId)
            .in('status', ['IN_APPEAL', 'ACCEPTED']);

        if (activeAppeals && activeAppeals.length > 0) {
            return NextResponse.json({
                success: false,
                error: `Operação bloqueada: existem ${activeAppeals.length} guia(s) com recurso de glosa em andamento ou acatado neste lote. Não é permitido desfazer o retorno enquanto houver recursos ativos.`,
            }, { status: 400 });
        }

        // 4. BLOQUEIO 2: Verificar se o lançamento financeiro já foi conciliado em extrato bancário
        const { data: lockedEntries } = await supabase
            .from('financial_entries')
            .select('id, status')
            .eq('clinic_id', profile.clinic_id)
            .ilike('description', `%Lote TISS nº ${batchNumber}%`)
            .in('status', ['CONCILIATED', 'SETTLED', 'CLOSED']);

        if (lockedEntries && lockedEntries.length > 0) {
            return NextResponse.json({
                success: false,
                error: `Operação bloqueada: o lançamento financeiro deste lote já foi liquidado ou conciliado definitivamente no extrato bancário. Não é permitido desfazer retorno com pagamento posterior consolidado.`,
            }, { status: 400 });
        }

        // 5. ESTORNO CONTÁBIL (Soft-delete / Reversão sem deleção física)
        // A) Atualizar lançamento original para CANCELLED com notas
        await supabase
            .from('financial_entries')
            .update({
                status: 'CANCELLED',
                notes: `Cancelado por desfazimento do Retorno TISS (Lote ${batchNumber}) realizado por ${profile.full_name} em ${new Date().toLocaleString('pt-BR')}`
            })
            .eq('clinic_id', profile.clinic_id)
            .ilike('description', `%Lote TISS nº ${batchNumber}%`);

        // B) Registrar lançamento de estorno para auditoria contábil
        const amountToReverse = Number(returnRecord.amount_approved || 0);
        if (amountToReverse > 0) {
            await supabase.from('financial_entries').insert({
                clinic_id: profile.clinic_id,
                type: 'EXPENSE',
                category: 'ESTORNO_CONVENIO',
                description: `Estorno Contábil - Retorno Lote TISS nº ${batchNumber}`,
                amount: amountToReverse,
                status: 'REVERSED',
                payment_date: new Date().toISOString(),
                notes: `Estorno transacional do retorno ${returnRecord.id} realizado por ${profile.full_name}`,
            });
        }

        // 6. SOFT-DELETE DAS GLOSAS (Status = CANCELLED)
        await supabase
            .from('tiss_glosas')
            .update({
                status: 'CANCELLED',
                notes: `Glosa cancelada por desfazimento do retorno ${returnRecord.id} em ${new Date().toLocaleString('pt-BR')}`
            })
            .eq('clinic_id', profile.clinic_id)
            .eq('batch_id', batchId);

        // 7. RESTAURAR STATUS DAS GUIAS PARA SENT
        const { data: batchGuides } = await supabase
            .from('tiss_guides')
            .select('id, status_history')
            .eq('clinic_id', profile.clinic_id)
            .eq('batch_id', batchId);

        if (batchGuides && batchGuides.length > 0) {
            for (const guide of batchGuides) {
                const history = Array.isArray(guide.status_history) ? guide.status_history : [];
                history.push({
                    status: 'SENT',
                    timestamp: new Date().toISOString(),
                    updated_by: profile.full_name,
                    notes: `Importação de retorno desfeita e estornada pelo usuário ${profile.full_name}`,
                });

                await supabase
                    .from('tiss_guides')
                    .update({
                        status: 'SENT',
                        paid_value: null,
                        glosa_value: 0,
                        glosa_code: null,
                        glosa_description: null,
                        status_history: history,
                    })
                    .eq('id', guide.id);
            }
        }

        // 8. RESTAURAR STATUS DO LOTE PARA SENT
        await supabase
            .from('tiss_batches')
            .update({
                status: 'SENT',
                approved_value: 0,
                glosa_value: 0,
                return_processed_at: null,
            })
            .eq('id', batchId);

        // 9. INATIVAÇÃO DO REGISTRO DE IMPORTAÇÃO (Permite reimportar via índice parcial)
        await supabase
            .from('tiss_return_imports')
            .update({
                status: 'CANCELLED',
            })
            .eq('clinic_id', profile.clinic_id)
            .eq('batch_id', batchId);

        // 10. MARCAR O RETORNO COMO CANCELLED COM HISTÓRICO
        await supabase
            .from('tiss_returns')
            .update({
                processing_status: 'CANCELLED',
                error_message: `Retorno estornado manualmente por ${profile.full_name} em ${new Date().toLocaleString('pt-BR')}`,
            })
            .eq('id', returnRecord.id);

        // 11. TRILHA DE AUDITORIA FORMAL (audit_logs)
        await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'TISS_RETURN_IMPORT_REVERSED',
            entity_type: 'tiss_return',
            entity_id: returnRecord.id,
            metadata: {
                batch_id: batchId,
                batch_number: batchNumber,
                amount_reversed: amountToReverse,
                reversed_by: profile.full_name,
                timestamp: new Date().toISOString(),
                reason: 'Estorno e desfazimento manual de conciliação de retorno TISS',
            },
        });

        return NextResponse.json({
            success: true,
            message: `Retorno do lote nº ${batchNumber} desfeito e estornado com sucesso. Guias e lotes restaurados para 'Enviado', glosas canceladas e lançamentos contábeis de estorno gerados.`,
        });

    } catch (err: any) {
        console.error('[TISS] Erro ao desfazer importação de retorno:', err);
        return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
    }
}
