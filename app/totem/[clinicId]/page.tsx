'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    type TvLogoMode,
    normalizeTvLogoMode,
    resolveTvDisplayLogo,
} from '@/lib/utils/tv-panel'

export default function TotemHomePage() {
    const router = useRouter()
    const params = useParams()
    const clinicId = params.clinicId as string

    const [currentTime, setCurrentTime] = useState(new Date())
    const [clinicName, setClinicName] = useState('')
    const [clinicLogoUrl, setClinicLogoUrl] = useState<string | null>(null)
    const [tvLogoMode, setTvLogoMode] = useState<TvLogoMode>('clinic')
    const [supabase] = useState(() => createClient())

    const fetchBranding = useCallback(async () => {
        if (!clinicId) return
        try {
            const res = await fetch(`/api/totem/branding?clinicId=${encodeURIComponent(clinicId)}`)
            if (res.ok) {
                const data = await res.json()
                setClinicName(data.clinicName || '')
                setClinicLogoUrl(data.clinicLogoUrl || null)
                setTvLogoMode(normalizeTvLogoMode(data.tvLogoMode))
                return
            }
        } catch {
            // fallback abaixo via cliente Supabase
        }

        try {
            const { data } = await (supabase as any)
                .from('clinics')
                .select('name, logo_url, theme')
                .eq('id', clinicId)
                .single()
            if (data) {
                setClinicName(data.name || '')
                setClinicLogoUrl(data.logo_url || null)
                setTvLogoMode(normalizeTvLogoMode(data.theme?.tv_logo_mode))
            }
        } catch {
            // fallback seguro para logotipo oficial CliniGo
        }
    }, [clinicId, supabase])

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        fetchBranding()
        if (!clinicId) return

        const channel = supabase
            .channel(`totem_branding_${clinicId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'clinics',
                    filter: `id=eq.${clinicId}`,
                },
                (payload: any) => {
                    if (!payload?.new) return
                    if (typeof payload.new.name === 'string') setClinicName(payload.new.name)
                    if ('logo_url' in payload.new) setClinicLogoUrl(payload.new.logo_url || null)
                    if (payload.new.theme) {
                        setTvLogoMode(normalizeTvLogoMode(payload.new.theme.tv_logo_mode))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [clinicId, fetchBranding, supabase])

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

    const displayLogo = resolveTvDisplayLogo({
        logoMode: tvLogoMode,
        clinicLogoUrl,
        clinicName,
        surface: 'dark',
    })

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-8 select-none bg-[#0B1512]">
            {/* Relógio */}
            <div className="absolute top-6 right-6 md:top-10 md:right-12 text-right">
                <div className="text-2xl md:text-3xl font-light tracking-[0.2em] text-white/80 font-mono tabular-nums">
                    {timeStr}
                </div>
                <div className="text-xs md:text-sm text-white/35 capitalize mt-0.5">{dateStr}</div>
            </div>

            <div className="w-full flex flex-col items-center max-w-3xl" style={{ animation: 'fadeUp 0.4s ease-out' }}>
                {/* Cabeçalho com Logotipo Oficial (Clínica ou CliniGo) */}
                <div className="text-center mb-12 md:mb-14 flex flex-col items-center">
                    {displayLogo.isClinicLogo ? (
                        <div className="bg-white/95 px-6 py-3 rounded-xl shadow-lg mb-4 inline-flex items-center justify-center">
                            <img
                                src={displayLogo.src}
                                alt={displayLogo.alt}
                                className="h-12 md:h-14 max-w-[260px] w-auto object-contain"
                            />
                        </div>
                    ) : (
                        <img
                            src={displayLogo.src}
                            alt={displayLogo.alt}
                            className="h-12 md:h-14 w-auto object-contain mb-4"
                        />
                    )}

                    {clinicName && displayLogo.isClinicLogo && (
                        <p className="text-sm font-medium text-emerald-300/80 tracking-wide mb-1">
                            {clinicName}
                        </p>
                    )}

                    <p className="text-base md:text-lg text-white/55 font-light">
                        Escolha como deseja confirmar sua chegada
                    </p>
                </div>

                {/* 2 Opções Reais do Totem: Check-in Facial e QR Code */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl px-4">
                    {/* Check-in Facial */}
                    <button
                        type="button"
                        onClick={() => router.push(`/totem/${clinicId}/face-checkin`)}
                        className="group relative rounded-xl p-7 md:p-8 text-left transition-all duration-200 active:scale-[0.98] hover:border-emerald-400/40 overflow-hidden min-h-[180px] cursor-pointer"
                        style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        <div className="mb-5 w-12 h-12 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400">
                                <path d="M3 8V6a3 3 0 0 1 3-3h2" />
                                <path d="M21 8V6a3 3 0 0 0-3-3h-2" />
                                <path d="M3 16v2a3 3 0 0 0 3 3h2" />
                                <path d="M21 16v2a3 3 0 0 1-3 3h-2" />
                                <circle cx="9" cy="10" r="1" fill="currentColor" />
                                <circle cx="15" cy="10" r="1" fill="currentColor" />
                                <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
                            </svg>
                        </div>
                        <h1 className="text-xl md:text-2xl font-medium text-white mb-2">Check-in Facial</h1>
                        <p className="text-sm text-white/50 font-light leading-relaxed">
                            Identificação facial automática para atendimentos agendados
                        </p>
                    </button>

                    {/* QR Code */}
                    <button
                        type="button"
                        onClick={() => router.push(`/totem/${clinicId}/qr-code`)}
                        className="group relative rounded-xl p-7 md:p-8 text-left transition-all duration-200 active:scale-[0.98] hover:border-sky-400/40 overflow-hidden min-h-[180px] cursor-pointer"
                        style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        <div className="mb-5 w-12 h-12 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sky-400">
                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="3" y="14" width="7" height="7" rx="1" />
                                <rect x="14" y="14" width="3" height="3" />
                                <line x1="21" y1="14" x2="21" y2="21" />
                                <line x1="14" y1="21" x2="21" y2="21" />
                            </svg>
                        </div>
                        <h2 className="text-xl md:text-2xl font-medium text-white mb-2">QR Code</h2>
                        <p className="text-sm text-white/50 font-light leading-relaxed">
                            Aproxime o QR Code do seu celular na câmera do totem
                        </p>
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
