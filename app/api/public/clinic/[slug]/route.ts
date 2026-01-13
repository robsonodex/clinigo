import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/public/clinic/[slug]
 * Public endpoint to get clinic data with theme, doctors, specialties and reviews
 * No authentication required
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const supabase = await createClient()

        // Fetch clinic with theme
        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .select(`
        id,
        name,
        slug,
        email,
        phone,
        address,
        logo_url,
        plan_type,
        theme,
        public_page_settings,
        is_active
      `)
            .eq('slug', slug)
            .eq('is_active', true)
            .single()

        if (clinicError || !clinic) {
            return NextResponse.json(
                { error: 'Clínica não encontrada' },
                { status: 404 }
            )
        }

        // Check if public page is enabled
        const publicSettings = clinic.public_page_settings as Record<string, unknown> | null
        if (publicSettings?.enabled === false) {
            return NextResponse.json(
                { error: 'Página pública desabilitada' },
                { status: 404 }
            )
        }

        // Fetch active doctors with user info
        const { data: doctors, error: doctorsError } = await supabase
            .from('doctors')
            .select(`
        id,
        specialty,
        crm,
        consultation_price,
        consultation_duration,
        display_settings,
        is_accepting_appointments,
        user:users (
          full_name,
          avatar_url
        )
      `)
            .eq('clinic_id', clinic.id)
            .eq('is_active', true)
            .eq('is_accepting_appointments', true)

        // Format doctors
        const formattedDoctors = (doctors || []).map((doc) => {
            const user = doc.user as { full_name: string; avatar_url?: string } | null
            const displaySettings = doc.display_settings as Record<string, unknown> | null
            return {
                id: doc.id,
                full_name: user?.full_name || 'Médico',
                specialty: doc.specialty,
                crm: doc.crm,
                photo_url: user?.avatar_url || null,
                consultation_price: doc.consultation_price,
                is_featured: displaySettings?.is_featured || false,
                accepts_insurance: displaySettings?.accepts_insurance || false,
            }
        })

        // Calculate specialty counts
        const specialtyCounts = formattedDoctors.reduce((acc, doc) => {
            acc[doc.specialty] = (acc[doc.specialty] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        const specialties = Object.entries(specialtyCounts).map(([name, count]) => ({
            name,
            slug: name.toLowerCase().replace(/\s+/g, '-'),
            doctorCount: count,
        }))

        // Fetch approved reviews
        const { data: reviews } = await supabase
            .from('service_reviews')
            .select(`
        id,
        reviewer_name,
        overall_rating,
        content,
        is_verified,
        created_at
      `)
            .eq('clinic_id', clinic.id)
            .eq('status', 'APPROVED')
            .order('created_at', { ascending: false })
            .limit(10)

        // Format reviews
        const formattedReviews = (reviews || []).map((review) => ({
            id: review.id,
            reviewer_name: review.reviewer_name,
            rating: review.overall_rating,
            comment: review.content || '',
            date: new Date(review.created_at).toLocaleDateString('pt-BR'),
            is_verified: review.is_verified,
        }))

        // Calculate average rating
        const totalReviews = formattedReviews.length
        const avgRating = totalReviews > 0
            ? formattedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
            : 0

        // Fetch clinic public profile if exists
        const { data: publicProfile } = await supabase
            .from('clinic_public_profile')
            .select('*')
            .eq('clinic_id', clinic.id)
            .single()

        // Merge public profile data
        const response = {
            clinic: {
                id: clinic.id,
                name: clinic.name,
                slug: clinic.slug,
                email: clinic.email,
                phone: clinic.phone,
                address: clinic.address,
                logo_url: clinic.logo_url,
                plan_type: clinic.plan_type,
                theme: clinic.theme,
                // From public profile
                tagline: publicProfile?.tagline || null,
                about: publicProfile?.about || null,
                video_url: publicProfile?.video_url || null,
                gallery: publicProfile?.gallery || [],
                google_maps_url: publicProfile?.google_maps_url || null,
                whatsapp_number: publicProfile?.whatsapp_number || null,
                instagram: publicProfile?.instagram || null,
                facebook: publicProfile?.facebook || null,
                linkedin: publicProfile?.linkedin || null,
                youtube: publicProfile?.youtube || null,
                opening_hours: publicProfile?.opening_hours || null,
                badges: publicProfile?.badges || [],
            },
            doctors: formattedDoctors,
            specialties,
            reviews: formattedReviews,
            stats: {
                average_rating: avgRating,
                total_reviews: totalReviews,
                total_doctors: formattedDoctors.length,
            },
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Error fetching public clinic data:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
