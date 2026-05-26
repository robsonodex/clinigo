import { type NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/marketplace/clinics
 * Public endpoint to list active clinics in the marketplace
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

            return {
                id: clinic.id,
                name: clinic.name,
                slug: clinic.slug,
                logo_url: clinic.logo_url || null,
                address: formattedAddress || undefined,
                city: city || undefined,
            }
        })

        return NextResponse.json({ clinics: formattedClinics })

    } catch (error) {
        console.error('Erro no endpoint de clínicas do marketplace:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
