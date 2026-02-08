'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { format, addDays, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { api, type Doctor, type AvailableSlotsResponse } from '@/lib/api-client'
import { formatCurrency, getInitials } from '@/lib/utils'

interface PageProps {
    params: Promise<{ clinic_slug: string; doctor_id: string }>
}

export default function DoctorProfilePage({ params }: PageProps) {
    const { clinic_slug, doctor_id } = use(params)
    const router = useRouter()
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedTime, setSelectedTime] = useState<string | null>(null)

    // Fetch doctor data
    const { data: doctor, isLoading: doctorLoading } = useQuery({
        queryKey: ['doctor-profile', doctor_id],
        queryFn: () => api.get<Doctor>(`/doctors/detail?id=${doctor_id}&action=profile`),
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

    // Generate next 7 days
    const today = startOfDay(new Date())
    const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i))

    const handleTimeSelect = (time: string) => {
        if (!selectedDate) return
        setSelectedTime(time)
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        router.push(`/${clinic_slug}/agendar/${doctor_id}/confirmar?date=${dateStr}&time=${time}`)
    }

    if (doctorLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <p className="text-gray-500">Carregando...</p>
            </div>
        )
    }

    if (!doctor) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <p className="text-gray-500">Medico nao encontrado</p>
            </div>
        )
    }

    const rating = doctor.rating || 5.0
    const reviewCount = doctor.review_count || 0
    const experienceYears = doctor.experience_years || 0
    const subspecialties = doctor.subspecialties || []
    const education = doctor.education || []
    const insurances = doctor.accepted_insurances || []
    const hasTele = doctor.display_settings?.show_teleconsulta || false

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="h-10 border-b">
                <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
                    <Link href={`/${clinic_slug}/agendar`} className="text-xs font-medium">
                        Voltar
                    </Link>
                    <span className="text-xs text-gray-400">Agendamento</span>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                {/* Perfil Horizontal */}
                <div className="border-b pb-5 mb-5">
                    <div className="flex gap-4 items-start">
                        {/* Avatar */}
                        {doctor.user.avatar_url ? (
                            <Image
                                src={doctor.user.avatar_url}
                                alt={doctor.user.full_name}
                                width={64}
                                height={64}
                                className="w-16 h-16 object-cover"
                            />
                        ) : (
                            <div className="w-16 h-16 bg-gray-100 flex items-center justify-center text-sm font-medium">
                                {getInitials(doctor.user.full_name)}
                            </div>
                        )}
                        <div className="flex-1">
                            <h1 className="font-medium">{doctor.user.full_name}</h1>
                            <p className="text-sm text-gray-500">{doctor.specialty} - CRM {doctor.crm}/{doctor.crm_state}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span>Nota {rating.toFixed(1)} ({reviewCount} avaliacoes)</span>
                                {experienceYears > 0 && (
                                    <>
                                        <span>|</span>
                                        <span>{experienceYears}+ anos de experiencia</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-medium">{formatCurrency(doctor.consultation_price)}</p>
                            <p className="text-xs text-gray-500">por consulta</p>
                            {hasTele && <p className="text-xs text-gray-400 mt-1">Teleconsulta disponivel</p>}
                        </div>
                    </div>
                </div>

                {/* Info em linha */}
                <div className="flex gap-8 text-xs border-b pb-5 mb-5 flex-wrap">
                    {subspecialties.length > 0 && (
                        <div>
                            <p className="text-gray-400 mb-1">Especialidades</p>
                            <p>{subspecialties.join(', ')}</p>
                        </div>
                    )}
                    {education.length > 0 && (
                        <div>
                            <p className="text-gray-400 mb-1">Formacao</p>
                            <p>{education.join(' | ')}</p>
                        </div>
                    )}
                    {insurances.length > 0 && (
                        <div>
                            <p className="text-gray-400 mb-1">Convenios</p>
                            <p>{insurances.join(', ')}</p>
                        </div>
                    )}
                    {doctor.bio && (
                        <div>
                            <p className="text-gray-400 mb-1">Sobre</p>
                            <p className="max-w-md">{doctor.bio}</p>
                        </div>
                    )}
                </div>

                {/* Agenda */}
                <div>
                    <p className="text-sm font-medium mb-4">Horarios Disponiveis</p>

                    {/* Dias em abas */}
                    <div className="flex border-b mb-4">
                        {dates.map((date, i) => {
                            const isSelected = selectedDate?.toDateString() === date.toDateString()
                            const isToday = date.toDateString() === today.toDateString()
                            return (
                                <button
                                    key={date.toISOString()}
                                    onClick={() => {
                                        setSelectedDate(date)
                                        setSelectedTime(null)
                                    }}
                                    className={`px-4 py-2 text-xs border-b-2 ${isSelected
                                        ? 'border-black font-medium'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    {isToday ? 'Hoje' : format(date, 'EEE', { locale: ptBR })} {format(date, 'd/MM')}
                                </button>
                            )
                        })}
                    </div>

                    {/* Horarios */}
                    {!selectedDate && (
                        <p className="text-xs text-gray-400 py-8 text-center">
                            Selecione uma data acima para ver os horarios
                        </p>
                    )}

                    {selectedDate && slotsLoading && (
                        <p className="text-xs text-gray-400 py-8 text-center">Carregando horarios...</p>
                    )}

                    {selectedDate && !slotsLoading && !slotsData?.available_slots?.filter(s => s.available).length && (
                        <p className="text-xs text-gray-400 py-8 text-center">
                            Nenhum horario disponivel para esta data
                        </p>
                    )}

                    {selectedDate && !slotsLoading && slotsData?.available_slots && (
                        <div className="flex flex-wrap gap-2">
                            {slotsData.available_slots
                                .filter(slot => slot.available)
                                .map(slot => (
                                    <button
                                        key={slot.time}
                                        onClick={() => handleTimeSelect(slot.time)}
                                        className={`px-4 py-2 text-sm border ${selectedTime === slot.time
                                            ? 'bg-black text-white border-black'
                                            : 'hover:border-black'
                                            }`}
                                    >
                                        {slot.time}
                                    </button>
                                ))}
                        </div>
                    )}

                    {/* Confirmar */}
                    {selectedTime && selectedDate && (
                        <div className="mt-6 pt-4 border-t flex items-center justify-between">
                            <div className="text-sm">
                                <span className="text-gray-500">Agendamento: </span>
                                <span>{format(selectedDate, "EEE d/MM", { locale: ptBR })} as {selectedTime}</span>
                            </div>
                            <button
                                onClick={() => handleTimeSelect(selectedTime)}
                                className="px-6 py-2 bg-black text-white text-sm"
                            >
                                Confirmar - {formatCurrency(doctor.consultation_price)}
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
