import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Portal do Profissional — Acesso para Terapeutas',
    description:
        'Acesso exclusivo do profissional terapeuta no CliniGo: agenda recorrente, prontuário estruturado com sigilo RBAC (CRP, CRFa, CREFITO), planos ABA e extrato individual de produção.',
    alternates: {
        canonical: 'https://clinigo.app/medico',
    },
    openGraph: {
        title: 'Portal do Profissional | CliniGo',
        description:
            'Acesso protegido para psicólogos, analistas ABA, fonoaudiólogos, terapeutas ocupacionais, psicomotricistas e fisioterapeutas.',
        url: 'https://clinigo.app/medico',
        siteName: 'CliniGo',
        type: 'website',
        locale: 'pt_BR',
    },
}

export default function MedicoLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}

