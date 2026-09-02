// app/api/doctor-patient-rates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { sendDoctorPatientRateNotification } from '@/lib/services/whatsapp-repasse';

export const dynamic = 'force-dynamic';

const rateUpsertSchema = z
  .object({
    doctor_id: z.string().uuid(),
    patient_id: z.string().uuid(),
    rate_type: z.enum(['FIXED', 'PERCENTAGE']),
    fixed_value: z.number().min(0).optional().nullable(),
    percentage: z.number().min(0).max(100).optional().nullable(),
    notes: z.string().optional().nullable(),
    notify_whatsapp: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.rate_type === 'FIXED') {
        return data.fixed_value != null && data.fixed_value >= 0;
      }
      if (data.rate_type === 'PERCENTAGE') {
        return data.percentage != null && data.percentage >= 0 && data.percentage <= 100;
      }
      return false;
    },
    {
      message: 'Para tipo FIXED informe fixed_value; para PERCENTAGE informe percentage entre 0 e 100.',
      path: ['rate_type'],
    }
  );

/**
 * GET /api/doctor-patient-rates?doctorId=...
 * Lista os pacientes vinculados ao profissional com o valor vigente de repasse (override vs contrato padrão)
 * e estatísticas agregadas.
 */
export async function GET(request: NextRequest) {
  try {
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

    if (!profile?.clinic_id) {
      return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId') || searchParams.get('doctor_id');

    if (!doctorId) {
      return NextResponse.json(
        { success: false, error: 'doctorId é obrigatório' },
        { status: 400 }
      );
    }

    // RBAC: DOCTOR só pode ver seus próprios valores se permitido
    if (profile.role === 'DOCTOR') {
      const { data: docRecord } = await supabaseAdmin
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .eq('clinic_id', profile.clinic_id)
        .single();

      if (docRecord?.id !== doctorId) {
        return NextResponse.json(
          { success: false, error: 'Sem permissão para consultar outro profissional' },
          { status: 403 }
        );
      }
    }

    // 1. Buscar contrato ativo do médico para compor valores herdados
    const { data: contracts } = await supabaseAdmin
      .from('doctor_contracts')
      .select('*')
      .eq('clinic_id', profile.clinic_id)
      .eq('doctor_id', doctorId)
      .eq('is_active', true)
      .limit(1);

    const contract = contracts?.[0] || null;

    // Se não tiver contrato, buscar percentual padrão em doctors
    const { data: doctorData } = await supabaseAdmin
      .from('doctors')
      .select('id, percentage')
      .eq('id', doctorId)
      .single();

    const contractDefaultPercentage =
      contract?.percentage_private ?? doctorData?.percentage ?? 70;
    const contractDefaultInsurance =
      contract?.percentage_insurance ?? contractDefaultPercentage;

    // 2. Buscar todos os pacientes que já tiveram agendamento com esse médico
    const { data: appointments, error: aptError } = await supabaseAdmin
      .from('appointments')
      .select('patient_id, appointment_date, status, patient:patients(id, name)')
      .eq('clinic_id', profile.clinic_id)
      .eq('doctor_id', doctorId);

    if (aptError) {
      throw aptError;
    }

    // Mapa de pacientes únicos atendidos por esse médico
    const patientMap = new Map<
      string,
      {
        id: string;
        name: string;
        total_appointments: number;
        last_appointment_date: string | null;
      }
    >();

    (appointments || []).forEach((apt: any) => {
      const patId = apt.patient_id;
      if (!patId) return;

      const patName =
        (Array.isArray(apt.patient) ? apt.patient[0]?.name : apt.patient?.name) || 'Paciente';

      const existing = patientMap.get(patId);
      if (!existing) {
        patientMap.set(patId, {
          id: patId,
          name: patName,
          total_appointments: 1,
          last_appointment_date: apt.appointment_date,
        });
      } else {
        existing.total_appointments++;
        if (
          !existing.last_appointment_date ||
          (apt.appointment_date && apt.appointment_date > existing.last_appointment_date)
        ) {
          existing.last_appointment_date = apt.appointment_date;
        }
      }
    });

    // 3. Buscar overrides ativos em doctor_patient_rates
    const { data: overrides, error: ovError } = await supabaseAdmin
      .from('doctor_patient_rates')
      .select(`
        id, clinic_id, doctor_id, patient_id, rate_type,
        fixed_value, percentage, active, notes, created_at, updated_at,
        patient:patients(id, name)
      `)
      .eq('clinic_id', profile.clinic_id)
      .eq('doctor_id', doctorId)
      .eq('active', true);

    if (ovError) {
      throw ovError;
    }

    const overrideMap = new Map<string, any>();
    (overrides || []).forEach((ov: any) => {
      overrideMap.set(ov.patient_id, ov);

      // Se o paciente do override ainda não estava no mapa de appointments, inclui ele
      if (!patientMap.has(ov.patient_id)) {
        const patName =
          (Array.isArray(ov.patient) ? ov.patient[0]?.name : ov.patient?.name) || 'Paciente';
        patientMap.set(ov.patient_id, {
          id: ov.patient_id,
          name: patName,
          total_appointments: 0,
          last_appointment_date: null,
        });
      }
    });

    // 4. Consolidar lista de pacientes com o repasse vigente
    let customCount = 0;
    let defaultCount = 0;
    let sumPercentageOrValue = 0;
    let maxItem: any = null;
    let minItem: any = null;

    const patientRatesList = Array.from(patientMap.values()).map((p) => {
      const ov = overrideMap.get(p.id);

      if (ov) {
        customCount++;
        const isFixed = ov.rate_type === 'FIXED';
        const rateValue = isFixed ? Number(ov.fixed_value) : Number(ov.percentage);
        sumPercentageOrValue += rateValue;

        const currentItem = {
          patient_id: p.id,
          patient_name: p.name,
          has_override: true,
          override_id: ov.id,
          rate_type: ov.rate_type as 'FIXED' | 'PERCENTAGE',
          rate_value: rateValue,
          fixed_value: ov.fixed_value != null ? Number(ov.fixed_value) : null,
          percentage: ov.percentage != null ? Number(ov.percentage) : null,
          source: 'PATIENT_OVERRIDE' as const,
          notes: ov.notes || null,
          updated_at: ov.updated_at,
          total_appointments: p.total_appointments,
          last_appointment_date: p.last_appointment_date,
        };

        if (!maxItem || rateValue > maxItem.rate_value) maxItem = currentItem;
        if (!minItem || rateValue < minItem.rate_value) minItem = currentItem;

        return currentItem;
      }

      // Herança do contrato
      defaultCount++;
      const defaultRateValue = Number(contractDefaultPercentage);
      sumPercentageOrValue += defaultRateValue;

      const defaultItem = {
        patient_id: p.id,
        patient_name: p.name,
        has_override: false,
        override_id: null,
        rate_type: 'PERCENTAGE' as const,
        rate_value: defaultRateValue,
        fixed_value: null,
        percentage: defaultRateValue,
        source: 'CONTRACT_DEFAULT' as const,
        notes: null,
        updated_at: contract?.updated_at || null,
        total_appointments: p.total_appointments,
        last_appointment_date: p.last_appointment_date,
      };

      if (!maxItem || defaultRateValue > maxItem.rate_value) maxItem = defaultItem;
      if (!minItem || defaultRateValue < minItem.rate_value) minItem = defaultItem;

      return defaultItem;
    });

    // Ordenar por nome do paciente
    patientRatesList.sort((a, b) => a.patient_name.localeCompare(b.patient_name));

    const totalPatients = patientRatesList.length;
    const averageRate =
      totalPatients > 0 ? Number((sumPercentageOrValue / totalPatients).toFixed(2)) : 0;

    const statistics = {
      total_patients: totalPatients,
      custom_count: customCount,
      default_count: defaultCount,
      average_rate: averageRate,
      max_rate: maxItem
        ? {
            patient_name: maxItem.patient_name,
            value: maxItem.rate_value,
            rate_type: maxItem.rate_type,
          }
        : null,
      min_rate: minItem
        ? {
            patient_name: minItem.patient_name,
            value: minItem.rate_value,
            rate_type: minItem.rate_type,
          }
        : null,
      contract_default: {
        percentage_private: contractDefaultPercentage,
        percentage_insurance: contractDefaultInsurance,
        contract_type: contract?.contract_type || 'PERCENTAGE_GROSS',
      },
    };

    return NextResponse.json({
      success: true,
      data: patientRatesList,
      statistics,
    });
  } catch (error: any) {
    console.error('[API DoctorPatientRates] Erro no GET:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/doctor-patient-rates
 * Cria ou atualiza override de repasse para o par (doctor_id, patient_id)
 * Registra histórico detalhado para auditoria.
 */
export async function POST(request: NextRequest) {
  try {
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
      .select('id, clinic_id, role, full_name')
      .eq('id', user.id)
      .single();

    if (!profile?.clinic_id) {
      return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
    }

    // Apenas Administradores e Coordenadores podem alterar repasses
    const canManageRates = ['CLINIC_ADMIN', 'SUPER_ADMIN', 'COORDINATOR'].includes(profile.role);
    if (!canManageRates) {
      return NextResponse.json(
        { success: false, error: 'Sem permissão — apenas administradores podem configurar repasses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = rateUpsertSchema.parse(body);

    const now = new Date().toISOString();

    // 1. Verificar se já existe override ativo para este par
    const { data: existingRate } = await supabaseAdmin
      .from('doctor_patient_rates')
      .select('*')
      .eq('clinic_id', profile.clinic_id)
      .eq('doctor_id', validated.doctor_id)
      .eq('patient_id', validated.patient_id)
      .eq('active', true)
      .maybeSingle();

    const previousRateType = existingRate ? existingRate.rate_type : null;
    const previousValue = existingRate
      ? existingRate.rate_type === 'FIXED'
        ? Number(existingRate.fixed_value)
        : Number(existingRate.percentage)
      : null;

    const newValue =
      validated.rate_type === 'FIXED'
        ? Number(validated.fixed_value)
        : Number(validated.percentage);

    let savedRate: any = null;

    if (existingRate) {
      // Atualiza registro existente
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('doctor_patient_rates')
        .update({
          rate_type: validated.rate_type,
          fixed_value: validated.rate_type === 'FIXED' ? validated.fixed_value : null,
          percentage: validated.rate_type === 'PERCENTAGE' ? validated.percentage : null,
          notes: validated.notes !== undefined ? validated.notes : existingRate.notes,
          updated_by: user.id,
          updated_at: now,
        })
        .eq('id', existingRate.id)
        .select()
        .single();

      if (updateError) throw updateError;
      savedRate = updated;
    } else {
      // Insere novo override
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('doctor_patient_rates')
        .insert({
          clinic_id: profile.clinic_id,
          doctor_id: validated.doctor_id,
          patient_id: validated.patient_id,
          rate_type: validated.rate_type,
          fixed_value: validated.rate_type === 'FIXED' ? validated.fixed_value : null,
          percentage: validated.rate_type === 'PERCENTAGE' ? validated.percentage : null,
          notes: validated.notes || null,
          active: true,
          created_by: user.id,
          updated_by: user.id,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      savedRate = inserted;
    }

    // 2. Gravar histórico de auditoria
    await supabaseAdmin.from('doctor_patient_rate_history').insert({
      rate_id: savedRate.id,
      clinic_id: profile.clinic_id,
      doctor_id: validated.doctor_id,
      patient_id: validated.patient_id,
      previous_rate_type: previousRateType,
      previous_value: previousValue,
      new_rate_type: validated.rate_type,
      new_value: newValue,
      changed_by: user.id,
      changed_at: now,
    });

    // 3. Notificação opcional via WhatsApp
    let whatsappNotified = false;
    if (validated.notify_whatsapp) {
      const { data: patient } = await supabaseAdmin
        .from('patients')
        .select('name')
        .eq('id', validated.patient_id)
        .single();

      const notifRes = await sendDoctorPatientRateNotification({
        clinicId: profile.clinic_id,
        doctorId: validated.doctor_id,
        patientName: patient?.name || 'Paciente',
        rateType: validated.rate_type,
        value: newValue,
      });
      whatsappNotified = notifRes.success;
    }

    return NextResponse.json({
      success: true,
      data: savedRate,
      whatsapp_notified: whatsappNotified,
      message: 'Valor de repasse do paciente salvo com sucesso!',
    });
  } catch (error: any) {
    console.error('[API DoctorPatientRates] Erro no POST:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
