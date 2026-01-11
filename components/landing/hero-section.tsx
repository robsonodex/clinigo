'use client'

import Link from 'next/link'
import { ArrowRight, Play, MessageCircle, CheckCircle, Shield, CreditCard, Headphones } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function HeroSection() {
    return (
        <section className="relative min-h-[100vh] flex items-center overflow-hidden pt-20">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900" />

            {/* Animated mesh overlay */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 -left-4 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
                <div className="absolute top-0 -right-4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute -bottom-8 left-20 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
            </div>

            {/* Grid pattern overlay */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
            />

            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-emerald-300 text-sm font-medium mb-8 animate-fade-in">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        +500 clínicas já usam CliniGo no Rio de Janeiro
                    </div>

                    {/* Main Headline */}
                    <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-tight animate-fade-in-up">
                        Sua clínica fatura{' '}
                        <span className="relative">
                            <span className="relative z-10 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                                40% mais
                            </span>
                            <span className="absolute bottom-2 left-0 right-0 h-3 bg-emerald-500/30 -rotate-1 rounded" />
                        </span>
                        {' '}com agendamento online inteligente
                    </h1>

                    {/* Subheadline */}
                    <p className="text-lg md:text-xl lg:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
                        Seus pacientes agendam consultas{' '}
                        <span className="text-white font-semibold">24 horas por dia</span>
                        e recebem confirmação automática.
                        <span className="text-emerald-400 font-semibold"> Sem secretária. Sem telefonemas.</span>
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 animate-fade-in-up animation-delay-400">
                        <Link href="/cadastro">
                            <Button
                                size="lg"
                                className={cn(
                                    "h-14 px-8 text-lg font-semibold gap-2",
                                    "bg-gradient-to-r from-emerald-500 to-teal-500",
                                    "hover:from-emerald-600 hover:to-teal-600",
                                    "shadow-lg shadow-emerald-500/30",
                                    "transition-all duration-300 hover:scale-105",
                                    "animate-pulse-subtle"
                                )}
                            >
                                <Play className="h-5 w-5 fill-current" />
                                Teste Grátis por 14 dias
                            </Button>
                        </Link>

                        <a
                            href="https://wa.me/5521965532247?text=Olá!%20Quero%20saber%20mais%20sobre%20o%20CliniGo"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button
                                size="lg"
                                variant="outline"
                                className={cn(
                                    "h-14 px-8 text-lg font-semibold gap-2",
                                    "bg-white/10 border-white/30 text-white",
                                    "hover:bg-white/20 hover:border-white/50",
                                    "backdrop-blur-sm",
                                    "transition-all duration-300"
                                )}
                            >
                                <MessageCircle className="h-5 w-5" />
                                Falar com Especialista
                            </Button>
                        </a>
                    </div>

                    {/* Trust badges */}
                    <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-emerald-50/90 animate-fade-in-up animation-delay-600 font-medium">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-emerald-400" />
                            <span>Sem cartão de crédito</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-400" />
                            <span>Cancele quando quiser</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Headphones className="h-4 w-4 text-emerald-400" />
                            <span>Suporte em português</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />



            {/* Custom animations */}
            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes fade-in-up {
                    from { 
                        opacity: 0; 
                        transform: translateY(30px);
                    }
                    to { 
                        opacity: 1; 
                        transform: translateY(0);
                    }
                }

                @keyframes blob {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(20px, -30px) scale(1.1); }
                    50% { transform: translate(-20px, 20px) scale(0.9); }
                    75% { transform: translate(30px, 30px) scale(1.05); }
                }

                @keyframes pulse-subtle {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
                    50% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
                }

                @keyframes scroll-down {
                    0%, 100% { opacity: 1; transform: translateY(0); }
                    50% { opacity: 0.5; transform: translateY(4px); }
                }

                :global(.animate-fade-in) {
                    animation: fade-in 0.6s ease-out forwards;
                }

                :global(.animate-fade-in-up) {
                    animation: fade-in-up 0.8s ease-out forwards;
                }

                :global(.animate-blob) {
                    animation: blob 7s infinite;
                }

                :global(.animate-pulse-subtle) {
                    animation: pulse-subtle 2s ease-in-out infinite;
                }

                :global(.animate-scroll-down) {
                    animation: scroll-down 1.5s ease-in-out infinite;
                }

                :global(.animation-delay-200) {
                    animation-delay: 0.2s;
                    opacity: 0;
                }

                :global(.animation-delay-400) {
                    animation-delay: 0.4s;
                    opacity: 0;
                }

                :global(.animation-delay-600) {
                    animation-delay: 0.6s;
                    opacity: 0;
                }

                :global(.animation-delay-2000) {
                    animation-delay: 2s;
                }

                :global(.animation-delay-4000) {
                    animation-delay: 4s;
                }
            `}</style>
        </section>
    )
}
