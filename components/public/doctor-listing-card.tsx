'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { format, addDays, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { api, type Doctor } from '@/lib/api-client'
import { formatCurrency, getInitials, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Star,
    MapPin,
    Calendar,
    Clock,
    ChevronRight,
    Video,
    Shield,
    CheckCircle2,
    Loader2
} from 'lucide-react'

// Special colors map (reused or imported)
const SPECIALTY_COLORS: Record<string, string> = {
    'Cardiologia': 'text-rose-600 bg-rose-50 border-rose-100',
    'Dermatologia': 'text-pink-600 bg-pink-50 border-pink-100',
    'Psiquiatria': 'text-purple-600 bg-purple-50 border-purple-100',
    'Ortopedia': 'text-emerald-600 bg-emerald-50 border-emerald-100',
    'Pediatria': 'text-amber-600 bg-amber-50 border-amber-100',
    'Oftalmologia': 'text-cyan-600 bg-cyan-50 border-cyan-100',
    'Ginecologia': 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-100',
    'Clínica Geral': 'text-blue-600 bg-blue-50 border-blue-100',
}

interface DoctorListingCardProps {
    doctor: Doctor
    clinicSlug: string
    primaryColor: string
}

export function DoctorListingCard({ doctor, clinicSlug, primaryColor }: DoctorListingCardProps) {
    const router = useRouter()

    // Fetch slots for next 3 days
    // We use a fixed start date (today) to keep query keys stable
    const today = new Date()
    const dateStr = format(today, 'yyyy-MM-dd')

    const { data: availability, isLoading } = useQuery({
        queryKey: ['available-slots-range', doctor.id, dateStr],
        queryFn: () => api.get<any>('/appointments/available-slots', {
            doctor_id: doctor.id,
            date: dateStr,
            days: 4 // Fetch 4 days to handle pagination/filling
        }),
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    })

    const handleSlotClick = (date: string, time: string) => {
        router.push(`/${clinicSlug}/agendar/${doctor.id}/confirmar?date=${date}&time=${time}`)
    }

    const goToProfile = () => {
        router.push(`/${clinicSlug}/agendar/${doctor.id}`)
    }

    const colors = SPECIALTY_COLORS[doctor.specialty] || SPECIALTY_COLORS['Clínica Geral']

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-5 flex flex-col md:flex-row gap-6">
            {/* Left: Doctor Profile */}
            <div className="flex-1 min-w-0">
                <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0 cursor-pointer" onClick={goToProfile}>
                        {doctor.user.avatar_url ? (
                            <Image
                                src={doctor.user.avatar_url}
                                alt={doctor.user.full_name}
                                width={80}
                                height={80}
                                className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md hover:scale-105 transition-transform"
                            />
                        ) : (
                            <div
                                className="w-20 h-20 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 font-bold text-xl border-2 border-white shadow-md"
                            >
                                {getInitials(doctor.user.full_name)}
                            </div>
                        )}
                        {doctor.is_premium && (
                            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 border-2 border-white shadow-sm" title="Premium">
                                <Star className="h-3 w-3 text-white fill-white" />
                            </span>
                        )}
                    </div>

                    {/* Info */}
                    <div className="space-y-1.5 cursor-pointer" onClick={goToProfile}>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-gray-900 line-clamp-1 hover:text-blue-600 transition-colors">
                                {doctor.user.full_name}
                            </h3>
                            <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-50" />
                        </div>

                        <p className="text-sm text-gray-500">
                            {doctor.specialty} • CRM {doctor.crm}
                        </p>

                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={cn(
                                        "w-3.5 h-3.5",
                                        star <= Math.round(doctor.rating || 5)
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "text-gray-200"
                                    )}
                                />
                            ))}
                            <span className="text-xs font-semibold text-gray-700 ml-1">
                                {doctor.rating || '5.0'}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">
                                ({doctor.review_count || 12} avaliações)
                            </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Consultório {doctor.display_settings?.show_teleconsulta ? '• Online' : ''}</span>
                        </div>
                    </div>
                </div>

                {/* Footer / Price */}
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div>
                        {doctor.display_settings?.show_price !== false ? (
                            <span className="text-sm font-semibold text-green-700 bg-green-50 px-2 py-1 rounded">
                                {formatCurrency(doctor.consultation_price)}
                            </span>
                        ) : (
                            <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded">
                                Consultar valor
                            </span>
                        )}
                    </div>
                    {/* Tags */}
                    <div className="flex gap-2">
                        {doctor.display_settings?.show_teleconsulta && (
                            <Badge variant="outline" className="text-[10px] h-6 border-blue-100 text-blue-600 bg-blue-50">
                                <Video className="w-3 h-3 mr-1" />
                                Video
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: Calendar/Slots */}
            <div className="w-full md:w-[480px] bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        Próximos horários
                    </h4>
                    <button
                        onClick={goToProfile}
                        className="text-xs font-medium text-blue-600 hover:underline"
                    >
                        Ver mais
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center min-h-[120px]">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : availability?.days?.some((d: any) => d.slots.length > 0) ? (
                    <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide snap-x">
                        {availability.days.map((day: any) => {
                            const date = new Date(day.date)
                            const isTodayDate = isSameDay(date, new Date())
                            const displaySlots = day.slots.slice(0, 4) // Show up to 4 slots per day

                            if (day.slots.length === 0) return null

                            return (
                                <div key={day.date} className="min-w-[100px] flex-shrink-0 snap-start bg-white rounded-lg border border-gray-200 p-2 flex flex-col gap-2">
                                    <div className="text-center border-b border-gray-100 pb-1">
                                        <p className="text-[10px] uppercase font-bold text-gray-500">
                                            {isTodayDate ? 'Hoje' : format(date, 'EEE', { locale: ptBR })}
                                        </p>
                                        <p className="text-xs font-medium text-gray-900">
                                            {format(date, 'd MMM', { locale: ptBR })}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        {displaySlots.map((slot: any) => (
                                            <button
                                                key={`${day.date}-${slot.time}`}
                                                onClick={() => handleSlotClick(day.date, slot.time)}
                                                className="text-xs font-medium bg-blue-50 text-blue-700 py-1.5 rounded hover:bg-blue-600 hover:text-white transition-colors"
                                            >
                                                {slot.time}
                                            </button>
                                        ))}
                                        {day.slots.length > 4 && (
                                            <button
                                                onClick={goToProfile}
                                                className="text-[10px] text-gray-400 hover:text-blue-600 mt-1"
                                            >
                                                mais {day.slots.length - 4}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[120px] text-center px-4">
                        <Calendar className="w-8 h-8 text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">Sem horários para os próximos dias</p>
                        <Button variant="link" onClick={goToProfile} className="text-xs h-auto p-0 mt-1">
                            Ver calendário completo
                        </Button>
                    </div>
                )}

                <Button
                    onClick={goToProfile}
                    className="w-full mt-3 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-semibold h-8 rounded-lg"
                    variant="outline"
                >
                    Ver perfil completo
                </Button>
            </div>
        </div>
    )
}
