'use client'

import { ClinicTheme, PageTemplate } from '@/types/clinic-theme'

// =============================================================================
// Shared Template Props Interface
// =============================================================================

export interface Doctor {
    id: string
    full_name: string
    specialty: string
    crm: string
    photo_url: string | null
    consultation_price: number
    is_featured: boolean
    accepts_insurance: boolean
}

export interface Specialty {
    name: string
    slug: string
    doctorCount: number
}

export interface Review {
    id: string
    reviewer_name: string
    rating: number
    comment: string
    date: string
    is_verified: boolean
}

export interface ClinicData {
    id: string
    name: string
    slug: string
    email: string | null
    phone: string | null
    address: string | null
    logo_url: string | null
    plan_type: string
    theme: Partial<ClinicTheme> | null
    tagline: string | null
    about: string | null
    video_url: string | null
    gallery: string[]
    google_maps_url: string | null
    whatsapp_number: string | null
    instagram: string | null
    facebook: string | null
    linkedin: string | null
    youtube: string | null
    opening_hours: Record<string, string> | null
}

export interface TemplateProps {
    clinic: ClinicData
    doctors: Doctor[]
    specialties: Specialty[]
    reviews: Review[]
    stats: {
        average_rating: number
        total_reviews: number
        total_doctors: number
    }
    onSearch: (term: string) => void
    onBook: (doctorId?: string) => void
    onTeleconsulta: () => void
}

// =============================================================================
// Template Exports
// =============================================================================

export { GlassmorphismTemplate } from './glassmorphism/GlassmorphismTemplate'
export { SwissMinimalTemplate } from './swiss-minimal/SwissMinimalTemplate'
export { AuroraNeonTemplate } from './aurora-neon/AuroraNeonTemplate'

// New Templates (4 selected)
export { ClassicMedicalTemplate } from './classic-medical/ClassicMedicalTemplate'
export { ModernMinimalTemplate } from './modern-minimal/ModernMinimalTemplate'
export { CorporateHealthcareTemplate } from './corporate-healthcare/CorporateHealthcareTemplate'
export { SwissCleanTemplate } from './swiss-clean/SwissCleanTemplate'


