'use client'

import { useEffect, useState } from 'react'
import BottomNav from '@/components/pwa/BottomNav'
import OfflineBanner from '@/components/pwa/OfflineBanner'
import { ToastProvider } from '@/components/pwa/Toast'
import { useFila } from '@/hooks/pwa/useFila'
import { useSessionGuard } from '@/lib/hooks/use-session-guard'

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  useSessionGuard()
  const { count } = useFila()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  return (
    <ToastProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <OfflineBanner />
        <main className="pb-20">
          {children}
        </main>
        <BottomNav queueCount={count} />
      </div>
    </ToastProvider>
  )
}
