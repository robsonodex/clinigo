'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { InactivityTimer } from '@/components/totem/InactivityTimer'

export default function TotemHomePage() {
    const router = useRouter()
    const params = useParams()
    const clinicId = params.clinicId as string
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    const timeStr = currentTime.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
    })

    const dateStr = currentTime.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'America/Sao_Paulo',
    })

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 select-none"
            style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}
        >
            <InactivityTimer redirectTo={`/totem/${clinicId}`} timeoutSeconds={120} />

            {/* Clock */}
            <div className="absolute top-10 right-12 text-right">
                <div className="text-3xl font-light tracking-[0.2em] text-white/80 font-mono tabular-nums">
                    {timeStr}
                </div>
                <div className="text-sm text-white/30 capitalize mt-1">{dateStr}</div>
            </div>

            {/* Welcome */}
            <div className="text-center mb-20">
                <h1 className="text-5xl md:text-6xl font-extralight text-white tracking-tight mb-4">
                    Bem-vindo
                </h1>
                <p className="text-lg text-white/40 font-light">
                    Selecione a forma de check-in
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-5 w-full max-w-2xl px-4">
                {/* QR Code */}
                <button
                    onClick={() => router.push(`/totem/${clinicId}/qr-code`)}
                    className="flex-1 min-w-0 group relative rounded-2xl p-8 text-left transition-all duration-300 active:scale-[0.98] overflow-hidden"
                    style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(20px)',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                    }}
                >
                    <div className="mb-5">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/70">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="3" height="3" />
                            <line x1="21" y1="14" x2="21" y2="21" />
                            <line x1="14" y1="21" x2="21" y2="21" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-medium text-white mb-1.5">QR Code</h2>
                    <p className="text-sm text-white/40 font-light pr-6">
                        Escaneie o código recebido por e-mail
                    </p>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-white/40 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </button>

                {/* Facial Recognition */}
                <button
                    onClick={() => router.push(`/totem/${clinicId}/face-checkin`)}
                    className="flex-1 min-w-0 group relative rounded-2xl p-8 text-left transition-all duration-300 active:scale-[0.98] overflow-hidden"
                    style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(20px)',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                    }}
                >
                    <div className="mb-5">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/70">
                            <path d="M3 8V6a3 3 0 0 1 3-3h2" />
                            <path d="M21 8V6a3 3 0 0 0-3-3h-2" />
                            <path d="M3 16v2a3 3 0 0 0 3 3h2" />
                            <path d="M21 16v2a3 3 0 0 1-3 3h-2" />
                            <circle cx="9" cy="10" r="1" fill="currentColor" />
                            <circle cx="15" cy="10" r="1" fill="currentColor" />
                            <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-medium text-white mb-1.5">Check-in Facial</h2>
                    <p className="text-sm text-white/40 font-light pr-6">
                        Identificação automática por câmera
                    </p>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-white/40 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </button>
            </div>

            {/* Subtle footer */}
            <p className="mt-32 text-white/20 text-sm tracking-[0.25em] uppercase font-light">
                Toque para iniciar
            </p>
        </div>
    )
}
