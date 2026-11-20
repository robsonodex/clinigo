import type { Metadata } from 'next'
import { PLANS_CONTENT } from '@/components/preview-home/content'

export const metadata: Metadata = {
    title: 'Planos e Preços para Clínicas de Terapias',
    description:
        'Planos transparentes para clínicas de terapias multidisciplinares a partir de R$ 149/mês: Básico (1 licença), Avançado (até 5 licenças com BI, WhatsApp e repasse) e Professional (até 30 licenças com TISS ANS e biometria facial).',
    alternates: {
        canonical: 'https://clinigo.app/planos',
    },
    keywords: [
        'preço sistema para clínica de terapias',
        'planos software clínica multidisciplinar',
        'quanto custa sistema para clínica ABA',
        'sistema clínica psicologia preço',
        'software TISS terapias preço',
    ],
    openGraph: {
        title: 'Planos e Preços | CliniGo para Clínicas de Terapias',
        description:
            'Três planos claros sem fidelidade: Básico (R$ 149/mês), Avançado (R$ 249/mês) e Professional (R$ 449/mês), com licença extra a R$ 49,90/mês.',
        url: 'https://clinigo.app/planos',
        siteName: 'CliniGo',
        type: 'website',
        locale: 'pt_BR',
    },
}

const planosJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://clinigo.app' },
                { '@type': 'ListItem', position: 2, name: 'Planos e Preços', item: 'https://clinigo.app/planos' },
            ],
        },
        {
            '@type': 'OfferCatalog',
            name: 'Planos CliniGo para Clínicas de Terapias Multidisciplinares',
            url: 'https://clinigo.app/planos',
            itemListElement: PLANS_CONTENT.plans.map((plan) => ({
                '@type': 'Offer',
                name: `CliniGo ${plan.name}`,
                description: `${plan.audience}. ${plan.licenses}. ${plan.core.join('; ')}.`,
                price: plan.price,
                priceCurrency: 'BRL',
                availability: 'https://schema.org/InStock',
                url: 'https://clinigo.app/planos',
            })),
        },
    ],
}

export default function PlanosLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(planosJsonLd) }}
            />
            {children}
        </>
    )
}

