import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Blog Técnico para Clínicas de Terapias Multidisciplinares',
    description:
        'Artigos e guias práticos sobre gestão de clínicas de terapias: agenda recorrente e co-terapia, planos ABA, sigilo clínico LGPD/RBAC, faturamento TISS ANS, biometria facial e repasse por profissional.',
    alternates: {
        canonical: 'https://clinigo.app/blog',
    },
    openGraph: {
        title: 'Blog Técnico | CliniGo para Clínicas de Terapias',
        description:
            'Guias práticos sobre agenda recorrente, ABA, Psicologia, Fonoaudiologia, TO, faturamento TISS, LGPD e gestão de repasses.',
        url: 'https://clinigo.app/blog',
        siteName: 'CliniGo',
        type: 'website',
        locale: 'pt_BR',
    },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}

