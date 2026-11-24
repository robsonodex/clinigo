'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/**
 * Barra fixa de contratação: aparece depois do Hero e some perto da chamada final/rodapé.
 * Mobile: base da tela, deixando livre o canto direito do botão do chatbot (bottom-6 right-6).
 * Desktop: cartão discreto centralizado.
 */
export function StickyCtaBar() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const onScroll = () => {
            const scrolled = window.scrollY
            const distanceToBottom = document.documentElement.scrollHeight - (scrolled + window.innerHeight)
            setVisible(scrolled > 720 && distanceToBottom > 900)
        }
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onScroll)
        return () => {
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onScroll)
        }
    }, [])

    return (
        <div
            aria-hidden={!visible}
            className={`fixed z-40 transition-all duration-200 left-3 right-[84px] bottom-[max(0.75rem,env(safe-area-inset-bottom))] md:left-1/2 md:right-auto md:bottom-6 md:-translate-x-1/2 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
        >
            <div className="rounded-xl border border-[#E6E8E5] bg-white/95 backdrop-blur-md shadow-[0_16px_40px_-20px_rgba(15,31,27,0.35)] p-2 flex items-center gap-2 md:gap-3 md:pl-4">
                <span className="hidden md:inline text-sm font-medium text-[#0F1F1B] whitespace-nowrap">
                    Teste o CliniGo com a sua equipe por 7 dias
                </span>
                <a
                    href="#planos"
                    tabIndex={visible ? 0 : -1}
                    className="flex-1 md:flex-none min-h-[44px] px-3 md:px-4 rounded-md border border-[#E6E8E5] bg-[#FAFAF8] hover:bg-[#F2F5F3] text-[#0F1F1B] text-xs sm:text-sm font-medium transition-colors inline-flex items-center justify-center whitespace-nowrap"
                >
                    Ver planos
                </a>
                <Link
                    href="/trial"
                    tabIndex={visible ? 0 : -1}
                    className="flex-1 md:flex-none min-h-[44px] px-3 md:px-4 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs sm:text-sm font-semibold transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                    Testar 7 dias
                    <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                </Link>
            </div>
        </div>
    )
}

