import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appointmentId } = await context.params;
    const supabase = await createClient();
    const adminDb = createServiceRoleClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { data: currentUser } = await (adminDb as any)
      .from('users')
      .select('id, role, clinic_id, full_name')
      .eq('id', user.id)
      .single();

    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Usuário não encontrado' }, { status: 403 });
    }

    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

    // Buscar agendamento
    const { data: appointment, error: aptError } = await (adminDb as any)
      .from('appointments')
      .select('id, clinic_id, doctor_id, patient_id, status')
      .eq('id', appointmentId)
      .single();

    if (aptError || !appointment) {
      return NextResponse.json({ success: false, error: 'Agendamento não encontrado' }, { status: 404 });
    }

    if (!isSuperAdmin && currentUser.clinic_id && appointment.clinic_id !== currentUser.clinic_id) {
      return NextResponse.json({ success: false, error: 'Acesso negado para esta clínica' }, { status: 403 });
    }

    const body = await request.json();
    const { action, reason } = body || {};

    if (!action) {
      return NextResponse.json({ success: false, error: 'Ação clínica não informada' }, { status: 400 });
    }

    const now = new Date().toISOString();
    let updateData: any = {
      updated_at: now
    };

    if (action === 'THERAPIST_CANCELLED') {
      const cancelReason = (reason || '').trim() || 'Desmarcado pelo terapeuta';
      updateData = {
        ...updateData,
        status: 'CANCELLED',
        session_status: 'Terapeuta desmarcou',
        session_status_notes: cancelReason,
        cancellation_reason: cancelReason,
        cancelled_at: now,
        cancelled_by: user.id
      };
    } else if (action === 'JUSTIFIED_ABSENCE') {
      const justifiedReason = (reason || '').trim() || 'Falta justificada';
      updateData = {
        ...updateData,
        status: 'NO_SHOW',
        session_status: 'Falta justificada',
        session_status_notes: justifiedReason,
        no_show: true,
        no_show_reason: justifiedReason,
        marked_no_show_at: now,
        marked_no_show_by: user.id
      };
    } else if (action === 'UNJUSTIFIED_ABSENCE') {
      const unjustifiedReason = (reason || '').trim() || 'Falta não justificada';
      updateData = {
        ...updateData,
        status: 'NO_SHOW',
        session_status: 'Falta injustificada',
        session_status_notes: unjustifiedReason,
        no_show: true,
        no_show_reason: unjustifiedReason,
        marked_no_show_at: now,
        marked_no_show_by: user.id
      };
    } else {
      return NextResponse.json({ success: false, error: 'Ação clínica inválida' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await (adminDb as any)
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .select('*')
      .single();

    if (updateError) {
      console.error('[clinical-status] Erro ao atualizar:', updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Status clínico atualizado com sucesso'
    });
  } catch (err: any) {
    console.error('[clinical-status] Erro interno:', err);
    return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
  }
}
