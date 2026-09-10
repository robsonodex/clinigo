import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/appointments/[id]/unlock-manual
 * Desbloqueia a confirmação de presença manual para um agendamento específico.
 * Ação exclusiva para Administradores da Clínica (ou Super Admin).
 */
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
      .select('id, role, clinic_id, full_name, is_coordinator')
      .eq('id', user.id)
      .single();

    const isAuthorized = currentUser?.role === 'CLINIC_ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.is_coordinator === true;
    if (!isAuthorized) {
      return NextResponse.json({
        success: false,
        error: 'Apenas a administração ou coordenação da clínica pode autorizar o atendimento sem biometria.'
      }, { status: 403 });
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await (adminDb as any)
      .from('appointments')
      .update({
        manual_checkin_unlocked_at: now,
        manual_checkin_unlocked_by: user.id,
      })
      .eq('id', appointmentId)
      .select('id, manual_checkin_unlocked_at, manual_checkin_unlocked_by')
      .single();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Check-in manual desbloqueado com sucesso pela administração.',
      data: updated
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
  }
}

/**
 * DELETE /api/appointments/[id]/unlock-manual
 * Bloqueia novamente a confirmação manual.
 */
export async function DELETE(
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
      .select('id, role, is_coordinator')
      .eq('id', user.id)
      .single();

    const isAuthorized = currentUser?.role === 'CLINIC_ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.is_coordinator === true;
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Apenas a administração ou coordenação da clínica pode alterar o bloqueio manual.' }, { status: 403 });
    }

    const { data: updated, error: updateError } = await (adminDb as any)
      .from('appointments')
      .update({
        manual_checkin_unlocked_at: null,
        manual_checkin_unlocked_by: null,
      })
      .eq('id', appointmentId)
      .select('id, manual_checkin_unlocked_at')
      .single();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Bloqueio de check-in manual reativado.',
      data: updated
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
  }
}
