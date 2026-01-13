'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useClinicTheme } from './ThemeProvider'
import { Search, Menu, X, Calendar, Phone, Video } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface DynamicHeaderProps {
    clinicName: string
    clinicSlug: string
    logoUrl?: string | null
    phone?: string | null
}

// =============================================================================
// Component
// =============================================================================

export function DynamicHeader({
    clinicName,
    clinicSlug,
    logoUrl,
    phone
}: DynamicHeaderProps) {
    const { theme } = useClinicTheme()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)

    const navLinks = [
        { href: `/${clinicSlug}`, label: 'Início' },
        { href: `/${clinicSlug}#especialidades`, label: 'Especialidades' },
        { href: `/${clinicSlug}#medicos`, label: 'Médicos' },
        { href: `/${clinicSlug}#localizacao`, label: 'Localização' },
        { href: `/${clinicSlug}#contato`, label: 'Contato' },
    ]

    return (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b shadow-sm">
            <div className="container mx-auto px-4">
                <div className="h-16 md:h-20 flex items-center justify-between gap-4">

                    {/* Logo */}
                    <Link
                        href={`/${clinicSlug}`}
                        className="flex items-center gap-3 flex-shrink-0 transition-opacity hover:opacity-90"
                    >
                        {logoUrl ? (
                            <Image
                                src={logoUrl}
                                alt={clinicName}
                                width={160}
                                height={50}
                                className="h-10 md:h-12 w-auto object-contain"
                            />
                        ) : (
                            <span
                                className="text-xl md:text-2xl font-bold font-theme-heading"
                                style={{ color: theme.colors.primary }}
                            >
                                {clinicName}
                            </span>
                        )}
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-sm font-medium text-gray-600 hover:text-theme-primary transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-3">
                        {/* Search */}
                        {searchOpen ? (
                            <div className="flex items-center gap-2 animate-in slide-in-from-right-5">
                                <Input
                                    placeholder="Buscar médico ou especialidade..."
                                    className="w-64 h-9"
                                    autoFocus
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSearchOpen(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSearchOpen(true)}
                                className="text-gray-500"
                            >
                                <Search className="w-5 h-5" />
                            </Button>
                        )}

                        {/* Phone */}
                        {phone && (
                            <a href={`tel:${phone}`} className="hidden xl:flex items-center gap-2 text-sm text-gray-600 hover:text-theme-primary">
                                <Phone className="w-4 h-4" />
                                <span>{phone}</span>
                            </a>
                        )}

                        {/* Teleconsulta CTA */}
                        <Link href={`/${clinicSlug}/agendar`}>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-theme-primary text-theme-primary hover:bg-theme-primary hover:text-white"
                            >
                                <Video className="w-4 h-4 mr-2" />
                                Teleconsulta
                            </Button>
                        </Link>

                        {/* Primary CTA */}
                        <Link href={`/${clinicSlug}/agendar`}>
                            <Button
                                size="sm"
                                className="btn-theme-primary"
                                style={{ backgroundColor: theme.colors.primary }}
                            >
                                <Calendar className="w-4 h-4 mr-2" />
                                {typeof theme.hero.cta_text === 'string' && theme.hero.cta_text ? theme.hero.cta_text : 'Agendar Consulta'}
                            </Button>
                        </Link>
                    </div>

                    {/* Mobile CTA + Menu */}
                    <div className="flex lg:hidden items-center gap-2">
                        <Link href={`/${clinicSlug}/agendar`}>
                            <Button
                                size="sm"
                                className="btn-theme-primary"
                                style={{ backgroundColor: theme.colors.primary }}
                            >
                                <Calendar className="w-4 h-4 mr-1" />
                                <span className="hidden sm:inline">Agendar</span>
                            </Button>
                        </Link>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? (
                                <X className="w-6 h-6" />
                            ) : (
                                <Menu className="w-6 h-6" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <nav className="lg:hidden py-4 border-t animate-in slide-in-from-top-5">
                        <div className="flex flex-col gap-2">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="py-2 px-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            ))}

                            {phone && (
                                <a
                                    href={`tel:${phone}`}
                                    className="py-2 px-3 text-gray-600 hover:bg-gray-50 rounded-lg flex items-center gap-2"
                                >
                                    <Phone className="w-4 h-4" />
                                    {phone}
                                </a>
                            )}

                            <div className="pt-2 border-t mt-2">
                                <Link href={`/${clinicSlug}/agendar`}>
                                    <Button
                                        className="w-full btn-theme-primary"
                                        style={{ backgroundColor: theme.colors.primary }}
                                    >
                                        <Video className="w-4 h-4 mr-2" />
                                        Teleconsulta
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </nav>
                )}
            </div>
        </header>
    )
}
