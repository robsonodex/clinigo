import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from '@/lib/providers'
import { Toaster } from '@/components/ui/toaster'
import { PWAInitializer } from '@/components/pwa-initializer'
import ChatbotProvider from '@/components/chatbot/ChatbotProvider'


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'CliniGO | O Melhor Sistema de Gestão de Clínicas e Consultórios',
    description: 'CliniGO é o melhor software de gestão para clínicas e consultórios médicos e terapêuticos. Prontuário eletrônico adaptativo, agenda anti-overbooking, faturamento TISS, check-in facial e WhatsApp integrado. Teste grátis por 7 dias!',
    keywords: [
        'sistema de clinica',
        'software para clinica',
        'sistema para consultorio',
        'prontuario eletronico',
        'software de psicologia',
        'faturamento TISS',
        'check-in facial',
        'agenda medica',
        'clinigo',
        'gestao de clinicas',
        'software de terapia'
    ],
    manifest: '/manifest.json',
    icons: {
        icon: [
            { url: '/favicon.png', type: 'image/png' },
            { url: '/favicon.ico', sizes: 'any' },
            { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
        apple: [
            { url: '/icons/icon-512x512.png', sizes: '512x512' },
        ],
    },
    openGraph: {
        title: 'CliniGO | O Melhor Sistema de Gestão de Clínicas e Consultórios',
        description: 'Prontuário eletrônico adaptativo, agenda integrada anti-overbooking, faturamento TISS completo, check-in facial inovador e automação por WhatsApp. Conheça o CliniGO.',
        url: 'https://clinigo.app',
        siteName: 'CliniGO',
        images: [
            {
                url: 'https://clinigo.app/dashboard-preview.png',
                width: 1200,
                height: 630,
                alt: 'CliniGO - Sistema de Gestão de Clínicas',
            }
        ],
        locale: 'pt_BR',
        type: 'website',
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
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#16a34a',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="pt-BR" suppressHydrationWarning>
            <head>
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

                {/* PWA - Apple specific tags */}
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content="CliniGo" />
                <link rel="apple-touch-icon" href="/icons/icon-512x512.png" />
                <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png" />

                {/* Android Chrome theme */}
                <meta name="theme-color" content="#16a34a" />

                {/* Microsoft/Windows */}
                <meta name="msapplication-TileColor" content="#16a34a" />
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

