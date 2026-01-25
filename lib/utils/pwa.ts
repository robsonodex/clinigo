/**
 * PWA Utilities
 * Service worker registration and update handling
 */

export function registerServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return
    }

    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
            })

            console.log('[PWA] Service Worker registered:', registration.scope)

            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing
                if (!newWorker) return

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available
                        console.log('[PWA] New version available! Reload to update.')

                        // Optional: Show update notification to user
                        if (window.confirm('Nova versão disponível! Recarregar agora?')) {
                            window.location.reload()
                        }
                    }
                })
            })

            // Check for updates periodically (every hour)
            setInterval(() => {
                registration.update()
            }, 60 * 60 * 1000)
        } catch (error) {
            console.error('[PWA] Service Worker registration failed:', error)
        }
    })
}

export function unregisterServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return
    }

    navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
            registration.unregister()
        })
    })
}
