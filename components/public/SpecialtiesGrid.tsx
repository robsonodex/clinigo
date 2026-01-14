'use client'

import Link from 'next/link'
import { useClinicTheme } from './ThemeProvider'
import { cn } from '@/lib/utils'
import {
    Stethoscope,
    Heart,
    Brain,
    Eye,
    Baby,
    Scissors,
    Sparkles,
    Users
} from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface Specialty {
    name: string
    slug: string
    doctorCount: number
    icon?: string
}

interface SpecialtiesGridProps {
    clinicSlug: string
    specialties: Specialty[]
}

// =============================================================================
// Icon Mapping
// =============================================================================

const SPECIALTY_ICONS: Record<string, React.FC<{ className?: string }>> = {
    'Cardiologia': Heart,
    'Neurologia': Brain,
    'Oftalmologia': Eye,
    'Pediatria': Baby,
    'Cirurgia': Scissors,
    'Dermatologia': Sparkles,
    'Clínica Geral': Stethoscope,
    'default': Users,
}

const SPECIALTY_COLORS: Record<string, string> = {
    'Cardiologia': '#EF4444',
    'Neurologia': '#8B5CF6',
    'Oftalmologia': '#0EA5E9',
    'Pediatria': '#F97316',
    'Cirurgia': '#10B981',
    'Dermatologia': '#EC4899',
    'Clínica Geral': '#6366F1',
}

// =============================================================================
// Component
// =============================================================================

export function SpecialtiesGrid({ clinicSlug, specialties }: SpecialtiesGridProps) {
    const { theme } = useClinicTheme()

    if (specialties.length === 0) {
        return null
    }

    return (
        <section id="especialidades" className="py-16 md:py-20 bg-gray-50/50">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold font-theme-heading mb-4" style={{ color: theme.colors.text }}>
                        Nossas Especialidades
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Encontre o especialista ideal para cuidar da sua saúde
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {specialties.map((specialty) => {
                        const IconComponent = SPECIALTY_ICONS[specialty.name] || SPECIALTY_ICONS['default']
                        const iconColor = SPECIALTY_COLORS[specialty.name] || theme.colors.primary

                        return (
                            <Link
                                key={specialty.slug}
                                href={`/${clinicSlug}/agendar?specialty=${encodeURIComponent(specialty.name)}`}
                                className="group"
                            >
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 hover:-translate-y-1 transition-all duration-300">
                                    {/* Icon */}
                                    <div
                                        className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                                        style={{ backgroundColor: `${iconColor}15` }}
                                    >
                                        <span style={{ color: iconColor }}>
                                            <IconComponent className="w-7 h-7" />
                                        </span>
                                    </div>

                                    {/* Name */}
                                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-theme-primary transition-colors">
                                        {specialty.name}
                                    </h3>

                                    {/* Doctor Count */}
                                    <p className="text-sm text-gray-500">
                                        {specialty.doctorCount} {specialty.doctorCount === 1 ? 'médico' : 'médicos'}
                                    </p>
                                </div>
                            </Link>
                        )
                    })}
                </div>

                {/* View All Link */}
                <div className="text-center mt-10">
                    <Link
                        href={`/${clinicSlug}/agendar`}
                        className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                        style={{ color: theme.colors.primary }}
                    >
                        Ver todos os médicos →
                    </Link>
                </div>
            </div>
        </section>
    )
}
