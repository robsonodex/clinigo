'use client'

import { useEffect } from 'react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const isChunkError =
        error.name === 'ChunkLoadError' ||
        error.message?.includes('ChunkLoadError') ||
        error.message?.includes('Failed to load chunk') ||
        error.message?.includes('Loading chunk') ||
        error.message?.includes('ERR_CACHE_READ_FAILURE')

    useEffect(() => {
        console.error(error)

        // Auto-recover from chunk errors: clear caches and reload
        if (isChunkError) {
            const autoRecover = async () => {
                if ('caches' in window) {
                    const keys = await caches.keys()
                    await Promise.all(keys.map((key) => caches.delete(key)))
                }
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations()
                    await Promise.all(registrations.map((r) => r.unregister()))
                }
                window.location.reload()
            }
            // Small delay to allow the error UI to render briefly
            const timer = setTimeout(autoRecover, 1500)
            return () => clearTimeout(timer)
        }
    }, [error, isChunkError])

    const handleRetry = async () => {
        if (isChunkError) {
            if ('caches' in window) {
                const keys = await caches.keys()
                await Promise.all(keys.map((key) => caches.delete(key)))
            }
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations()
                await Promise.all(registrations.map((r) => r.unregister()))
            }
            window.location.reload()
        } else {
            reset()
        }
    }

    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-4">
            <h2 className="text-xl font-bold mb-4">Algo deu errado!</h2>
            {isChunkError ? (
                <p className="text-amber-700 mb-4 bg-amber-50 p-3 rounded border border-amber-200 max-w-md mx-auto text-sm text-center">
                    Uma atualização do sistema foi detectada. Recarregando automaticamente...
                </p>
            ) : (
                <p className="text-gray-600 mb-4">{error.message}</p>
            )}
            <button
                onClick={handleRetry}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium min-h-[44px] min-w-[44px] active:bg-blue-800 transition-colors"
            >
                {isChunkError ? 'Atualizar agora' : 'Tentar novamente'}
            </button>
        </div>
    )
}
