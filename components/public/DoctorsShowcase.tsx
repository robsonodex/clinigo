'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useClinicTheme } from './ThemeProvider'
import { Star, Clock, Calendar, CreditCard, Award, Video } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface Doctor {
    id: string
    full_name: string
    specialty: string
    crm: string
    crm_state?: string
    photo_url?: string | null
    consultation_price?: number
    rating?: number
    total_reviews?: number
    next_available?: string
    accepts_insurance?: boolean
    is_featured?: boolean
}

interface DoctorsShowcaseProps {
    clinicSlug: string
    doctors: Doctor[]
    title?: string
    subtitle?: string
}

// =============================================================================
// Single Doctor Card Component
// =============================================================================

function DoctorShowcaseCard({
    doctor,
    clinicSlug
}: {
    doctor: Doctor
    clinicSlug: string
}) {
    const { theme } = useClinicTheme()

    return (
        <div className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
            {/* Photo Section */}
            <div className="relative h-64 overflow-hidden">
                {doctor.photo_url ? (
                    <Image
                        src={doctor.photo_url}
                        alt={doctor.full_name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <span className="text-5xl font-bold text-gray-400">
                            {doctor.full_name.charAt(0)}
                        </span>
                    </div>
                )}

                {/* Featured Badge */}
                {doctor.is_featured && (
                    <div
                        className="absolute top-4 right-4 px-3 py-1 rounded-full text-white text-xs font-semibold flex items-center gap-1"
                        style={{ backgroundColor: theme.colors.accent }}
                    >
                        <Award className="w-3 h-3" />
                        Destaque
                    </div>
                )}

                {/* Next Available Overlay */}
                {doctor.next_available && (
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Próxima disponibilidade
                            </p>
                            <p className="font-semibold text-emerald-600">{doctor.next_available}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Info Section */}
            <div className="p-5 space-y-4">
                {/* Name & Specialty */}
                <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-theme-primary transition-colors">
                        {doctor.full_name}
                    </h3>
                    <p className="text-gray-600">{doctor.specialty}</p>
                    <p className="text-sm text-gray-400">CRM {doctor.crm}{doctor.crm_state && `/${doctor.crm_state}`}</p>
                </div>

                {/* Rating */}
                {(doctor.rating ?? 0) > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="flex">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    className={`w-4 h-4 ${i < Math.floor(doctor.rating || 0)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-200'
                                        }`}
                                />
                            ))}
                        </div>
                        <span className="text-sm font-medium">{doctor.rating?.toFixed(1)}</span>
                        <span className="text-sm text-gray-400">({doctor.total_reviews})</span>
                    </div>
                )}

                {/* Insurance Badge */}
                {doctor.accepts_insurance && (
                    <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                            <CreditCard className="w-3 h-3 mr-1" />
                            Aceita Convênios
                        </Badge>
                    </div>
                )}

                {/* Price (if enabled) */}
                {theme.display.show_prices && doctor.consultation_price && (
                    <div className="pt-4 border-t">
                        <p className="text-sm text-gray-500">A partir de</p>
                        <p
                            className="text-2xl font-bold"
                            style={{ color: theme.colors.primary }}
                        >
                            R$ {doctor.consultation_price.toFixed(2).replace('.', ',')}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                    <Link href={`/${clinicSlug}/agendar/${doctor.id}`} className="flex-1">
                        <Button
                            className="w-full btn-theme-primary"
                            style={{ backgroundColor: theme.colors.primary }}
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Agendar
                        </Button>
                    </Link>
                    <Link href={`/${clinicSlug}/agendar/${doctor.id}?type=teleconsulta`}>
                        <Button variant="outline" size="icon">
                            <Video className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}

// =============================================================================
// Main Component
// =============================================================================

export function DoctorsShowcase({
    clinicSlug,
    doctors,
    title = "Nossos Especialistas",
    subtitle = "Médicos qualificados e prontos para atender você"
}: DoctorsShowcaseProps) {
    const { theme } = useClinicTheme()

    if (doctors.length === 0) {
        return null
    }

    // Show max 6 doctors in showcase, featured first
    const showcaseDoctors = [...doctors]
        .sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0))
        .slice(0, 6)

    return (
        <section id="medicos" className="py-16 md:py-20">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2
                        className="text-3xl md:text-4xl font-bold font-theme-heading mb-4"
                        style={{ color: theme.colors.text }}
                    >
                        {title}
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        {subtitle}
                    </p>
                </div>

                {/* Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {showcaseDoctors.map((doctor) => (
                        <DoctorShowcaseCard
                            key={doctor.id}
                            doctor={doctor}
                            clinicSlug={clinicSlug}
                        />
                    ))}
                </div>

                {/* View All Link */}
                {doctors.length > 6 && (
                    <div className="text-center mt-10">
                        <Link href={`/${clinicSlug}/agendar`}>
                            <Button
                                variant="outline"
                                size="lg"
                                className="border-2"
                                style={{ borderColor: theme.colors.primary, color: theme.colors.primary }}
                            >
                                Ver todos os {doctors.length} médicos
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </section>
    )
}
