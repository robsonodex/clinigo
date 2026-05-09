import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Teste Grátis 7 Dias | CliniGo - Sistema de Gestão para Clínicas',
    description: 'Experimente o CliniGo gratuitamente por 7 dias. Agenda, prontuário eletrônico, check-in facial, faturamento TISS e muito mais. Sem cartão de crédito.',
    keywords: 'sistema para clínica, gestão clínica, prontuário eletrônico, agenda médica, TISS, teste grátis, software médico',
    openGraph: {
        title: 'Teste Grátis 7 Dias | CliniGo',
        description: 'A plataforma All-in-One para gestão de clínicas. Teste grátis por 7 dias, sem cartão de crédito.',
        type: 'website',
        url: 'https://www.clinigo.app/trial',
    },
    robots: {
        index: true,
        follow: true,
    },
}

export default function TrialLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
