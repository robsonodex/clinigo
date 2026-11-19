'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ArrowLeft, ArrowRight, Menu, X } from 'lucide-react'
import { landingFontVariables } from '@/components/preview-home/fonts'
import '@/components/preview-home/preview-home.css'

const HEADER_LINKS = [
    { href: '/planos', label: 'Planos' },
    { href: '/sobre', label: 'Sobre' },
    { href: '/blog', label: 'Blog' },
    { href: '/partners', label: 'Parceiros' },
    { href: '/help', label: 'Ajuda' },
    { href: '/contato', label: 'Contato' },
] as const

const FOOTER_COLUMNS = [
    {
        title: 'Plataforma',
        links: [
            { label: 'Início', href: '/' },
            { label: 'Planos', href: '/planos' },
            { label: 'Sites para clínicas', href: '/site' },
            { label: 'Central de Ajuda', href: '/help' },
        ],
    },
    {
        title: 'Empresa',
        links: [
            { label: 'Sobre nós', href: '/sobre' },
            { label: 'Blog', href: '/blog' },
            { label: 'Programa de Parceiros', href: '/partners' },
            { label: 'Contato', href: '/contato' },
        ],
    },
    {
        title: 'Acesso',
        links: [
            { label: 'Entrar', href: '/login' },
            { label: 'Testar grátis', href: '/trial' },
            { label: 'Cadastrar clínica', href: '/cadastro' },
            { label: 'Termos de uso', href: '/termos' },
        ],
    },
] as const

export interface EditorialShellProps {
    children: React.ReactNode
    /** Modo minimalista para fluxos focados de conversão ou autenticação (ex: /trial, /partners/register). */
    minimal?: boolean
    /** Link de retorno no modo minimalista. Padrão: '/'. */
    backHref?: string
    /** Rótulo do botão de retorno no modo minimalista. */
    backLabel?: string
    /** Rótulo/link opcional de login no modo minimalista. */
    rightAction?: {
        label: string
        href: string
        accent?: boolean
    }
    /** Oculta o rodapé completo em páginas focadas (exibe rodapé compacto). */
    compactFooter?: boolean
}

