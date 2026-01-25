/**
 * PWA Initializer - Client Component
 * Registers service worker on client side
 */
'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/utils/pwa'

export function PWAInitializer() {
    useEffect(() => {
        // Register service worker
        registerServiceWorker()
    }, [])

    return null
}
