import { requireTissAction, enforceTissAdministrativeGuard } from '@/lib/auth/tiss-role-guard';
import { canPerformTissAction } from '@/lib/tiss/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// ============================================
// SCHEMA DE VALIDAÇÃO PARA EDIÇÃO
// ============================================

const updateGuideSchema = z.object({
    patient_card_number: z.string().optional(),
    patient_card_validity: z.string().optional(),
    procedure_code: z.string().optional(),
    procedure_name: z.string().optional(),
    procedure_quantity: z.number().int().positive().optional(),
    unit_value: z.number().positive().optional(),
    cid10_code: z.string().optional(),
    authorization_code: z.string().optional(),
    execution_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes: z.string().optional(),
});

// ============================================
// GET /api/tiss/guides/[id] - Detalhes da Guia
// ============================================

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireTissAction(request, 'guia.ver');
    if (!guard.authorized) {
        return guard.response;
    }
    try {
        const { id } = await params;
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

        const guide_id = id;

        // Buscar guia
        const { data: guide, error: guideError } = await supabase
            .from('tiss_guides')
            .select(`
        *,
        batch:tiss_batches(id, batch_number, status),
        patient:patients(id, full_name, cpf, email, phone, date_of_birth),
        doctor:doctors(id, user:users(full_name), crm, specialty),
        appointment:appointments(id, scheduled_at, type),
        consultation:consultations(id, diagnosis, started_at)
      `)
            .eq('id', guide_id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (guideError || !guide) {
            return NextResponse.json(
                { success: false, error: 'Guia não encontrada' },
                { status: 404 }
            );
        }

        // Buscar erros de validação
        const { data: validationErrors } = await supabase
            .from('tiss_validation_errors')
            .select('*')
            .eq('guide_id', guide_id)
            .eq('resolved', false);

        return NextResponse.json({
            success: true,
            data: {
                guide,
                validation_errors: validationErrors || [],
            },
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao buscar guia:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

// ============================================
// PUT /api/tiss/guides/[id] - Editar Guia
// ============================================

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireTissAction(request, 'guia.salvar_rascunho');
    if (!guard.authorized) {
        return guard.response;
    }
    try {
        const { id } = await params;
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

        const guide_id = id;

        // Verificar se guia existe e pertence à clínica
        const { data: existingGuide } = await supabase
            .from('tiss_guides')
            .select('id, batch_id, status')
            .eq('id', guide_id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!existingGuide) {
            return NextResponse.json(
                { success: false, error: 'Guia não encontrada' },
                { status: 404 }
            );
        }

        // Não permite editar guias já enviadas
        if (existingGuide.status !== 'PENDING') {
            return NextResponse.json(
                { success: false, error: 'Apenas guias pendentes podem ser editadas' },
                { status: 400 }
            );
        }

        // Parse e validar body
        const body = await request.json();
        const validated = updateGuideSchema.parse(body);

        const updates: any = {};

        // Aplicar atualizações permitidas
        if (validated.patient_card_number) updates.patient_card_number = validated.patient_card_number;
        if (validated.patient_card_validity !== undefined) updates.patient_card_validity = validated.patient_card_validity;
        if (validated.procedure_code) updates.procedure_code = validated.procedure_code;
        if (validated.procedure_name) updates.procedure_name = validated.procedure_name;
        if (validated.procedure_quantity) updates.procedure_quantity = validated.procedure_quantity;
        if (validated.unit_value !== undefined) updates.unit_value = validated.unit_value;
        if (validated.cid10_code !== undefined) updates.cid10_code = validated.cid10_code;
        if (validated.authorization_code !== undefined) updates.authorization_code = validated.authorization_code;
        if (validated.execution_date) updates.execution_date = validated.execution_date;
        if (validated.notes !== undefined) updates.notes = validated.notes;

        // Recalcular total_value se quantidade ou valor unitário mudaram
        if (validated.procedure_quantity || validated.unit_value) {
            const currentGuide = await supabase
                .from('tiss_guides')
                .select('procedure_quantity, unit_value')
                .eq('id', guide_id)
                .single();

            const quantity = validated.procedure_quantity || currentGuide.data?.procedure_quantity || 1;
            const unitValue = validated.unit_value || currentGuide.data?.unit_value || 0;

            updates.total_value = quantity * unitValue;
        }

        // Resetar validação ao editar
        updates.validation_status = 'NOT_VALIDATED';

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { success: false, error: 'Nenhum campo para atualizar' },
                { status: 400 }
            );
        }

        // Atualizar guia
        const { data: guide, error: updateError } = await supabase
            .from('tiss_guides')
            .update(updates)
            .eq('id', guide_id)
            .eq('clinic_id', profile.clinic_id)
            .select()
            .single();

        if (updateError) {
            console.error('[TISS] Erro ao atualizar guia:', updateError);
            return NextResponse.json(
                { success: false, error: 'Erro ao atualizar guia' },
                { status: 500 }
            );
        }

        // Limpar erros de validação antigos
        await supabase
            .from('tiss_validation_errors')
            .delete()
            .eq('guide_id', guide_id);

        return NextResponse.json({
            success: true,
            data: guide,
            message: 'Guia atualizada com sucesso',
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao atualizar guia:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Dados inválidos', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

// ============================================
// DELETE /api/tiss/guides/[id] - Deletar Rascunho ou Cancelar Guia (B2.1)
// ============================================

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const baseGuard = await enforceTissAdministrativeGuard(request);
    if (!baseGuard.authorized) {
        return baseGuard.response;
    }

    try {
        const { id } = await params;
        const supabase = await createClient();

        // 1. Autenticar usuário
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Não autenticado' },
                { status: 401 }
            );
        }

        // 2. Obter perfil e clinic_id
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

        const role = request.headers.get('x-user-role') || profile.role;
        const clinicId = profile.clinic_id;

        // 3. Buscar a guia no banco para inspecionar seu estado real
        const { data: guide, error: fetchError } = await supabase
            .from('tiss_guides')
            .select('id, status, validation_status, batch_id, authorization_code, notes')
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .single();

        if (fetchError || !guide) {
            return NextResponse.json(
                { success: false, error: 'Guia não encontrada' },
                { status: 404 }
            );
        }

        // 4. Trava impeditiva para guias já transmitidas ou faturadas
        if (guide.status === 'SENT' || guide.status === 'APPROVED' || guide.status === 'PAID') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Guias já transmitidas ou faturadas junto à operadora não podem ser excluídas nem canceladas sem pedido formal de estorno',
                },
                { status: 400 }
            );
        }

        // 5. Determinar se a operação é Cancelamento de Guia Validada ou em Lote vs Exclusão de Rascunho
        const isCancelOperation =
            Boolean(guide.batch_id) ||
            guide.validation_status === 'VALID' ||
            guide.status === 'VALID' ||
            guide.status === 'VALIDATED';

        if (isCancelOperation) {
            // Regra B2.1: Cancelar guia validada ou em lote exige a ação 'guia.cancelar' (restrita a FINANCIAL e ADMIN; RECEPTIONIST bloqueada)
            if (!canPerformTissAction(role, 'guia.cancelar')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Sem permissão: cancelamento de guias validadas ou vinculadas a lote exige perfil financeiro ou administrativo (guia.cancelar).",
                        code: 'FORBIDDEN',
                        action: 'guia.cancelar',
                    },
                    { status: 403 }
                );
            }

            // Exige justificativa com ao menos 5 caracteres
            let reason = request.nextUrl.searchParams.get('reason') || '';
            if (!reason) {
                try {
                    const body = await request.json();
                    if (body && typeof body.reason === 'string') {
                        reason = body.reason.trim();
                    }
                } catch {
                    // Corpo JSON opcional
                }
            }

            if (!reason || reason.trim().length < 5) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'O cancelamento de guia validada exige justificativa com ao menos 5 caracteres',
                    },
                    { status: 400 }
                );
            }

            const updatedNotes = guide.notes
                ? `${guide.notes} | Cancelada em ${new Date().toLocaleDateString('pt-BR')}: ${reason}`
                : `Cancelada em ${new Date().toLocaleDateString('pt-BR')}: ${reason}`;

            // Regra B2.1: Nunca gravar DENIED no cancelamento. Usar CANCELLED.
            const { error: cancelError } = await supabase
                .from('tiss_guides')
                .update({
                    status: 'CANCELLED',
                    validation_status: 'INVALID',
                    cancellation_reason: reason,
                    cancelled_at: new Date().toISOString(),
                    cancelled_by: user.id,
                    notes: updatedNotes,
                    deleted_at: new Date().toISOString(),
                })
                .eq('id', id)
                .eq('clinic_id', clinicId);

            if (cancelError) {
                console.error('[TISS] Erro ao cancelar guia validada:', cancelError);
                return NextResponse.json(
                    { success: false, error: 'Erro ao cancelar guia validada' },
                    { status: 500 }
                );
            }

            // Devolver saldo de sessões se havia autorização vinculada
            if (guide.authorization_code) {
                const { data: authRecord } = await supabase
                    .from('tiss_authorization_requests')
                    .select('id, sessions_used')
                    .eq('clinic_id', clinicId)
                    .eq('authorization_number', guide.authorization_code)
                    .maybeSingle();

                if (authRecord && (authRecord.sessions_used || 0) > 0) {
                    await (supabase
                        .from('tiss_authorization_requests') as any)
                        .update({ sessions_used: Math.max(0, (authRecord.sessions_used || 0) - 1) })
                        .eq('id', authRecord.id);
                }
            }

            return NextResponse.json({
                success: true,
                message: 'Guia validada cancelada com sucesso com justificativa registrada',
            });
        }

        // 6. Caso de Exclusão de Rascunho puro (status PENDING/DRAFT e sem lote): exige 'guia.excluir_rascunho' (RECEPTIONIST pode)
        if (!canPerformTissAction(role, 'guia.excluir_rascunho')) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Sem permissão: seu perfil não tem permissão para excluir rascunhos de guia.",
                    code: 'FORBIDDEN',
                    action: 'guia.excluir_rascunho',
                },
                { status: 403 }
            );
        }

        const { error: deleteError } = await supabase
            .from('tiss_guides')
            .delete()
            .eq('id', id)
            .eq('clinic_id', clinicId);

        if (deleteError) {
            console.error('[TISS] Erro ao deletar rascunho de guia:', deleteError);
            return NextResponse.json(
                { success: false, error: 'Erro ao deletar rascunho de guia' },
                { status: 500 }
            );
        }

        // Devolver saldo de sessões se a guia possuía autorização vinculada
        if (guide.authorization_code) {
            const { data: authRecord } = await supabase
                .from('tiss_authorization_requests')
                .select('id, sessions_used')
                .eq('clinic_id', clinicId)
                .eq('authorization_number', guide.authorization_code)
                .maybeSingle();

            if (authRecord && (authRecord.sessions_used || 0) > 0) {
                await (supabase
                    .from('tiss_authorization_requests') as any)
                    .update({ sessions_used: Math.max(0, (authRecord.sessions_used || 0) - 1) })
                    .eq('id', authRecord.id);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Guia em rascunho excluída com sucesso',
        });

    } catch (error: any) {
        console.error('[TISS] Erro inesperado ao excluir/cancelar guia:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
