import { type NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

interface RouteParams {
    params: Promise<{ slug: string }>
}

/**
 * GET /api/public/clinic-reviews/[slug]
 * Public endpoint to fetch clinic reviews from satisfaction_surveys
 * Returns average scores, total count, and recent public comments
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { slug } = await params

        if (!slug) {
            return NextResponse.json({ error: 'Slug obrigatório' }, { status: 400 })
        }

        const supabase = createServiceRoleClient()

        // 1. Look up clinic by slug
        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .select('id')
            .eq('slug', slug)
            .eq('is_active', true)
            .single()

        if (clinicError || !clinic) {
            return NextResponse.json({
                average_score: 0,
                average_stars: 0,
                total_reviews: 0,
                comments: [],
            })
        }

        // 2. Fetch completed surveys with scores for this clinic
        // Note: Filtering by completed_at NOT NULL ensures only answered surveys are included
        const { data: surveys, error: surveysError } = await supabase
            .from('satisfaction_surveys')
            .select('nps_score, professional_rating, comment, completed_at')
            .eq('clinic_id', clinic.id)
            .not('nps_score', 'is', null)
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false })

        if (surveysError) {
            console.error('Erro ao buscar avaliações públicas:', surveysError)
            return NextResponse.json({
                average_score: 0,
                average_stars: 0,
                total_reviews: 0,
                comments: [],
            })
        }

        const validSurveys = surveys || []
        const totalReviews = validSurveys.length

        if (totalReviews === 0) {
            return NextResponse.json({
                average_score: 0,
                average_stars: 0,
                total_reviews: 0,
                comments: [],
            })
        }

        // 3. Calculate averages
        const npsScores = validSurveys
            .map(s => s.nps_score)
            .filter((s): s is number => s !== null && s !== undefined)

        const professionalRatings = validSurveys
            .map(s => s.professional_rating)
            .filter((s): s is number => s !== null && s !== undefined)

        const averageScore = npsScores.length > 0
            ? parseFloat((npsScores.reduce((a, b) => a + b, 0) / npsScores.length).toFixed(1))
            : 0

        const averageStars = professionalRatings.length > 0
            ? parseFloat((professionalRatings.reduce((a, b) => a + b, 0) / professionalRatings.length).toFixed(1))
            : 0

        // 4. Get last 5 non-null comments (no patient-identifying data)
        const comments = validSurveys
            .map(s => s.comment)
            .filter((c): c is string => !!c && c.trim().length > 0)
            .slice(0, 5)

        return NextResponse.json({
            average_score: averageScore,
            average_stars: averageStars,
            total_reviews: totalReviews,
            comments,
        })

    } catch (error) {
        console.error('Erro no endpoint de avaliações públicas:', error)
        return NextResponse.json({
            average_score: 0,
            average_stars: 0,
            total_reviews: 0,
            comments: [],
        })
    }
}
