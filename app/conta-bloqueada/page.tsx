'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShieldAlert, MessageCircle, RefreshCw, LogOut, Lock, Building2, HelpCircle } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

export default function ContaBloqueadaPage() {
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    const handleRefresh = () => {
        setIsRefreshing(true)
        window.location.reload()
    }

    const handleLogout = async () => {
        setIsLoggingOut(true)
        try {
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dlxakeejmyzhzdxzjgne.supabase.co',
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDA1NzIsImV4cCI6MjA4MjYxNjU3Mn0.Y6qi1c9jNMe3_cNof8pAxDHKhpVZgbcXCq5tTMDZ-ac'
            )
            await supabase.auth.signOut()
        } catch (e) {
            console.error('Logout error:', e)
        } finally {
            window.location.href = '/clinica'
        }
    }

    const whatsappUrl = `https://wa.me/5521965572247?text=${encodeURIComponent('Olá, sou o gestor da clínica e meu acesso ao CliniGo está bloqueado. Gostaria de solicitar a verificação/desbloqueio.')}`

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-red-500 selection:text-white">
            {/* Background Glow Animations */}
            <div className="absolute top-1/4 -left-32 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }} />

            <div className="w-full max-w-xl relative z-10 my-auto">
                {/* Header Logo */}
                <div className="flex justify-center mb-6 sm:mb-8">
                    <Link href="/" className="inline-block group">
                        <Image
                            src="/logo_white.svg"
                            alt="CliniGo"
                            width={180}
                            height={48}
                            className="h-12 w-auto group-hover:scale-105 transition-transform"
                            priority
                        />
                    </Link>
                </div>

                {/* Main Card */}
                <div className="bg-slate-900/80 border border-red-500/30 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-2xl shadow-red-950/40 relative overflow-hidden">
                    {/* Top status bar */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />

                    {/* Icon Badge */}
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="relative mb-4">
                            <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shadow-inner">
                                <ShieldAlert className="w-10 h-10 text-red-500 animate-pulse" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-red-600 text-white p-1 rounded-full border-2 border-slate-900">
                                <Lock className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold uppercase tracking-wider mb-3">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            Sistema Bloqueado • Conta Inativa
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                            Acesso à Clínica Suspenso
                        </h1>
                        <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-md">
                            O acesso a esta clínica foi bloqueado temporariamente pela administração do CliniGo. Todas as funções permanecerão bloqueadas até a liberação.
                        </p>
                    </div>

                    {/* Details Box */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-8 space-y-3 text-sm text-slate-300">
                        <div className="flex items-start gap-3">
                            <Building2 className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <strong className="text-white block font-medium">Por que a conta foi bloqueada?</strong>
                                O bloqueio ocorre quando a conta da clínica está inativa no painel Master Hub ou por pendência administrativa.
                            </div>
                        </div>
                        <div className="flex items-start gap-3 pt-2 border-t border-slate-800/80">
                            <HelpCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <strong className="text-white block font-medium">Como solicitar o desbloqueio?</strong>
                                O gestor responsável deve entrar em contato diretamente com o suporte para que o administrador realize a ativação no Master Hub.
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons (REGRA DOS BOTÕES & PWA Touch Areas >= 44px) */}
                    <div className="space-y-3">
                        {/* 1. WhatsApp Direct Support */}
                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full min-h-[48px] px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-950/40 active:scale-[0.98] text-sm sm:text-base"
                        >
                            <MessageCircle className="w-5 h-5" />
                            Falar com Suporte no WhatsApp
                        </a>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {/* 2. Reload / Check Status */}
                            <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="w-full min-h-[44px] px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                {isRefreshing ? 'Verificando...' : 'Verificar Desbloqueio'}
                            </button>

                            {/* 3. Logout / Change User */}
                            <button
                                type="button"
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="w-full min-h-[44px] px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 font-medium rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
                            >
                                <LogOut className="w-4 h-4" />
                                {isLoggingOut ? 'Saindo...' : 'Sair da Conta'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Disclaimer */}
                <p className="text-center text-xs text-slate-500 mt-6">
                    CliniGo • Sistema de Gestão Médica • Proteção de Dados LGPD
                </p>
            </div>
        </div>
    )
}
