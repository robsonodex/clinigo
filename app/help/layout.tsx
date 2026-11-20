import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Central de Ajuda e Configuração',
    description:
        'Tutoriais e guias práticos do CliniGo para clínicas de terapias multidisciplinares: WhatsApp automático, Totem, Painel de TV, envio SMTP, TISS e check-in facial.',
    alternates: {
        canonical: 'https://clinigo.app/help',
    },
    openGraph: {
        title: 'Central de Ajuda | CliniGo',
        description:
            'Guias de configuração de WhatsApp, Totem de autoatendimento, Painel de TV e e-mail SMTP para clínicas de terapias.',
        url: 'https://clinigo.app/help',
        siteName: 'CliniGo',
        type: 'website',
        locale: 'pt_BR',
    },
}

export default function HelpLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-white">
            {children}
        </div>
    )
}
