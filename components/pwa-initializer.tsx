'use client'

import { useEffect, useState } from 'react'
import {
    SW_UPDATE_EVENT,
    forceClearPwaCachesAndUpdate,
    registerServiceWorker,
} from '@/lib/utils/pwa'
import { AnimatePresence, motion } from 'framer-motion'
import {
    Check,
    Copy,
    Download,
    PlusSquare,
    RefreshCw,
    Share,
    X,
} from 'lucide-react'

const PWA_BRAND_VERSION = '2026-11-v2'
const BRAND_ACK_KEY = 'clinigo-pwa-brand-version'
const UPDATE_SNOOZE_KEY = 'clinigo-pwa-update-snooze-until'
const INSTALL_CLOSED_KEY = 'clinigo-pwa-prompt-closed'
const APP_PUBLIC_URL = 'https://clinigo.app'

type PromptMode = 'install' | 'update' | 'sw-refresh' | null
type DevicePlatform = 'ios' | 'android' | 'desktop' | null

function detectStandalone(): boolean {
    if (typeof window === 'undefined') return false
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    )
}

function detectPlatform(): { platform: DevicePlatform; isSafariIOS: boolean } {
    if (typeof window === 'undefined') {
        return { platform: null, isSafariIOS: false }
    }
    const ua = window.navigator.userAgent || ''
    const uaLower = ua.toLowerCase()
    const isIpadOS =
        uaLower.includes('macintosh') &&
        typeof navigator.maxTouchPoints === 'number' &&
        navigator.maxTouchPoints > 1
    const isIOS = uaLower.includes('iphone') || uaLower.includes('ipad') || uaLower.includes('ipod') || isIpadOS
    const isAndroid = uaLower.includes('android')

    if (isIOS) {
        const isOtherIOSBrowser = /crios|fxios|edgios|opios|fban|fbav|instagram|whatsapp|line\//i.test(ua)
        const isSafari = /safari/i.test(ua) && !isOtherIOSBrowser
        return { platform: 'ios', isSafariIOS: isSafari }
    }

    if (isAndroid) {
        return { platform: 'android', isSafariIOS: false }
    }

    return { platform: 'desktop', isSafariIOS: false }
}

