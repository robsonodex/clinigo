'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PrivacidadePage() {
    const router = useRouter()

    useEffect(() => {
        // Redirect to LGPD page which contains all privacy information
        router.replace('/lgpd')
    }, [router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-600">Redirecionando para Política de Privacidade...</p>
            </div>
        </div>
    )
}
