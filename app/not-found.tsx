'use client'

import Link from 'next/link'
import { ArrowLeft, Home, LogIn, Search } from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'

export default function NotFound() {
    return (
        <EditorialShell minimal backHref="/" backLabel="Voltar ao início" compactFooter>
            <main className="flex-1 flex items-center justify-center px-5 py-16">
                <div className="max-w-lg w-full bg-white border border-[#E6E8E5] rounded-xl p-8 sm:p-10 text-center shadow-sm">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#E6F2EE] text-[#155E4B] mb-5">
                        <Search className="w-7 h-7" strokeWidth={1.75} />
                    </div>

                    <p className="font-tech-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#155E4B] mb-2">
                        ERRO 404
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight mb-3">
                        Página não encontrada
                    </h1>
                    <p className="text-sm sm:text-base text-[#4B5B56] leading-relaxed mb-7">
                        O endereço solicitado não está disponível ou foi movido. Utilize os atalhos abaixo para continuar navegando pelo CliniGo.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/"
                            className="min-h-[46px] px-5 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                        >
                            <Home className="w-4 h-4" />
                            Ir para o início
                        </Link>
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="min-h-[46px] px-5 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-[#0F1F1B] text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar
                        </button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-[#E6E8E5] flex flex-wrap items-center justify-center gap-4 text-xs text-[#4B5B56]">
                        <Link href="/login" className="hover:text-[#155E4B] inline-flex items-center gap-1 font-medium">
                            <LogIn className="w-3.5 h-3.5" />
                            Entrar
                        </Link>
                        <span>·</span>
                        <Link href="/planos" className="hover:text-[#155E4B] font-medium">
                            Planos
                        </Link>
                        <span>·</span>
                        <Link href="/help" className="hover:text-[#155E4B] font-medium">
                            Central de Ajuda
                        </Link>
                        <span>·</span>
                        <Link href="/contato" className="hover:text-[#155E4B] font-medium">
                            Contato
                        </Link>
                    </div>
                </div>
            </main>
        </EditorialShell>
    )
}
