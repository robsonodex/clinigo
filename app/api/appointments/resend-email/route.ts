import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendConfirmationEmail } from '@/lib/services/email';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interface for the appointment query result
interface AppointmentQueryResult {
    id: string;
    scheduled_at: string;
    video_link: string | null;
    patients: {
        id: string;
        full_name: string;
        email: string;
    };
    doctors: {
        id: string;
        specialty: string;
        users: {
            full_name: string;
        };
    };
    clinics: {
        id: string;
        name: string;
    };
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { appointmentId } = await req.json();

        if (!appointmentId) {
            return NextResponse.json(
                { error: 'appointmentId é obrigatório' },
                { status: 400 }
            );
        }

        // Verificar autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            );
        }

        // Buscar dados do agendamento com joins
        const { data, error } = await supabase
            .from('appointments')
            .select(`
                id,
                scheduled_at,
                video_link,
                patients!inner (
                    id,
                    full_name,
                    email
                ),
                doctors!inner (
                    id,
                    specialty,
                    users!inner (
                        full_name
                    )
                ),
                clinics!inner (
                    id,
                    name
                )
            `)
            .eq('id', appointmentId)
            .single();

        if (error || !data) {
            console.error('Erro ao buscar agendamento:', error);
            return NextResponse.json(
                { error: 'Agendamento não encontrado' },
                { status: 404 }
            );
        }

        // Cast to our expected type
        const appointment = data as unknown as AppointmentQueryResult;
        const patient = appointment.patients;
        const doctor = appointment.doctors;
        const clinic = appointment.clinics;

        if (!patient?.email) {
            return NextResponse.json(
                { error: 'Paciente sem e-mail cadastrado' },
                { status: 400 }
            );
        }

        const scheduledAt = new Date(appointment.scheduled_at);

        // Enviar e-mail de confirmação
        await sendConfirmationEmail({
            patient_email: patient.email,
            patient_name: patient.full_name,
            doctor_name: doctor.users.full_name,
            specialty: doctor.specialty || 'Clínica Geral',
            clinic_name: clinic.name,
            appointment_date: format(scheduledAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
            appointment_time: format(scheduledAt, 'HH:mm'),
            video_link: appointment.video_link || '',
            appointment_id: appointment.id,
        });

        return NextResponse.json({
            success: true,
            message: 'E-mail reenviado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao reenviar e-mail:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar solicitação' },
            { status: 500 }
        );
    }
}
