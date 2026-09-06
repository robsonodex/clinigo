'use client'

import React, { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const router = useRouter()

    useEffect(() => {
        console.error('Falha interceptada pelo Error Boundary do Dashboard:', error)
    }, [error])

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
            <div className="max-w-md w-full p-6 text-center bg-card rounded-2xl border shadow-sm space-y-6">
                <div className="w-14 h-14 mx-auto rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                        Não foi possível carregar esta seção
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Ocorreu uma instabilidade pontual ao processar este módulo. Nenhuma informação foi perdida.
                    </p>
                    {error.message && (
                        <p className="text-xs font-mono p-2 bg-muted/60 rounded border text-muted-foreground break-all text-left">
                            {error.message}
                        </p>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <Button
                        variant="default"
                        onClick={() => reset()}
                        className="min-h-[44px] min-w-[44px] gap-2 px-5 font-semibold"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Tentar novamente
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => router.push('/dashboard')}
                        className="min-h-[44px] min-w-[44px] gap-2 px-5"
                    >
                        <Home className="w-4 h-4" />
                        Ir para Início
                    </Button>
                </div>
            </div>
        </div>
    )
}
