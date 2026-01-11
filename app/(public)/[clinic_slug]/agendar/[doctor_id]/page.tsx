'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { format, addDays, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { api, type Doctor, type AvailableSlotsResponse } from '@/lib/api-client'
import { formatCurrency, cn } from '@/lib/utils'
import {
    ArrowLeft,
    Star,
    MapPin,
    Award,
    Briefcase,
    Heart,
    ChevronDown,
    Clock,
    DollarSign,
    Building2,
    Shield,
    CheckCircle2,
    Calendar as CalendarIcon,
    Loader2,
} from 'lucide-react'

interface PageProps {
    params: Promise<{ clinic_slug: string; doctor_id: string }>
}

export default function DoctorProfilePage({ params }: PageProps) {
    const { clinic_slug, doctor_id } = use(params)
    const router = useRouter()
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedTime, setSelectedTime] = useState<string | null>(null)
    const [showAllSpecialties, setShowAllSpecialties] = useState(false)

    // Fetch doctor data
    const { data: doctor, isLoading: doctorLoading } = useQuery({
        queryKey: ['doctor-profile', doctor_id],
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

    // Generate next 14 days for horizontal calendar
    const today = startOfDay(new Date())
    const dates = Array.from({ length: 14 }, (_, i) => addDays(today, i))

    const handleTimeSelect = (time: string) => {
        if (!selectedDate) return
        setSelectedTime(time)
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        router.push(`/${clinic_slug}/agendar/${doctor_id}/confirmar?date=${dateStr}&time=${time}`)
    }

    // Data vem 100% do Supabase via API
    const rating = doctor?.rating || 0
    const reviewCount = doctor?.review_count || 0
    const experienceYears = doctor?.experience_years || 0
    const isPremium = doctor?.is_premium || false
    const faithfulPatients = doctor?.faithful_patients_count || 0

    if (doctorLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="container mx-auto px-4 py-8">
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        )
    }

    if (!doctor) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-muted-foreground">Médico não encontrado</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            {/* Top Navigation */}
            <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link
                            href={`/${clinic_slug}/agendar`}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            <span className="font-medium hidden sm:inline">Voltar para busca</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600 hidden sm:inline">CliniGo</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-7xl mx-auto">
                    {/* Doctor Profile Card */}
                    <Card className="mb-8 overflow-hidden border-0 shadow-lg">
                        <CardContent className="p-0">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8">
                                <div className="flex flex-col md:flex-row gap-8">
                                    {/* Left: Photo */}
                                    <div className="flex-shrink-0">
                                        <div className="relative">
                                            {isPremium && (
                                                <Badge className="absolute -top-2 -left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-md z-10">
                                                    ⭐ DESTAQUE
                                                </Badge>
                                            )}
                                            <div className="w-40 h-40 rounded-full overflow-hidden bg-white shadow-xl ring-4 ring-white">
                                                {doctor.user.avatar_url ? (
                                                    <Image
                                                        src={doctor.user.avatar_url}
                                                        alt={doctor.user.full_name}
                                                        width={160}
                                                        height={160}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
                                                        <span className="text-5xl font-bold text-blue-600">
                                                            {doctor.user.full_name.charAt(0)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Info */}
                                    <div className="flex-1 space-y-6">
                                        {/* Name & Verification */}
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h1 className="text-3xl font-bold text-gray-900">
                                                    {doctor.user.full_name}
                                                </h1>
                                                <CheckCircle2 className="w-6 h-6 text-blue-500 fill-blue-500" />
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-lg text-gray-700 font-medium">
                                                    {doctor.specialty}
                                                </span>
                                                <button
                                                    onClick={() => setShowAllSpecialties(!showAllSpecialties)}
                                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                                                >
                                                    Mais
                                                    <ChevronDown className={cn(
                                                        "w-4 h-4 transition-transform",
                                                        showAllSpecialties && "rotate-180"
                                                    )} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Ratings */}
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={cn(
                                                            "w-5 h-5",
                                                            star <= Math.round(rating)
                                                                ? "fill-yellow-400 text-yellow-400"
                                                                : "text-gray-300"
                                                        )}
                                                    />
                                                ))}
                                                <span className="text-sm font-semibold text-gray-700">
                                                    {rating.toFixed(1)}
                                                </span>
                                            </div>
                                            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline">
                                                {reviewCount} opiniões
                                            </button>
                                        </div>

                                        {/* Credentials */}
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <span className="font-medium">CRM {doctor.crm}</span>
                                            <span>•</span>
                                            <span className="font-medium">{doctor.crm_state}</span>
                                        </div>

                                        {/* Quick Info Badges */}
                                        <div className="flex flex-wrap gap-3">
                                            <Badge variant="outline" className="bg-white/80 border-blue-200 text-blue-700 px-4 py-2">
                                                <Shield className="w-4 h-4 mr-2" />
                                                Veja se seu convênio é aceito
                                            </Badge>
                                            <Badge variant="outline" className="bg-white/80 border-green-200 text-green-700 px-4 py-2">
                                                <Award className="w-4 h-4 mr-2" />
                                                +{experienceYears} anos de experiência
                                            </Badge>
                                        </div>

                                        {/* Specialties & Differentials */}
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-2 text-sm">
                                                <Briefcase className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                                <span className="text-gray-700">
                                                    {doctor.bio || 'Atendimento especializado e humanizado'}
                                                </span>
                                            </div>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex items-center gap-2 text-sm cursor-help">
                                                            <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                                                            <span className="font-medium text-gray-700">
                                                                {faithfulPatients} Pacientes fiéis
                                                            </span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Pacientes que retornaram para consulta</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>

                                        {/* Location */}
                                        <div className="flex items-start gap-2 text-sm pt-2 border-t border-blue-100">
                                            <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-gray-700">
                                                    Consultório particular
                                                </p>
                                                <button className="text-blue-600 hover:text-blue-700 font-medium hover:underline mt-1">
                                                    Ver no mapa
                                                </button>
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className="flex items-center gap-2 pt-4 border-t border-blue-100">
                                            <DollarSign className="w-6 h-6 text-green-600" />
                                            <div>
                                                <p className="text-sm text-gray-600">Primeira consulta {doctor.specialty}</p>
                                                <p className="text-2xl font-bold text-green-600">
                                                    {formatCurrency(doctor.consultation_price)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Availability Section */}
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Horários Disponíveis
                            </h2>
                            <p className="text-gray-600">
                                Selecione a data e horário desejados para sua consulta
                            </p>
                        </div>

                        {/* Horizontal Date Picker */}
                        <Card className="border-0 shadow-md">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-semibold text-gray-900">Escolha uma data</h3>
                                </div>
                                <div className="relative">
                                    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                                        {dates.map((date) => {
                                            const isSelected = selectedDate?.toDateString() === date.toDateString()
                                            const isToday = date.toDateString() === today.toDateString()

                                            return (
                                                <button
                                                    key={date.toISOString()}
                                                    onClick={() => {
                                                        setSelectedDate(date)
                                                        setSelectedTime(null)
                                                    }}
                                                    className={cn(
                                                        "flex-shrink-0 flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all min-w-[90px] hover:shadow-md",
                                                        isSelected
                                                            ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105"
                                                            : "bg-white border-gray-200 hover:border-blue-300"
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "text-xs font-semibold uppercase tracking-wide mb-1",
                                                        isSelected ? "text-blue-100" : "text-gray-500"
                                                    )}>
                                                        {format(date, 'EEE', { locale: ptBR })}
                                                    </span>
                                                    <span className="text-3xl font-bold mb-1">
                                                        {format(date, 'd')}
                                                    </span>
                                                    <span className={cn(
                                                        "text-xs font-medium",
                                                        isSelected ? "text-blue-100" : "text-gray-600"
                                                    )}>
                                                        {isToday ? 'Hoje' : format(date, 'MMM', { locale: ptBR })}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Time Slots */}
                        {selectedDate && (
                            <Card className="border-0 shadow-md">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Clock className="w-5 h-5 text-blue-600" />
                                        <h3 className="font-semibold text-gray-900">
                                            Horários disponíveis para {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
                                        </h3>
                                    </div>

                                    {slotsLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                        </div>
                                    ) : !slotsData?.available_slots?.length ? (
                                        <div className="text-center py-12">
                                            <p className="text-gray-500">Nenhum horário disponível para esta data</p>
                                            <p className="text-sm text-gray-400 mt-2">
                                                Selecione outra data
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                            {slotsData.available_slots
                                                .filter(slot => slot.available)
                                                .map((slot) => (
                                                    <Button
                                                        key={slot.time}
                                                        variant={selectedTime === slot.time ? "default" : "outline"}
                                                        className={cn(
                                                            "h-14 text-base font-semibold transition-all hover:scale-105",
                                                            selectedTime === slot.time
                                                                ? "bg-blue-600 hover:bg-blue-700 shadow-lg"
                                                                : "hover:border-blue-400 hover:text-blue-600"
                                                        )}
                                                        onClick={() => handleTimeSelect(slot.time)}
                                                    >
                                                        {slot.time}
                                                    </Button>
                                                ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {!selectedDate && (
                            <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
                                <CardContent className="p-8 text-center">
                                    <CalendarIcon className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                                    <p className="text-gray-600 font-medium">
                                        Selecione uma data acima para ver os horários disponíveis
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
