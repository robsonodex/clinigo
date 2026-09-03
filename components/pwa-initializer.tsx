'use client'

import { useEffect, useState } from 'react'
import { registerServiceWorker } from '@/lib/utils/pwa'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Download, Share, PlusSquare, Sparkles } from 'lucide-react'

export function PWAInitializer() {
    const [showPrompt, setShowPrompt] = useState(false)
    const [platform, setPlatform] = useState<'ios' | 'android' | null>(null)
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

    useEffect(() => {
        // 1. Registrar o Service Worker
        registerServiceWorker()

        // 2. Verificar se está rodando no cliente
        if (typeof window === 'undefined') return

        // 3. Verificar se já está instalado (standalone)
        const isStandalone = 
            window.matchMedia('(display-mode: standalone)').matches || 
            (window.navigator as any).standalone === true

        if (isStandalone) return

        // 4. Detecção de dispositivo móvel
        const ua = window.navigator.userAgent.toLowerCase()
        const isIpad = ua.includes('ipad')
        const isIphone = ua.includes('iphone')
        const isIOS = isIpad || isIphone
        const isAndroid = ua.includes('android')
        const isMobile = isIOS || isAndroid

        if (!isMobile) return

        // 5. Verificar se o usuário fechou o prompt recentemente (respeito a usabilidade - 3 dias)
        const lastClosed = localStorage.getItem('clinigo-pwa-prompt-closed')
        if (lastClosed) {
            const closedDate = new Date(lastClosed)
            const diffTime = Math.abs(new Date().getTime() - closedDate.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            if (diffDays <= 3) {
                return // não mostra se foi fechado nos últimos 3 dias
            }
        }

        // 6. Escuta do evento de instalação do Chrome/Android
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e)
            setPlatform('android')
            setShowPrompt(true)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        // Se for iOS, não há evento beforeinstallprompt, então mostramos o guia diretamente
        if (isIOS) {
            setPlatform('ios')
            // Delay de 2.5 segundos para o usuário carregar a página antes de ver o pop-up
            const timer = setTimeout(() => {
                setShowPrompt(true)
            }, 2500)
            return () => {
                clearTimeout(timer)
                window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            }
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        }
    }, [])

    const handleInstallClick = async () => {
        if (!deferredPrompt) return

        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        console.log(`[PWA] User choice outcome: ${outcome}`)

        setDeferredPrompt(null)
        setShowPrompt(false)
    }

    const handleShareClick = async () => {
        if (typeof window === 'undefined') return
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'CliniGo',
                    text: 'Acesse o CliniGo - App oficial da sua Clínica',
                    url: window.location.href
                })
            } catch (error) {
                console.log('[PWA] Share cancelled or failed:', error)
            }
        } else {
            alert('O seu navegador não suporta compartilhamento direto. Por favor, use o botão de compartilhar do próprio navegador Safari.')
        }
    }

    const handleClose = () => {
        localStorage.setItem('clinigo-pwa-prompt-closed', new Date().toISOString())
        setShowPrompt(false)
    }

    return (
        <AnimatePresence>
            {showPrompt && (
                <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 md:hidden">
                    {/* Background click closes */}
                    <div className="absolute inset-0" onClick={handleClose} />

                    {/* Bottom Sheet */}
                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative w-full max-w-md bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800/50 rounded-2xl shadow-2xl overflow-hidden p-6 z-10"
                    >
                        {/* Close button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 p-1.5 rounded-xs bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Top Indicator */}
                        <div className="flex justify-center mb-4">
                            <div className="w-12 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full" />
                        </div>

                        {/* App Info Header */}
                        <div className="flex items-center gap-4 mb-5">
                            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg text-white font-bold text-xl">
                                C
                                <div className="absolute -top-1 -right-1 bg-amber-400 text-amber-950 p-0.5 rounded-full shadow border border-white">
                                    <Sparkles className="w-2.5 h-2.5" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-50">Instalar CliniGo</h3>
                                <p className="text-xs text-slate-500 dark:text-zinc-400">App oficial da sua Clínica</p>
                            </div>
                        </div>

                        {/* Feature Highlights */}
                        <p className="text-sm text-slate-600 dark:text-zinc-300 mb-6 leading-relaxed font-medium">
                            Adicione o CliniGo à sua tela inicial para acessar sua agenda, prontuários e atendimentos de forma ultra-rápida, sem ocupar espaço no celular!
                        </p>

                        {/* Platform Specific Actions */}
                        {platform === 'android' ? (
                            <button
                                onClick={handleInstallClick}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xs bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98]"
                            >
                                <Download className="w-4 h-4" />
                                Instalar Aplicativo
                            </button>
                        ) : platform === 'ios' ? (
                            <div className="space-y-4 text-left">
                                <button
                                    onClick={handleShareClick}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xs bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98]"
                                >
                                    <Share className="w-4 h-4" />
                                    Abrir Compartilhamento
                                </button>

                                <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-xl p-4 space-y-3.5">
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Como instalar no iPhone/iPad:</h4>
                                    
                                    <div className="flex gap-3.5 items-start text-xs text-slate-600 dark:text-zinc-300">
                                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-700 font-bold text-slate-800 dark:text-zinc-200">1</div>
                                        <p className="leading-relaxed">
                                            Toque no botão <button onClick={handleShareClick} className="inline-flex items-center gap-0.5 font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer bg-transparent border-none p-0 align-baseline"><Share className="w-3.5 h-3.5 inline mr-0.5" /> Compartilhar</button> acima (ou use o ícone de compartilhar na barra inferior do seu Safari).
                                        </p>
                                    </div>
                                    
                                    <div className="flex gap-3.5 items-start text-xs text-slate-600 dark:text-zinc-300">
                                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-700 font-bold text-slate-800 dark:text-zinc-200">2</div>
                                        <p className="leading-relaxed">
                                            Na lista de opções que abrir, role para baixo e toque em <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-zinc-50"><PlusSquare className="w-3.5 h-3.5 inline" /> Adicionar à Tela de Início</span>.
                                        </p>
                                    </div>
                                    
                                    <div className="flex gap-3.5 items-start text-xs text-slate-600 dark:text-zinc-300">
                                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-700 font-bold text-slate-800 dark:text-zinc-200">3</div>
                                        <p className="leading-relaxed">
                                            Toque em <span className="font-bold text-slate-900 dark:text-zinc-50">Adicionar</span> no canto superior direito para confirmar.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {/* Remind later action */}
                        <div className="mt-4 flex justify-center">
                            <button
                                onClick={handleClose}
                                className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors py-1 px-3"
                            >
                                Lembrar mais tarde
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
