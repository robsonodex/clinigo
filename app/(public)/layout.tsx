import type { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
    title: {
        default: 'CliniGo | Sistema para Clínicas de Terapias Multidisciplinares',
        template: '%s | CliniGo',
    },
    description:
        'Plataforma operacional e clínica para clínicas de terapias multidisciplinares: Psicologia, ABA, Fonoaudiologia, Terapia Ocupacional, Psicomotricidade e Fisioterapia.',
}

/**
 * Public pages layout
 * Note: Does NOT render html/body as the root layout already provides these
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
    return <>{children}</>
}
