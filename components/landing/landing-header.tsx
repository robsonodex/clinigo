'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X, Stethoscope, Building2, UserRound, Users, ChevronDown, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navLinks = [
    { label: 'Funcionalidades', href: '#funcionalidades' },
    { label: 'Planos', href: '/planos' },
    { label: 'Contato', href: 'mailto:contato@clinigo.app' },
]

const loginPortals = [
    { label: 'Login Clínica', href: '/clinica', icon: Building2, description: 'Administradores' },
    { label: 'Login Médico', href: '/medico', icon: UserRound, description: 'Profissionais de saúde' },
    { label: 'Login Paciente', href: '/paciente', icon: Users, description: 'Pacientes cadastrados' },
    { label: 'Super Admin', href: '/login', icon: Shield, description: 'Painel de gestão' },
]

export function LandingHeader() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
                ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200'
                : 'bg-transparent'
                }`}
        >
            <div className="container mx-auto px-4">
                <div className="h-20 flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${isScrolled ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20' : 'bg-white/20 backdrop-blur-sm'}`}>
                            <Stethoscope className="h-5 w-5 text-white" />
                        </div>
                        <span className={`text-xl font-bold ${isScrolled ? 'text-slate-900' : 'text-white'}`}>
                            CliniGo
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`font-medium transition-colors ${isScrolled
                                    ? 'text-slate-600 hover:text-emerald-600'
                                    : 'text-white/90 hover:text-white'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Desktop CTA */}
                    <div className="hidden md:flex items-center gap-4">
                        {/* Login Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className={isScrolled ? 'text-slate-600' : 'text-white hover:bg-white/10'}
                                >
                                    Entrar
                                    <ChevronDown className="ml-1 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                {loginPortals.map((portal) => (
                                    <DropdownMenuItem key={portal.href} asChild>
                                        <Link href={portal.href} className="flex items-center gap-3 cursor-pointer">
                                            <portal.icon className="h-4 w-4 text-emerald-600" />
                                            <div>
                                                <div className="font-medium">{portal.label}</div>
                                                <div className="text-xs text-muted-foreground">{portal.description}</div>
                                            </div>
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Link href="/cadastro">
                            <Button
                                className={`shadow-lg font-semibold ${isScrolled
                                    ? 'btn-premium'
                                    : 'bg-white text-emerald-700 hover:bg-emerald-50'
                                    }`}
                            >
                                Começar grátis
                            </Button>
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? (
                            <X className={`h-6 w-6 ${isScrolled ? 'text-slate-700' : 'text-white'}`} />
                        ) : (
                            <Menu className={`h-6 w-6 ${isScrolled ? 'text-slate-700' : 'text-white'}`} />
                        )}
                    </button>
                </div>


                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden absolute top-20 left-0 right-0 bg-white border-b border-slate-200 shadow-lg p-4 space-y-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="block py-2 text-slate-600 font-medium"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}

                        {/* Mobile Login Portals */}
                        <div className="pt-4 border-t border-slate-200 space-y-2">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Portais de Acesso</p>
                            {loginPortals.map((portal) => (
                                <Link
                                    key={portal.href}
                                    href={portal.href}
                                    className="flex items-center gap-3 py-2 text-slate-600"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <portal.icon className="h-4 w-4 text-emerald-600" />
                                    <span>{portal.label}</span>
                                </Link>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-slate-200">
                            <Link href="/cadastro" className="block">
                                <Button variant="premium" className="w-full">
                                    Começar grátis
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </header>
    )
}
