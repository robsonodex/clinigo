import { type NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/marketplace/clinics
 * Public endpoint to list active clinics in the marketplace
 * Returns clinics with specialties (from doctors) and average rating
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = createServiceRoleClient()

        // Fetch all active clinics
        const { data: clinics, error } = await supabase
            .from('clinics')
            .select('id, name, slug, address, logo_url, is_active')
            .eq('is_active', true)
            .order('name', { ascending: true })

        if (error) {
            console.error('Erro ao buscar clínicas para o marketplace:', error)
            return NextResponse.json({ error: 'Erro ao carregar clínicas' }, { status: 500 })
        }

        // Fetch doctors grouped by clinic for specialties and ratings
        const clinicIds = (clinics || []).map(c => c.id)
        const { data: doctors } = await supabase
            .from('doctors')
            .select('clinic_id, specialty, rating')
            .in('clinic_id', clinicIds)

        // Build specialty and rating maps per clinic
        const clinicDoctorMap = new Map<string, { specialties: Set<string>; ratings: number[] }>()
        for (const doc of doctors || []) {
            if (!clinicDoctorMap.has(doc.clinic_id)) {
                clinicDoctorMap.set(doc.clinic_id, { specialties: new Set(), ratings: [] })
            }
            const entry = clinicDoctorMap.get(doc.clinic_id)!
            if (doc.specialty) entry.specialties.add(doc.specialty)
            if (doc.rating != null) entry.ratings.push(doc.rating)
        }

        // Format clinics to match what the frontend expects
        const formattedClinics = (clinics || []).map((clinic) => {
            const addr = clinic.address as Record<string, unknown> | null
            const city = addr?.city as string | undefined

            // Build a human readable address
            let formattedAddress = ''
            if (addr) {
                const parts = [
                    addr.street,
                    addr.number,
                    addr.neighborhood,
                    addr.city,
                    addr.state
                ].filter(Boolean)
                formattedAddress = parts.join(', ')
            }

            const doctorData = clinicDoctorMap.get(clinic.id)
            const specialties = doctorData ? Array.from(doctorData.specialties) : []
            const ratings = doctorData?.ratings || []
            const averageRating = ratings.length > 0
                ? parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
                : null

            return {
                id: clinic.id,
                name: clinic.name,
                slug: clinic.slug,
                logo_url: clinic.logo_url || null,
                address: formattedAddress || undefined,
                city: city || undefined,
                specialties,
                average_rating: averageRating,
                total_doctors: specialties.length > 0 ? (doctorData?.ratings.length || 0) : 0,
            }
        })

        return NextResponse.json({ clinics: formattedClinics })

    } catch (error) {
        console.error('Erro no endpoint de clínicas do marketplace:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
