import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { resolveDoctorRepasseValue } from '@/lib/services/repasse-calculator';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appointmentId } = await context.params;
    const supabase = await createClient();
    const supabaseAdmin = createServiceRoleClient();

    // 1. Autenticação e identificação de usuário
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, clinic_id, role, full_name')
      .eq('id', user.id)
      .single();

    if (userError || !currentUser?.clinic_id) {
      return NextResponse.json({ success: false, error: 'Perfil ou clínica não encontrados' }, { status: 403 });
    }

    // 2. Parse opcional do body (ex: método de checkin, sala)
    let checkinMethod = 'APP';
    try {
      const body = await request.json();
      if (body?.method) checkinMethod = body.method;
    } catch {
      // Body vazio é aceito (clique direto)
    }

    // 3. Buscar agendamento e médico responsável
    const { data: appointment, error: aptError } = await supabaseAdmin
      .from('appointments')
      .select(`
        id, clinic_id, doctor_id, patient_id, price, status,
        appointment_date, appointment_time, checked_in_at,
        health_insurance_id, type, payment_type, procedure_id,
        doctor_checked_in_at, verification_level,
        doctor:doctors(id, user_id, percentage),
        patient:patients(id, name)
      `)
      .eq('id', appointmentId)
      .eq('clinic_id', currentUser.clinic_id)
      .single();

    if (aptError || !appointment) {
      return NextResponse.json({ success: false, error: 'Agendamento não encontrado para esta clínica' }, { status: 404 });
    }

    // Validação de permissão: médico só pode dar checkin em seus próprios atendimentos (a menos que seja ADMIN ou COORDENADOR)
    const isAdminOrCoord = currentUser.role === 'CLINIC_ADMIN' || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'COORDINATOR';
    if (!isAdminOrCoord && appointment.doctor?.user_id && appointment.doctor.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Você só pode confirmar presença para seus próprios agendamentos' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // 4. Determinação da Comprovação (Dupla Comprovação se recepção já confirmou)
    const hasReceptionCheckin = Boolean(appointment.checked_in_at);
    const verificationLevel = hasReceptionCheckin ? 'DOUBLE_VERIFIED' : 'DOCTOR_ONLY';

    // 5. Cálculo Centralizado do Repasse Financeiro (Snapshot Imutável)
    // Prioridade 1: doctor_patient_rates (override por paciente)
    // Prioridade 2: doctor_contracts (contrato geral)
    const isInsurance = Boolean(
      appointment.health_insurance_id ||
      appointment.type === 'convenio' ||
      appointment.payment_type === 'CONVENIO'
    );
    const grossPrice = Number(appointment.price) || 0;

    const repasseResult = await resolveDoctorRepasseValue({
      clinicId: currentUser.clinic_id,
      doctorId: appointment.doctor_id,
      patientId: appointment.patient_id,
      appointmentValue: grossPrice,
      isInsurance,
      healthInsuranceId: appointment.health_insurance_id,
      supabaseClient: supabaseAdmin,
    });

    // 6. Atualização em Cascata do Agendamento
    const { data: updatedAppointment, error: updateError } = await (supabaseAdmin
      .from('appointments') as any)
      .update({
        status: 'IN_PROGRESS',
        doctor_checked_in_at: now,
        doctor_checked_in_by: user.id,
        doctor_checkin_method: checkinMethod,
        verification_level: verificationLevel,
        in_consultation_at: now,
        repasse_amount: repasseResult.amount,
        repasse_rate_applied: repasseResult.rateApplied,
        repasse_contract_id: repasseResult.contractId,
        rate_source: repasseResult.source,
        repasse_rate_id: repasseResult.rateId,
        updated_at: now,
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) {
      console.error('[Doctor Check-in] Erro ao atualizar agendamento:', updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    // 7. URL do Prontuário Clínico para abertura imediata
    const prontuarioUrl = `/dashboard/prontuarios/${appointment.id}`;

    return NextResponse.json({
      success: true,
      message: 'Check-in do profissional confirmado com sucesso! Atendimento iniciado.',
      data: {
        appointment: updatedAppointment,
        verification_level: verificationLevel,
        is_double_verified: verificationLevel === 'DOUBLE_VERIFIED',
        repasse: {
          gross_price: grossPrice,
          applied_rate: repasseResult.rateApplied,
          amount: repasseResult.amount,
          contract_id: repasseResult.contractId,
          rate_type: repasseResult.rateType,
          rate_source: repasseResult.source,
          rate_id: repasseResult.rateId,
        },
        prontuario_url: prontuarioUrl,
      },
    });

  } catch (error: any) {
    console.error('[Doctor Check-in API] Erro não tratado:', error);
    return NextResponse.json({ success: false, error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
