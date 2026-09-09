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
      .select('id, role, clinic_id, full_name')
      .eq('id', user.id)
      .single();

    const isAdmin = currentUser?.role === 'CLINIC_ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Apenas administradores podem desbloquear o check-in manual para este agendamento.'
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
      .select('id, role')
      .eq('id', user.id)
      .single();

    const isAdmin = currentUser?.role === 'CLINIC_ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Apenas administradores podem alterar o bloqueio manual.' }, { status: 403 });
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
