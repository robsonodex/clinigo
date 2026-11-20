import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Sobre o CliniGo — Tecnologia para Clínicas de Terapias',
    description:
        'Conheça a arquitetura, missão e equipe do CliniGo: plataforma brasileira especializada em clínicas de Psicologia, ABA, Fonoaudiologia, Terapia Ocupacional, Psicomotricidade e Fisioterapia.',
    alternates: {
        canonical: 'https://clinigo.app/sobre',
    },
    openGraph: {
        title: 'Sobre o CliniGo | Plataforma para Clínicas de Terapias',
        description:
            'Nossa história, governança LGPD, assinatura eletrônica Lei 14.063/2020 e especialização em clínicas de terapias multidisciplinares.',
        url: 'https://clinigo.app/sobre',
        siteName: 'CliniGo',
        type: 'website',
        locale: 'pt_BR',
    },
}

export default function SobreLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}

