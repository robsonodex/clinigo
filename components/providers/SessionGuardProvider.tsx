'use client'

/**
 * SessionGuardProvider
 * Monitora a sessão única do usuário em tempo real e exibe um modal editorial de segurança
 * sempre que o mesmo login for iniciado em outro dispositivo/navegador.
 */
import { useEffect, useState } from 'react'
import {
    useSessionGuard,
    SESSION_REPLACED_EVENT,
    SESSION_REPLACED_STORAGE_KEY,
    SessionReplacedPayload,
} from '@/lib/hooks/use-session-guard'
import { ShieldCheck, MonitorSmartphone, Clock, Mail, ArrowRight, Lock } from 'lucide-react'

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
        try {
            const urlParams = new URLSearchParams(window.location.search)
            if (urlParams.get('preview_session_popup') === '1') {
                setReplacedInfo({
                    email: 'gestor@clinigo.app',
                    new_device: 'Google Chrome (Windows)',
                    replaced_at: new Date().toISOString(),
                    message: 'Sua sessão neste navegador foi encerrada porque um novo login foi iniciado com esta conta em outro dispositivo.',
                })
                return
            }

            const saved = window.sessionStorage.getItem(SESSION_REPLACED_STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved) as SessionReplacedPayload
                if (parsed) setReplacedInfo(parsed)
            }
        } catch {
            /* ignore */
        }

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
            window.localStorage.removeItem(SESSION_REPLACED_STORAGE_KEY)
        } catch {
            /* ignore */
        }
        setReplacedInfo(null)
        window.location.replace('/login')
    }

    if (!replacedInfo) return null

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-replaced-title"
            aria-describedby="session-replaced-desc"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4"
        >
            <div className="w-full max-w-[440px] rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-[0_24px_64px_-16px_rgba(15,23,42,0.28)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Cabeçalho Editorial Minimalista */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800/80">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E6F2EE] dark:bg-[#155E4B]/25 border border-[#C4E1D7] dark:border-[#155E4B]/40 text-[#155E4B] dark:text-emerald-400">
                            <ShieldCheck className="h-4 w-4" />
                        </div>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-600 dark:text-zinc-300">
                            Proteção de Sessão CliniGo
                        </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#155E4B]" />
                        Sessão única
                    </span>
                </div>

                {/* Corpo Principal */}
                <div className="px-6 py-5 space-y-5">
                    <div className="space-y-1.5">
                        <h2
                            id="session-replaced-title"
                            className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug"
                        >
                            Acesso iniciado em outro dispositivo
                        </h2>
                        <p
                            id="session-replaced-desc"
                            className="text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed"
                        >
                            Sua sessão neste navegador foi encerrada automaticamente porque esta conta entrou em outro local. Por segurança e conformidade LGPD, mantemos apenas um acesso ativo por usuário.
                        </p>
                    </div>

                    {/* Card de Metadados do Novo Acesso (Tabular / Hairline) */}
                    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 divide-y divide-zinc-200/70 dark:divide-zinc-800/80 text-xs">
                        {replacedInfo.email && (
                            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-medium shrink-0">
                                    <Mail className="h-3.5 w-3.5 text-zinc-400" />
                                    Conta
                                </span>
                                <span
                                    className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[230px]"
                                    title={replacedInfo.email}
                                >
                                    {replacedInfo.email}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                            <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-medium shrink-0">
                                <MonitorSmartphone className="h-3.5 w-3.5 text-zinc-400" />
                                Novo acesso
                            </span>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100 text-right">
                                {replacedInfo.new_device || 'Outro computador ou navegador'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                            <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-medium shrink-0">
                                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                                Detectado
                            </span>
                            <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                                {formatReplacedTime(replacedInfo.replaced_at)}
                            </span>
                        </div>
                    </div>

                    {/* Nota de Tranquilidade LGPD */}
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                        <span>Todos os registros salvos permanecem protegidos. Caso não reconheça este acesso, altere sua senha.</span>
                    </div>

                    {/* Ação Principal */}
                    <div className="pt-0.5">
                        <button
                            type="button"
                            autoFocus
                            onClick={handleConfirmAndLogin}
                            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#155E4B] hover:bg-[#114B3C] active:bg-[#0D3C30] text-white text-sm font-medium px-4 py-2.5 shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#155E4B]/40 focus-visible:ring-offset-2"
                        >
                            <span>Fazer login novamente</span>
                            <ArrowRight className="h-4 w-4 shrink-0" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
