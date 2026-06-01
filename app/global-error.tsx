'use client'

export default function GlobalError({
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

    const handleRetry = async () => {
        if (isChunkError) {
            // Clear all caches to remove stale chunks
            if ('caches' in window) {
                const keys = await caches.keys()
                await Promise.all(keys.map((key) => caches.delete(key)))
            }
            // Unregister service workers that may be serving stale content
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations()
                await Promise.all(registrations.map((r) => r.unregister()))
            }
            // Hard reload to get fresh chunks from server
            window.location.reload()
        } else {
            reset()
        }
    }

    return (
        <html>
            <body>
                <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Algo deu errado!</h2>
                        {isChunkError ? (
                            <p className="text-amber-700 mb-4 bg-amber-50 p-3 rounded border border-amber-200 max-w-md mx-auto text-sm">
                                Uma atualização do sistema foi detectada. Clique abaixo para carregar a versão mais recente.
                            </p>
                        ) : (
                            <p className="text-red-600 mb-4 bg-red-50 p-2 rounded border border-red-200">
                                {error.message}
                            </p>
                        )}
                        <button
                            onClick={handleRetry}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium min-h-[44px] min-w-[44px] active:bg-blue-800 transition-colors"
                        >
                            {isChunkError ? 'Atualizar agora' : 'Tentar novamente'}
                        </button>
                    </div>
                </div>
            </body>
        </html>
    )
}
