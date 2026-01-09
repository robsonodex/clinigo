'use client'

import { useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    Stethoscope,
    User,
    Building2,
    UserCog,
    ArrowRight,
    Shield,
    Brain,
    Calendar,
    FileText,
    Sparkles
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PortalCardProps {
    href: string
    icon: React.ReactNode
    title: string
    description: string
    gradient: string
    delay?: number
}

function PortalCard({ href, icon, title, description, gradient, delay = 0 }: PortalCardProps) {
    return (
        <Link href={href} className="group block">
            <Card
                className={`
                    relative overflow-hidden border-0 shadow-lg h-full
                    transition-all duration-300 hover:shadow-2xl hover:-translate-y-2
                    ${gradient}
                `}
                style={{ animationDelay: `${delay}ms` }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-2">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                    <CardTitle className="text-xl text-white flex items-center gap-2">
                        {title}
                        <ArrowRight className="h-5 w-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription className="text-white/80">
                        {description}
                    </CardDescription>
                </CardContent>
            </Card>
        </Link>
    )
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex items-center gap-3 text-gray-600">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                {icon}
            </div>
            <span className="text-sm">{text}</span>
        </div>
    )
}

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
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
            {/* Header */}
            <header className="container mx-auto px-4 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                            <Stethoscope className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            CliniGo
                        </span>
                    </div>
                    <Link href="/login">
                        <Button variant="ghost" size="sm">
                            Entrar
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <main className="container mx-auto px-4 py-12 md:py-20">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-6">
                        <Sparkles className="h-4 w-4" />
                        Plataforma completa de teleconsultoria médica
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                        Gestão médica{' '}
                        <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            inteligente
                        </span>
                        {' '}e integrada
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 mb-8">
                        Conectamos pacientes, médicos e clínicas em uma única plataforma
                        com inteligência artificial preditiva para suporte ao diagnóstico.
                    </p>
                </div>

                {/* Portal Cards */}
                <section className="mb-20">
                    <h2 className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider mb-8">
                        Acesso ao Sistema
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        <PortalCard
                            href="/paciente/entrar"
                            icon={<User className="h-7 w-7 text-white" />}
                            title="Portal do Paciente"
                            description="Agende consultas, acesse seu histórico médico e gerencie seus atendimentos."
                            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                            delay={0}
                        />
                        <PortalCard
                            href="/login"
                            icon={<UserCog className="h-7 w-7 text-white" />}
                            title="Portal do Médico"
                            description="Acesse sua agenda, prontuários e utilize a IA para suporte diagnóstico."
                            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                            delay={100}
                        />
                        <PortalCard
                            href="/login"
                            icon={<Building2 className="h-7 w-7 text-white" />}
                            title="Portal da Clínica"
                            description="Gerencie sua clínica, equipe médica, faturamento e relatórios."
                            gradient="bg-gradient-to-br from-violet-500 to-purple-600"
                            delay={200}
                        />
                    </div>
                </section>

                {/* Features */}
                <section className="max-w-4xl mx-auto mb-20">
                    <div className="bg-white rounded-2xl shadow-lg border p-8 md:p-12">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                                    Por que escolher o CliniGo?
                                </h3>
                                <div className="space-y-4">
                                    <FeatureItem
                                        icon={<Calendar className="h-4 w-4" />}
                                        text="Agendamento online 24/7"
                                    />
                                    <FeatureItem
                                        icon={<FileText className="h-4 w-4" />}
                                        text="Prontuário eletrônico completo"
                                    />
                                    <FeatureItem
                                        icon={<Brain className="h-4 w-4" />}
                                        text="IA preditiva para diagnóstico"
                                    />
                                    <FeatureItem
                                        icon={<Shield className="h-4 w-4" />}
                                        text="100% seguro e LGPD compliant"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-center">
                                <div className="relative">
                                    <div className="w-48 h-48 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl">
                                            <div className="text-center text-white">
                                                <div className="text-3xl font-bold">AiA</div>
                                                <div className="text-xs opacity-80">Intelligence</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-400 animate-pulse" />
                                    <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-teal-400 animate-pulse" style={{ animationDelay: '500ms' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="text-center mb-16">
                    <Link href="/planos">
                        <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-200">
                            Ver Planos e Preços
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t bg-gray-50">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Stethoscope className="h-4 w-4" />
                            <span>CliniGo © 2026. Todos os direitos reservados.</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-medium bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                    Powered by AiA Predictive Intelligence
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Hidden Super Admin Access - Shield Icon at 5% opacity */}
                    <div className="mt-4 flex justify-center">
                        <Link
                            href="/dashboard/super"
                            className="opacity-[0.05] hover:opacity-100 transition-opacity duration-500"
                            title=""
                            aria-hidden="true"
                        >
                            <Shield className="h-4 w-4 text-gray-400 hover:text-red-500 transition-colors" />
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
