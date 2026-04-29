import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'CliniGo',
  description: 'Gestão clínica inteligente na palma da mão',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CliniGo',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f766e' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function PWALayout({ children }: { children: React.ReactNode }) {
  return children
}
