'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Stethoscope, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export function LandingHeader() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                isScrolled
                    ? "bg-white/80 backdrop-blur-md shadow-sm py-4"
                    : "bg-transparent py-6"
            )}
        >
            <div className="container mx-auto px-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        isScrolled ? "bg-emerald-600 text-white" : "bg-white text-emerald-600"
                    )}>
                        <Stethoscope className="h-6 w-6" />
                    </div>
                    <span className={cn(
                        "text-2xl font-bold transition-colors",
                        isScrolled ? "text-gray-900" : "text-white"
                    )}>
                        CliniGo
                    </span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    {['Paciente', 'Médico', 'Clínica'].map((item) => (
                        <Link
                            key={item}
                            href={`/${item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-emerald-400",
                                isScrolled ? "text-gray-600" : "text-gray-200"
                            )}
                        >
                            {item}
                        </Link>
                    ))}
                    <Link
                        href="/planos"
                        className={cn(
                            "text-sm font-medium transition-colors hover:text-emerald-400",
                            isScrolled ? "text-gray-600" : "text-gray-200"
                        )}
                    >
                        Planos
                    </Link>
                </nav>

                {/* Auth Buttons */}
                <div className="hidden md:flex items-center gap-4">
                    <Link href="/login">
                        <Button
                            variant="ghost"
                            className={cn(
                                "hover:text-emerald-500",
                                isScrolled ? "text-gray-700" : "text-white hover:bg-white/10"
                            )}
                        >
                            Entrar
                        </Button>
                    </Link>
                    <Link href="/cadastro">
                        <Button
                            className={cn(
                                "font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105",
                                isScrolled
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-white text-emerald-600 hover:bg-gray-100"
                            )}
                        >
                            Começar Agora
                        </Button>
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? (
                        <X className={cn("h-6 w-6", isScrolled ? "text-gray-900" : "text-white")} />
                    ) : (
                        <Menu className={cn("h-6 w-6", isScrolled ? "text-gray-900" : "text-white")} />
                    )}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="absolute top-full left-0 right-0 bg-white border-b shadow-lg p-4 md:hidden flex flex-col gap-4 animate-in slide-in-from-top-5">
                    {['Paciente', 'Médico', 'Clínica', 'Planos'].map((item) => (
                        <Link
                            key={item}
                            href={`/${item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}
                            className="text-gray-600 font-medium py-2 hover:text-emerald-600"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            {item}
                        </Link>
                    ))}
                    <div className="border-t pt-4 flex flex-col gap-3">
                        <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start">Entrar</Button>
                        </Link>
                        <Link href="/cadastro" onClick={() => setMobileMenuOpen(false)}>
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                                Começar Agora
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </header>
    )
}
