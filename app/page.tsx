'use client'

import { useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Stethoscope, Shield } from 'lucide-react'

// Landing page sections
import { HeroSection } from '@/components/landing/hero-section'
import { LandingHeader } from '@/components/landing/landing-header'
import { CredibilityBar } from '@/components/landing/credibility-bar'
import { ProblemSolutionSection } from '@/components/landing/problem-solution-section'
import { DemoSection } from '@/components/landing/demo-section'
import { SocialProofSection } from '@/components/landing/social-proof-section'
import { ComparisonSection } from '@/components/landing/comparison-section'
import { FAQSection } from '@/components/landing/faq-section'
import { WhatsAppFloatingButton } from '@/components/landing/whatsapp-floating-button'

export default function LandingPage() {
    const router = useRouter()

    // Secret Super Admin shortcut: Ctrl+Shift+A
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            e.preventDefault()
            router.push('/system-master-hub')
        }
    }, [router])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    return (
        <div className="min-h-screen">
            {/* Header */}
            <LandingHeader />

            {/* Floating WhatsApp Button */}
            <WhatsAppFloatingButton />

            {/* Hero Section */}
            <HeroSection />

            {/* Credibility Bar */}
            <CredibilityBar />

            {/* Problem → Solution */}
            <ProblemSolutionSection />

            {/* Demo Section */}
            <DemoSection />

            {/* Social Proof */}
            <SocialProofSection />

            {/* Before/After Comparison */}
            <ComparisonSection />

            {/* FAQ */}
            <FAQSection />

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-emerald-600 to-teal-600">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
                        Pronto para transformar sua clínica?
                    </h2>
                    <p className="text-xl text-emerald-100 mb-10 max-w-2xl mx-auto">
                        Junte-se a mais de 500 clínicas que já faturam mais com menos trabalho.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/cadastro"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-emerald-600 font-bold text-lg hover:bg-gray-100 transition-all duration-300 hover:scale-105 shadow-lg"
                        >
                            Começar Teste Grátis
                        </Link>
                        <Link
                            href="/planos"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-500/30 text-white font-semibold text-lg hover:bg-emerald-500/50 transition-all border border-white/30"
                        >
                            Ver Planos e Preços
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t bg-gray-900 text-gray-300">
                <div className="container mx-auto px-4 py-12">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        {/* Logo & Description */}
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                                    <Stethoscope className="h-5 w-5 text-white" />
                                </div>
                                <span className="text-xl font-bold text-white">
                                    CliniGo
                                </span>
                            </div>
                            <p className="text-gray-400 max-w-sm">
                                A plataforma de gestão médica mais completa do Brasil.
                                Agendamento online, prontuário eletrônico e IA para triagem e otimização.
                            </p>
                        </div>

                        {/* Links */}
                        <div>
                            <h4 className="font-semibold text-white mb-4">Produto</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li><Link href="/planos" className="hover:text-white transition-colors">Planos</Link></li>
                                <li><Link href="/cadastro" className="hover:text-white transition-colors">Cadastrar</Link></li>
                                <li><Link href="/login" className="hover:text-white transition-colors">Entrar</Link></li>
                            </ul>
                        </div>

                        {/* Contact */}
                        <div>
                            <h4 className="font-semibold text-white mb-4">Contato</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li>
                                    <a
                                        href="https://wa.me/5521965532247"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-white transition-colors"
                                    >
                                        WhatsApp
                                    </a>
                                </li>
                                <li className="text-sm">Rio de Janeiro, RJ</li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom */}
                    <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Stethoscope className="h-4 w-4" />
                            <span>CliniGo © 2026. Todos os direitos reservados.</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border border-emerald-700/30">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-medium text-emerald-400">
                                Powered by AiA Predictive Intelligence
                            </span>
                        </div>
                    </div>

                    {/* Hidden Super Admin Access */}
                    <div className="mt-4 flex justify-center">
                        <Link
                            href="/dashboard/super"
                            className="opacity-[0.02] hover:opacity-100 transition-opacity duration-500"
                            title=""
                            aria-hidden="true"
                        >
                            <Shield className="h-4 w-4 text-gray-600 hover:text-red-500 transition-colors" />
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
