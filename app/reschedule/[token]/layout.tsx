import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Reagendar Consulta | CliniGo',
    description: 'Reagende sua consulta de forma rápida e segura.',
    robots: {
        index: false,
        follow: false,
    },
}

export default function RescheduleLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
