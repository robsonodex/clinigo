import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

async function getAuthContext(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'Não autorizado', status: 401 }
    }

    const headerClinicId = request.headers.get('x-clinic-id')
    const headerUserRole = request.headers.get('x-user-role')

    let clinicId = headerClinicId
    let userRole = headerUserRole

    if (!clinicId || !userRole) {
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        clinicId = (userData as any)?.clinic_id
        userRole = (userData as any)?.role
    }

    if (!clinicId) {
        return { error: 'Clínica não encontrada para o usuário', status: 400 }
    }

    return { user, clinicId, userRole, supabase }
}

/**
 * PATCH /api/crm/pipeline-cards/[cardId]/move
 * Move um card entre etapas e/ou entre funis, com validação multi-tenant estrita.
 */
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ cardId: string }> }
) {
    try {
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { clinicId, userRole, user, supabase } = auth
        const { cardId } = await context.params

        // Permissão: ADMIN, RECEPTIONIST, DOCTOR
        if (!['CLINIC_ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST', 'DOCTOR'].includes(userRole || '')) {
            return NextResponse.json({ error: 'Permissão insuficiente para mover cards', code: 'FORBIDDEN' }, { status: 403 })
        }

        const body = await request.json()
        const { stage_id, target_pipeline_id, new_position, target_stage_name } = body

        if (!stage_id && !target_stage_name) {
            return NextResponse.json({ error: 'Etapa de destino (stage_id) é obrigatória' }, { status: 400 })
        }

        const serviceClient = createServiceRoleClient()

        // 1. Verificar se o cardId corresponde a um registro em crm_pipeline_cards
        const { data: existingCard } = await serviceClient
            .from('crm_pipeline_cards')
            .select('id, clinic_id, pipeline_id, stage_id, patient_id')
            .eq('id', cardId)
            .eq('clinic_id', clinicId)
            .maybeSingle()

        if (existingCard) {
            // Atualizar o card existente
            const updatePayload: Record<string, any> = {
                stage_id: stage_id,
                updated_at: new Date().toISOString()
            }

            if (target_pipeline_id) {
                updatePayload.pipeline_id = target_pipeline_id
            }

            if (typeof new_position === 'number') {
                updatePayload.position = new_position
            }

            const { data: updatedCard, error: updateError } = await serviceClient
                .from('crm_pipeline_cards')
                .update(updatePayload)
                .eq('id', cardId)
                .eq('clinic_id', clinicId)
                .select()
                .single()

            if (updateError) {
                console.error('[PATCH /api/crm/pipeline-cards/move] Erro ao mover card:', updateError)
                return NextResponse.json({ error: updateError.message }, { status: 500 })
            }

            return NextResponse.json({
                success: true,
                card: updatedCard
            })
        }

        // 2. Se o cardId não estiver em crm_pipeline_cards, verificar se é um ID de paciente clínico
        const { data: patient } = await supabase
            .from('patients')
            .select('id, full_name, phone, email, clinic_id')
            .eq('id', cardId)
            .eq('clinic_id', clinicId)
            .maybeSingle()

        if (patient) {
            // Verificar ou criar entrada em crm_pipeline_cards para persistir o novo estágio
            let targetPipeId = target_pipeline_id
            if (!targetPipeId) {
                const { data: defaultPipe } = await serviceClient
                    .from('crm_pipelines')
                    .select('id')
                    .eq('clinic_id', clinicId)
                    .eq('is_default', true)
                    .maybeSingle()
                targetPipeId = defaultPipe?.id || 'default-pipeline'
            }

            // Criar ou atualizar card correspondente
            const { data: newCard, error: createCardError } = await serviceClient
                .from('crm_pipeline_cards')
                .upsert({
                    clinic_id: clinicId,
                    pipeline_id: targetPipeId,
                    stage_id: stage_id,
                    patient_id: patient.id,
                    title: patient.full_name,
                    contact_name: patient.full_name,
                    contact_phone: patient.phone,
                    contact_email: patient.email,
                    position: typeof new_position === 'number' ? new_position : 0,
                    created_by: user.id,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'clinic_id,patient_id' })
                .select()
                .maybeSingle()

            // Executar ação clínica retrocompatível caso aplicável (ex: marcar consulta como realizada)
            if (target_stage_name) {
                const stageLower = target_stage_name.toLowerCase()
                if (['compareceu', 'retornou', 'recorrente'].includes(stageLower)) {
                    // Busca agendamento recente para marcar COMPLETED
                    const { data: appt } = await supabase
                        .from('appointments')
                        .select('id, status')
                        .eq('clinic_id', clinicId)
                        .eq('patient_id', patient.id)
                        .in('status', ['SCHEDULED', 'CONFIRMED'])
                        .order('appointment_date', { ascending: false })
                        .limit(1)
                        .maybeSingle()

                    if (appt) {
                        await supabase
                            .from('appointments')
                            .update({ status: 'COMPLETED' })
                            .eq('id', appt.id)
                            .eq('clinic_id', clinicId)
                    }
                }
            }

            return NextResponse.json({
                success: true,
                card: newCard || { id: patient.id, stage_id }
            })
        }

        return NextResponse.json({ error: 'Card ou paciente não encontrado' }, { status: 404 })

    } catch (error: any) {
        console.error('[PATCH /api/crm/pipeline-cards/move] Erro:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}
