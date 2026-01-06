'use client'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html>
            <body>
                <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Algo deu errado!</h2>
                        <p className="text-red-600 mb-4 bg-red-50 p-2 rounded border border-red-200">
                            {error.message}
                        </p>
                        <button
                            onClick={() => reset()}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                            Tentar novamente
                        </button>
                    </div>
                </div>
            </body>
        </html>
    )
}
