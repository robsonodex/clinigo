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
                className="fixed bottom-4 right-4 z-50 bg-amber-600 text-white px-3.5 py-2 rounded-md shadow-md cursor-pointer flex items-center gap-2 hover:bg-amber-700 transition-colors"
                onClick={() => setMinimized(false)}
            >
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-mono font-semibold uppercase tracking-wider">DEMO</span>
            </div>
        )
    }

    return (
        <div className="bg-amber-600 text-white px-4 py-2.5 relative border-b border-amber-700">
            <div className="container mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <div>
                        <p className="font-semibold text-sm">
                            Conta de Demonstração
                        </p>
                        <p className="text-xs text-amber-100">
                            Dados fictícios. Tudo será apagado periodicamente. Não cadastre informações reais.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                    <Link
                        href="/cadastro"
                        className="bg-white text-amber-800 px-3.5 py-1.5 rounded-md text-xs font-semibold hover:bg-amber-50 transition-colors"
                    >
                        Criar conta real
                    </Link>
                    <button
                        type="button"
                        onClick={() => setMinimized(true)}
                        className="text-amber-100 hover:text-white p-1 rounded-md"
                        aria-label="Minimizar aviso"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
