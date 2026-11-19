'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Menu, X } from 'lucide-react'
import { NAV_CONTENT } from './content'

export function NavbarSection() {
    const [scrolled, setScrolled] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 12)
        handleScroll()
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        if (!mobileOpen) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMobileOpen(false)
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [mobileOpen])

    return (
        <header
            className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
                scrolled
                    ? 'bg-[#FAFAF8]/92 backdrop-blur-md border-b border-[#E6E8E5]'
                    : 'bg-[#FAFAF8]/80 backdrop-blur-sm border-b border-transparent'
            }`}
        >
            <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
                <Link
                    href="/"
                    onClick={(e) => {
                        setMobileOpen(false)
                        if (typeof window !== 'undefined' && window.location.pathname === '/') {
                            e.preventDefault()
                            if (window.location.hash) {
                                window.history.replaceState(null, '', '/')
                            }
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                    }}
                    className="inline-flex items-center shrink-0 py-1"
                    aria-label="CliniGo — página inicial"
                >
                    <Image
                        src="/logo_black.svg"
                        alt="CliniGo"
                        width={148}
                        height={48}
                        priority
                        unoptimized
                        className="h-[42px] sm:h-[48px] w-auto object-contain"
                    />
                </Link>

                <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-8 text-sm text-[#4B5B56]">
                    {NAV_CONTENT.links.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="font-medium hover:text-[#0F1F1B] transition-colors py-1"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                {/* Desktop: Entrar direto para /login (sem dropdown) + CTA sólido */}
                <div className="hidden md:flex items-center gap-2 shrink-0">
                    <Link
                        href={NAV_CONTENT.loginHref}
                        className="min-h-[40px] px-4 rounded-md text-sm font-medium text-[#0F1F1B] hover:bg-[#F2F5F3] transition-colors inline-flex items-center justify-center"
                    >
                        {NAV_CONTENT.loginLabel}
                    </Link>
                    <Link
                        href={NAV_CONTENT.primaryCtaHref}
                        className="min-h-[40px] px-4 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5 group"
                    >
                        {NAV_CONTENT.primaryCtaLabel}
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
                    </Link>
                </div>

                {/* Mobile: Entrar direto + menu hamburger >= 44px */}
                <div className="flex md:hidden items-center gap-2">
                    <Link
                        href={NAV_CONTENT.loginHref}
                        className="min-h-[44px] px-3.5 rounded-md border border-[#E6E8E5] bg-white text-[#0F1F1B] text-xs font-semibold inline-flex items-center justify-center"
                    >
                        {NAV_CONTENT.loginLabel}
                    </Link>
                    <button
                        type="button"
                        onClick={() => setMobileOpen((v) => !v)}
                        aria-expanded={mobileOpen}
                        aria-controls="mobile-nav-drawer"
                        aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
                        className="min-w-[44px] min-h-[44px] rounded-md border border-[#E6E8E5] bg-white text-[#0F1F1B] inline-flex items-center justify-center cursor-pointer"
                    >
                        {mobileOpen ? (
                            <X className="w-5 h-5" strokeWidth={1.75} />
                        ) : (
                            <Menu className="w-5 h-5" strokeWidth={1.75} />
                        )}
                    </button>
                </div>
            </div>

            {mobileOpen && (
                <div
                    id="mobile-nav-drawer"
                    className="md:hidden bg-[#FAFAF8] border-b border-[#E6E8E5] px-5 py-4"
                >
                    <nav aria-label="Navegação mobile" className="flex flex-col gap-1">
                        {NAV_CONTENT.links.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileOpen(false)}
                                className="min-h-[44px] px-3 rounded-md text-sm font-medium text-[#0F1F1B] hover:bg-[#F2F5F3] flex items-center justify-between"
                            >
                                <span>{link.label}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-[#4B5B56]" strokeWidth={1.75} />
                            </a>
                        ))}
                    </nav>
                    <div className="grid grid-cols-2 gap-2.5 pt-3 mt-3 border-t border-[#E6E8E5]">
                        <Link
                            href={NAV_CONTENT.loginHref}
                            onClick={() => setMobileOpen(false)}
                            className="min-h-[44px] rounded-md border border-[#E6E8E5] bg-white text-[#0F1F1B] text-sm font-medium flex items-center justify-center"
                        >
                            {NAV_CONTENT.loginLabel}
                        </Link>
                        <Link
                            href={NAV_CONTENT.primaryCtaHref}
                            onClick={() => setMobileOpen(false)}
                            className="min-h-[44px] rounded-md bg-[#155E4B] text-white text-sm font-medium flex items-center justify-center"
                        >
                            {NAV_CONTENT.primaryCtaLabel}
                        </Link>
                    </div>
                </div>
            )}
        </header>
    )
}
