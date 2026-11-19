import type { Metadata } from 'next'
import { PreviewLandingPage } from '@/components/preview-home/PreviewLandingPage'
import { PLANS_CONTENT, SEO_CONTENT } from '@/components/preview-home/content'
import { landingFontVariables } from '@/components/preview-home/fonts'

/**
 * Home oficial (clinigo.app) — identidade 2027, foco em clinicas de terapias.
 * A landing anterior permanece em app/(marketing)/landing-premium/page.tsx
 * para rollback imediato caso necessario.
 */
export const metadata: Metadata = {
    title: SEO_CONTENT.title,
    description: SEO_CONTENT.description,
    alternates: {
        canonical: 'https://clinigo.app',
    },
    keywords: [
        'sistema para clínica de terapias',
        'software para clínica de terapia',
        'sistema para psicologia',
        'sistema para clínica ABA',
        'software para fonoaudiologia',
        'sistema para terapia ocupacional',
        'prontuário para psicomotricidade',
        'agenda recorrente para terapeutas',
        'clinigo',
    ],
    openGraph: {
        title: SEO_CONTENT.title,
        description: SEO_CONTENT.description,
        url: 'https://clinigo.app',
        siteName: 'CliniGo',
        images: [
            {
                url: 'https://clinigo.app/dashboard-preview.png',
                width: 1200,
                height: 630,
                alt: 'CliniGo - Plataforma para clínicas de terapias multidisciplinares',
            },
        ],
        locale: 'pt_BR',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: SEO_CONTENT.title,
        description: SEO_CONTENT.description,
        images: ['https://clinigo.app/dashboard-preview.png'],
    },
    robots: {
        index: true,
        follow: true,
    },
}

const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Organization',
            name: 'CliniGo',
            url: 'https://clinigo.app',
            logo: 'https://clinigo.app/logo-clinigo-terapias.png',
        },
        {
            '@type': 'SoftwareApplication',
            name: 'CliniGo',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web, Android, iOS (PWA)',
            description: SEO_CONTENT.description,
            url: 'https://clinigo.app',
            offers: PLANS_CONTENT.plans.map((plan) => ({
                '@type': 'Offer',
                name: plan.name,
                price: plan.price,
                priceCurrency: 'BRL',
            })),
        },
    ],
}

export default function Home() {
    return (
        <div className={landingFontVariables}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <PreviewLandingPage />
        </div>
    )
}
