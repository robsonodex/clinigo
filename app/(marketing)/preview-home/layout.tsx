import type { Metadata } from 'next'
import { SEO_CONTENT } from '@/components/preview-home/content'
import { landingFontVariables } from '@/components/preview-home/fonts'

export const metadata: Metadata = {
    title: SEO_CONTENT.title,
    description: SEO_CONTENT.description,
    openGraph: {
        title: SEO_CONTENT.title,
        description: SEO_CONTENT.description,
        type: 'website',
        locale: 'pt_BR',
        siteName: 'CliniGo',
    },
    // Rota de previa: a pagina oficial indexavel e a raiz (/).
    robots: {
        index: false,
        follow: false,
    },
    alternates: {
        canonical: 'https://clinigo.app',
    },
}

export default function PreviewHomeLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <div className={landingFontVariables}>{children}</div>
}
