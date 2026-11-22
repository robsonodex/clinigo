import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'CliniGo',
  description: 'Gestão clínica inteligente na palma da mão',
  manifest: '/manifest.json?v=2',
  icons: {
    icon: [
      { url: '/icons/clinigo-pwa-192-v2.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/clinigo-pwa-512-v2.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon-v2.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CliniGo',
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

export default function PWALayout({ children }: { children: React.ReactNode }) {
  return children
}
