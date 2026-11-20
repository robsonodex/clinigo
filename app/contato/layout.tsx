import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Contato, Demonstração e Suporte Técnico',
    description:
        'Fale com a equipe comercial ou suporte técnico do CliniGo por WhatsApp ou e-mail. Tire dúvidas sobre planos, implantação, migração de dados e demonstração para sua clínica de terapias.',
    alternates: {
        canonical: 'https://clinigo.app/contato',
    },
    openGraph: {
        title: 'Contato | CliniGo para Clínicas de Terapias',
        description:
            'Canais diretos do comercial, suporte técnico e DPO/LGPD do CliniGo para clínicas de terapias multidisciplinares.',
        url: 'https://clinigo.app/contato',
        siteName: 'CliniGo',
        type: 'website',
        locale: 'pt_BR',
    },
}

export default function ContatoLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}

