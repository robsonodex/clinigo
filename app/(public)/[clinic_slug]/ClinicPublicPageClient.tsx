'use client'

import { ThemeProvider } from '@/components/public/ThemeProvider'
import { DynamicHeader } from '@/components/public/DynamicHeader'
import { HeroSection } from '@/components/public/HeroSection'
import { SpecialtiesGrid } from '@/components/public/SpecialtiesGrid'
import { DoctorsShowcase } from '@/components/public/DoctorsShowcase'
import { ReviewsSection } from '@/components/public/ReviewsSection'
import { LocationMap } from '@/components/public/LocationMap'
import { FAQSection } from '@/components/public/FAQSection'
import { CustomFooter } from '@/components/public/CustomFooter'
import { ClinicTheme, DEFAULT_THEME } from '@/types/clinic-theme'
import { useRouter } from 'next/navigation'

// =============================================================================
// Helper: Deep sanitize to remove empty objects
// =============================================================================

function deepSanitize<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj
    if (typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(deepSanitize) as T

    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (value === null || value === undefined) {
            result[key] = null
            continue
        }
        if (typeof value === 'object' && !Array.isArray(value)) {
            const cleaned = deepSanitize(value as Record<string, unknown>)
            if (Object.keys(cleaned).length === 0) {
                result[key] = null
            } else {
                result[key] = cleaned
            }
        } else {
            result[key] = value
        }
    }
    return result as T
}

function sanitizeTheme(theme: Partial<ClinicTheme> | null): Partial<ClinicTheme> | null {
    if (!theme || typeof theme !== 'object') return null
    if (Object.keys(theme).length === 0) return null
    return deepSanitize(theme)
}

// =============================================================================
// Types
// =============================================================================

interface Doctor {
    id: string
    full_name: string
    specialty: string
    crm: string
    photo_url: string | null
    consultation_price: number
    is_featured: boolean
    accepts_insurance: boolean
}

interface Specialty {
    name: string
    slug: string
    doctorCount: number
}

interface Review {
    id: string
    reviewer_name: string
    rating: number
    comment: string
    date: string
    is_verified: boolean
}

interface ClinicData {
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

interface PageData {
    clinic: ClinicData
    doctors: Doctor[]
    specialties: Specialty[]
    reviews: Review[]
    stats: {
        average_rating: number
        total_reviews: number
        total_doctors: number
    }
}

interface ClinicPublicPageClientProps {
    data: PageData
}

// =============================================================================
// Client Component
// =============================================================================

export function ClinicPublicPageClient({ data }: ClinicPublicPageClientProps) {
    const router = useRouter()
    const { clinic, doctors, specialties, reviews, stats } = data

    // Sanitize theme to remove empty objects
    const sanitizedTheme = sanitizeTheme(clinic.theme)

    const handleSearch = (term: string) => {
        router.push(`/${clinic.slug}/agendar?search=${encodeURIComponent(term)}`)
    }

    // Sanitize opening_hours
    const safeOpeningHours = (() => {
        if (!clinic.opening_hours || typeof clinic.opening_hours !== 'object') return null
        const entries = Object.entries(clinic.opening_hours)
        if (entries.length === 0) return null
        const sanitized: Record<string, string> = {}
        for (const [k, v] of entries) {
            if (v && typeof v === 'string') sanitized[k] = v
            else if (v) sanitized[k] = String(v)
        }
        return Object.keys(sanitized).length > 0 ? sanitized : null
    })()

    return (
        <ThemeProvider
            theme={sanitizedTheme}
            planType={clinic.plan_type}
        >
            <div className="min-h-screen bg-white font-theme">
                {/* Header */}
                <DynamicHeader
                    clinicName={clinic.name}
                    clinicSlug={clinic.slug}
                    logoUrl={clinic.logo_url}
                    phone={clinic.phone}
                />

                {/* Hero */}
                <HeroSection
                    clinicName={clinic.name}
                    clinicSlug={clinic.slug}
                    logoUrl={clinic.logo_url}
                    rating={stats.average_rating}
                    totalReviews={stats.total_reviews}
                    onSearch={handleSearch}
                />

                {/* Specialties */}
                <SpecialtiesGrid
                    clinicSlug={clinic.slug}
                    specialties={specialties}
                />

                {/* Doctors */}
                <DoctorsShowcase
                    clinicSlug={clinic.slug}
                    doctors={doctors}
                />

                {/* Reviews */}
                <ReviewsSection
                    clinicRating={stats.average_rating}
                    totalReviews={stats.total_reviews}
                    reviews={reviews}
                    googleReviewsUrl={clinic.google_maps_url}
                />

                {/* Location */}
                <LocationMap
                    clinicName={clinic.name}
                    address={clinic.address}
                    phone={clinic.phone}
                    googleMapsUrl={clinic.google_maps_url}
                    openingHours={safeOpeningHours}
                    gallery={clinic.gallery}
                />

                {/* FAQ */}
                <FAQSection
                    clinicSlug={clinic.slug}
                    whatsappNumber={clinic.whatsapp_number}
                />

                {/* Footer */}
                <CustomFooter
                    clinicName={clinic.name}
                    clinicSlug={clinic.slug}
                    logoUrl={clinic.logo_url}
                    address={clinic.address}
                    phone={clinic.phone}
                    email={clinic.email}
                    socialLinks={{
                        instagram: clinic.instagram,
                        facebook: clinic.facebook,
                        linkedin: clinic.linkedin,
                        youtube: clinic.youtube,
                    }}
                />
            </div>
        </ThemeProvider>
    )
}
