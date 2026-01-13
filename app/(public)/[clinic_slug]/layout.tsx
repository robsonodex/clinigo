import { ReactNode } from 'react'

interface LayoutProps {
    children: ReactNode
    params: Promise<{ clinic_slug: string }>
}

/**
 * Layout for public clinic pages
 * The actual header/footer is now handled by individual pages
 * This layout just provides a clean wrapper
 */
export default async function ClinicLayout({ children }: LayoutProps) {
    return (
        <>
            {children}
        </>
    )
}
