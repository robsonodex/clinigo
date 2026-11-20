import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Sites Profissionais para Clínicas de Terapias',
    description:
        'Criação de sites profissionais responsivos e otimizados para o Google para clínicas de Psicologia, ABA, Fonoaudiologia, TO e terapias multidisciplinares, integrados ao agendamento online CliniGo.',
    alternates: {
        canonical: 'https://clinigo.app/site',
    },
    openGraph: {
        title: 'Sites Profissionais para Clínicas de Terapias | CliniGo',
        description:
            'Site sob medida com domínio próprio, SEO técnico e integração direta com o agendamento online e pré-cadastro do CliniGo.',
        url: 'https://clinigo.app/site',
        siteName: 'CliniGo',
        type: 'website',
        locale: 'pt_BR',
    },
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}

