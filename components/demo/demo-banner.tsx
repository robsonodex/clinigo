'use client'

import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

interface DemoBannerProps {
    isDemo?: boolean
}

export function DemoBanner({ isDemo }: DemoBannerProps) {
    const [minimized, setMinimized] = useState(false)

    if (!isDemo) return null

    if (minimized) {
        return (
            <div
                className="fixed bottom-4 right-4 z-50 bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg cursor-pointer flex items-center gap-2 hover:bg-amber-600 transition-colors"
                onClick={() => setMinimized(false)}
            >
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">DEMO</span>
            </div>
        )
    }

    return (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 relative">
            <div className="container mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div>
                        <p className="font-semibold text-sm">
                            ⚠️ Conta de Demonstração
                        </p>
                        <p className="text-xs text-amber-100">
                            Dados fictícios. Tudo será apagado periodicamente. Não cadastre informações reais.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/cadastro"
                        className="bg-white text-amber-600 px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-amber-50 transition-colors"
                    >
                        Criar conta real
                    </Link>
                    <button
                        onClick={() => setMinimized(true)}
                        className="text-amber-100 hover:text-white p-1"
                        aria-label="Minimizar aviso"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
