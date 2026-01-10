'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { api, type Doctor, fetchClinicBySlug, type Clinic } from '@/lib/api-client'
import { formatCurrency, getInitials, cn } from '@/lib/utils'
import {
    Search,
    Clock,
    Video,
    Shield,
    Heart,
    Sparkles,
    Calendar,
    ChevronRight,
    Award,
    Users,
    CheckCircle2,
    MessageCircle,
    Phone,
    Star,
    Zap,
    Bot
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const SPECIALTY_COLORS: Record<string, { gradient: string; glow: string; bg: string; text: string }> = {
    'Cardiologia': { gradient: 'from-rose-500 to-red-600', glow: 'shadow-rose-500/30', bg: 'bg-rose-50', text: 'text-rose-700' },
    'Dermatologia': { gradient: 'from-pink-500 to-fuchsia-600', glow: 'shadow-pink-500/30', bg: 'bg-pink-50', text: 'text-pink-700' },
    'Endocrinologia': { gradient: 'from-purple-500 to-violet-600', glow: 'shadow-purple-500/30', bg: 'bg-purple-50', text: 'text-purple-700' },
    'Gastroenterologia': { gradient: 'from-orange-500 to-amber-600', glow: 'shadow-orange-500/30', bg: 'bg-orange-50', text: 'text-orange-700' },
    'Ginecologia': { gradient: 'from-rose-400 to-pink-600', glow: 'shadow-rose-500/30', bg: 'bg-rose-50', text: 'text-rose-700' },
    'Neurologia': { gradient: 'from-blue-500 to-indigo-600', glow: 'shadow-blue-500/30', bg: 'bg-blue-50', text: 'text-blue-700' },
    'Oftalmologia': { gradient: 'from-cyan-500 to-teal-600', glow: 'shadow-cyan-500/30', bg: 'bg-cyan-50', text: 'text-cyan-700' },
    'Ortopedia': { gradient: 'from-green-500 to-emerald-600', glow: 'shadow-green-500/30', bg: 'bg-green-50', text: 'text-green-700' },
    'Pediatria': { gradient: 'from-amber-400 to-yellow-500', glow: 'shadow-amber-500/30', bg: 'bg-amber-50', text: 'text-amber-700' },
    'Psiquiatria': { gradient: 'from-indigo-500 to-purple-600', glow: 'shadow-indigo-500/30', bg: 'bg-indigo-50', text: 'text-indigo-700' },
    'Urologia': { gradient: 'from-teal-500 to-cyan-600', glow: 'shadow-teal-500/30', bg: 'bg-teal-50', text: 'text-teal-700' },
    'Clínica Geral': { gradient: 'from-emerald-500 to-green-600', glow: 'shadow-emerald-500/30', bg: 'bg-emerald-50', text: 'text-emerald-700' },
}

interface PageProps {
    params: Promise<{ clinic_slug: string }>
}

// Animated floating shapes component
function FloatingShapes({ color }: { color: string }) {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
            <div
                className="absolute top-20 right-10 w-72 h-72 rounded-full blur-3xl opacity-20 animate-pulse"
                style={{ background: color, animationDuration: '4s' }}
            />
            <div
                className="absolute top-1/2 -left-20 w-96 h-96 rounded-full blur-3xl opacity-15 animate-pulse"
                style={{ background: `linear-gradient(135deg, ${color}, transparent)`, animationDuration: '6s', animationDelay: '1s' }}
            />
            <div
                className="absolute -bottom-20 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-10 animate-pulse"
                style={{ background: color, animationDuration: '5s', animationDelay: '2s' }}
            />
            {/* Animated particles */}
            <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDuration: '3s' }} />
            <div className="absolute top-1/3 right-1/3 w-3 h-3 rounded-full bg-white/20 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }} />
            <div className="absolute bottom-1/4 left-1/3 w-2 h-2 rounded-full bg-white/25 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
        </div>
    )
}

