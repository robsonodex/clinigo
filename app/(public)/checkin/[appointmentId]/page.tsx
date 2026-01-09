import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { PreCheckinWizard } from '@/components/checkin/PreCheckinWizard'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Heart, AlertCircle } from 'lucide-react'

export const metadata = {
    title: 'Pré-Check-in | CliniGo',
    description: 'Preencha o formulário de pré-check-in para agilizar seu atendimento',
}

interface PageProps {
    params: { appointmentId: string }
    searchParams: { clinic?: string }
}

async function getAppointmentData(appointmentId: string) {
    const supabase = createServiceRoleClient()

    const { data: appointment, error } = await supabase
        .from('appointments')
        .select(`
            id,
            appointment_date,
            appointment_time,
            status,
            clinic_id,
            patient_id,
            patients (
                id,
                full_name,
                phone,
                email
            ),
            doctors (
                id,
                full_name
            ),
            clinics (
                id,
                name,
                logo_url
            )
        `)
        .eq('id', appointmentId)
        .single()

    if (error || !appointment) {
        return null
    }

    return appointment
}

async function CheckinContent({ appointmentId }: { appointmentId: string }) {
    const appointment = await getAppointmentData(appointmentId)

    if (!appointment) {
        return (
            <Card className="max-w-lg mx-auto">
                <CardContent className="pt-6 text-center">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                    <h2 className="text-xl font-semibold text-red-700">Agendamento não encontrado</h2>
                    <p className="text-muted-foreground mt-2">
                        O link de check-in pode ter expirado ou o agendamento foi cancelado.
                    </p>
                </CardContent>
            </Card>
        )
    }

    // Check if appointment is in a valid status
    const validStatuses = ['CONFIRMED', 'PENDING_PAYMENT', 'PENDING']
    if (!validStatuses.includes(appointment.status)) {
        return (
            <Card className="max-w-lg mx-auto">
                <CardContent className="pt-6 text-center">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-amber-500" />
                    <h2 className="text-xl font-semibold text-amber-700">Check-in não disponível</h2>
                    <p className="text-muted-foreground mt-2">
                        {appointment.status === 'WAITING_ROOM'
                            ? 'Você já realizou o check-in para este agendamento.'
                            : appointment.status === 'COMPLETED'
                                ? 'Esta consulta já foi realizada.'
                                : appointment.status === 'CANCELLED'
                                    ? 'Este agendamento foi cancelado.'
                                    : `Status atual: ${appointment.status}`
                        }
                    </p>
                </CardContent>
            </Card>
        )
    }

    // Format date
    const appointmentDate = new Date(appointment.appointment_date)
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    })

    return (
        <PreCheckinWizard
            appointmentId={appointment.id}
            clinicId={appointment.clinic_id}
            patientName={(appointment.patients as any)?.full_name}
            doctorName={(appointment.doctors as any)?.full_name}
            appointmentDate={formattedDate}
            appointmentTime={appointment.appointment_time?.substring(0, 5)}
        />
    )
}

export default function CheckinPage({ params }: PageProps) {
    const { appointmentId } = params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(appointmentId)) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b py-4">
                <div className="container mx-auto px-4 flex items-center justify-center gap-2">
                    <Heart className="w-6 h-6 text-green-600" />
                    <h1 className="text-xl font-bold text-green-700">CliniGo</h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <Suspense
                    fallback={
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                            <p className="text-muted-foreground">Carregando dados do agendamento...</p>
                        </div>
                    }
                >
                    <CheckinContent appointmentId={appointmentId} />
                </Suspense>
            </main>

            {/* Footer */}
            <footer className="mt-auto py-6 text-center text-sm text-muted-foreground">
                <p>© 2026 CliniGo. Todos os direitos reservados.</p>
                <p className="mt-1">
                    Seus dados estão protegidos pela LGPD.
                </p>
            </footer>
        </div>
    )
}
