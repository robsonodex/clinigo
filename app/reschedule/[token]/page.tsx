'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, User, Stethoscope, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface ReschedulePageProps {
    params: {
        token: string
    }
}

interface TokenData {
    id: string
    appointment_id: string
    patient_id: string
    clinic_id: string
    token: string
    expires_at: string
    appointment: {
        id: string
        appointment_date: string
        appointment_time: string
        patient: {
            id: string
            full_name: string
            email: string
            phone: string
        }
        doctor: {
            id: string
            specialty: string
            user: {
                full_name: string
            }
        }
        clinic: {
            id: string
            name: string
            phone: string
        }
    }
}

interface AvailableSlot {
    appointment_date: string
    appointment_time: string
    slot_time: string
}

export default function ReschedulePage({ params }: ReschedulePageProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [tokenData, setTokenData] = useState<TokenData | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
    const [selectedDate, setSelectedDate] = useState('')
    const [selectedTime, setSelectedTime] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        validateToken()
    }, [params.token])

    const validateToken = async () => {
        try {
            const response = await fetch(`/api/reschedule/validate/${params.token}`)
            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Token inválido ou expirado')
                setLoading(false)
                return
            }

            setTokenData(data.tokenData)

            // Fetch available slots for the same doctor
            fetchAvailableSlots(data.tokenData.appointment.doctor.id)

            setLoading(false)
        } catch (err) {
            setError('Erro ao validar token')
            setLoading(false)
        }
    }

    const fetchAvailableSlots = async (doctorId: string) => {
        try {
            // Get next 14 days of available slots
            const dates = Array.from({ length: 14 }, (_, i) => {
                const date = new Date()
                date.setDate(date.getDate() + i + 1) // Start from tomorrow
                return date.toISOString().split('T')[0]
            })

            const allSlots: AvailableSlot[] = []

            for (const date of dates) {
                const response = await fetch(
                    `/api/appointments/available-slots?doctor_id=${doctorId}&date=${date}`
                )
                const data = await response.json()

                if (data.available_slots && data.available_slots.length > 0) {
                    allSlots.push(
                        ...data.available_slots.map((slot: any) => ({
                            appointment_date: date,
                            appointment_time: slot.slot_time || slot,
                            slot_time: slot.slot_time || slot,
                        }))
                    )
                }
            }

            setAvailableSlots(allSlots)
        } catch (err) {
            console.error('Error fetching slots:', err)
        }
    }

    const handleReschedule = async () => {
        if (!selectedDate || !selectedTime) {
            toast.error('Selecione data e horário')
            return
        }

        setSubmitting(true)

        try {
            const response = await fetch(`/api/reschedule/${params.token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointment_date: selectedDate,
                    appointment_time: selectedTime,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao reagendar')
            }

            toast.success('Consulta reagendada com sucesso!')

            // Redirect to success page
            router.push(`/reschedule/success?date=${selectedDate}&time=${selectedTime}`)

        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao reagendar')
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-muted-foreground">Validando...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (error || !tokenData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md border-red-200">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-red-600">
                            <XCircle className="w-6 h-6" />
                            <CardTitle>Link Inválido</CardTitle>
                        </div>
                        <CardDescription className="text-red-600">
                            {error || 'Este link de reagendamento não é válido ou já foi utilizado.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Entre em contato com a clínica para reagendar sua consulta:
                        </p>
                        {tokenData?.appointment?.clinic && (
                            <p className="font-medium">
                                {tokenData.appointment.clinic.name}
                                <br />
                                <a
                                    href={`tel:${tokenData.appointment.clinic.phone}`}
                                    className="text-primary hover:underline"
                                >
                                    {tokenData.appointment.clinic.phone}
                                </a>
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    const { appointment } = tokenData
    const uniqueDates = [...new Set(availableSlots.map(s => s.appointment_date))]
    const filteredTimes = selectedDate
        ? availableSlots.filter(s => s.appointment_date === selectedDate)
        : []

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2 text-primary">
                            <Calendar className="w-6 h-6" />
                            <CardTitle>Reagendar Consulta</CardTitle>
                        </div>
                        <CardDescription>
                            {appointment.clinic.name}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Previous Appointment Info */}
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Consulta original:</p>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium">{appointment.patient.full_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4 text-muted-foreground" />
                                    <span>{appointment.doctor.user.full_name} - {appointment.doctor.specialty}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span>
                                        {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')} às{' '}
                                        {appointment.appointment_time}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Reschedule Form */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="date">Nova Data</Label>
                                <Select value={selectedDate} onValueChange={setSelectedDate}>
                                    <SelectTrigger id="date">
                                        <SelectValue placeholder="Selecione uma data" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniqueDates.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-muted-foreground">
                                                Nenhum horário disponível
                                            </div>
                                        ) : (
                                            uniqueDates.map(date => (
                                                <SelectItem key={date} value={date}>
                                                    {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                    })}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="time">Novo Horário</Label>
                                <Select
                                    value={selectedTime}
                                    onValueChange={setSelectedTime}
                                    disabled={!selectedDate}
                                >
                                    <SelectTrigger id="time">
                                        <SelectValue placeholder="Selecione um horário" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredTimes.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-muted-foreground">
                                                {selectedDate ? 'Nenhum horário disponível' : 'Selecione uma data primeiro'}
                                            </div>
                                        ) : (
                                            filteredTimes.map(slot => (
                                                <SelectItem key={slot.slot_time} value={slot.slot_time}>
                                                    {slot.slot_time}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            onClick={handleReschedule}
                            disabled={!selectedDate || !selectedTime || submitting}
                            className="w-full"
                            size="lg"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Reagendando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Confirmar Reagendamento
                                </>
                            )}
                        </Button>

                        {/* Help Text */}
                        <p className="text-xs text-center text-muted-foreground">
                            Ao confirmar, você receberá uma confirmação por email.
                            <br />
                            Dúvidas? Entre em contato:{' '}
                            <a
                                href={`tel:${appointment.clinic.phone}`}
                                className="text-primary hover:underline"
                            >
                                {appointment.clinic.phone}
                            </a>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
