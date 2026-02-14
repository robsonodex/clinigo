'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'

export default function TotemConfirmacaoPage() {
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const clinicId = params.clinicId as string

    const nome = searchParams.get('nome') || 'Paciente'
    const tipo = searchParams.get('tipo') || 'qr'
    const [countdown, setCountdown] = useState(10)

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    router.replace(`/totem/${clinicId}`)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [clinicId, router])

    const label = tipo === 'facial' ? 'Reconhecimento facial' : 'QR Code'

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 select-none"
            style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}
        >
            <div className="text-center max-w-lg">
                {/* Check icon */}
                <div className="mb-10" style={{ animation: 'fadeScale 0.5s ease-out' }}>
                    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-emerald-400">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 12l3 3 5-5" />
                    </svg>
                </div>

                <h1 className="text-4xl font-light text-white mb-3 tracking-tight"
                    style={{ animation: 'fadeUp 0.5s ease-out 0.15s both' }}
                >
                    Check-in realizado
                </h1>

                <p className="text-xl text-white/70 font-medium mb-2"
                    style={{ animation: 'fadeUp 0.5s ease-out 0.3s both' }}
                >
                    {nome}
                </p>

                <p className="text-sm text-white/30 mb-16"
                    style={{ animation: 'fadeUp 0.5s ease-out 0.4s both' }}
                >
                    via {label}
                </p>

                {/* Divider */}
                <div className="w-12 h-px mx-auto mb-6" style={{ background: 'rgba(255,255,255,0.1)' }} />

                <p className="text-white/20 text-xs tracking-widest uppercase">
                    Retornando em {countdown}s
                </p>
            </div>

            <style jsx>{`
                @keyframes fadeScale {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