// Premium Doctor Card with animations
function AnimatedDoctorCard({ doctor, onSelect, index, primaryColor }: {
    doctor: Doctor;
    onSelect: () => void;
    index: number;
    primaryColor: string;
}) {
    const colors = SPECIALTY_COLORS[doctor.specialty] || SPECIALTY_COLORS['Clínica Geral']
    const [isHovered, setIsHovered] = useState(false)

    return (
        <div
            className={cn(
                "group relative bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 overflow-hidden transition-all duration-500",
                "hover:scale-[1.02] hover:-translate-y-1",
                isHovered ? `shadow-2xl ${colors.glow}` : "shadow-lg shadow-gray-200/50"
            )}
            style={{
                animationDelay: `${index * 150}ms`,
                animation: 'slideUpFade 0.8s ease-out forwards',
                opacity: 0
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Gradient border on hover */}
            <div className={cn(
                "absolute inset-0 rounded-3xl transition-opacity duration-500",
                isHovered ? "opacity-100" : "opacity-0"
            )} style={{
                background: `linear-gradient(135deg, ${primaryColor}22, transparent 50%, ${primaryColor}11)`,
            }} />

            {/* Shine effect on hover */}
            <div className={cn(
                "absolute inset-0 transition-opacity duration-700",
                isHovered ? "opacity-100" : "opacity-0"
            )}>
                <div
                    className="absolute -inset-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-shimmer"
                />
            </div>

            <div className="relative p-6">
                {/* Availability Pulse Badge */}
                <div className="absolute top-4 right-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75" />
                        <Badge className="relative bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/30 border-0">
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                Disponível
                            </span>
                        </Badge>
                    </div>
                </div>

                {/* Doctor Info */}
                <div className="flex items-start gap-4 mb-5">
                    {/* Avatar with animated ring */}
                    <div className="relative flex-shrink-0">
                        <div
                            className={cn(
                                "absolute -inset-1 rounded-full transition-all duration-500",
                                isHovered ? "opacity-100 animate-spin-slow" : "opacity-0"
                            )}
                            style={{ background: `conic-gradient(from 0deg, ${primaryColor}, transparent, ${primaryColor})` }}
                        />
                        {doctor.user.avatar_url ? (
                            <Image
                                src={doctor.user.avatar_url}
                                alt={doctor.user.full_name}
                                width={80}
                                height={80}
                                className="relative w-20 h-20 rounded-full object-cover border-4 border-white shadow-xl"
                            />
                        ) : (
                            <div
                                className={cn(
                                    "relative w-20 h-20 rounded-full flex items-center justify-center border-4 border-white shadow-xl bg-gradient-to-br",
                                    colors.gradient
                                )}
                            >
                                <span className="text-2xl font-bold text-white drop-shadow-lg">
                                    {getInitials(doctor.user.full_name)}
                                </span>
                            </div>
                        )}
                        {/* Status indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                    </div>

                    {/* Text Info */}
                    <div className="flex-1 min-w-0 pt-1">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-600 transition-all duration-300 line-clamp-1">
                            {doctor.user.full_name}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            CRM {doctor.crm}/{doctor.crm_state}
                        </p>
                        <div className="mt-2">
                            <Badge className={cn(
                                "font-semibold border-0 shadow-sm",
                                colors.bg, colors.text
                            )}>
                                <Sparkles className="w-3 h-3 mr-1" />
                                {doctor.specialty}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Bio with fade effect */}
                {doctor.bio && (
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-4 relative">
                        {doctor.bio}
                        <span className="absolute bottom-0 right-0 w-16 h-full bg-gradient-to-l from-white/80 to-transparent" />
                    </p>
                )}

                {/* Feature Pills with icons - Conditional based on display_settings */}
                <div className="flex flex-wrap gap-2 mb-5">
                    {(doctor.display_settings?.show_teleconsulta !== false) && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                            <Video className="w-3.5 h-3.5" />
                            Teleconsulta HD
                        </div>
                    )}
                    {(doctor.display_settings?.show_duration !== false) && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">
                            <Clock className="w-3.5 h-3.5" />
                            {doctor.consultation_duration || 30} min
                        </div>
                    )}
                    {(doctor.display_settings?.show_rating !== false) && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            Top Rated
                        </div>
                    )}
                    {(doctor.display_settings?.show_convenio === true) && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                            <Shield className="w-3.5 h-3.5" />
                            Convênios
                        </div>
                    )}
                </div>

                {/* Divider with gradient */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-4" />

                {/* Price and CTA */}
                <div className="flex items-center justify-between">
                    {(doctor.display_settings?.show_price !== false) ? (
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Consulta</p>
                            <div className="flex items-baseline gap-1">
                                <span className={cn(
                                    "text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r",
                                    colors.gradient
                                )}>
                                    {formatCurrency(doctor.consultation_price)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Valor</p>
                            <p className="text-lg font-semibold text-gray-600">Sob consulta</p>
                        </div>
                    )}
                    <Button
                        onClick={onSelect}
                        size="lg"
                        className={cn(
                            "group/btn relative overflow-hidden rounded-xl font-semibold text-white shadow-xl transition-all duration-300",
                            "hover:shadow-2xl hover:scale-105 active:scale-95",
                            `bg-gradient-to-r ${colors.gradient} ${colors.glow}`
                        )}
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Agendar
                            <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </span>
                        {/* Button shine effect */}
                        <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

// Skeleton with shimmer
function DoctorCardSkeleton() {
    return (
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 p-6 overflow-hidden relative">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <div className="flex items-start gap-4 mb-4">
                <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-3">
                    <div className="h-6 bg-gray-200 rounded-full w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded-full w-1/2 animate-pulse" />
                    <div className="h-6 bg-gray-200 rounded-full w-24 animate-pulse" />
                </div>
            </div>
            <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        </div>
    )
}

// Specialty Chip with hover effects
function SpecialtyChip({ specialty, isSelected, onClick }: {
    specialty: string;
    isSelected: boolean;
    onClick: () => void
}) {
    const colors = SPECIALTY_COLORS[specialty] || SPECIALTY_COLORS['Clínica Geral']

    return (
        <button
            onClick={onClick}
            className={cn(
                "relative px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap",
                "hover:scale-105 active:scale-95",
                isSelected
                    ? `bg-gradient-to-r ${colors.gradient} text-white shadow-lg ${colors.glow}`
                    : "bg-white/80 text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-white shadow-sm"
            )}
        >
            {isSelected && (
                <span className="absolute inset-0 rounded-full bg-white/20 animate-pulse" />
            )}
            <span className="relative">{specialty}</span>
        </button>
    )
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

    const handleSelectDoctor = (doctorId: string) => {
        router.push(`/${clinicSlug}/agendar/${doctorId}`)
    }

    const primaryColor = clinic?.primary_color || '#10b981'
    const hasAiA = clinic?.plan_type && ['PROFESSIONAL', 'ENTERPRISE', 'NETWORK'].includes(clinic.plan_type)

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative">
            {/* Animated background */}
            <FloatingShapes color={primaryColor} />

            {/* ===== HEADER ===== */}
            <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-sm">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {clinic?.logo_url ? (
                                <Image
                                    src={clinic.logo_url}
                                    alt={clinic.name}
                                    width={44}
                                    height={44}
                                    className="h-11 w-auto object-contain drop-shadow-md"
                                />
                            ) : (
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
                                >
                                    {clinic?.name?.charAt(0) || 'C'}
                                </div>
                            )}
                            <div>
                                <h1 className="font-bold text-lg" style={{ color: primaryColor }}>
                                    {clinic?.name || 'Clínica'}
                                </h1>
                                {clinic?.phone && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {clinic.phone}
                                    </p>
                                )}
                            </div>
                        </div>

                        {clinic?.phone && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="hidden sm:flex bg-white/50 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 rounded-xl shadow-sm"
                                onClick={() => window.open(`https://wa.me/55${clinic.phone?.replace(/\D/g, '')}`, '_blank')}
                            >
                                <MessageCircle className="w-4 h-4 mr-2" />
                                WhatsApp
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* ===== HERO ===== */}
            <section className="relative pt-12 pb-8 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Animated badge */}
                    <div
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold mb-6 shadow-lg animate-bounce-subtle"
                        style={{
                            background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}08)`,
                            border: `1px solid ${primaryColor}30`,
                            color: primaryColor
                        }}
                    >
                        <Zap className="w-4 h-4" />
                        Agendamento Instantâneo
                        <Sparkles className="w-4 h-4" />
                    </div>

                    {/* Dynamic title */}
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-4 leading-tight tracking-tight">
                        Agende sua consulta
                        <br />
                        <span
                            className="bg-clip-text text-transparent animate-gradient-x"
                            style={{
                                backgroundImage: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}aa, ${primaryColor})`,
                                backgroundSize: '200% auto'
                            }}
                        >
                            {clinic?.name || 'conosco'}
                        </span>
                    </h1>

                    <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                        Escolha seu especialista e agende em <strong className="text-gray-900">segundos</strong>.
                        Atendimento <strong style={{ color: primaryColor }}>humanizado</strong> com total comodidade.
                    </p>

                    {/* Trust badges with animation */}
                    <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                        {[
                            { icon: Shield, label: 'Seguro', color: 'emerald' },
                            { icon: Video, label: 'Vídeo HD', color: 'blue' },
                            { icon: Heart, label: 'Humanizado', color: 'rose' },
                        ].map((item, i) => (
                            <div
                                key={item.label}
                                className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm animate-fade-in-up"
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                <item.icon className={`w-5 h-5 text-${item.color}-500`} />
                                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== AIA CARD (PREMIUM ONLY) ===== */}
            {hasAiA && (
                <section className="px-4 pb-6">
                    <div className="max-w-4xl mx-auto">
                        <Link href={`/${clinicSlug}/triagem`}>
                            <div className="group relative bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-6 shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-500 cursor-pointer overflow-hidden hover:scale-[1.01]">
                                <div className="absolute inset-0 opacity-30">
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
                                </div>

                                <div className="relative flex items-center gap-5">
                                    <div className="flex-shrink-0 w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-inner">
                                        <Bot className="w-9 h-9 text-white drop-shadow-lg" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-white text-xl mb-1 drop-shadow-sm">
                                            Não sabe qual especialista escolher?
                                        </h3>
                                        <p className="text-emerald-100 text-sm">
                                            Converse com a <strong className="text-white">AiA</strong> e receba uma recomendação personalizada.
                                        </p>
                                    </div>
                                    <ChevronRight className="w-7 h-7 text-white/80 group-hover:translate-x-2 transition-transform hidden sm:block" />
                                </div>
                            </div>
                        </Link>
                    </div>
                </section>
            )}

            {/* ===== SEARCH & FILTERS ===== */}
            <section className="px-4 pb-6">
                <div className="max-w-4xl mx-auto">
                    {/* Search bar with glow */}
                    <div className="relative mb-4">
                        <div
                            className="absolute -inset-1 rounded-2xl opacity-50 blur-lg"
                            style={{ background: `linear-gradient(135deg, ${primaryColor}30, transparent)` }}
                        />
                        <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-xl p-4">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    placeholder="Buscar médico por nome ou especialidade..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-12 h-14 bg-gray-50/50 border-gray-200 rounded-xl text-base focus:ring-2 focus:border-transparent transition-all"
                                    style={{ '--tw-ring-color': `${primaryColor}40` } as React.CSSProperties}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Specialty chips */}
                    {uniqueSpecialties.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            <button
                                onClick={() => setSelectedSpecialty(undefined)}
                                className={cn(
                                    "px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap",
                                    "hover:scale-105 active:scale-95",
                                    !selectedSpecialty
                                        ? "bg-gray-900 text-white shadow-lg shadow-gray-900/30"
                                        : "bg-white/80 text-gray-700 border border-gray-200 hover:bg-white"
                                )}
                            >
                                ✨ Todos
                            </button>
                            {uniqueSpecialties.map((specialty) => (
                                <SpecialtyChip
                                    key={specialty}
                                    specialty={specialty}
                                    isSelected={selectedSpecialty === specialty}
                                    onClick={() => setSelectedSpecialty(selectedSpecialty === specialty ? undefined : specialty)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ===== DOCTORS GRID ===== */}
            <section className="px-4 pb-20">
                <div className="max-w-4xl mx-auto">
                    {!isLoading && filteredDoctors && (
                        <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
                            <Users className="w-4 h-4" />
                            <span>
                                <strong className="text-gray-900">{filteredDoctors.length}</strong> especialista{filteredDoctors.length !== 1 ? 's' : ''} disponíve{filteredDoctors.length !== 1 ? 'is' : 'l'}
                            </span>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="grid md:grid-cols-2 gap-6">
                            {[...Array(4)].map((_, i) => <DoctorCardSkeleton key={i} />)}
                        </div>
                    ) : filteredDoctors && filteredDoctors.length > 0 ? (
                        <div className="grid md:grid-cols-2 gap-6">
                            {filteredDoctors.map((doctor, index) => (
                                <AnimatedDoctorCard
                                    key={doctor.id}
                                    doctor={doctor}
                                    index={index}
                                    primaryColor={primaryColor}
                                    onSelect={() => handleSelectDoctor(doctor.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shadow-inner">
                                <Search className="w-10 h-10 text-amber-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                Nenhum especialista encontrado
                            </h3>
                            <p className="text-gray-500 max-w-md mx-auto mb-6">
                                {selectedSpecialty
                                    ? `Não há médicos de ${selectedSpecialty} disponíveis.`
                                    : 'Não há médicos disponíveis no momento.'}
                            </p>
                            {selectedSpecialty && (
                                <Button
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={() => setSelectedSpecialty(undefined)}
                                >
                                    Ver todas especialidades
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* ===== FOOTER ===== */}
            <footer className="border-t border-gray-100 bg-white/50 backdrop-blur-sm py-8">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-emerald-500" />
                            <span>Dados protegidos pela LGPD</span>
                        </div>
                        <p className="text-center">© 2026 {clinic?.name}. Saúde com tecnologia.</p>
                    </div>
                </div>
            </footer>

            {/* ===== CUSTOM ANIMATIONS ===== */}
            <style jsx global>{`
                @keyframes slideUpFade {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes gradient-x {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-shimmer { animation: shimmer 2s infinite; }
                .animate-gradient-x { animation: gradient-x 3s ease infinite; }
                .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }
                .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; opacity: 0; }
                .animate-spin-slow { animation: spin-slow 8s linear infinite; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    )
}
