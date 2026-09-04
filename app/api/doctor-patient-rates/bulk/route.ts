// app/api/doctor-patient-rates/bulk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { sendDoctorPatientRateNotification } from '@/lib/services/whatsapp-repasse';
import { resolveClinicId } from '@/lib/utils/resolve-clinic-id';

export const dynamic = 'force-dynamic';

const bulkItemSchema = z.object({
  patient_id: z.string().uuid(),
  rate_type: z.enum(['FIXED', 'PERCENTAGE']),
  value: z.number().min(0),
  notes: z.string().optional().nullable(),
});

const bulkPayloadSchema = z.object({
  doctor_id: z.string().uuid(),
  rates: z.array(bulkItemSchema).min(1),
  notify_whatsapp: z.boolean().default(false),
});

/**
 * POST /api/doctor-patient-rates/bulk
 * Atualização em lote de múltiplos valores de pacientes para um médico.
 * Utilizado para edição múltipla em planilha e importação Excel.
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
      .select('id, clinic_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.clinic_id && profile?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
    }

    const { clinicId: resolvedClinicId } = await resolveClinicId({
      profileClinicId: profile?.clinic_id,
      profileRole: profile?.role || '',
    });

    if (!resolvedClinicId) {
      return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
    }

    const canManageRates = ['CLINIC_ADMIN', 'SUPER_ADMIN', 'COORDINATOR'].includes(profile?.role || '');
    if (!canManageRates) {
      return NextResponse.json(
        { success: false, error: 'Sem permissão — apenas administradores podem configurar repasses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = bulkPayloadSchema.parse(body);

    const now = new Date().toISOString();
    let updatedCount = 0;
    let insertedCount = 0;
    const errors: string[] = [];

    // Buscar overrides ativos existentes para este médico para comparação
    const { data: existingRates } = await supabaseAdmin
      .from('doctor_patient_rates')
      .select('*')
      .eq('clinic_id', resolvedClinicId)
      .eq('doctor_id', validated.doctor_id)
      .eq('active', true);

    const existingMap = new Map<string, any>();
    (existingRates || []).forEach((r) => existingMap.set(r.patient_id, r));

    for (const item of validated.rates) {
      try {
        const existing = existingMap.get(item.patient_id);
        const fixedValue = item.rate_type === 'FIXED' ? item.value : null;
        const percentage = item.rate_type === 'PERCENTAGE' ? item.value : null;

        const previousRateType = existing ? existing.rate_type : null;
        const previousValue = existing
          ? existing.rate_type === 'FIXED'
            ? Number(existing.fixed_value)
            : Number(existing.percentage)
          : null;

        let rateId: string;

        if (existing) {
          const { data: updated, error: uErr } = await supabaseAdmin
            .from('doctor_patient_rates')
            .update({
              rate_type: item.rate_type,
              fixed_value: fixedValue,
              percentage: percentage,
              notes: item.notes !== undefined ? item.notes : existing.notes,
              updated_by: user.id,
              updated_at: now,
            })
            .eq('id', existing.id)
            .select('id')
            .single();

          if (uErr) throw uErr;
          rateId = updated.id;
          updatedCount++;
        } else {
          const { data: inserted, error: iErr } = await supabaseAdmin
            .from('doctor_patient_rates')
            .insert({
              clinic_id: resolvedClinicId,
              doctor_id: validated.doctor_id,
              patient_id: item.patient_id,
              rate_type: item.rate_type,
              fixed_value: fixedValue,
              percentage: percentage,
              notes: item.notes || null,
              active: true,
              created_by: user.id,
              updated_by: user.id,
              created_at: now,
              updated_at: now,
            })
            .select('id')
            .single();

          if (iErr) throw iErr;
          rateId = inserted.id;
          insertedCount++;
        }

        // Gravar histórico
        await supabaseAdmin.from('doctor_patient_rate_history').insert({
          rate_id: rateId,
          clinic_id: resolvedClinicId,
          doctor_id: validated.doctor_id,
          patient_id: item.patient_id,
          previous_rate_type: previousRateType,
          previous_value: previousValue,
          new_rate_type: item.rate_type,
          new_value: item.value,
          changed_by: user.id,
          changed_at: now,
        });
      } catch (err: any) {
        errors.push(`Paciente ${item.patient_id}: ${err.message}`);
      }
    }

    // Se notify_whatsapp for true e houver alteração
    let whatsappNotified = false;
    if (validated.notify_whatsapp && (updatedCount > 0 || insertedCount > 0)) {
      try {
        const notifRes = await sendDoctorPatientRateNotification({
          clinicId: resolvedClinicId,
          doctorId: validated.doctor_id,
          patientName: `${validated.rates.length} pacientes atualizados`,
          rateType: 'FIXED',
          value: 0,
        });
        whatsappNotified = notifRes.success;
      } catch {
        // Silencioso se der erro no disparo secundário
      }
    }

    return NextResponse.json({
      success: true,
      processed: updatedCount + insertedCount,
      updated: updatedCount,
      inserted: insertedCount,
      errors: errors.length > 0 ? errors : undefined,
      whatsapp_notified: whatsappNotified,
      message: `${updatedCount + insertedCount} valores de pacientes processados com sucesso!`,
    });
  } catch (error: any) {
    console.error('[API DoctorPatientRates Bulk] Erro no POST:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
