import { writeTissAudit } from '@/lib/tiss/audit';

export interface SyncAccountBridgeParams {
    supabaseAdmin: any;
    clinicId: string;
    appointmentId: string;
    triggeredByUserId?: string | null;
    overrideStatus?: string | null;
    overrideSessionStatus?: string | null;
}

export interface SyncAccountBridgeResult {
    created: boolean;
    updated: boolean;
    skipped: boolean;
    reason?: string;
    guideId?: string;
    guideNumber?: string;
    warnings: string[];
}

function generateSafeGuideNumber(): string {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rand = String(Math.floor(100000 + Math.random() * 900000));
    return `G${ym}${rand}`;
}

export async function syncAppointmentToTissAccount({
    supabaseAdmin,
    clinicId,
    appointmentId,
    triggeredByUserId,
    overrideStatus,
    overrideSessionStatus,
}: SyncAccountBridgeParams): Promise<SyncAccountBridgeResult> {
    const warnings: string[] = [];

    const { data: appointment, error: apptErr } = await supabaseAdmin
        .from('appointments')
        .select(`
            id,
            clinic_id,
            patient_id,
            doctor_id,
            appointment_date,
            appointment_time,
            status,
            session_status,
            payment_type,
            health_insurance_plan_id,
            insurance_card_number,
            insurance_card_validity,
            checkin_confirmed_at,
            checkin_method,
            therapist_start_verified_at
        `)
        .eq('id', appointmentId)
        .eq('clinic_id', clinicId)
        .maybeSingle();

    if (apptErr || !appointment) {
        return {
            created: false,
            updated: false,
            skipped: true,
            reason: apptErr?.message || 'Agendamento não encontrado para a clínica',
            warnings,
        };
    }

    const effectivePaymentType = String(appointment.payment_type || '').toUpperCase();
    if (effectivePaymentType !== 'CONVENIO') {
        return {
            created: false,
            updated: false,
            skipped: true,
            reason: 'Atendimento particular não gera conta TISS automaticamente',
            warnings,
        };
    }

    const effectiveStatus = String(overrideStatus || appointment.status || '').toUpperCase();
    const effectiveSessionStatus = String(overrideSessionStatus || appointment.session_status || '');
    const isCompletedSession =
        effectiveStatus === 'COMPLETED' ||
        effectiveSessionStatus === 'Presente' ||
        effectiveSessionStatus === 'Reposição';

    if (!isCompletedSession) {
        return {
            created: false,
            updated: false,
            skipped: true,
            reason: 'Atendimento ainda não foi concluído como Presente ou Reposição',
            warnings,
        };
    }

    // Verifica se já existe guia ativa para este agendamento (idempotência estrita)
    const { data: existingGuide } = await supabaseAdmin
        .from('tiss_guides')
        .select('id, guide_number, billing_stage, status, authorization_request_id')
        .eq('clinic_id', clinicId)
        .eq('appointment_id', appointmentId)
        .is('deleted_at', null)
        .not('status', 'in', '("CANCELLED","CANCELED")')
        .maybeSingle();

    const [{ data: patient }, { data: plan }, { data: evolution }] = await Promise.all([
        supabaseAdmin
            .from('patients')
            .select('id, full_name, cpf, insurance_card_number, insurance_validity, health_insurance_id')
            .eq('id', appointment.patient_id)
            .eq('clinic_id', clinicId)
            .maybeSingle(),
        appointment.health_insurance_plan_id
            ? supabaseAdmin
                  .from('health_insurance_plans')
                  .select('id, name, health_insurance_id')
                  .eq('id', appointment.health_insurance_plan_id)
                  .maybeSingle()
            : Promise.resolve({ data: null }),
        supabaseAdmin
            .from('medical_records')
            .select('id, signed_at, signature_hash')
            .eq('appointment_id', appointmentId)
            .eq('clinic_id', clinicId)
            .maybeSingle(),
    ]);

    const effectivePlanId = appointment.health_insurance_plan_id || null;
    const healthInsuranceId: string | null = plan?.health_insurance_id || patient?.health_insurance_id || null;

    const cardNumber = appointment.insurance_card_number || patient?.insurance_card_number || '';
    const cardValidity = appointment.insurance_card_validity || patient?.insurance_validity || null;

    if (!cardNumber) warnings.push('Paciente sem número de carteirinha informado');
    if (cardValidity && cardValidity < appointment.appointment_date) {
        warnings.push('Carteirinha vencida na data do atendimento');
    }

    // Buscar autorização ativa e com saldo se houver operadora
    let matchedAuth: any = null;
    if (healthInsuranceId) {
        const { data: authList } = await supabaseAdmin
            .from('tiss_authorization_requests')
            .select('id, authorization_number, request_number, expires_at, sessions_authorized, sessions_used, status, procedure_code')
            .eq('clinic_id', clinicId)
            .eq('patient_id', appointment.patient_id)
            .eq('health_insurance_id', healthInsuranceId)
            .in('status', ['APPROVED', 'AUTHORIZED', 'PENDING'])
            .order('created_at', { ascending: false })
            .limit(5);

        matchedAuth = (authList || []).find((a: any) => {
            const remaining = Number(a.sessions_authorized || 1) - Number(a.sessions_used || 0);
            const notExpired = !a.expires_at || String(a.expires_at).slice(0, 10) >= appointment.appointment_date;
            return remaining > 0 && notExpired;
        }) || (authList || [])[0] || null;

        if (matchedAuth) {
            const remaining = Number(matchedAuth.sessions_authorized || 1) - Number(matchedAuth.sessions_used || 0);
            if (remaining <= 0) warnings.push('Saldo de sessões da autorização esgotado');
            if (matchedAuth.expires_at && String(matchedAuth.expires_at).slice(0, 10) < appointment.appointment_date) {
                warnings.push('Senha de autorização vencida');
            }
        }
    }

    // Buscar valor contratado na tabela de preços da operadora
    let resolvedCode = matchedAuth?.procedure_code || '10101012';
    let resolvedName = 'Consulta / Sessão em Consultório';
    let resolvedPrice = 0;

    if (healthInsuranceId) {
        const { data: priceRows } = await supabaseAdmin
            .from('health_insurance_price_tables')
            .select('tuss_code, procedure_name, price, health_insurance_plan_id')
            .eq('clinic_id', clinicId)
            .eq('health_insurance_id', healthInsuranceId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(25);

        const exactPlanMatch = (priceRows || []).find(
            (r: any) => r.health_insurance_plan_id === effectivePlanId && (!matchedAuth?.procedure_code || r.tuss_code === matchedAuth.procedure_code)
        );
        const generalMatch = (priceRows || []).find(
            (r: any) => !r.health_insurance_plan_id && (!matchedAuth?.procedure_code || r.tuss_code === matchedAuth.procedure_code)
        );
        const chosenPrice = exactPlanMatch || generalMatch || (priceRows || [])[0];
        if (chosenPrice) {
            resolvedCode = chosenPrice.tuss_code || resolvedCode;
            resolvedName = chosenPrice.procedure_name || resolvedName;
            resolvedPrice = Number(chosenPrice.price || 0);
        } else {
            warnings.push('Valor contratado não localizado na tabela da operadora');
        }
    } else {
        warnings.push('Operadora não vinculada ao plano de convênio');
    }

    const biometricConfirmed = Boolean(appointment.checkin_confirmed_at || appointment.therapist_start_verified_at);
    const evolutionCompleted = Boolean(evolution?.id);
    const evolutionSigned = Boolean(evolution?.signed_at || evolution?.signature_hash);
    const readinessSummary = [
        `Biometria/Check-in: ${biometricConfirmed ? 'Confirmado' : 'Pendente'}`,
        `Evolução Clínica: ${evolutionCompleted ? (evolutionSigned ? 'Assinada' : 'Registrada') : 'Pendente'}`,
        warnings.length > 0 ? `Alertas: ${warnings.join('; ')}` : 'Sem pendências críticas',
    ].join(' | ');

    const now = new Date().toISOString();

    if (existingGuide) {
        await supabaseAdmin
            .from('tiss_guides')
            .update({
                health_insurance_id: healthInsuranceId,
                authorization_request_id: existingGuide.authorization_request_id || matchedAuth?.id || null,
                authorization_code: matchedAuth?.authorization_number || undefined,
                account_notes: readinessSummary,
                updated_at: now,
            })
            .eq('id', existingGuide.id)
            .eq('clinic_id', clinicId);

        return {
            created: false,
            updated: true,
            skipped: false,
            guideId: existingGuide.id,
            guideNumber: existingGuide.guide_number,
            warnings,
        };
    }

    const guideNumber = generateSafeGuideNumber();
    const { data: createdGuide, error: insertErr } = await supabaseAdmin
        .from('tiss_guides')
        .insert({
            clinic_id: clinicId,
            appointment_id: appointmentId,
            patient_id: appointment.patient_id,
            doctor_id: appointment.doctor_id,
            health_insurance_id: healthInsuranceId,
            authorization_request_id: matchedAuth?.id || null,
            guide_number: guideNumber,
            guide_type: resolvedCode.startsWith('101') ? 'CONSULTATION' : 'SPSADT',
            patient_cpf: patient?.cpf || null,
            patient_name: patient?.full_name || 'Beneficiário',
            patient_card_number: cardNumber || 'PENDENTE',
            patient_card_validity: cardValidity || null,
            procedure_code: resolvedCode,
            procedure_name: resolvedName,
            procedure_quantity: 1,
            unit_value: resolvedPrice,
            total_value: resolvedPrice,
            authorization_code: matchedAuth?.authorization_number || null,
            execution_date: appointment.appointment_date,
            status: 'DRAFT',
            billing_stage: 'ELABORACAO',
            validation_status: warnings.length > 0 ? 'WARNING' : 'NOT_VALIDATED',
            account_notes: readinessSummary,
            status_history: [
                {
                    status: 'DRAFT',
                    billing_stage: 'ELABORACAO',
                    at: now,
                    by: triggeredByUserId || null,
                    note: 'Conta médica gerada automaticamente na conclusão do atendimento',
                },
            ],
            created_at: now,
            updated_at: now,
        })
        .select('id, guide_number')
        .single();

    if (insertErr || !createdGuide) {
        return {
            created: false,
            updated: false,
            skipped: true,
            reason: insertErr?.message || 'Falha ao inserir guia em elaboração',
            warnings,
        };
    }

    await supabaseAdmin.from('tiss_guide_procedures').insert({
        clinic_id: clinicId,
        guide_id: createdGuide.id,
        procedure_code: resolvedCode,
        procedure_name: resolvedName,
        item_group: 'HONORARIOS',
        unit_measure: 'UN',
        quantity: 1,
        unit_value: resolvedPrice,
        total_value: resolvedPrice,
        execution_date: appointment.appointment_date,
        status: 'ACTIVE',
    });

    if (matchedAuth?.id) {
        const nextUsed = Number(matchedAuth.sessions_used || 0) + 1;
        await supabaseAdmin
            .from('tiss_authorization_requests')
            .update({
                sessions_used: nextUsed,
                updated_at: now,
            })
            .eq('id', matchedAuth.id)
            .eq('clinic_id', clinicId);
    }

    if (triggeredByUserId) {
        await writeTissAudit({
            clinicId,
            userId: triggeredByUserId,
            action: 'TISS_ACCOUNT_AUTO_CREATED',
            entityType: 'tiss_guide',
            entityId: createdGuide.id,
            newState: {
                billing_stage: 'ELABORACAO',
                appointment_id: appointmentId,
                procedure_code: resolvedCode,
                total_value: resolvedPrice,
            },
            customSupabase: supabaseAdmin,
        });
    }

    return {
        created: true,
        updated: false,
        skipped: false,
        guideId: createdGuide.id,
        guideNumber: createdGuide.guide_number,
        warnings,
    };
}
