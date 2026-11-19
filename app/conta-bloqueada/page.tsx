'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShieldAlert, MessageCircle, RefreshCw, LogOut, Lock, Building2, HelpCircle } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { EditorialShell } from '@/components/marketing/EditorialShell'

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

    const whatsappUrl = `https://wa.me/5521975129005?text=${encodeURIComponent('Olá, sou o gestor da clínica e meu acesso ao CliniGo está bloqueado. Gostaria de solicitar a verificação e desbloqueio.')}`

    return (
        <EditorialShell minimal backHref="/" backLabel="Voltar ao início" compactFooter>
            <main className="flex-1 flex items-center justify-center p-5 sm:p-8">
                <div className="w-full max-w-xl">
                    <div className="flex justify-center mb-6">
                        <Link href="/" className="inline-block">
                            <Image
                                src="/logo_black.svg"
                                alt="CliniGo"
                                width={160}
                                height={48}
                                unoptimized
                                priority
                                className="h-[46px] w-auto object-contain"
                            />
                        </Link>
                    </div>

                    <div className="bg-white border border-[#E6E8E5] rounded-xl p-6 sm:p-9 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />

                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="relative mb-4">
                                <div className="w-16 h-16 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
                                    <ShieldAlert className="w-8 h-8 text-red-600" strokeWidth={1.75} />
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-red-600 text-white p-1 rounded-full border-2 border-white">
                                    <Lock className="w-3.5 h-3.5" />
                                </div>
                            </div>

                            <span className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.14em] px-3 py-1 rounded-md bg-red-50 border border-red-200 text-red-700 mb-3">
                                Sistema Bloqueado · Conta Inativa
                            </span>

                            <h1 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight">
                                Acesso à clínica suspenso
                            </h1>
                            <p className="text-sm sm:text-base text-[#4B5B56] mt-2 max-w-md leading-relaxed">
                                O acesso a esta unidade foi bloqueado temporariamente pela administração do CliniGo até a regularização da conta.
                            </p>
                        </div>

                        <div className="bg-[#FAFAF8] border border-[#E6E8E5] rounded-xl p-4 sm:p-5 mb-7 space-y-3 text-sm text-[#4B5B56]">
                            <div className="flex items-start gap-3">
                                <Building2 className="w-5 h-5 text-red-600 shrink-0 mt-0.5" strokeWidth={1.75} />
                                <div>
                                    <strong className="text-[#0F1F1B] block font-semibold">Por que a conta foi bloqueada?</strong>
                                    O bloqueio ocorre quando a assinatura da clínica está inativa ou aguarda validação administrativa.
                                </div>
                            </div>
                            <div className="flex items-start gap-3 pt-3 border-t border-[#E6E8E5]">
                                <HelpCircle className="w-5 h-5 text-[#155E4B] shrink-0 mt-0.5" strokeWidth={1.75} />
                                <div>
                                    <strong className="text-[#0F1F1B] block font-semibold">Como solicitar o desbloqueio?</strong>
                                    O gestor responsável deve entrar em contato diretamente com o suporte para verificação e reativação.
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full min-h-[48px] px-5 py-3 bg-[#155E4B] hover:bg-[#0F493A] text-white font-semibold rounded-md flex items-center justify-center gap-2 transition-colors text-sm"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Falar com Suporte no WhatsApp
                            </a>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className="w-full min-h-[44px] px-4 py-2.5 bg-white hover:bg-[#F2F5F3] border border-[#E6E8E5] text-[#0F1F1B] font-medium rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm cursor-pointer"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    {isRefreshing ? 'Verificando...' : 'Verificar Desbloqueio'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                    className="w-full min-h-[44px] px-4 py-2.5 bg-white hover:bg-red-50 border border-[#E6E8E5] hover:border-red-200 text-[#4B5B56] hover:text-red-700 font-medium rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm cursor-pointer"
                                >
                                    <LogOut className="w-4 h-4" />
                                    {isLoggingOut ? 'Saindo...' : 'Sair da Conta'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <p className="text-center text-xs text-[#4B5B56] mt-6">
                        CliniGo · Plataforma para Clínicas de Terapias Multidisciplinares · Proteção de Dados LGPD
                    </p>
                </div>
            </main>
        </EditorialShell>
    )
}
