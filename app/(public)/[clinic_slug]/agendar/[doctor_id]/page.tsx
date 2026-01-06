'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, addDays, isBefore, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TimeSlotPicker } from '@/components/calendar/time-slot-picker'
import { api, type Doctor, type AvailableSlotsResponse } from '@/lib/api-client'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageProps {
    params: Promise<{ clinic_slug: string; doctor_id: string }>
}

export default function SelectDateTimePage({ params }: PageProps) {
    const { clinic_slug, doctor_id } = use(params)
    const router = useRouter()
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedTime, setSelectedTime] = useState<string | null>(null)

    // Fetch doctor data
    const { data: doctor, isLoading: doctorLoading } = useQuery({
        queryKey: ['doctor', doctor_id],
        queryFn: () => api.get<Doctor>(`/doctors/${doctor_id}`),
    })

    // Fetch available slots when date is selected
    const { data: slotsData, isLoading: slotsLoading } = useQuery({
        queryKey: ['available-slots', doctor_id, selectedDate?.toISOString().split('T')[0]],
        queryFn: () =>
            api.get<AvailableSlotsResponse>('/appointments/available-slots', {
                doctor_id,
                date: selectedDate!.toISOString().split('T')[0],
            }),
        enabled: !!selectedDate,
    })

    // Generate next 14 days
    const today = startOfDay(new Date())
    const dates = Array.from({ length: 14 }, (_, i) => addDays(today, i))

    const handleContinue = () => {
        if (!selectedDate || !selectedTime) return
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        router.push(
            `/${clinic_slug}/agendar/${doctor_id}/confirmar?date=${dateStr}&time=${selectedTime}`
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="border-b bg-white sticky top-0 z-10">
                <div className="container mx-auto px-4 h-14 flex items-center">
                    <Link
                        href={`/${clinic_slug}/agendar`}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 max-w-4xl">
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Date Selection */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Selecione a data
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                                    {dates.map((date) => {
                                        const isSelected =
                                            selectedDate?.toDateString() === date.toDateString()
                                        const isToday = date.toDateString() === today.toDateString()

                                        return (
                                            <button
                                                key={date.toISOString()}
                                                onClick={() => {
                                                    setSelectedDate(date)
                                                    setSelectedTime(null)
                                                }}
                                                className={cn(
                                                    'flex-shrink-0 flex flex-col items-center p-3 rounded-lg border transition-all min-w-[72px]',
                                                    isSelected
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'bg-white hover:border-primary/50'
                                                )}
                                            >
                                                <span className="text-xs font-medium uppercase">
                                                    {format(date, 'EEE', { locale: ptBR })}
                                                </span>
                                                <span className="text-2xl font-bold">
                                                    {format(date, 'd')}
                                                </span>
                                                <span className="text-xs">
                                                    {isToday ? 'Hoje' : format(date, 'MMM', { locale: ptBR })}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Time Slots */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    Horários disponíveis
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!selectedDate ? (
                                    <p className="text-muted-foreground text-center py-8">
                                        Selecione uma data para ver os horários
                                    </p>
                                ) : (
                                    <TimeSlotPicker
                                        slots={slotsData?.available_slots}
                                        selected={selectedTime}
                                        onSelect={setSelectedTime}
                                        isLoading={slotsLoading}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar - Doctor Summary */}
                    <div className="md:col-span-1">
                        <Card className="sticky top-20">
                            <CardHeader>
                                <CardTitle className="text-lg">Resumo</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {doctorLoading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-4 w-2/3" />
                                    </div>
                                ) : doctor ? (
                                    <>
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{doctor.user.full_name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {doctor.specialty}
                                                </p>
                                            </div>
                                        </div>

                                        {selectedDate && (
                                            <div className="py-3 border-t">
                                                <p className="text-sm text-muted-foreground">Data</p>
                                                <p className="font-medium">
                                                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                                                </p>
                                            </div>
                                        )}

                                        {selectedTime && (
                                            <div className="py-3 border-t">
                                                <p className="text-sm text-muted-foreground">Horário</p>
                                                <p className="font-medium">{selectedTime}</p>
                                            </div>
                                        )}

                                        <div className="py-3 border-t">
                                            <p className="text-sm text-muted-foreground">Valor</p>
                                            <p className="text-2xl font-bold text-primary">
                                                {formatCurrency(doctor.consultation_price)}
                                            </p>
                                        </div>
                                    </>
                                ) : null}

                                <Button
                                    size="lg"
                                    className="w-full"
                                    disabled={!selectedDate || !selectedTime}
                                    onClick={handleContinue}
                                >
                                    Continuar
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
}
