import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClinicPublicPageClient } from './ClinicPublicPageClient'
import { ClinicTheme } from '@/types/clinic-theme'

// =============================================================================
// Helper: Sanitize fields that may return {} instead of null
// =============================================================================

/**
 * Converts empty objects, null, undefined to null
 * Returns the value if it's a valid non-empty value
 */
function sanitizeField<T>(value: T | null | undefined): T | null {
    if (value === null || value === undefined) return null
    if (typeof value === 'object' && !Array.isArray(value)) {
        if (Object.keys(value as object).length === 0) return null
    }
    return value
}

/**
 * Sanitize opening_hours to ensure all values are strings
 */
function sanitizeOpeningHours(hours: unknown): Record<string, string> | null {
    if (!hours || typeof hours !== 'object') return null
    const entries = Object.entries(hours as Record<string, unknown>)
    if (entries.length === 0) return null

    const sanitized: Record<string, string> = {}
    for (const [key, value] of entries) {
        if (value !== null && value !== undefined && typeof value === 'string') {
            sanitized[key] = value
        }
    }
    return Object.keys(sanitized).length > 0 ? sanitized : null
}

// =============================================================================
// Types
// =============================================================================

interface PageProps {
    params: Promise<{ clinic_slug: string }>
}

// =============================================================================
// Metadata
// =============================================================================

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { clinic_slug } = await params
    const supabase = await createClient()

    const { data: clinic } = await supabase
        .from('clinics')
        .select('name')
        .eq('slug', clinic_slug)
        .eq('is_active', true)
        .single()

    if (!clinic) {
        return { title: 'Clínica não encontrada' }
    }

    return {
        title: `${clinic.name} | Agende sua Consulta`,
        description: `Agende sua consulta online na ${clinic.name}`,
    }
}

// =============================================================================
// Page Component
// =============================================================================

export default async function ClinicPublicPage({ params }: PageProps) {
    const { clinic_slug } = await params
    const supabase = await createClient()

    // Fetch clinic
    const { data: clinic, error: clinicError } = await supabase
        .from('clinics')
        .select('*')
        .eq('slug', clinic_slug)
        .eq('is_active', true)
        .single()

    if (clinicError || !clinic) {
        notFound()
    }

    // Fetch public profile
    const { data: publicProfile } = await supabase
        .from('clinic_public_profile')
        .select('*')
        .eq('clinic_id', clinic.id)
        .single()

    // Fetch doctors
    const { data: doctors } = await supabase
        .from('doctors')
        .select(`
            id,
            specialty,
            crm,
            consultation_price,
            users!inner(id, full_name, photo_url)
        `)
        .eq('clinic_id', clinic.id)
        .eq('is_active', true)

    // Fetch reviews
    const { data: reviews } = await supabase
        .from('service_reviews')
        .select('*')
        .eq('clinic_id', clinic.id)
        .eq('status', 'APPROVED')
        .order('created_at', { ascending: false })
        .limit(6)

    // Format data with sanitization
    const formattedDoctors = (doctors || []).map((d: any) => ({
        id: d.id,
        full_name: d.users.full_name,
        specialty: d.specialty,
        crm: d.crm,
        photo_url: sanitizeField(d.users.photo_url),
        consultation_price: d.consultation_price,
        is_featured: false,
        accepts_insurance: false,
    }))

    const specialtyCounts = formattedDoctors.reduce((acc: Record<string, number>, doc) => {
        acc[doc.specialty] = (acc[doc.specialty] || 0) + 1
        return acc
    }, {})

    const specialties = Object.entries(specialtyCounts).map(([name, count]) => ({
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        doctorCount: count,
    }))

    const formattedReviews = (reviews || []).map((r: any) => ({
        id: r.id,
        reviewer_name: r.reviewer_name,
        rating: r.overall_rating,
        comment: r.content || '',
        date: new Date(r.created_at).toLocaleDateString('pt-BR'),
        is_verified: r.is_verified || false,
    }))

    const avgRating = formattedReviews.length > 0
        ? formattedReviews.reduce((sum, r) => sum + r.rating, 0) / formattedReviews.length
        : 0

    // Prepare page data with SANITIZATION
    const pageData = {
        clinic: {
            id: clinic.id,
            name: clinic.name,
            slug: clinic.slug,
            email: sanitizeField(clinic.email),
            phone: sanitizeField(clinic.phone),
            address: sanitizeField(clinic.address),  // ← THIS WAS THE PROBLEM!
            logo_url: sanitizeField(clinic.logo_url),
            plan_type: clinic.plan_type || 'STARTER',
            theme: sanitizeField(clinic.theme as Partial<ClinicTheme>),
            tagline: sanitizeField(publicProfile?.tagline),
            about: sanitizeField(publicProfile?.about),
            video_url: sanitizeField(publicProfile?.video_url),
            gallery: (publicProfile?.gallery as string[]) || [],
            google_maps_url: sanitizeField(publicProfile?.google_maps_url),
            whatsapp_number: sanitizeField(publicProfile?.whatsapp_number),
            instagram: sanitizeField(publicProfile?.instagram),
            facebook: sanitizeField(publicProfile?.facebook),
            linkedin: sanitizeField(publicProfile?.linkedin),
            youtube: sanitizeField(publicProfile?.youtube),
            opening_hours: sanitizeOpeningHours(publicProfile?.opening_hours),
        },
        doctors: formattedDoctors,
        specialties,
        reviews: formattedReviews,
        stats: {
            average_rating: avgRating,
            total_reviews: formattedReviews.length,
            total_doctors: formattedDoctors.length,
        },
    }

    return <ClinicPublicPageClient data={pageData} />
}
