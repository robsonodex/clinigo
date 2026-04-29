'use client'

import { useEffect, useState } from 'react'

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      setTimeout(() => setShow(false), 2000)
    }
    const handleOffline = () => {
      setIsOffline(true)
      setShow(true)
    }

    if (!navigator.onLine) {
      setIsOffline(true)
      setShow(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!show) return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-500 ${
        isOffline
          ? 'bg-amber-600 text-white translate-y-0'
          : 'bg-emerald-600 text-white -translate-y-full'
      }`}
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)' }}
    >
      {isOffline ? (
        <>
          <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          Sem conexão — modo offline
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Conexão restaurada
        </>
      )}
    </div>
  )
}
