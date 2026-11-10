'use client'

/**
 * SessionGuardProvider
 * Monitora a sessão única do usuário e exibe um modal central corporativo
 * sempre que o mesmo login for iniciado simultaneamente em outro dispositivo/navegador.
 */
import { useEffect, useState } from 'react'
import {
    useSessionGuard,
    SESSION_REPLACED_EVENT,
    SESSION_REPLACED_STORAGE_KEY,
    SessionReplacedPayload
} from '@/lib/hooks/use-session-guard'
import { ShieldAlert, Laptop, Clock, Mail, LogIn } from 'lucide-react'

function formatReplacedTime(iso?: string | null): string {
    if (!iso) return 'Agora mesmo'
    try {
        const dt = new Date(iso)
        if (Number.isNaN(dt.getTime())) return 'Agora mesmo'
        const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        return `Hoje às ${timeStr}`
    } catch {
        return 'Agora mesmo'
    }
}

export function SessionGuardProvider() {
    useSessionGuard()
    const [replacedInfo, setReplacedInfo] = useState<SessionReplacedPayload | null>(null)

    useEffect(() => {
        // 1. Verificar se já existe aviso pendente salvo no sessionStorage (ex.: se a página recarregou)
        try {
            const urlParams = new URLSearchParams(window.location.search)
            if (urlParams.get('preview_session_popup') === '1') {
                setReplacedInfo({
                    email: 'robsonsync@clinigo.app',
                    new_device: 'Microsoft Edge (Windows)',
                    replaced_at: new Date().toISOString(),
                    message: 'Sua sessão foi encerrada porque um novo login foi realizado em outro dispositivo.'
                })
                return
            }

            const saved = window.sessionStorage.getItem(SESSION_REPLACED_STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved) as SessionReplacedPayload
                if (parsed) setReplacedInfo(parsed)
            }
        } catch { }

        // 2. Escutar evento em tempo real disparado pelo useSessionGuard
        const handleSessionReplaced = (event: Event) => {
            const customEvent = event as CustomEvent<SessionReplacedPayload>
            setReplacedInfo(
                customEvent.detail || {
                    new_device: 'Outro computador ou navegador',
                    replaced_at: new Date().toISOString(),
                }
            )
        }

        window.addEventListener(SESSION_REPLACED_EVENT, handleSessionReplaced)
        return () => {
            window.removeEventListener(SESSION_REPLACED_EVENT, handleSessionReplaced)
        }
    }, [])

    const handleConfirmAndLogin = () => {
        try {
            window.sessionStorage.removeItem(SESSION_REPLACED_STORAGE_KEY)
        } catch { }
        setReplacedInfo(null)
        window.location.replace('/login')
    }

    if (!replacedInfo) return null

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-replaced-title"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
        >
            <div className="w-full max-w-[420px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Faixa superior institucional */}
                <div className="h-1.5 w-full bg-amber-600" />

                <div className="p-5 sm:p-6 space-y-4">
                    {/* Cabeçalho compacto */}
                    <div className="flex items-start gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                Segurança de Acesso • Sessão Única
                            </span>
                            <h2
                                id="session-replaced-title"
                                className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug mt-0.5"
                            >
                                Sessão Iniciada em Outro Dispositivo
                            </h2>
                        </div>
                    </div>

                    {/* Explicação direta */}
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        Sua sessão neste dispositivo foi encerrada porque um novo acesso foi iniciado com esta mesma conta em outro local.
                    </p>

                    {/* Quadro diagnóstico do novo acesso */}
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3.5 space-y-2.5 text-xs">
                        {replacedInfo.email && (
                            <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                    Conta:
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[210px]">
                                    {replacedInfo.email}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                                <Laptop className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                Dispositivo:
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                                {replacedInfo.new_device || 'Outro computador ou navegador'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                                <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                Horário:
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {formatReplacedTime(replacedInfo.replaced_at)}
                            </span>
                        </div>
                    </div>

                    {/* Botão de ação com área de toque mínima 44px */}
                    <div className="pt-1">
                        <button
                            type="button"
                            onClick={handleConfirmAndLogin}
                            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-sm font-semibold px-4 py-2.5 shadow-xs transition-colors cursor-pointer"
                        >
                            <LogIn className="h-4 w-4" />
                            <span>Entendi, ir para a tela de Login</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
