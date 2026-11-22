import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from '@/lib/providers'
import { Toaster } from '@/components/ui/toaster'
import { PWAInitializer } from '@/components/pwa-initializer'
import ChatbotProvider from '@/components/chatbot/ChatbotProvider'


const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-inter',
    display: 'swap',
})

export const metadata: Metadata = {
    metadataBase: new URL('https://clinigo.app'),
    title: {
        default: 'CliniGo | Sistema para Clínicas de Terapias Multidisciplinares',
        template: '%s | CliniGo',
    },
    description: 'Sistema de gestão clínica e operacional para clínicas de terapias multidisciplinares: Psicologia, ABA, Fonoaudiologia, Terapia Ocupacional, Psicomotricidade e Fisioterapia. Agenda recorrente, TISS, biometria facial e LGPD. Teste 7 dias grátis.',
    alternates: {
        canonical: 'https://clinigo.app',
    },
    keywords: [
        'sistema para clínica de terapias',
        'sistema para clínica multidisciplinar',
        'software clínica multidisciplinar',
        'sistema para clínica ABA',
        'prontuário eletrônico psicologia e ABA',
        'sistema fonoaudiologia e terapia ocupacional',
        'sistema psicomotricidade e fisioterapia',
        'agenda recorrente clínicas de terapia',
        'co-terapia agenda clínica',
        'faturamento TISS terapias',
        'check-in facial clínica terapias',
        'gestão de clínicas de neurodesenvolvimento',
        'repasse por profissional clínica',
        'clinigo',
    ],
    manifest: '/site.webmanifest?v=2',
    icons: {
        icon: [
            { url: '/favicon.ico', sizes: '48x48 32x32 16x16', type: 'image/x-icon' },
            { url: '/favicon.png', sizes: '48x48', type: 'image/png' },
            { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
            { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
            { url: '/icons/clinigo-pwa-192-v2.png', sizes: '192x192', type: 'image/png' },
            { url: '/icons/clinigo-pwa-512-v2.png', sizes: '512x512', type: 'image/png' },
            { url: '/icon.png', sizes: '512x512', type: 'image/png' },
        ],
        shortcut: '/favicon.ico',
        apple: [
            { url: '/apple-touch-icon-v2.png', sizes: '180x180', type: 'image/png' },
        ],
    },
    openGraph: {
        title: 'CliniGo | Sistema para Clínicas de Terapias Multidisciplinares',
        description: 'Agenda recorrente com co-terapia, prontuário por especialidade (Psicologia, ABA, Fono, TO, Psicomotricidade e Fisioterapia), WhatsApp automático, biometria facial, TISS e repasse por profissional.',
        url: 'https://clinigo.app',
        siteName: 'CliniGo',
        images: [
            {
                url: 'https://clinigo.app/dashboard-preview.png',
                width: 1200,
                height: 630,
                alt: 'CliniGo - Sistema para Clínicas de Terapias Multidisciplinares',
            }
        ],
        locale: 'pt_BR',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'CliniGo | Sistema para Clínicas de Terapias Multidisciplinares',
        description: 'Agenda recorrente com co-terapia, prontuário por especialidade, planos ABA, WhatsApp automático, biometria facial, TISS e repasse por profissional.',
        images: ['https://clinigo.app/dashboard-preview.png'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'CliniGo',
    },
    formatDetection: {
        telephone: true,
    },
    other: {
        'mobile-web-app-capable': 'yes',
    },
    verification: {
        google: 'KdqyntPwFiVd3T46JuwXlcL-bSerz4LX8fRdXOTzPLU',
    },
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
    themeColor: '#155e4b',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
            <head>
                {/* Garante sistema sempre em Tema Claro Editorial (apenas o menu lateral alterna Claro/Escuro) */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(function(){try{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}catch(e){}})();`,
                    }}
                />
                {/* Google Ads Tag (gtag.js) — Medição de conversões */}
                <Script
                    src="https://www.googletagmanager.com/gtag/js?id=AW-18137890436"
                    strategy="afterInteractive"
                />
                <Script id="google-ads-gtag" strategy="afterInteractive">
                    {`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', 'AW-18137890436');
                    `}
                </Script>

                {/* Favicons explícitos para Google Search Crawler e navegadores */}
                <link rel="icon" href="/favicon.ico" sizes="48x48 32x32 16x16" type="image/x-icon" />
                <link rel="icon" href="/favicon.png" type="image/png" sizes="48x48" />
                <link rel="icon" href="/favicon-48x48.png" type="image/png" sizes="48x48" />
                <link rel="icon" href="/favicon-96x96.png" type="image/png" sizes="96x96" />
                <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />

                {/* Descoberta para mecanismos de IA (GEO / AEO - llms.txt e resumo estruturado) */}
                <link rel="alternate" type="text/plain" href="/llms.txt" title="CliniGo LLM Context" />
                <link rel="alternate" type="application/json" href="/.well-known/ai-summary.json" title="CliniGo AI Summary" />

                {/* PWA - Apple specific tags */}
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content="CliniGo" />
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-v2.png" />

                {/* Android Chrome theme */}
                <meta name="theme-color" content="#155e4b" />

                {/* Microsoft/Windows */}
                <meta name="msapplication-TileColor" content="#155e4b" />
                <meta name="msapplication-tap-highlight" content="no" />
            </head>
            <body className={inter.className} suppressHydrationWarning>
                <PWAInitializer />
                <Providers>
                    {children}
                </Providers>
                <Toaster />
                <ChatbotProvider />
            </body>
        </html>
    )
}

