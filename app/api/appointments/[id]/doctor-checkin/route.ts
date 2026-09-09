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

    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
    if (userError || (!currentUser?.clinic_id && !isSuperAdmin)) {
      return NextResponse.json({ success: false, error: 'Perfil ou clínica não encontrados' }, { status: 403 });
    }

    // 2. Parse opcional do body
    let checkinMethod = 'APP';
    let biometricVerified = false;
    let biometricPersonName: string | null = null;
    let justificationReason: string | null = null;
    try {
      const body = await request.json();
      if (body?.method) checkinMethod = body.method;
      if (body?.biometric_verified) biometricVerified = true;
      if (body?.person_name) biometricPersonName = body.person_name;
      if (body?.reason) justificationReason = body.reason;
    } catch {
      // Body vazio é aceito
    }

    // 3. Buscar agendamento e médico responsável
    let query = supabaseAdmin
      .from('appointments')
      .select(`
        id, clinic_id, doctor_id, patient_id, status,
        appointment_date, appointment_time, checked_in_at,
        health_insurance_plan_id, appointment_type, payment_type,
        doctor_checked_in_at, verification_level,
        manual_checkin_unlocked_at, manual_checkin_unlocked_by,
        doctor:doctors!appointments_doctor_id_fkey(id, user_id, consultation_price),
        patient:patients(id, full_name)
      `)
      .eq('id', appointmentId);

    if (!isSuperAdmin && currentUser?.clinic_id) {
      query = query.eq('clinic_id', currentUser.clinic_id);
    }

    const { data: appointment, error: aptError } = await query.single();

    if (aptError || !appointment) {
      return NextResponse.json({
        success: false,
        error: 'Agendamento não encontrado para esta clínica'
      }, { status: 404 });
    }

    const effectiveClinicId = appointment.clinic_id || currentUser?.clinic_id;
    const isAdminOrCoord = currentUser?.role === 'CLINIC_ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'COORDINATOR';

    // 4. Validação de Bloqueio de Check-in Manual por Terapeuta
    const isManualCheckin = !biometricVerified && checkinMethod !== 'FACIAL_DOCTOR';
    if (isManualCheckin && !isAdminOrCoord) {
      // Terapeuta tentando confirmar manualmente sem biometria
      if (!appointment.manual_checkin_unlocked_at) {
        return NextResponse.json({
          success: false,
          error: 'A confirmação manual de presença está bloqueada para terapeutas. Solicite o desbloqueio ao administrador da clínica.'
        }, { status: 403 });
      }
    }

    // Validação de permissão do agendamento
    if (!isAdminOrCoord && appointment.doctor?.user_id && appointment.doctor.user_id !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'Você só pode confirmar presença para seus próprios agendamentos'
      }, { status: 403 });
    }

    const now = new Date().toISOString();

    // 5. Determinação da Comprovação
    const hasReceptionCheckin = Boolean(appointment.checked_in_at);
    let verificationLevel = 'DOCTOR_ONLY';
    if (hasReceptionCheckin && (biometricVerified || checkinMethod === 'FACIAL_DOCTOR')) {
      verificationLevel = 'DOUBLE_VERIFIED';
    } else if (hasReceptionCheckin) {
      verificationLevel = 'DOUBLE_VERIFIED';
    } else if (biometricVerified || checkinMethod === 'FACIAL_DOCTOR') {
      verificationLevel = 'FACIAL_DOCTOR';
    }

    // 6. Cálculo Centralizado do Repasse Financeiro
    const isInsurance = Boolean(
      appointment.health_insurance_plan_id ||
      appointment.appointment_type === 'convenio' ||
      appointment.payment_type === 'CONVENIO'
    );
    const grossPrice = Number(appointment.doctor?.consultation_price) || 0;

    const repasseResult = await resolveDoctorRepasseValue({
      clinicId: effectiveClinicId,
      doctorId: appointment.doctor_id,
      patientId: appointment.patient_id,
      appointmentValue: grossPrice,
      isInsurance,
      healthInsuranceId: appointment.health_insurance_plan_id,
      supabaseClient: supabaseAdmin,
    });

    const statusNotes = biometricPersonName 
      ? `Presença confirmada por biometria facial (${biometricPersonName})`
      : checkinMethod === 'FACIAL_DOCTOR' 
        ? 'Presença confirmada por biometria facial do consultório'
        : justificationReason 
          ? `Presença manual justificada: ${justificationReason}`
          : 'Presença confirmada pelo profissional no consultório';

    // 7. Atualização do Agendamento
    const { data: updatedAppointment, error: updateError } = await (supabaseAdmin
      .from('appointments') as any)
      .update({
        status: 'IN_PROGRESS',
        doctor_checked_in_at: now,
        doctor_checked_in_by: user.id,
        doctor_checkin_method: checkinMethod,
        verification_level: verificationLevel,
        session_status: 'Presente',
        session_status_notes: statusNotes,
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

    // 8. URL do Prontuário Clínico para abertura imediata
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