export function EditorialShell({
    children,
    minimal = false,
    backHref = '/',
    backLabel = 'Voltar ao início',
    rightAction,
    compactFooter = false,
}: EditorialShellProps) {
    const pathname = usePathname()
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
        <div className={`${landingFontVariables} clinigo-editorial min-h-screen flex flex-col overflow-x-clip`}>
            <header
                className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
                    scrolled
                        ? 'bg-[#FAFAF8]/95 backdrop-blur-md border-b border-[#E6E8E5]'
                        : 'bg-[#FAFAF8]/88 backdrop-blur-sm border-b border-[#E6E8E5]/70'
                }`}
            >
                <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
                    <Link
                        href="/"
                        onClick={() => setMobileOpen(false)}
                        className="inline-flex items-center shrink-0 py-1 min-h-[44px]"
                        aria-label="CliniGo — página inicial"
                    >
                        <Image
                            src="/logo_black.svg"
                            alt="CliniGo"
                            width={148}
                            height={48}
                            priority
                            unoptimized
                            className="h-[42px] sm:h-[46px] w-auto object-contain"
                        />
                    </Link>

                    {minimal ? (
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            <Link
                                href={backHref}
                                className="min-h-[44px] px-3 rounded-md text-xs sm:text-sm font-medium text-[#4B5B56] hover:text-[#0F1F1B] hover:bg-[#F2F5F3] transition-colors inline-flex items-center gap-1.5"
                            >
                                <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
                                <span className="hidden sm:inline">{backLabel}</span>
                                <span className="sm:hidden">Voltar</span>
                            </Link>
                            {rightAction && (
                                <Link
                                    href={rightAction.href}
                                    className={`min-h-[44px] px-4 rounded-md text-xs sm:text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5 ${
                                        rightAction.accent
                                            ? 'bg-[#155E4B] hover:bg-[#0F493A] text-white'
                                            : 'border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-[#0F1F1B]'
                                    }`}
                                >
                                    {rightAction.label}
                                </Link>
                            )}
                        </div>
                    ) : (
                        <>
                            <nav aria-label="Navegação principal" className="hidden lg:flex items-center gap-7 text-sm text-[#4B5B56]">
                                {HEADER_LINKS.map((link) => {
                                    const active = pathname === link.href || (link.href !== '/' && pathname?.startsWith(`${link.href}/`))
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className={`font-medium transition-colors py-1 ${
                                                active
                                                    ? 'text-[#155E4B] font-semibold'
                                                    : 'hover:text-[#0F1F1B]'
                                            }`}
                                        >
                                            {link.label}
                                        </Link>
                                    )
                                })}
                            </nav>

                            <div className="hidden lg:flex items-center gap-2 shrink-0">
                                <Link
                                    href="/login"
                                    className="min-h-[40px] px-4 rounded-md text-sm font-medium text-[#0F1F1B] hover:bg-[#F2F5F3] transition-colors inline-flex items-center justify-center"
                                >
                                    Entrar
                                </Link>
                                <Link
                                    href="/trial"
                                    className="min-h-[40px] px-4 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5 group"
                                >
                                    Começar agora
                                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
                                </Link>
                            </div>

                            <div className="flex lg:hidden items-center gap-2">
                                <Link
                                    href="/login"
                                    className="min-h-[44px] px-3.5 rounded-md border border-[#E6E8E5] bg-white text-[#0F1F1B] text-xs font-semibold inline-flex items-center justify-center"
                                >
                                    Entrar
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => setMobileOpen((v) => !v)}
                                    aria-expanded={mobileOpen}
                                    aria-controls="editorial-mobile-nav"
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
                        </>
                    )}
                </div>

                {!minimal && mobileOpen && (
                    <div
                        id="editorial-mobile-nav"
                        className="lg:hidden bg-[#FAFAF8] border-b border-[#E6E8E5] px-5 py-4"
                    >
                        <nav aria-label="Navegação mobile" className="flex flex-col gap-1">
                            {HEADER_LINKS.map((link) => {
                                const active = pathname === link.href || pathname?.startsWith(`${link.href}/`)
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setMobileOpen(false)}
                                        className={`min-h-[44px] px-3 rounded-md text-sm font-medium flex items-center justify-between ${
                                            active
                                                ? 'bg-[#E6F2EE] text-[#114D3E] font-semibold'
                                                : 'text-[#0F1F1B] hover:bg-[#F2F5F3]'
                                        }`}
                                    >
                                        <span>{link.label}</span>
                                        <ArrowRight className="w-3.5 h-3.5 text-[#4B5B56]" strokeWidth={1.75} />
                                    </Link>
                                )
                            })}
                        </nav>
                        <div className="grid grid-cols-2 gap-2.5 pt-3 mt-3 border-t border-[#E6E8E5]">
                            <Link
                                href="/login"
                                onClick={() => setMobileOpen(false)}
                                className="min-h-[44px] rounded-md border border-[#E6E8E5] bg-white text-[#0F1F1B] text-sm font-medium flex items-center justify-center"
                            >
                                Entrar
                            </Link>
                            <Link
                                href="/trial"
                                onClick={() => setMobileOpen(false)}
                                className="min-h-[44px] rounded-md bg-[#155E4B] text-white text-sm font-medium flex items-center justify-center"
                            >
                                Testar grátis
                            </Link>
                        </div>
                    </div>
                )}
            </header>

            <div className="flex-1 pt-16 flex flex-col">
                {children}
            </div>

            {compactFooter ? (
                <footer className="bg-white border-t border-[#E6E8E5] py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                    <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#4B5B56]">
                        <span>© 2026 CliniGo. Todos os direitos reservados.</span>
                        <div className="flex items-center gap-5">
                            <Link href="/termos" className="hover:text-[#0F1F1B] transition-colors py-1">
                                Termos de uso
                            </Link>
                            <Link href="/help" className="hover:text-[#0F1F1B] transition-colors py-1">
                                Ajuda
                            </Link>
                            <Link href="/contato" className="hover:text-[#0F1F1B] transition-colors py-1">
                                Contato
                            </Link>
                        </div>
                    </div>
                </footer>
            ) : (
                <footer className="bg-white border-t border-[#E6E8E5] text-sm pb-[max(2rem,env(safe-area-inset-bottom))]">
                    <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-14 pb-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12">
                            <div className="col-span-2 md:col-span-1">
                                <Link href="/" className="inline-block mb-4" aria-label="CliniGo — página inicial">
                                    <Image
                                        src="/logo_black.svg"
                                        alt="CliniGo"
                                        width={148}
                                        height={48}
                                        unoptimized
                                        className="h-[44px] w-auto object-contain"
                                    />
                                </Link>
                                <p className="text-xs sm:text-sm text-[#4B5B56] leading-relaxed">
                                    Plataforma operacional e clínica para clínicas de terapias multidisciplinares: Psicologia, ABA, Fonoaudiologia, Terapia Ocupacional, Psicomotricidade e Fisioterapia.
                                </p>
                            </div>

                            {FOOTER_COLUMNS.map((col) => (
                                <div key={col.title}>
                                    <h3 className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F1F1B] mb-4">
                                        {col.title}
                                    </h3>
                                    <ul className="space-y-2.5 text-sm text-[#4B5B56]">
                                        {col.links.map((link) => (
                                            <li key={link.label}>
                                                <Link
                                                    href={link.href}
                                                    className="hover:text-[#0F1F1B] transition-colors"
                                                >
                                                    {link.label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        <div className="pt-6 border-t border-[#E6E8E5] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#4B5B56]">
                            <span>© 2026 CliniGo. Todos os direitos reservados.</span>
                            <a
                                href="https://nodexsolucoes.com.br"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
                            >
                                <span>Desenvolvido por</span>
                                <Image
                                    src="/nodex-logo.png"
                                    alt="Nodex Soluções"
                                    width={76}
                                    height={22}
                                    className="h-5 w-auto rounded bg-[#0F1F1B] px-1.5 py-0.5"
                                />
                            </a>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    )
}

