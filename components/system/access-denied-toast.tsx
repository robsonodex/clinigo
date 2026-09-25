'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

function AccessDeniedToastInner() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        const error = searchParams.get('error')
        if (error === 'unauthorized_role') {
            toast.error('Acesso restrito: seu perfil de usuário não possui permissão para acessar esta área.')
            const params = new URLSearchParams(searchParams.toString())
            params.delete('error')
            const queryString = params.toString()
            const newUrl = queryString ? `${pathname}?${queryString}` : pathname
            router.replace(newUrl)
        }
    }, [searchParams, pathname, router])

    return null
}

export function AccessDeniedToast() {
    return (
        <Suspense fallback={null}>
            <AccessDeniedToastInner />
        </Suspense>
    )
}
