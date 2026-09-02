import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  authenticateDoctorByPhone,
  calculateDoctorMonthlyExtract,
  formatRepasseWhatsAppMessage,
  processIncomingWhatsAppRepasse,
} from '@/lib/services/whatsapp-repasse';
import { z } from 'zod';

const extractTestSchema = z.object({
  phone: z.string().min(8),
  doctor_id: z.string().uuid().optional(),
  command_text: z.string().default('extrato'),
  send_whatsapp: z.boolean().default(false),
  sector: z.string().default('default'),
});

/**
 * GET /api/whatsapp/repasse-extract
 * Obtém prévia do extrato de repasse para o profissional logado ou doctor_id especificado
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, clinic_id, role, full_name, phone')
      .eq('id', user.id)
      .single();

    if (!profile?.clinic_id) {
      return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const doctorIdParam = searchParams.get('doctor_id');

    let resolvedDoctorId = doctorIdParam;

    // Se for DOCTOR, força o seu próprio ID
    if (profile.role === 'DOCTOR') {
      const { data: doctorRecord } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .eq('clinic_id', profile.clinic_id)
        .single();

      if (!doctorRecord) {
        return NextResponse.json({ success: false, error: 'Perfil profissional não encontrado' }, { status: 404 });
      }
      resolvedDoctorId = doctorRecord.id;
    } else if (!resolvedDoctorId) {
      // Se for admin e não passou doctor_id, busca o primeiro médico ativo para preview
      const { data: firstDoc } = await supabase
        .from('doctors')
        .select('id')
        .eq('clinic_id', profile.clinic_id)
        .eq('is_active', true)
        .limit(1)
        .single();

      resolvedDoctorId = firstDoc?.id || null;
    }

    if (!resolvedDoctorId) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum profissional encontrado para calcular o extrato',
      }, { status: 404 });
    }

    const extractData = await calculateDoctorMonthlyExtract(profile.clinic_id, resolvedDoctorId);

    if (!extractData) {
      return NextResponse.json({ success: false, error: 'Falha ao calcular extrato' }, { status: 500 });
    }

    const formattedMessage = formatRepasseWhatsAppMessage(extractData);

    return NextResponse.json({
      success: true,
      data: extractData,
      formatted_message: formattedMessage,
    });
  } catch (error: any) {
    console.error('[API WhatsApp Repasse] Erro no GET:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/repasse-extract
 * Simula ou dispara o comando de extrato para teste/envio
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, clinic_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.clinic_id) {
      return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
    }

    const body = await request.json();
    const validated = extractTestSchema.parse(body);

    const senderJid = `${validated.phone.replace(/\D/g, '')}@s.whatsapp.net`;

    if (validated.send_whatsapp) {
      // Processa e dispara via WhatsApp de fato
      const result = await processIncomingWhatsAppRepasse(
        profile.clinic_id,
        senderJid,
        validated.command_text,
        validated.sector
      );

      return NextResponse.json({
        success: true,
        handled: result.handled,
        sent: result.sent,
        preview_message: result.message,
      });
    }

    // Apenas simulação (autentica + calcula sem enviar)
    const { doctor, clinic } = await authenticateDoctorByPhone(profile.clinic_id, validated.phone);

    if (!doctor) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        error: 'Telefone não autenticado como profissional da clínica',
      }, { status: 404 });
    }

    const extractData = await calculateDoctorMonthlyExtract(profile.clinic_id, doctor.id);
    if (!extractData) {
      return NextResponse.json({ success: false, error: 'Erro ao calcular extrato' }, { status: 500 });
    }

    const formattedMessage = formatRepasseWhatsAppMessage(extractData);

    return NextResponse.json({
      success: true,
      authenticated: true,
      doctor: {
        id: doctor.id,
        name: doctor.user.full_name,
        specialty: doctor.specialty,
        phone: doctor.user.phone,
      },
      data: extractData,
      formatted_message: formattedMessage,
    });
  } catch (error: any) {
    console.error('[API WhatsApp Repasse] Erro no POST:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Dados inválidos', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
