'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Play, CheckCircle, Calendar, Users, TrendingUp, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function HeroSection() {
    return (
        <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-b from-emerald-50/50 via-white to-white pt-20">
            {/* Subtle animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-float" />
                <div className="absolute bottom-20 left-10 w-96 h-96 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float-delayed" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left Content */}
                    <div className="max-w-xl animate-fade-in-left">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-6 animate-fade-in">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                            </span>
                            +500 clínicas no Rio de Janeiro
                        </div>

                        {/* Main Headline */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                            Gestão completa para{' '}
                            <span className="relative inline-block">
                                <span className="relative z-10 text-emerald-600">sua clínica</span>
                                <span className="absolute bottom-1 left-0 right-0 h-3 bg-emerald-200/60 -rotate-1 rounded" />
                            </span>{' '}
                            médica
                        </h1>

                        {/* Subheadline */}
                        <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
                            Agendamento online, prontuário eletrônico e gestão financeira integrada.
                            Tudo que sua clínica precisa em um só lugar.
                        </p>

                        {/* Feature checkmarks */}
                        <div className="grid grid-cols-2 gap-3 mb-8">
                            {[
                                { icon: Calendar, text: 'Agenda online 24h' },
                                { icon: Users, text: 'Sem overbooking' },
                                { icon: TrendingUp, text: 'Relatórios completos' },
                                { icon: Clock, text: 'Economia de tempo' },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2 text-gray-700 animate-fade-in-up"
                                    style={{ animationDelay: `${i * 100}ms` }}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <item.icon className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    <span className="text-sm font-medium">{item.text}</span>
                                </div>
                            ))}
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <Link href="/cadastro">
                                <Button
                                    size="lg"
                                    className={cn(
                                        "h-14 px-8 text-lg font-semibold gap-2 w-full sm:w-auto",
                                        "bg-gradient-to-r from-emerald-600 to-teal-600",
                                        "hover:from-emerald-700 hover:to-teal-700",
                                        "shadow-lg shadow-emerald-500/25",
                                        "transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                                    )}
                                >
                                    Teste Grátis 7 Dias
                                    <ArrowRight className="h-5 w-5" />
                                </Button>
                            </Link>

                            <Link href="/demo">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className={cn(
                                        "h-14 px-8 text-lg font-semibold gap-2 w-full sm:w-auto",
                                        "border-2 border-emerald-200 text-emerald-700",
                                        "hover:bg-emerald-50 hover:border-emerald-300",
                                        "transition-all duration-300"
                                    )}
                                >
                                    <Play className="h-5 w-5" />
                                    Ver Demonstração
                                </Button>
                            </Link>
                        </div>

                        {/* Trust text */}
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            Sem cartão de crédito • Cancele quando quiser
                        </p>
                    </div>

                    {/* Right - Dashboard Preview */}
                    <div className="relative lg:pl-8 animate-fade-in-right">
                        <div className="relative">
                            {/* Main dashboard mockup */}
                            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-float-slow">
                                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 h-3" />
                                <div className="p-4">
                                    {/* Stats cards */}
                                    <div className="grid grid-cols-4 gap-3 mb-4">
                                        {[
                                            { label: 'Hoje', value: '547', color: 'blue' },
                                            { label: 'Confirmadas', value: '0', color: 'green' },
                                            { label: 'Agend. Hoje', value: '0', color: 'yellow' },
                                            { label: 'Faturado', value: 'R$ 0', color: 'purple' },
                                        ].map((stat, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "rounded-xl p-3 text-center",
                                                    stat.color === 'blue' && "bg-blue-50",
                                                    stat.color === 'green' && "bg-emerald-50",
                                                    stat.color === 'yellow' && "bg-amber-50",
                                                    stat.color === 'purple' && "bg-purple-50",
                                                )}
                                            >
                                                <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                                                <div className="text-xs text-gray-500">{stat.label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Placeholder content */}
                                    <div className="space-y-3">
                                        <div className="h-20 bg-gray-100 rounded-lg animate-pulse-subtle" />
                                        <div className="grid grid-cols-4 gap-3">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div key={i} className="h-24 bg-gray-50 rounded-lg border border-gray-100" />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating notification card */}
                            <div className="absolute -left-4 top-1/4 bg-white rounded-xl shadow-lg p-3 border border-gray-100 animate-bounce-subtle">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">Nova consulta!</p>
                                        <p className="text-xs text-gray-500">Agendada agora</p>
                                    </div>
                                </div>
                            </div>

                            {/* Floating stats badge */}
                            <div className="absolute -right-2 bottom-1/4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-lg px-4 py-2 animate-bounce-subtle-delayed">
                                <div className="text-center">
                                    <div className="text-2xl font-bold">97%</div>
                                    <div className="text-xs opacity-90">Satisfação</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom animations */}
            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes fade-in-left {
                    from { 
                        opacity: 0; 
                        transform: translateX(-30px);
                    }
                    to { 
                        opacity: 1; 
                        transform: translateX(0);
                    }
                }

                @keyframes fade-in-right {
                    from { 
                        opacity: 0; 
                        transform: translateX(30px);
                    }
                    to { 
                        opacity: 1; 
                        transform: translateX(0);
                    }
                }

                @keyframes fade-in-up {
                    from { 
                        opacity: 0; 
                        transform: translateY(20px);
                    }
                    to { 
                        opacity: 1; 
                        transform: translateY(0);
                    }
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(2deg); }
                }

                @keyframes float-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }

                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }

                @keyframes pulse-subtle {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 0.8; }
                }

                :global(.animate-fade-in) {
                    animation: fade-in 0.6s ease-out forwards;
                }

                :global(.animate-fade-in-left) {
                    animation: fade-in-left 0.8s ease-out forwards;
                }

                :global(.animate-fade-in-right) {
                    animation: fade-in-right 0.8s ease-out forwards;
                    animation-delay: 0.2s;
                    opacity: 0;
                }

                :global(.animate-fade-in-up) {
                    animation: fade-in-up 0.6s ease-out forwards;
                    opacity: 0;
                }

                :global(.animate-float) {
                    animation: float 8s ease-in-out infinite;
                }

                :global(.animate-float-delayed) {
                    animation: float 8s ease-in-out infinite;
                    animation-delay: 2s;
                }

                :global(.animate-float-slow) {
                    animation: float-slow 6s ease-in-out infinite;
                }

                :global(.animate-bounce-subtle) {
                    animation: bounce-subtle 3s ease-in-out infinite;
                }

                :global(.animate-bounce-subtle-delayed) {
                    animation: bounce-subtle 3s ease-in-out infinite;
                    animation-delay: 1.5s;
                }

                :global(.animate-pulse-subtle) {
                    animation: pulse-subtle 2s ease-in-out infinite;
                }
            `}</style>
        </section>
    )
}
