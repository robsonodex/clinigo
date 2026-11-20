import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Termos de Uso da Plataforma',
    description:
        'Termos de Uso e condições gerais de licenciamento da plataforma CliniGo para clínicas de terapias multidisciplinares, incluindo segurança, LGPD e disponibilidade.',
    alternates: {
        canonical: 'https://clinigo.app/termos',
    },
    openGraph: {
        title: 'Termos de Uso | CliniGo',
        description: 'Condições gerais de licenciamento e uso do software CliniGo.',
        url: 'https://clinigo.app/termos',
        siteName: 'CliniGo',
        type: 'website',
        locale: 'pt_BR',
    },
}

export default function TermosLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}