export function PWAInitializer() {
    const [mode, setMode] = useState<PromptMode>(null)
    const [platform, setPlatform] = useState<DevicePlatform>(null)
    const [isSafariIOS, setIsSafariIOS] = useState(false)
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [copiedLink, setCopiedLink] = useState(false)

    useEffect(() => {
        // 1. Registrar/atualizar o Service Worker imediatamente (inclusive se load já disparou)
        registerServiceWorker()

        if (typeof window === 'undefined') return

        // 2. Detectar abertura a partir do novo manifest (?pwa_v=2) e limpar URL sem recarregar
        try {
            const currentUrl = new URL(window.location.href)
            if (currentUrl.searchParams.get('pwa_v') === '2') {
                localStorage.setItem(BRAND_ACK_KEY, PWA_BRAND_VERSION)
                localStorage.removeItem(UPDATE_SNOOZE_KEY)
                currentUrl.searchParams.delete('pwa_v')
                const cleanPath = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
                window.history.replaceState({}, '', cleanPath || '/')
            }
        } catch {
            // Ignora caso URL ou storage não estejam disponíveis
        }

        const { platform: detectedPlatform, isSafariIOS: safariCheck } = detectPlatform()
        setPlatform(detectedPlatform)
        setIsSafariIOS(safariCheck)

        const isStandalone = detectStandalone()

        // 3. Ouvir notificações de atualização do Service Worker
        const handleSwUpdate = () => {
            setMode((prev) => (prev === 'update' ? prev : 'sw-refresh'))
        }
        window.addEventListener(SW_UPDATE_EVENT, handleSwUpdate)

        // 4. Se já estiver rodando como aplicativo instalado (standalone)
        if (isStandalone) {
            let acknowledged = false
            let snoozed = false
            try {
                acknowledged = localStorage.getItem(BRAND_ACK_KEY) === PWA_BRAND_VERSION
                const snoozeUntil = Number(localStorage.getItem(UPDATE_SNOOZE_KEY) || '0')
                snoozed = Number.isFinite(snoozeUntil) && snoozeUntil > Date.now()
            } catch {
                // Storage bloqueado
            }

            if (!acknowledged && !snoozed) {
                const timer = setTimeout(() => {
                    setMode('update')
                }, 1500)
                return () => {
                    clearTimeout(timer)
                    window.removeEventListener(SW_UPDATE_EVENT, handleSwUpdate)
                }
            }

            return () => {
                window.removeEventListener(SW_UPDATE_EVENT, handleSwUpdate)
            }
        }

        // 5. Fluxo de instalação para visitantes no navegador móvel (Android / iOS)
        if (detectedPlatform !== 'ios' && detectedPlatform !== 'android') {
            return () => {
                window.removeEventListener(SW_UPDATE_EVENT, handleSwUpdate)
            }
        }

        // Respeita dispensa recente do prompt de instalação (3 dias)
        try {
            const lastClosed = localStorage.getItem(INSTALL_CLOSED_KEY)
            if (lastClosed) {
                const closedDate = new Date(lastClosed)
                const diffTime = Math.abs(Date.now() - closedDate.getTime())
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                if (diffDays <= 3) {
                    return () => {
                        window.removeEventListener(SW_UPDATE_EVENT, handleSwUpdate)
                    }
                }
            }
        } catch {
            // Storage indisponível
        }

        // Escuta do evento de instalação nativa no Chrome/Android
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e)
            setPlatform('android')
            setMode('install')
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        if (detectedPlatform === 'ios') {
            const timer = setTimeout(() => {
                setMode('install')
            }, 2500)
            return () => {
                clearTimeout(timer)
                window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
                window.removeEventListener(SW_UPDATE_EVENT, handleSwUpdate)
            }
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            window.removeEventListener(SW_UPDATE_EVENT, handleSwUpdate)
        }
    }, [])

    const handleInstallClick = async () => {
        if (!deferredPrompt) return

        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
            try {
                localStorage.setItem(BRAND_ACK_KEY, PWA_BRAND_VERSION)
            } catch {
                // Ignora erro de storage
            }
        }

        setDeferredPrompt(null)
        setMode(null)
    }

    const handleUpdateNow = async () => {
        setIsUpdating(true)
        try {
            // Evita reexibir imediatamente após recarregar enquanto o Chrome processa o WebAPK
            const twoHoursMs = 2 * 60 * 60 * 1000
            localStorage.setItem(UPDATE_SNOOZE_KEY, String(Date.now() + twoHoursMs))
        } catch {
            // Ignora erro de storage
        }

        await forceClearPwaCachesAndUpdate()
        window.location.reload()
    }

    const handleMarkUpdated = () => {
        try {
            localStorage.setItem(BRAND_ACK_KEY, PWA_BRAND_VERSION)
            localStorage.removeItem(UPDATE_SNOOZE_KEY)
        } catch {
            // Ignora erro de storage
        }
        setMode(null)
    }

    const handleSnoozeUpdate = () => {
        try {
            const oneDayMs = 24 * 60 * 60 * 1000
            localStorage.setItem(UPDATE_SNOOZE_KEY, String(Date.now() + oneDayMs))
        } catch {
            // Ignora erro de storage
        }
        setMode(null)
    }

    const handleCloseInstall = () => {
        try {
            localStorage.setItem(INSTALL_CLOSED_KEY, new Date().toISOString())
        } catch {
            // Ignora erro de storage
        }
        setMode(null)
    }

    const handleCopyAppUrl = async () => {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(APP_PUBLIC_URL)
            } else {
                const input = document.createElement('input')
                input.value = APP_PUBLIC_URL
                document.body.appendChild(input)
                input.select()
                document.execCommand('copy')
                input.remove()
            }
            setCopiedLink(true)
            setTimeout(() => setCopiedLink(false), 2500)
        } catch {
            setCopiedLink(false)
        }
    }

    useEffect(() => {
        if (!mode) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (mode === 'update') {
                    handleSnoozeUpdate()
                } else if (mode === 'install') {
                    handleCloseInstall()
                } else {
                    setMode(null)
                }
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [mode])

    const handleBackdropClose = () => {
        if (mode === 'update') {
            handleSnoozeUpdate()
        } else if (mode === 'install') {
            handleCloseInstall()
        } else {
            setMode(null)
        }
    }

    return (
        <AnimatePresence>
            {mode === 'sw-refresh' && (
                <motion.div
                    initial={{ y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 24, opacity: 0 }}
                    className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-6 sm:w-full sm:max-w-sm z-[9998]"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                >
                    <div className="bg-white border border-[#E6E8E5] rounded-xl shadow-lg p-4 flex items-center gap-3">
                        <img
                            src="/icons/clinigo-pwa-192-v2.png"
                            alt="CliniGo"
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-lg border border-[#E6E8E5] bg-white object-contain shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[#0F1F1B]">Nova versão disponível</p>
                            <p className="text-xs text-[#4B5B56] mt-0.5">
                                Recarregue para aplicar a atualização mais recente do CliniGo.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleUpdateNow}
                            disabled={isUpdating}
                            className="min-h-[44px] px-3 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold shrink-0 inline-flex items-center gap-1.5 transition-colors disabled:opacity-60"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                            {isUpdating ? 'Atualizando' : 'Atualizar'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode(null)}
                            aria-label="Fechar aviso de atualização"
                            className="min-w-[44px] min-h-[44px] -mr-2 rounded-md text-[#4B5B56] hover:bg-[#F2F5F3] inline-flex items-center justify-center shrink-0 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}

            {(mode === 'install' || mode === 'update') && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="clinigo-pwa-modal-title"
                    className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/45 backdrop-blur-sm p-3 sm:p-4"
                >
                    <div className="absolute inset-0" onClick={handleBackdropClose} />

                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                        className="relative w-full max-w-md bg-white border border-[#E6E8E5] rounded-2xl shadow-2xl overflow-hidden px-5 pt-5 z-10 max-h-[90vh] overflow-y-auto"
                        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}
                    >
                        <button
                            type="button"
                            onClick={handleBackdropClose}
                            aria-label="Fechar janela"
                            className="absolute top-3 right-3 min-w-[44px] min-h-[44px] rounded-md bg-[#F2F5F3] hover:bg-[#E6E8E5] text-[#4B5B56] inline-flex items-center justify-center transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex justify-center mb-4 md:hidden">
                            <div className="w-10 h-1 bg-[#D5DCD8] rounded-full" />
                        </div>

                        {/* Cabeçalho com o novo logotipo oficial */}
                        <div className="flex items-center gap-3.5 mb-4 pr-10">
                            <div className="w-14 h-14 rounded-xl bg-white border border-[#E6E8E5] shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                                <img
                                    src="/icons/clinigo-pwa-192-v2.png"
                                    alt="Novo logotipo CliniGo"
                                    width={56}
                                    height={56}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div className="min-w-0">
                                <h3
                                    id="clinigo-pwa-modal-title"
                                    className="text-base font-semibold text-[#0F1F1B] leading-snug"
                                >
                                    {mode === 'update'
                                        ? 'Atualização do aplicativo disponível'
                                        : 'Instalar CliniGo'}
                                </h3>
                                <p className="text-xs text-[#4B5B56] mt-0.5">
                                    {mode === 'update'
                                        ? 'Nova identidade visual e melhorias de desempenho'
                                        : 'Acesso rápido na tela inicial do seu aparelho'}
                                </p>
                            </div>
                        </div>

                        {mode === 'update' ? (
                            <div className="space-y-4">
                                <p className="text-sm text-[#354540] leading-relaxed">
                                    O CliniGo atualizou sua marca e o ícone oficial do aplicativo. Atualize agora para exibir o novo logotipo na tela inicial e limpar arquivos antigos.
                                </p>

                                {platform === 'ios' ? (
                                    <div className="bg-[#FAFAF8] border border-[#E6E8E5] rounded-xl p-4 space-y-3">
                                        <h4 className="text-xs font-semibold text-[#0F1F1B] uppercase tracking-wide">
                                            Como atualizar o ícone no iPhone / iPad
                                        </h4>
                                        <div className="flex gap-3 items-start text-xs text-[#354540] leading-relaxed">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E6E8E5] font-semibold text-[#0F1F1B]">
                                                1
                                            </span>
                                            <p>
                                                Mantenha o dedo pressionado sobre o ícone antigo do CliniGo na Tela de Início e toque em <span className="font-semibold text-[#0F1F1B]">Remover Favorito</span>.
                                            </p>
                                        </div>
                                        <div className="flex gap-3 items-start text-xs text-[#354540] leading-relaxed">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E6E8E5] font-semibold text-[#0F1F1B]">
                                                2
                                            </span>
                                            <p>
                                                Abra <span className="font-semibold text-[#0F1F1B]">clinigo.app</span> no navegador <span className="font-semibold text-[#0F1F1B]">Safari</span>.
                                            </p>
                                        </div>
                                        <div className="flex gap-3 items-start text-xs text-[#354540] leading-relaxed">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E6E8E5] font-semibold text-[#0F1F1B]">
                                                3
                                            </span>
                                            <p>
                                                Toque em <span className="inline-flex items-center gap-1 font-semibold text-[#0F1F1B]"><Share className="w-3.5 h-3.5 inline" /> Compartilhar</span> na barra inferior do Safari e selecione <span className="inline-flex items-center gap-1 font-semibold text-[#0F1F1B]"><PlusSquare className="w-3.5 h-3.5 inline" /> Adicionar à Tela de Início</span>.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-[#FAFAF8] border border-[#E6E8E5] rounded-xl p-4 space-y-2.5">
                                        <h4 className="text-xs font-semibold text-[#0F1F1B] uppercase tracking-wide">
                                            Se o ícone antigo permanecer na tela inicial
                                        </h4>
                                        <div className="flex gap-3 items-start text-xs text-[#354540] leading-relaxed">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E6E8E5] font-semibold text-[#0F1F1B]">
                                                1
                                            </span>
                                            <p>
                                                Desinstale o atalho antigo do CliniGo na tela inicial do aparelho.
                                            </p>
                                        </div>
                                        <div className="flex gap-3 items-start text-xs text-[#354540] leading-relaxed">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E6E8E5] font-semibold text-[#0F1F1B]">
                                                2
                                            </span>
                                            <p>
                                                Abra <span className="font-semibold text-[#0F1F1B]">clinigo.app</span> no Google Chrome e toque em <span className="font-semibold text-[#0F1F1B]">Instalar aplicativo</span>.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2.5 pt-1">
                                    <button
                                        type="button"
                                        onClick={handleUpdateNow}
                                        disabled={isUpdating}
                                        className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white font-semibold text-sm transition-colors disabled:opacity-60"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
                                        {isUpdating ? 'Atualizando aplicativo...' : 'Atualizar aplicativo agora'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleCopyAppUrl}
                                        className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-[#0F1F1B] font-medium text-sm transition-colors"
                                    >
                                        {copiedLink ? (
                                            <>
                                                <Check className="w-4 h-4 text-[#155E4B]" />
                                                Link clinigo.app copiado
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4 text-[#4B5B56]" />
                                                Copiar link clinigo.app
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E6E8E5]">
                                    <button
                                        type="button"
                                        onClick={handleMarkUpdated}
                                        className="min-h-[44px] px-2 text-xs font-medium text-[#155E4B] hover:text-[#0F493A] transition-colors"
                                    >
                                        Já estou com o novo ícone
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSnoozeUpdate}
                                        className="min-h-[44px] px-2 text-xs font-medium text-[#4B5B56] hover:text-[#0F1F1B] transition-colors"
                                    >
                                        Lembrar depois
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-[#354540] leading-relaxed">
                                    Adicione o CliniGo à sua tela inicial para acessar agenda, prontuários e atendimentos em tela cheia com um toque.
                                </p>

                                {platform === 'android' ? (
                                    <button
                                        type="button"
                                        onClick={handleInstallClick}
                                        className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white font-semibold text-sm transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Instalar Aplicativo
                                    </button>
                                ) : platform === 'ios' ? (
                                    <div className="space-y-3 text-left">
                                        {!isSafariIOS && (
                                            <div className="bg-[#FAFAF8] border border-[#D5DCD8] rounded-xl p-3.5 space-y-2.5">
                                                <p className="text-xs text-[#354540] leading-relaxed">
                                                    No iPhone e iPad, a instalação na Tela de Início precisa ser feita pelo navegador <span className="font-semibold text-[#0F1F1B]">Safari</span>. Copie o endereço abaixo e abra no Safari:
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={handleCopyAppUrl}
                                                    className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white font-semibold text-xs transition-colors"
                                                >
                                                    {copiedLink ? (
                                                        <>
                                                            <Check className="w-4 h-4" />
                                                            Link clinigo.app copiado
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-4 h-4" />
                                                            Copiar link para abrir no Safari
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        <div className="bg-[#FAFAF8] border border-[#E6E8E5] rounded-xl p-4 space-y-3">
                                            <h4 className="text-xs font-semibold text-[#0F1F1B] uppercase tracking-wide">
                                                Como instalar no iPhone / iPad (Safari)
                                            </h4>

                                            <div className="flex gap-3 items-start text-xs text-[#354540] leading-relaxed">
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E6E8E5] font-semibold text-[#0F1F1B]">
                                                    1
                                                </span>
                                                <p>
                                                    Na barra inferior do Safari, toque no botão{' '}
                                                    <span className="inline-flex items-center gap-1 font-semibold text-[#0F1F1B]">
                                                        <Share className="w-3.5 h-3.5 inline" /> Compartilhar
                                                    </span>
                                                    .
                                                </p>
                                            </div>

                                            <div className="flex gap-3 items-start text-xs text-[#354540] leading-relaxed">
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E6E8E5] font-semibold text-[#0F1F1B]">
                                                    2
                                                </span>
                                                <p>
                                                    Role as opções e toque em{' '}
                                                    <span className="inline-flex items-center gap-1 font-semibold text-[#0F1F1B]">
                                                        <PlusSquare className="w-3.5 h-3.5 inline" /> Adicionar à Tela de Início
                                                    </span>
                                                    .
                                                </p>
                                            </div>

                                            <div className="flex gap-3 items-start text-xs text-[#354540] leading-relaxed">
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E6E8E5] font-semibold text-[#0F1F1B]">
                                                    3
                                                </span>
                                                <p>
                                                    Confirme tocando em{' '}
                                                    <span className="font-semibold text-[#0F1F1B]">Adicionar</span> no canto superior direito.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="flex justify-center pt-1">
                                    <button
                                        type="button"
                                        onClick={handleCloseInstall}
                                        className="min-h-[44px] px-4 text-xs font-medium text-[#4B5B56] hover:text-[#0F1F1B] transition-colors"
                                    >
                                        Lembrar mais tarde
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
