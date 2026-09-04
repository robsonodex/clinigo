// app/api/doctor-patient-rates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { resolveClinicId } from '@/lib/utils/resolve-clinic-id';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/doctor-patient-rates/[id]
 * Realiza soft delete do override individual (active = false).
 * O paciente volta a herdar as regras do contrato geral do profissional.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rateId } = await context.params;
    const supabase = await createClient();
    const supabaseAdmin = createServiceRoleClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id, clinic_id, role')
      .eq('id', user.id)
      .single();

    const { clinicId: resolvedClinicId } = await resolveClinicId({
      profileClinicId: profile?.clinic_id,
      profileRole: profile?.role || '',
    });

    if (!resolvedClinicId) {
      return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
    }

    const canManage = ['CLINIC_ADMIN', 'SUPER_ADMIN', 'COORDINATOR'].includes(profile?.role || '');
    if (!canManage) {
      return NextResponse.json(
        { success: false, error: 'Sem permissão — apenas administradores podem alterar repasses' },
        { status: 403 }
      );
    }

    // 1. Buscar o override existente
    const { data: rate, error: findError } = await supabaseAdmin
      .from('doctor_patient_rates')
      .select('*')
      .eq('id', rateId)
      .eq('clinic_id', resolvedClinicId)
      .single();

    if (findError || !rate) {
      return NextResponse.json(
        { success: false, error: 'Registro de valor personalizado não encontrado' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    // 2. Soft-delete (active = false)
    const { error: updateError } = await supabaseAdmin
      .from('doctor_patient_rates')
      .update({
        active: false,
        updated_by: user.id,
        updated_at: now,
      })
      .eq('id', rateId);

    if (updateError) {
      throw updateError;
    }

    // 3. Registrar na trilha de auditoria
    const previousVal =
      rate.rate_type === 'FIXED' ? Number(rate.fixed_value) : Number(rate.percentage);

    await supabaseAdmin.from('doctor_patient_rate_history').insert({
      rate_id: rate.id,
      clinic_id: resolvedClinicId,
      doctor_id: rate.doctor_id,
      patient_id: rate.patient_id,
      previous_rate_type: rate.rate_type,
      previous_value: previousVal,
      new_rate_type: 'CONTRACT_DEFAULT',
      new_value: 0,
      changed_by: user.id,
      changed_at: now,
    });

    return NextResponse.json({
      success: true,
      message: 'Valor personalizado removido. O paciente voltou a seguir o contrato padrão do profissional.',
    });
  } catch (error: any) {
    console.error('[API DoctorPatientRates] Erro no DELETE:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
