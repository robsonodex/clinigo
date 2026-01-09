import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/lib/providers'
import { Toaster } from '@/components/ui/toaster'


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'CliniGo - Teleconsultoria',
    description: 'Sistema de teleconsultoria médica',
    manifest: '/manifest.json',
    icons: {
        icon: [
            { url: '/favicon.svg', type: 'image/svg+xml' },
            { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
        apple: [
            { url: '/icons/icon-512x512.png', sizes: '512x512' },
        ],
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
                <Providers>
                    {children}
                </Providers>
                <Toaster />
            </body>
        </html>
    )
}

