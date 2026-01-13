import { ReactNode } from 'react'

export const metadata = {
    title: 'CliniGo',
    description: 'Sistema de gestão para clínicas médicas',
}

/**
 * Public pages layout
 * Note: Does NOT render html/body as the root layout already provides these
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
    return <>{children}</>
}
