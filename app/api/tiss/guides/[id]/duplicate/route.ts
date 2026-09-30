import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// POST /api/tiss/guides/[id]/duplicate - Duplicar Guia para Múltiplas Sessões (G5)
// =============================================================================

interface DuplicateRequestBody {
    dates?: string[]; // Array explícito de datas ISO (YYYY-MM-DD)
    count?: number; // Quantidade de sessões a duplicar se datas não forem informadas
    interval_days?: number; // Intervalo em dias entre as sessões geradas (padrão: 7)
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // 1. Controle de menor privilégio: ação guia.duplicar
    const guard = await requireTissAction(request, 'guia.duplicar');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const { id } = await params;
        const supabase = await createClient();

        // 2. Autenticação e perfil
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Não autenticado' },
                { status: 401 }
            );
        }

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

        const clinicId = profile.clinic_id;

        // 3. Buscar a guia de origem da clínica
        const { data: sourceGuide, error: fetchError } = await supabase
            .from('tiss_guides')
            .select('*')
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .single();

        if (fetchError || !sourceGuide) {
            return NextResponse.json(
                { success: false, error: 'Guia de origem não encontrada' },
                { status: 404 }
            );
        }

        // 4. Interpretar corpo da requisição para múltiplas sessões (G5)
        let body: DuplicateRequestBody = {};
        try {
            body = await request.json();
        } catch {
            // Corpo JSON opcional
        }

        let targetDates: string[] = [];
        if (Array.isArray(body.dates) && body.dates.length > 0) {
            targetDates = body.dates.map(d => String(d).trim()).filter(Boolean);
        } else if (body.count && body.count > 0) {
            const count = Math.min(Math.max(1, body.count), 50); // teto de 50 sessões
            const interval = body.interval_days && body.interval_days > 0 ? body.interval_days : 7;
            const baseDate = sourceGuide.execution_date ? new Date(sourceGuide.execution_date) : new Date();

            for (let i = 1; i <= count; i++) {
                const nextDate = new Date(baseDate);
                nextDate.setDate(nextDate.getDate() + (i * interval));
                targetDates.push(nextDate.toISOString().split('T')[0]);
            }
        } else {
            // Duplicação pontual de 1 sessão com data de hoje
            targetDates.push(new Date().toISOString().split('T')[0]);
        }

        // 5. Verificar saldo de autorização se houver código vinculado
        let remainingSessions = Infinity;
        let authRecordId: string | null = null;

        if (sourceGuide.authorization_code) {
            const { data: authRecord } = await supabase
                .from('tiss_authorization_requests')
                .select('id, total_sessions, sessions_used')
                .eq('clinic_id', clinicId)
                .eq('authorization_number', sourceGuide.authorization_code)
                .maybeSingle();

            if (authRecord && authRecord.total_sessions) {
                authRecordId = authRecord.id;
                const used = authRecord.sessions_used || 0;
                remainingSessions = Math.max(0, authRecord.total_sessions - used);
            }
        }

        const createdGuides: any[] = [];
        const rejectedItems: Array<{ date: string; reason: string }> = [];
        const year = new Date().getFullYear();

        // 6. Criar guias sequencialmente com número atômico
        for (const date of targetDates) {
            // Se autorização informada e saldo esgotado, recusar sessão
            if (sourceGuide.authorization_code && remainingSessions <= 0) {
                rejectedItems.push({
                    date,
                    reason: `Saldo de sessões da autorização ${sourceGuide.authorization_code} esgotado.`,
                });
                continue;
            }

            // Gerar número atômico seguro de guia
            let newGuideNumber = '';
            if (typeof supabase.rpc === 'function') {
                const rpcRes = await supabase.rpc('generate_tiss_guide_number', {
                    p_clinic_id: clinicId,
                    p_year: year,
                });
                if (rpcRes.data) {
                    newGuideNumber = rpcRes.data;
                }
            }

            if (!newGuideNumber) {
                const timestamp = Date.now().toString().slice(-6) + Math.floor(Math.random() * 10);
                newGuideNumber = `${year}99${timestamp}`;
            }

            const duplicatePayload = {
                clinic_id: clinicId,
                batch_id: null, // Nova guia inicia sem lote
                appointment_id: sourceGuide.appointment_id || null,
                consultation_id: sourceGuide.consultation_id || null,
                patient_id: sourceGuide.patient_id,
                doctor_id: sourceGuide.doctor_id,
                guide_number: newGuideNumber,
                guide_type: sourceGuide.guide_type,
                patient_cpf: sourceGuide.patient_cpf,
                patient_name: sourceGuide.patient_name,
                patient_card_number: sourceGuide.patient_card_number,
                patient_card_validity: sourceGuide.patient_card_validity,
                procedure_code: sourceGuide.procedure_code,
                procedure_name: sourceGuide.procedure_name,
                procedure_quantity: sourceGuide.procedure_quantity || 1,
                unit_value: sourceGuide.unit_value || 0,
                total_value: sourceGuide.total_value || 0,
                cid10_code: sourceGuide.cid10_code || null,
                cid10_description: sourceGuide.cid10_description || null,
                authorization_code: sourceGuide.authorization_code || null,
                execution_date: date,
                status: 'DRAFT',
                validation_status: 'NOT_VALIDATED',
                glosa_value: 0,
                glosa_code: null,
                glosa_description: null,
                can_appeal: false,
                notes: sourceGuide.notes
                    ? `Cópia da guia ${sourceGuide.guide_number}: ${sourceGuide.notes}`
                    : `Cópia da guia ${sourceGuide.guide_number}`,
            };

            const { data: newGuide, error: insertError } = await supabase
                .from('tiss_guides')
                .insert(duplicatePayload)
                .select()
                .single();

            if (insertError) {
                console.error('[TISS] Erro ao duplicar guia para a data', date, insertError);
                rejectedItems.push({
                    date,
                    reason: `Erro de banco de dados: ${insertError.message}`,
                });
                continue;
            }

            // Abater saldo da autorização
            if (authRecordId && remainingSessions !== Infinity) {
                remainingSessions--;
                await (supabase
                    .from('tiss_authorization_requests') as any)
                    .update({
                        sessions_used: (sourceGuide.sessions_used || 0) + createdGuides.length + 1,
                    })
                    .eq('id', authRecordId);
            }

            createdGuides.push(newGuide);
        }

        const message = rejectedItems.length > 0
            ? `Duplicação concluída: ${createdGuides.length} guia(s) criada(s) com sucesso. ${rejectedItems.length} sessão(ões) recusada(s).`
            : `Duplicação concluída: ${createdGuides.length} guia(s) criada(s) com sucesso.`;

        return NextResponse.json({
            success: true,
            summary: {
                requested_sessions: targetDates.length,
                created_count: createdGuides.length,
                rejected_count: rejectedItems.length,
            },
            created_guides: createdGuides,
            rejected_items: rejectedItems,
            message,
        }, { status: 201 });

    } catch (error: any) {
        console.error('[TISS] Erro ao processar duplicação de guias:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor ao duplicar guia' },
            { status: 500 }
        );
    }
}
