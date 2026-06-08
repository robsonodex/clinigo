import { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import BookingPageClient from './BookingPageClient'

interface PageProps {
    params: Promise<{ clinic_slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    try {
        const { clinic_slug } = await params
        const supabase = createServiceRoleClient()

        const { data: clinic } = await supabase
            .from('clinics')
            .select('name, address, logo_url')
            .eq('slug', clinic_slug)
            .eq('is_active', true)
            .single()

        if (!clinic) {
            return {
                title: 'Agendar consulta | CliniGo',
                description: 'Agende sua consulta online pelo CliniGo.',
            }
        }

        const addr = clinic.address as Record<string, unknown> | null
        const city = (addr?.city as string) || ''

        return {
            title: `Agendar consulta — ${clinic.name} | CliniGo`,
            description: `Agende sua consulta em ${clinic.name}${city ? `, em ${city}` : ''}. Atendimento online e presencial.`,
            openGraph: {
                title: `Agendar consulta — ${clinic.name} | CliniGo`,
                description: `Agende sua consulta em ${clinic.name}${city ? `, em ${city}` : ''}. Atendimento online e presencial.`,
                ...(clinic.logo_url ? { images: [{ url: clinic.logo_url }] } : {}),
            },
        }
    } catch {
        return {
            title: 'Agendar consulta | CliniGo',
            description: 'Agende sua consulta online pelo CliniGo.',
        }
    }
}

export default async function BookingPage({ params }: PageProps) {
    const { clinic_slug } = await params

    // Fetch clinic data for JSON-LD
    let clinicJsonLd: Record<string, unknown> | null = null
    try {
        const supabase = createServiceRoleClient()
        const { data: clinic } = await supabase
            .from('clinics')
            .select('name, address, logo_url')
            .eq('slug', clinic_slug)
            .eq('is_active', true)
            .single()

        if (clinic) {
            const addr = clinic.address as Record<string, unknown> | null
            const city = (addr?.city as string) || ''

            clinicJsonLd = {
                '@context': 'https://schema.org',
                '@type': 'MedicalClinic',
                name: clinic.name,
                address: {
                    '@type': 'PostalAddress',
                    addressLocality: city,
                },
                url: `https://clinigo.app/${clinic_slug}/agendar`,
                ...(clinic.logo_url ? { image: clinic.logo_url } : {}),
            }
        }
    } catch {
        // Non-critical — page works without JSON-LD
    }

    return (
        <>
            {clinicJsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(clinicJsonLd) }}
                />
            )}
            <BookingPageClient clinicSlugProp={clinic_slug} />
        </>
    )
}
