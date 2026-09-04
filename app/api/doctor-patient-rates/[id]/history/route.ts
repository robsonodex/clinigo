// app/api/doctor-patient-rates/[id]/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { resolveClinicId } from '@/lib/utils/resolve-clinic-id';

export const dynamic = 'force-dynamic';

/**
 * GET /api/doctor-patient-rates/[id]/history
 * Retorna a linha do tempo de auditoria das mudanças de repasse daquele par (médico, paciente).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rateOrPatientId } = await context.params;
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

    // Busca o registro para saber doctor_id e patient_id caso o id seja de doctor_patient_rates
    const { data: rateRecord } = await supabaseAdmin
      .from('doctor_patient_rates')
      .select('id, doctor_id, patient_id')
      .eq('id', rateOrPatientId)
      .eq('clinic_id', resolvedClinicId)
      .maybeSingle();

    let query = supabaseAdmin
      .from('doctor_patient_rate_history')
      .select(`
        id, rate_id, clinic_id, doctor_id, patient_id,
        previous_rate_type, previous_value,
        new_rate_type, new_value,
        changed_at,
        user:users!changed_by(id, full_name, email)
      `)
      .eq('clinic_id', resolvedClinicId)
      .order('changed_at', { ascending: false });

    if (rateRecord) {
      // Filtra por doctor_id e patient_id para pegar histórico completo mesmo se o rate_id tiver sido recriado
      query = query
        .eq('doctor_id', rateRecord.doctor_id)
        .eq('patient_id', rateRecord.patient_id);
    } else {
      // Tenta filtrar diretamente por rate_id ou patient_id
      query = query.or(`rate_id.eq.${rateOrPatientId},patient_id.eq.${rateOrPatientId}`);
    }

    const { data: history, error: hError } = await query;

    if (hError) {
      throw hError;
    }

    const formattedHistory = (history || []).map((item: any) => {
      const changer = Array.isArray(item.user) ? item.user[0] : item.user;
      return {
        id: item.id,
        rate_id: item.rate_id,
        previous_rate_type: item.previous_rate_type,
        previous_value: item.previous_value != null ? Number(item.previous_value) : null,
        new_rate_type: item.new_rate_type,
        new_value: Number(item.new_value),
        changed_at: item.changed_at,
        changed_by_name: changer?.full_name || changer?.email || 'Administrador',
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedHistory,
    });
  } catch (error: any) {
    console.error('[API DoctorPatientRates History] Erro:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
