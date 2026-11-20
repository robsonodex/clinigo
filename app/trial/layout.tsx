import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Teste Grátis 7 Dias — Sistema para Clínicas de Terapias',
    description:
        'Teste o CliniGo gratuitamente por 7 dias sem cartão de crédito. Agenda recorrente com co-terapia, prontuário ABA, Psicologia, Fonoaudiologia, TO, Psicomotricidade, Fisioterapia, TISS e repasse.',
    alternates: {
        canonical: 'https://clinigo.app/trial',
    },
    keywords: [
        'teste grátis sistema clínica de terapias',
        'testar software clínica multidisciplinar',
        'teste grátis sistema ABA',
        'teste grátis prontuário psicologia e fonoaudiologia',
        'agenda recorrente terapias teste grátis',
        'clinigo trial',
    ],
    openGraph: {
        title: 'Teste Grátis 7 Dias | CliniGo para Clínicas de Terapias',
        description:
            'Avalie na prática a plataforma operacional para clínicas de terapias multidisciplinares por 7 dias sem cartão de crédito.',
        type: 'website',
        url: 'https://clinigo.app/trial',
        siteName: 'CliniGo',
        locale: 'pt_BR',
    },
    robots: {
        index: true,
        follow: true,
    },
}

export default function TrialLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
