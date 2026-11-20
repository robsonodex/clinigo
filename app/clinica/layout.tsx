import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Portal da Clínica — Acesso Administrativo',
    description:
        'Acesso seguro ao Portal da Clínica CliniGo para gestores, coordenação técnica, recepção e equipe financeira de clínicas de terapias multidisciplinares.',
    alternates: {
        canonical: 'https://clinigo.app/clinica',
    },
    openGraph: {
        title: 'Portal da Clínica | CliniGo',
        description:
            'Login administrativo do CliniGo para gestão de agenda recorrente, BI de terapia, convênios TISS e repasses.',
        url: 'https://clinigo.app/clinica',
        siteName: 'CliniGo',
        type: 'website',
        locale: 'pt_BR',
    },
}

export default function ClinicaLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}

