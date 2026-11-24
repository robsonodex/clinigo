import type { Metadata } from 'next'
import { PreviewLandingPage } from '@/components/preview-home/PreviewLandingPage'
import { FAQ_CONTENT, PLANS_CONTENT, SEO_CONTENT } from '@/components/preview-home/content'
import { landingFontVariables } from '@/components/preview-home/fonts'

/**
 * Home oficial (clinigo.app) — identidade editorial, foco em clínicas de terapias multidisciplinares.
 * A landing anterior permanece em app/(marketing)/landing-premium/page.tsx (com noindex)
 * para rollback imediato caso necessário.
 */
export const metadata: Metadata = {
    title: {
        absolute: SEO_CONTENT.title,
    },
    description: SEO_CONTENT.description,
    alternates: {
        canonical: 'https://clinigo.app',
    },
    keywords: [
        'sistema para clínica de terapias',
        'sistema para clínica multidisciplinar',
        'software para clínica de terapia',
        'sistema para psicologia',
        'sistema para clínica ABA',
        'software para neurodesenvolvimento e TEA',
        'software para fonoaudiologia',
        'sistema para terapia ocupacional',
        'prontuário para psicomotricidade',
        'sistema para fisioterapia agenda recorrente',
        'faturamento TISS para clínicas de terapias',
        'biometria facial presença TISS',
        'repasse por profissional clínica de terapia',
        'agenda recorrente e co-terapia',
        'inteligencia artificial lgpd clinica de terapias',
        'portal da familia terapia aba',
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
                alt: 'CliniGo - Sistema para Clínicas de Terapias Multidisciplinares',
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
            '@type': 'WebSite',
            '@id': 'https://clinigo.app/#website',
            name: 'CliniGo',
            alternateName: ['CliniGo Terapias', 'CliniGo Plataforma para Clínicas de Terapias'],
            url: 'https://clinigo.app',
            inLanguage: 'pt-BR',
            description: SEO_CONTENT.description,
            publisher: {
                '@id': 'https://clinigo.app/#organization',
            },
        },
        {
            '@type': 'Organization',
            '@id': 'https://clinigo.app/#organization',
            name: 'CliniGo',
            legalName: 'CliniGo Tecnologia para Clínicas de Terapias',
            url: 'https://clinigo.app',
            logo: {
                '@type': 'ImageObject',
                url: 'https://clinigo.app/logo-clinigo-terapias.png',
            },
            image: 'https://clinigo.app/dashboard-preview.png',
            description:
                'Plataforma brasileira especializada em gestão operacional e clínica para clínicas de terapias multidisciplinares: Psicologia, ABA e Neurodesenvolvimento, Fonoaudiologia, Terapia Ocupacional, Psicomotricidade e Fisioterapia.',
            email: 'contato@clinigo.app',
            telephone: '+55-21-97512-9005',
            areaServed: {
                '@type': 'Country',
                name: 'Brasil',
            },
            knowsAbout: [
                'Gestão de Clínicas de Terapias Multidisciplinares',
                'Análise do Comportamento Aplicada (ABA) e Neurodesenvolvimento',
                'Prontuário Eletrônico para Psicologia (CRP)',
                'Prontuário Eletrônico para Fonoaudiologia (CRFa)',
                'Terapia Ocupacional e Gestão de Salas Sensoriais (CREFITO)',
                'Psicomotricidade e Gráfico Evolutivo',
                'Fisioterapia e Reabilitação Funcional',
                'Agenda Recorrente e Co-terapia',
                'Faturamento TISS Padrão ANS e Gestão de Glosas',
                'Check-in por Biometria Facial para Comprovação de Presença',
                'Governança LGPD, Sigilo Clínico RBAC/RLS e Assinatura Eletrônica Lei 14.063/2020',
                'Repasse Financeiro por Profissional Terapeuta',
            ],
            contactPoint: [
                {
                    '@type': 'ContactPoint',
                    contactType: 'sales',
                    telephone: '+55-21-97512-9005',
                    email: 'contato@clinigo.app',
                    availableLanguage: ['Portuguese'],
                    areaServed: 'BR',
                },
                {
                    '@type': 'ContactPoint',
                    contactType: 'customer support',
                    telephone: '+55-21-97512-9005',
                    email: 'contato@clinigo.app',
                    availableLanguage: ['Portuguese'],
                    areaServed: 'BR',
                },
            ],
        },
        {
            '@type': 'SoftwareApplication',
            '@id': 'https://clinigo.app/#software',
            name: 'CliniGo',
            applicationCategory: 'BusinessApplication',
            applicationSubCategory: 'Sistema de Gestão para Clínicas de Terapias Multidisciplinares',
            operatingSystem: 'Web, Android, iOS (PWA)',
            inLanguage: 'pt-BR',
            url: 'https://clinigo.app',
            image: 'https://clinigo.app/dashboard-preview.png',
            description: SEO_CONTENT.description,
            audience: {
                '@type': 'Audience',
                audienceType:
                    'Clínicas de Terapias Multidisciplinares, Clínicas ABA, Psicologia, Fonoaudiologia, Terapia Ocupacional, Psicomotricidade e Fisioterapia',
            },
            featureList: [
                'CliniGo IA com Escudo LGPD nativo: Estruturador de Evolução, Tradutor Empático CliniGo Família, Redator em 3 Tons e Carta Técnica ANS',
                'CliniGo Família 2.0 sem app: Mural de Conquistas, Atividades em Casa, retorno estruturado da escola e Radar de Retenção',
                'Agenda recorrente minuto a minuto (40, 45, 50 ou 120 min) com co-terapia nativa, Meu Dia Clínico e reserva de salas sensoriais',
                'Workspaces clínicos por especialidade (456+ objetivos): ABA e Neurodesenvolvimento com Modo Tatame DTT/NET, Psicologia, Fonoaudiologia, TO, Psicomotricidade (55 objetivos PDF) e Fisioterapia',
                'Mesa de Supervisão ABA/PEI com Curvas de Aprendizagem (>=80% em 3 sessões) e alerta de calibração entre terapeutas',
                'Sigilo clínico RBAC e isolamento RLS no servidor em conformidade com LGPD, CRP, CRFa e CREFITO',
                'Pré-cadastro online e assinatura eletrônica de contratos com validade jurídica Lei 14.063/2020 e hash SHA-256',
                'Check-in biométrico facial multi-superfície, Totem 100% digital e Painel de TV Editorial Sensorial',
                'Domínio TISS completo: Score de Saúde do Lote, Raio-X de Operadoras (DSO), Glosas em 3 Níveis e Dossiê Probatório em 1 clique',
                'Meu Repasse Ao Vivo por profissional, WhatsApp integrado por setores, Busca Global Ctrl+K e teleconsulta WebRTC nativa',
            ],
            provider: {
                '@id': 'https://clinigo.app/#organization',
            },
            offers: PLANS_CONTENT.plans.map((plan) => ({
                '@type': 'Offer',
                name: `Plano ${plan.name} CliniGo`,
                description: `${plan.audience} — ${plan.licenses}`,
                price: plan.price,
                priceCurrency: 'BRL',
                availability: 'https://schema.org/InStock',
                url: 'https://clinigo.app/planos',
            })),
        },
        {
            '@type': 'ItemList',
            '@id': 'https://clinigo.app/#specialties',
            name: 'Soluções CliniGo por Especialidade Terapêutica',
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Sistema para Clínica Multidisciplinar de Terapias',
                    url: 'https://clinigo.app/solucoes/clinica-multidisciplinar',
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Sistema para Clínica ABA e Neurodesenvolvimento',
                    url: 'https://clinigo.app/solucoes/clinica-aba',
                },
                {
                    '@type': 'ListItem',
                    position: 3,
                    name: 'Sistema para Clínica de Psicologia (CRP)',
                    url: 'https://clinigo.app/solucoes/psicologia',
                },
                {
                    '@type': 'ListItem',
                    position: 4,
                    name: 'Sistema para Clínica de Fonoaudiologia (CRFa)',
                    url: 'https://clinigo.app/solucoes/fonoaudiologia',
                },
                {
                    '@type': 'ListItem',
                    position: 5,
                    name: 'Sistema para Terapia Ocupacional e Sala Sensorial (CREFITO)',
                    url: 'https://clinigo.app/solucoes/terapia-ocupacional',
                },
                {
                    '@type': 'ListItem',
                    position: 6,
                    name: 'Sistema para Psicomotricidade',
                    url: 'https://clinigo.app/solucoes/psicomotricidade',
                },
                {
                    '@type': 'ListItem',
                    position: 7,
                    name: 'Sistema para Clínica de Fisioterapia',
                    url: 'https://clinigo.app/solucoes/fisioterapia',
                },
                {
                    '@type': 'ListItem',
                    position: 8,
                    name: 'Faturamento TISS e Biometria Facial para Terapias',
                    url: 'https://clinigo.app/solucoes/faturamento-tiss-terapias',
                },
            ],
        },
        {
            '@type': 'FAQPage',
            '@id': 'https://clinigo.app/#faq',
            mainEntity: FAQ_CONTENT.items.map((item) => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.answer,
                },
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
