'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
    FileSpreadsheet,
    QrCode,
    ShieldCheck,
    Database,
    Server,
    Zap,
    Check,
    ArrowRight,
    Activity,
    Calendar,
    DollarSign,
    Users,
    BarChart3,
    Settings,
    ChevronRight
} from 'lucide-react'
import './landing-v3.css'

// ============================================================================
// DESIGN SYSTEM
// ============================================================================
const colors = {
    primaryDeep: '#08331E',
    primaryAccent: '#10B981',
    bgPure: '#FFFFFF',
    surfaceMuted: '#F9FAFB',
    borderLight: '#E5E7EB',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
}

// ============================================================================
// DATA
// ============================================================================
const differentials = [
    {
        icon: FileSpreadsheet,
        title: 'Faturamento TISS 4.02 Nativo',
        description: 'Diferente de integradores, o CliniGo gera o XML pronto para as operadoras diretamente do banco de dados Professional.',
        highlight: 'Sem intermediários',
    },
    {
        icon: QrCode,
        title: 'Check-in Autônomo via QR Code',
        description: 'Redução de 40% na fila da recepção com pré-cadastro público integrado ao fluxo de chegada.',
        highlight: '-40% tempo de espera',
    },
    {
        icon: ShieldCheck,
        title: 'Privacidade nível Banco (RLS)',
        description: 'Isolamento físico de dados entre clínicas no PostgreSQL, garantindo conformidade total com a LGPD.',
        highlight: 'LGPD Compliant',
    },
]

const plans = [
    {
        name: 'STARTER',
        price: 'R$ 149',
        target: 'Para médicos solo',
        features: [
            'Teleconsulta WebRTC HD',
            'Agenda anti-overbooking',
            'Prontuário eletrônico básico',
            'Check-in QR Code',
        ],
        cta: 'Iniciar teste grátis',
        href: '/cadastro',
    },
    {
        name: 'BASIC',
        price: 'R$ 299',
        target: 'Para clínicas em expansão',
        features: [
            'Tudo do Starter +',
            'Gestão Financeira completa',
            'CRM de Pacientes',
            'Relatórios avançados',
        ],
        cta: 'Iniciar teste grátis',
        href: '/cadastro',
    },
    {
        name: 'PROFESSIONAL',
        price: 'R$ 549',
        target: 'O padrão ouro',
        features: [
            'Tudo do Basic +',
            'Geração de XML TISS 4.02',
            'SMTP próprio para emails',
            'API dedicada',
        ],
        recommended: true,
        cta: 'Iniciar teste grátis',
        href: '/cadastro',
    },
    {
        name: 'ENTERPRISE',
        price: 'R$ 799+',
        target: 'Unidades ilimitadas',
        features: [
            'Tudo do Professional +',
            'Médicos ilimitados',
            'Suporte com engenheiro dedicado',
            'SLA garantido 99.5%',
        ],
        cta: 'Falar com vendas',
        href: '/contato',
    },
]

const dashboardTabs = [
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'pacientes', label: 'Pacientes', icon: Users },
]

const techStack = [
    { name: 'Supabase', description: 'PostgreSQL + RLS', icon: Database },
    { name: 'Vercel', description: 'Edge Network', icon: Zap },
    { name: 'WebRTC', description: 'Telemedicina HD', icon: Server },
]

// ============================================================================
// COMPONENTS
// ============================================================================

