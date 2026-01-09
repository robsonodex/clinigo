'use client'

import { useEffect } from 'react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-4">
            <h2 className="text-xl font-bold mb-4">Algo deu errado!</h2>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <button
                onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                }
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
                Tentar novamente
            </button>
        </div>
    )
}

