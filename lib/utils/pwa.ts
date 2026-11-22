/**
 * PWA Utilities
 * Service worker registration, cache cleanup, and update event dispatching
 */

export const SW_UPDATE_EVENT = 'clinigo:sw-update-available'

let swRegistrationStarted = false

async function doRegisterServiceWorker() {
    if (swRegistrationStarted) return
    swRegistrationStarted = true

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none',
        })

        // Força verificação imediata contra o servidor para derrubar SW/caches legados
        registration.update().catch(() => {})

        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (!newWorker) return

            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' })
                    window.dispatchEvent(new CustomEvent(SW_UPDATE_EVENT))
                }
            })
        })

        // Checagem periódica (a cada hora)
        setInterval(() => {
            registration.update().catch(() => {})
        }, 60 * 60 * 1000)
    } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error)
    }
}

export function registerServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return
    }

    // Em ambiente de desenvolvimento (localhost), desregistra qualquer Service Worker e limpa caches
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((r) => r.unregister())
        })
        if ('caches' in window) {
            caches.keys().then((names) => {
                names.forEach((name) => caches.delete(name))
            })
        }
        return
    }

    // Se o evento load já ocorreu antes da hidratação do React, registra imediatamente
    if (document.readyState === 'complete') {
        void doRegisterServiceWorker()
    } else {
        window.addEventListener(
            'load',
            () => {
                void doRegisterServiceWorker()
            },
            { once: true }
        )
    }
}

export async function forceClearPwaCachesAndUpdate(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
        if ('caches' in window) {
            const names = await caches.keys()
            await Promise.all(names.map((name) => caches.delete(name)))
        }

        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations()
            await Promise.all(
                registrations.map(async (registration) => {
                    try {
                        registration.active?.postMessage({ type: 'CLEAR_ALL_CACHES' })
                        registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
                        await registration.update()
                    } catch {
                        // Continua limpeza mesmo se um SW falhar
                    }
                })
            )
        }
    } catch (error) {
        console.error('[PWA] Failed to clear caches:', error)
    }
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
