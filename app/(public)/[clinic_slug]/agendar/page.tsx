'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api, type Doctor, fetchClinicBySlug } from '@/lib/api-client'
import Image from 'next/image'
import Link from 'next/link'
import { formatCurrency, getInitials } from '@/lib/utils'
import { format, addDays, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PageProps {
    params: Promise<{ clinic_slug: string }>
}

export default function BookingPage({ params }: PageProps) {
    const router = useRouter()
    const [clinicSlug, setClinicSlug] = useState<string | null>(null)
    const [selectedSpecialty, setSelectedSpecialty] = useState<string | undefined>()
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        params.then((p) => setClinicSlug(p.clinic_slug))
    }, [params])

    const { data: clinic } = useQuery({
        queryKey: ['clinic', clinicSlug],
        queryFn: () => fetchClinicBySlug(clinicSlug!),
        enabled: !!clinicSlug,
    })

    const { data: doctors, isLoading } = useQuery({
        queryKey: ['public-doctors', clinicSlug, selectedSpecialty],
        queryFn: () =>
            api.get<Doctor[]>('/doctors', {
                clinic_slug: clinicSlug!,
                ...(selectedSpecialty ? { specialty: selectedSpecialty } : {}),
                is_accepting: 'true',
            }),
        enabled: !!clinicSlug,
    })

    const uniqueSpecialties = Array.from(new Set(doctors?.map(d => d.specialty) || []))

    const filteredDoctors = doctors?.filter(
        (doc) =>
            !searchTerm ||
            doc.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.specialty.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="h-10 border-b">
                <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
                    <span className="text-xs font-medium">{clinic?.name || 'Clinica'}</span>
                    <span className="text-xs text-gray-400">Agendamento</span>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                {/* Busca */}
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center border-b pb-5 mb-5">
                    <input
                        type="text"
                        placeholder="Buscar médico, especialidade..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 h-10 px-3 text-sm border rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                    <select
                        value={selectedSpecialty || ''}
                        onChange={(e) => setSelectedSpecialty(e.target.value || undefined)}
                        className="h-10 px-3 text-sm border rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black bg-white"
                    >
                        <option value="">Todas especialidades</option>
                        {uniqueSpecialties.map(spec => (
                            <option key={spec} value={spec}>{spec}</option>
                        ))}
                    </select>
                </div>

                {/* Titulo */}
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium">
                        {selectedSpecialty ? `Especialistas em ${selectedSpecialty}` : 'Medicos e Especialistas'}
                    </p>
                    <p className="text-xs text-gray-400">{filteredDoctors?.length || 0} resultados</p>
                </div>

                {/* Loading */}
                {isLoading && (
                    <p className="text-xs text-gray-400 py-8 text-center">Carregando...</p>
                )}

                {/* Empty */}
                {!isLoading && (!filteredDoctors || filteredDoctors.length === 0) && (
                    <div className="py-12 text-center">
                        <p className="text-sm text-gray-500">Nenhum resultado encontrado</p>
                        <button
                            onClick={() => { setSearchTerm(''); setSelectedSpecialty(undefined) }}
                            className="text-xs text-gray-400 mt-2 hover:text-black"
                        >
                            Limpar filtros
                        </button>
                    </div>
                )}

                {/* Lista */}
                <div className="divide-y">
                    {filteredDoctors?.map((doctor) => (
                        <DoctorRow
                            key={doctor.id}
                            doctor={doctor}
                            clinicSlug={clinicSlug || ''}
                        />
                    ))}
                </div>
            </main>
        </div>
    )
}

interface DoctorRowProps {
    doctor: Doctor
    clinicSlug: string
}

function DoctorRow({ doctor, clinicSlug }: DoctorRowProps) {
    const router = useRouter()
    const today = new Date()
    const dateStr = format(today, 'yyyy-MM-dd')

    const { data: availability, isLoading } = useQuery({
        queryKey: ['available-slots-range', doctor.id, dateStr],
        queryFn: () => api.get<any>('/appointments/available-slots', {
            doctor_id: doctor.id,
            date: dateStr,
            days: 4
        }),
        staleTime: 1000 * 60 * 5,
    })

    const handleSlotClick = (date: string, time: string) => {
        router.push(`/${clinicSlug}/agendar/${doctor.id}/confirmar?date=${date}&time=${time}`)
    }

    const goToProfile = () => {
        router.push(`/${clinicSlug}/agendar/${doctor.id}`)
    }

    const hasTele = doctor.display_settings?.show_teleconsulta || false
    const showPrice = doctor.display_settings?.show_price !== false

    return (
        <div className="py-4 flex gap-4">
            {/* Avatar */}
            <div onClick={goToProfile} className="cursor-pointer flex-shrink-0">
                {doctor.user.avatar_url ? (
                    <Image
                        src={doctor.user.avatar_url}
                        alt={doctor.user.full_name}
                        width={48}
                        height={48}
                        className="w-12 h-12 object-cover"
                    />
                ) : (
                    <div className="w-12 h-12 bg-gray-100 flex items-center justify-center text-xs font-medium">
                        {getInitials(doctor.user.full_name)}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div onClick={goToProfile} className="cursor-pointer">
                    <p className="font-medium text-sm">{doctor.user.full_name}</p>
                    <p className="text-xs text-gray-500">{doctor.specialty} - CRM {doctor.crm}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>Nota {doctor.rating || '5.0'}</span>
                        {hasTele && <span>Teleconsulta</span>}
                        {showPrice && <span>{formatCurrency(doctor.consultation_price)}</span>}
                    </div>
                </div>

                {/* Slots */}
                <div className="mt-3 flex flex-wrap gap-1">
                    {isLoading ? (
                        <span className="text-xs text-gray-400">Carregando horarios...</span>
                    ) : availability?.days?.some((d: any) => d.slots.length > 0) ? (
                        <>
                            {availability.days.slice(0, 3).map((day: any) => {
                                const displaySlots = day.slots.slice(0, 3)
                                if (day.slots.length === 0) return null
                                const date = new Date(day.date)
                                const isToday = isSameDay(date, new Date())

                                return displaySlots.map((slot: any) => (
                                    <button
                                        key={`${day.date}-${slot.time}`}
                                        onClick={() => handleSlotClick(day.date, slot.time)}
                                        className="px-2 py-1 text-xs border hover:border-black"
                                    >
                                        {isToday ? 'Hoje' : format(date, 'EEE', { locale: ptBR })} {slot.time}
                                    </button>
                                ))
                            })}
                            <button
                                onClick={goToProfile}
                                className="px-2 py-1 text-xs text-gray-400 hover:text-black"
                            >
                                Ver mais
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={goToProfile}
                            className="text-xs text-gray-400 hover:text-black"
                        >
                            Ver calendario
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
