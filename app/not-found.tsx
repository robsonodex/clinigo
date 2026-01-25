'use client'

import Link from 'next/link'
import { Home, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                {/* Logo */}
                <Link href="/" className="inline-block mb-8">
                    <img src="/logo_white.svg" alt="CliniGo" className="h-12 mx-auto" />
                </Link>

                {/* 404 Number */}
                <div className="relative mb-8">
                    <span className="text-[150px] md:text-[200px] font-bold text-white/5 leading-none select-none">
                        404
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Search className="w-20 h-20 text-emerald-500/50" />
                    </div>
                </div>

                {/* Text */}
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
                    Página não encontrada
                </h1>
                <p className="text-gray-400 mb-8">
                    Desculpe, não conseguimos encontrar a página que você está procurando.
                    Ela pode ter sido movida ou não existir mais.
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                    >
                        <Home className="w-5 h-5" />
                        Ir para início
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Voltar
                    </button>
                </div>

                {/* Help links */}
                <div className="mt-12 pt-8 border-t border-white/10">
                    <p className="text-gray-500 text-sm mb-4">Precisa de ajuda?</p>
                    <div className="flex flex-wrap justify-center gap-4 text-sm">
                        <Link href="/contato" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                            Contato
                        </Link>
                        <span className="text-gray-600">•</span>
                        <Link href="/lgpd" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                            LGPD
                        </Link>
                        <span className="text-gray-600">•</span>
                        <Link href="/termos" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                            Termos
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
