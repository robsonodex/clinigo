import { ReactNode } from 'react'

export const metadata = {
    title: 'CliniGo',
    description: 'Sistema de gestão para clínicas médicas',
}

export default function PublicLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="pt-BR">
            <body className="antialiased">
                {children}
            </body>
        </html>
    )
}

