'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useClinicTheme } from './ThemeProvider'
import {
    Instagram,
    Facebook,
    Linkedin,
    Youtube,
    MapPin,
    Phone,
    Mail,
    Heart
} from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface SocialLinks {
    instagram?: string | null
    facebook?: string | null
    linkedin?: string | null
    youtube?: string | null
}

interface CustomFooterProps {
    clinicName: string
    clinicSlug: string
    logoUrl?: string | null
    address?: string | null
    phone?: string | null
    email?: string | null
    socialLinks?: SocialLinks
}

// =============================================================================
// Component
// =============================================================================

export function CustomFooter({
    clinicName,
    clinicSlug,
    logoUrl,
    address,
    phone,
    email,
    socialLinks = {}
}: CustomFooterProps) {
    const { theme, showBranding } = useClinicTheme()
    const currentYear = new Date().getFullYear()

    const quickLinks = [
        { href: `/${clinicSlug}`, label: 'Início' },
        { href: `/${clinicSlug}/agendar`, label: 'Agendar Consulta' },
        { href: `/${clinicSlug}#especialidades`, label: 'Especialidades' },
        { href: `/${clinicSlug}#medicos`, label: 'Médicos' },
        { href: `/${clinicSlug}#localizacao`, label: 'Localização' },
        { href: `/${clinicSlug}#faq`, label: 'Dúvidas' },
    ]

    const hasSocialLinks = Object.values(socialLinks).some(v => v)

    return (
        <footer className="bg-gray-900 text-white">
            {/* Main Footer */}
            <div className="container mx-auto px-4 py-12 md:py-16">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">

                    {/* Brand Column */}
                    <div className="lg:col-span-1">
                        {logoUrl ? (
                            <Image
                                src={logoUrl}
                                alt={clinicName}
                                width={160}
                                height={50}
                                className="h-10 w-auto object-contain brightness-0 invert mb-4"
                            />
                        ) : (
                            <h3
                                className="text-xl font-bold mb-4"
                                style={{ color: theme.colors.primary }}
                            >
                                {clinicName}
                            </h3>
                        )}
                        <p className="text-gray-400 text-sm leading-relaxed mb-6">
                            Cuidando da sua saúde com excelência e dedicação.
                            Agende sua consulta e receba o atendimento que você merece.
                        </p>

                        {/* Social Links */}
                        {hasSocialLinks && (
                            <div className="flex gap-3">
                                {socialLinks.instagram && (
                                    <a
                                        href={socialLinks.instagram}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
                                    >
                                        <Instagram className="w-5 h-5" />
                                    </a>
                                )}
                                {socialLinks.facebook && (
                                    <a
                                        href={socialLinks.facebook}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
                                    >
                                        <Facebook className="w-5 h-5" />
                                    </a>
                                )}
                                {socialLinks.linkedin && (
                                    <a
                                        href={socialLinks.linkedin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
                                    >
                                        <Linkedin className="w-5 h-5" />
                                    </a>
                                )}
                                {socialLinks.youtube && (
                                    <a
                                        href={socialLinks.youtube}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
                                    >
                                        <Youtube className="w-5 h-5" />
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-semibold mb-4 text-white">Links Rápidos</h4>
                        <ul className="space-y-3">
                            {quickLinks.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-gray-400 hover:text-white text-sm transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="font-semibold mb-4 text-white">Contato</h4>
                        <ul className="space-y-4">
                            {address && (
                                <li className="flex gap-3">
                                    <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                    <span className="text-gray-400 text-sm">{address}</span>
                                </li>
                            )}
                            {phone && (
                                <li className="flex gap-3">
                                    <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                    <a
                                        href={`tel:${phone}`}
                                        className="text-gray-400 text-sm hover:text-white transition-colors"
                                    >
                                        {phone}
                                    </a>
                                </li>
                            )}
                            {email && (
                                <li className="flex gap-3">
                                    <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                    <a
                                        href={`mailto:${email}`}
                                        className="text-gray-400 text-sm hover:text-white transition-colors"
                                    >
                                        {email}
                                    </a>
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="font-semibold mb-4 text-white">Legal</h4>
                        <ul className="space-y-3">
                            <li>
                                <Link
                                    href="/termos"
                                    className="text-gray-400 hover:text-white text-sm transition-colors"
                                >
                                    Termos de Uso
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/privacidade"
                                    className="text-gray-400 hover:text-white text-sm transition-colors"
                                >
                                    Política de Privacidade
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/lgpd"
                                    className="text-gray-400 hover:text-white text-sm transition-colors"
                                >
                                    LGPD
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-800">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Copyright */}
                        <p className="text-gray-400 text-sm">
                            © {currentYear} {clinicName}. Todos os direitos reservados.
                        </p>

                        {/* Powered By (only if branding should show) */}
                        {showBranding && (
                            <a
                                href="https://clinigo.app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
                            >
                                <span>Powered by</span>
                                <span
                                    className="font-semibold"
                                    style={{ color: theme.colors.primary }}
                                >
                                    CliniGo
                                </span>
                                <Heart className="w-3 h-3" style={{ color: theme.colors.accent }} />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </footer>
    )
}
