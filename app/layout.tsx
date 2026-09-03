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
    metadataBase: new URL('https://clinigo.app'),
    title: 'CliniGO | Sistema para Gestão de Clínicas e Consultórios',
    description: 'Software completo para gestão de clínicas e consultórios médicos. Prontuário eletrônico, agendamento online, faturamento TISS e check-in facial. Teste 7 dias grátis!',
    alternates: {
        canonical: 'https://clinigo.app',
    },
    keywords: [
        'sistema para gestão de clínicas',
        'software para clínica médica',
        'sistema de agendamento para clínicas',
        'prontuário eletrônico para clínicas',
        'gestão de clínicas online',
        'sistema de clínica',
        'software de psicologia',
        'faturamento TISS',
        'check-in facial médica',
        'agenda médica online',
        'clinigo'
    ],
    manifest: '/site.webmanifest',
    icons: {
        icon: [
            { url: '/favicon.ico', sizes: '48x48 32x32 16x16', type: 'image/x-icon' },
            { url: '/favicon.png', sizes: '48x48', type: 'image/png' },
            { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
            { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
            { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
            { url: '/icon.png', sizes: '512x512', type: 'image/png' },
        ],
        shortcut: '/favicon.ico',
        apple: [
            { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
    },
    openGraph: {
        title: 'CliniGO | Sistema para Gestão de Clínicas e Consultórios',
        description: 'Software completo para gestão de clínicas e consultórios médicos. Prontuário eletrônico, agendamento online, faturamento TISS e check-in facial. Teste 7 dias grátis!',
        url: 'https://clinigo.app',
        siteName: 'CliniGO',
        images: [
            {
                url: 'https://clinigo.app/dashboard-preview.png',
                width: 1200,
                height: 630,
                alt: 'CliniGO - Sistema para Gestão de Clínicas e Consultórios',
            }
        ],
        locale: 'pt_BR',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'CliniGO | Sistema para Gestão de Clínicas e Consultórios',
        description: 'Software para clínica médica com prontuário eletrônico, agendamento online, faturamento TISS e check-in facial.',
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
        title: 'CliniGO',
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

                {/* Favicons explícitos para Google Search Crawler e navegadores */}
                <link rel="icon" href="/favicon.ico" sizes="48x48 32x32 16x16" type="image/x-icon" />
                <link rel="icon" href="/favicon.png" type="image/png" sizes="48x48" />
                <link rel="icon" href="/favicon-48x48.png" type="image/png" sizes="48x48" />
                <link rel="icon" href="/favicon-96x96.png" type="image/png" sizes="96x96" />
                <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
                <link rel="manifest" href="/site.webmanifest" />

                {/* PWA - Apple specific tags */}
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content="CliniGO" />
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

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

