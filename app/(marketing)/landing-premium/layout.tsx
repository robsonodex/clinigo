import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Arquivo Legado (Rollback)',
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
        },
    },
}

export default function LandingPremiumLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}