function SystemStatus() {
    return (
        <div className="flex items-center justify-center gap-2 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB]">
            <span className="text-sm text-[#6B7280] font-medium">Status:</span>
            <span className="text-sm text-[#111827] font-medium">All systems operational</span>
            <span className="relative flex h-[6px] w-[6px] ml-1">
                <span className="system-pulse absolute inline-flex h-full w-full rounded-full bg-[#10B981]"></span>
                <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[#10B981]"></span>
            </span>
        </div>
    )
}

function Navbar() {
    return (
        <nav className="sticky top-0 z-50 bg-white/98 backdrop-blur-md border-b border-[#E5E7EB]">
            <SystemStatus />
            <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center">
                    <Image
                        src="/logo-clinigo.png"
                        alt="CliniGo"
                        width={280}
                        height={80}
                        className="h-10 w-auto"
                        priority
                        quality={100}
                    />
                </Link>

                <div className="hidden md:flex items-center gap-8">
                    <a href="#diferenciais" className="text-[#111827] hover:text-[#10B981] transition-colors">
                        Diferenciais
                    </a>
                    <a href="#planos" className="text-[#111827] hover:text-[#10B981] transition-colors">
                        Planos
                    </a>
                    <a href="#tecnologia" className="text-[#111827] hover:text-[#10B981] transition-colors">
                        Tecnologia
                    </a>
                </div>

                <div className="flex items-center gap-4">
                    <Link
                        href="/login"
                        className="text-[#111827] hover:text-[#10B981] transition-colors font-medium"
                    >
                        Entrar
                    </Link>
                    <Link
                        href="/cadastro"
                        className="bg-[#08331E] text-white px-5 py-2.5 rounded-md font-medium hover:bg-[#0a4025] transition-colors"
                    >
                        Demonstração
                    </Link>
                </div>
            </div>
        </nav>
    )
}

function HeroSection() {
    const [activeTab, setActiveTab] = useState('agenda')

    return (
        <section className="pt-16 pb-24 bg-white">
            <div className="max-w-[1200px] mx-auto px-6">
                {/* Hero Content */}
                <div className="max-w-3xl mx-auto text-center mb-16 fade-in-up">
                    <h1 className="text-4xl md:text-5xl lg:text-[56px] font-semibold text-[#111827] leading-tight mb-6">
                        A infraestrutura definitiva para operações médicas de alto nível.
                    </h1>
                    <p className="text-lg md:text-xl text-[#6B7280] leading-relaxed mb-10">
                        Faturamento TISS nativo, Telemedicina WebRTC e segurança de dados via
                        Row Level Security (RLS). Projetado para escalar do consultório à rede hospitalar.
                    </p>
                    <Link
                        href="/cadastro"
                        className="inline-flex items-center gap-2 bg-[#08331E] text-white px-8 py-4 rounded-md font-semibold text-lg hover:bg-[#0a4025] transition-all hover:gap-3"
                    >
                        Agendar Demonstração Técnica
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>

                {/* MacBook Pro Mockup */}
                <div className="macbook-container fade-in-up-delay-2">
                    <div className="macbook-frame border-beam">
                        <div className="macbook-screen">
                            {/* Dashboard Tabs */}
                            <div className="bg-[#1a1a1c] px-4 py-2 flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-[#ff5f57]"></span>
                                    <span className="w-3 h-3 rounded-full bg-[#febc2e]"></span>
                                    <span className="w-3 h-3 rounded-full bg-[#28c840]"></span>
                                </div>
                                <div className="flex-1 flex justify-center gap-1">
                                    {dashboardTabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${activeTab === tab.id
                                                ? 'bg-[#10B981] text-white'
                                                : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            <tab.icon className="w-3 h-3" />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dashboard Content - Glassmorphism */}
                            <div className="glass-dashboard relative aspect-[16/10] overflow-hidden">
                                <Image
                                    src="/landing/dashboard.png"
                                    alt="CliniGo Dashboard"
                                    fill
                                    className="object-cover object-top"
                                    priority
                                />
                                {/* Glassmorphism overlay */}
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/10 pointer-events-none"></div>
                            </div>
                        </div>
                    </div>
                    <div className="macbook-base"></div>
                </div>
            </div>
        </section>
    )
}

function DifferentialsSection() {
    return (
        <section id="diferenciais" className="py-24 bg-[#F9FAFB]">
            <div className="max-w-[1200px] mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-semibold text-[#111827] mb-4">
                        Diferenciais únicos no Brasil
                    </h2>
                    <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
                        Tecnologia de ponta sem termos genéricos. Transparência total sobre como funciona.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {differentials.map((item, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-xl border border-[#E5E7EB] p-8 hover:shadow-lg transition-shadow"
                        >
                            <div className="w-14 h-14 bg-[#08331E]/5 rounded-lg flex items-center justify-center mb-6">
                                <item.icon className="w-7 h-7 text-[#08331E]" strokeWidth={1.5} />
                            </div>
                            <div className="inline-block bg-[#10B981]/10 text-[#059669] text-xs font-semibold px-2.5 py-1 rounded mb-4">
                                {item.highlight}
                            </div>
                            <h3 className="text-xl font-semibold text-[#111827] mb-3">
                                {item.title}
                            </h3>
                            <p className="text-[#6B7280] leading-relaxed">
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function PricingSection() {
    return (
        <section id="planos" className="py-24 bg-white">
            <div className="max-w-[1200px] mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-semibold text-[#111827] mb-4">
                        Planos honestos
                    </h2>
                    <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
                        Sem pegadinhas. Sem asteriscos. O que você vê é o que você paga.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className={`relative rounded-xl border p-6 flex flex-col ${plan.recommended
                                ? 'border-[#10B981] border-2 shadow-lg'
                                : 'border-[#E5E7EB]'
                                }`}
                        >
                            {plan.recommended && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#10B981] text-white text-xs font-semibold px-3 py-1 rounded-full">
                                    Recomendado
                                </div>
                            )}

                            <div className="mb-6">
                                <span className="text-sm font-bold text-[#6B7280] tracking-wider">
                                    {plan.name}
                                </span>
                                <div className="mt-2">
                                    <span className="text-3xl font-bold text-[#111827]">{plan.price}</span>
                                    <span className="text-[#6B7280]">/mês</span>
                                </div>
                                <p className="text-sm text-[#6B7280] mt-2">{plan.target}</p>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-[#111827]">
                                        <Check className="w-4 h-4 text-[#10B981] mt-0.5 flex-shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={plan.href}
                                className={`w-full py-3 px-4 rounded-md font-medium text-center transition-colors ${plan.recommended
                                    ? 'bg-[#08331E] text-white hover:bg-[#0a4025]'
                                    : 'bg-[#F9FAFB] text-[#111827] border border-[#E5E7EB] hover:bg-[#E5E7EB]'
                                    }`}
                            >
                                {plan.cta}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function TechStackSection() {
    return (
        <section id="tecnologia" className="py-24 bg-[#08331E]">
            <div className="max-w-[1200px] mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
                        Stack de produção
                    </h2>
                    <p className="text-lg text-white/70 max-w-2xl mx-auto">
                        Sem "cloud genérica". Tecnologia real, transparente e auditável.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {techStack.map((tech, index) => (
                        <div
                            key={index}
                            className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-8 text-center"
                        >
                            <div className="w-16 h-16 bg-[#10B981]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <tech.icon className="w-8 h-8 text-[#10B981]" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {tech.name}
                            </h3>
                            <p className="text-white/60">
                                {tech.description}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-16 text-center">
                    <div className="inline-flex items-center gap-6 bg-white/5 backdrop-blur border border-white/10 rounded-full px-8 py-4">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-[#10B981]" />
                            <span className="text-white font-medium">99.9% Uptime SLA</span>
                        </div>
                        <div className="w-px h-6 bg-white/20"></div>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-[#10B981]" />
                            <span className="text-white font-medium">LGPD Compliant</span>
                        </div>
                        <div className="w-px h-6 bg-white/20"></div>
                        <div className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-[#10B981]" />
                            <span className="text-white font-medium">PostgreSQL RLS</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function CTASection() {
    return (
        <section className="py-24 bg-white">
            <div className="max-w-[800px] mx-auto px-6 text-center">
                <h2 className="text-3xl md:text-4xl font-semibold text-[#111827] mb-6">
                    Pronto para escalar sua operação?
                </h2>
                <p className="text-lg text-[#6B7280] mb-10">
                    Agende uma demonstração técnica com nossa equipe de engenharia.
                    Sem compromisso, sem pressão de vendas.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/cadastro"
                        className="inline-flex items-center gap-2 bg-[#08331E] text-white px-8 py-4 rounded-md font-semibold text-lg hover:bg-[#0a4025] transition-all hover:gap-3"
                    >
                        Agendar Demonstração
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link
                        href="/contato"
                        className="inline-flex items-center gap-2 text-[#111827] border border-[#E5E7EB] px-8 py-4 rounded-md font-semibold text-lg hover:bg-[#F9FAFB] transition-colors"
                    >
                        Falar com Vendas
                        <ChevronRight className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        </section>
    )
}

function Footer() {
    const footerLinks = {
        produto: [
            { label: 'Funcionalidades', href: '#diferenciais' },
            { label: 'Planos', href: '#planos' },
            { label: 'Tecnologia', href: '#tecnologia' },
        ],
        suporte: [
            { label: 'Documentação', href: '/docs' },
            { label: 'Status', href: '/status' },
            { label: 'API', href: '/api-docs' },
        ],
        empresa: [
            { label: 'Sobre', href: '/sobre' },
            { label: 'Blog', href: '/blog' },
            { label: 'Contato', href: '/contato' },
        ],
        legal: [
            { label: 'Termos de Uso', href: '/termos' },
            { label: 'Privacidade', href: '/privacidade' },
            { label: 'LGPD', href: '/lgpd' },
        ],
    }

    return (
        <footer className="bg-[#F9FAFB] border-t border-[#E5E7EB] pt-16 pb-8">
            <div className="max-w-[1200px] mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center">
                            <Image
                                src="/logo-clinigo.png"
                                alt="CliniGo"
                                width={280}
                                height={80}
                                className="h-9 w-auto"
                                quality={100}
                            />
                        </Link>
                        <p className="text-sm text-[#6B7280] mt-4">
                            Infraestrutura para operações médicas de alto nível.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold text-[#111827] mb-4">Produto</h4>
                        <ul className="space-y-2">
                            {footerLinks.produto.map((link, i) => (
                                <li key={i}>
                                    <Link href={link.href} className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-[#111827] mb-4">Suporte</h4>
                        <ul className="space-y-2">
                            {footerLinks.suporte.map((link, i) => (
                                <li key={i}>
                                    <Link href={link.href} className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-[#111827] mb-4">Empresa</h4>
                        <ul className="space-y-2">
                            {footerLinks.empresa.map((link, i) => (
                                <li key={i}>
                                    <Link href={link.href} className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-[#111827] mb-4">Legal</h4>
                        <ul className="space-y-2">
                            {footerLinks.legal.map((link, i) => (
                                <li key={i}>
                                    <Link href={link.href} className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-[#E5E7EB] flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-[#6B7280]">
                        © 2026 CliniGo. Todos os direitos reservados.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                        <span>Powered by</span>
                        <span className="font-semibold text-[#111827]">Supabase</span>
                        <span>+</span>
                        <span className="font-semibold text-[#111827]">Vercel</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function LandingV3Page() {
    return (
        <main className="font-sans antialiased">
            <Navbar />
            <HeroSection />
            <DifferentialsSection />
            <PricingSection />
            <TechStackSection />
            <CTASection />
            <Footer />
        </main>
    )
}
