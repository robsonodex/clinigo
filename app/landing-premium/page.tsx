'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CliniGoLogo } from '@/components/ui/clinigo-logo'
import {
    Calendar,
    Video,
    FileText,
    QrCode,
    BarChart3,
    MessageCircle,
    Check,
    ArrowRight,
    Plus,
    Star,
    Stethoscope,
    Shield,
    CreditCard,
    Headphones,
    ChevronRight,
    Play,
    Users,
    TrendingUp,
    Clock,
    Settings,
    Globe
} from 'lucide-react'
import './premium-landing.css'

// ============================================================================
// DATA
// ============================================================================

const metrics = [
    { value: '12.847', label: 'consultas agendadas hoje', prefix: '' },
    { value: '98,5', label: 'satisfação dos médicos', prefix: '', suffix: '%' },
    { value: '4.200', label: 'pacientes atendidos/dia', prefix: '+' },
]

const bentoFeatures = [
    {
        id: 'agenda',
        icon: Calendar,
        title: 'Agenda Anti-Overbooking',
        description: 'Sistema inteligente que previne conflitos de horários automaticamente, mostrando slots em tempo real.',
        large: true,
    },
    {
        id: 'teleconsulta',
        icon: Video,
        title: 'Teleconsulta WebRTC',
        description: 'Vídeo-chamada HD integrada com interface futurista e gravação opcional.',
        large: false,
    },
    {
        id: 'prontuario',
        icon: FileText,
        title: 'Prontuário Eletrônico',
        description: 'Interface completa com histórico do paciente e modelos personalizáveis.',
        large: false,
    },
    {
        id: 'checkin',
        icon: QrCode,
        title: 'Check-in QR Code',
        description: 'Redução de 40% na fila com pré-cadastro e chegada autônoma.',
        large: false,
    },
    {
        id: 'faturamento',
        icon: BarChart3,
        title: 'Faturamento TISS',
        description: 'Geração de XML TISS 4.02 nativo para operadoras. Sem intermediários.',
        large: false,
    },
    {
        id: 'crm',
        icon: Users,
        title: 'CRM de Pacientes',
        description: 'Gestão completa do relacionamento com pacientes, histórico de interações e acompanhamento.',
        large: true,
    },
]

const plans = [
    {
        name: 'CliniGo Básico',
        price: 'R$ 149',
        target: 'Para consultórios com até 2 médicos',
        features: [
            'Até 2 médicos',
            'Check-in QR Code',
            'Prontuário eletrônico',
            'Teleconsulta integrada',
            'SMTP próprio',
            'Financeiro básico',
            'Relatórios básicos',
            'Agenda anti-overbooking',
            'Suporte padrão',
        ],
        cta: 'Começar Agora',
        href: '/cadastro',
        recommended: false,
    },
    {
        name: 'CliniGo Avançado',
        price: 'R$ 299',
        target: 'Para clínicas com até 5 médicos',
        features: [
            'Até 5 médicos',
            'Tudo do Básico +',
            'Check-in avançado + Upload',
            'Prontuário completo',
            'Teleconsulta WebRTC',
            'SMTP próprio',
            'CRM completo',
            'Financeiro completo',
            'Relatórios avançados',
            'Suporte prioritário',
        ],
        cta: 'Começar Agora',
        href: '/cadastro',
        recommended: true,
    },
    {
        name: 'CliniGo Professional',
        price: 'R$ 549',
        target: 'Para centros com até 30 médicos',
        features: [
            'Até 30 médicos',
            'Consultas ilimitadas',
            'Tudo do Avançado +',
            'Até 3 unidades',
            'Prontuário multi-unidade',
            'Faturamento TISS',
            'SMTP próprio',
            'API dedicada',
            'BI e relatórios gerenciais',
            'SLA 99.5%',
            'Onboarding personalizado',
            'Suporte 24/7',
        ],
        cta: 'Começar Agora',
        href: '/cadastro',
        recommended: false,
    },
    {
        name: 'CliniGo Enterprise',
        price: 'A partir de R$ 799',
        target: 'Para redes com médicos ilimitados',
        features: [
            'Médicos ilimitados',
            'Tudo do Professional +',
            'Unidades ilimitadas',
            'SMTP próprio',
            'Migração dedicada',
            'Atendimento direto',
            'Ajustes sob demanda',
            'Consultoria de implantação',
            'Treinamento presencial',
            'SLA garantido 99.5%',
            'Gerente de conta dedicado',
        ],
        cta: 'Começar Agora',
        href: '/cadastro',
        recommended: false,
    },
]

const testimonialsGroups = [
    // Card 1 - Focus on time savings
    [
        {
            name: 'Dr. Ricardo Mendes',
            role: 'Cardiologista | CRM 52.78942-RJ',
            quote: 'O CliniGo reduziu em 60% o tempo que eu gastava com burocracia. Agora consigo focar no que realmente importa: meus pacientes.',
        },
        {
            name: 'Dra. Juliana Costa',
            role: 'Pediatra | CRM 52.14563-SP',
            quote: 'Antes eu perdia 2 horas por dia com papelada. Com o CliniGo, tudo ficou digital e automático. Tempo é dinheiro!',
        },
        {
            name: 'Dr. Marcos Silva',
            role: 'Ortopedista | CRM 52.93217-MG',
            quote: 'A agenda inteligente acabou com os conflitos de horário. Nenhum overbooking desde que migramos.',
        },
    ],
    // Card 2 - Focus on technology
    [
        {
            name: 'Dra. Camila Santos',
            role: 'Dermatologista | CRM 52.45821-RJ',
            quote: 'A teleconsulta WebRTC é impecável. Qualidade de vídeo HD sem travamentos, mesmo com conexões instáveis.',
        },
        {
            name: 'Dr. André Lima',
            role: 'Psiquiatra | CRM 52.67329-SP',
            quote: 'O prontuário eletrônico é intuitivo e completo. Meus atendimentos online ficaram muito mais profissionais.',
        },
        {
            name: 'Dra. Patrícia Ramos',
            role: 'Nutricionista | CRN 52.XXX-RJ',
            quote: 'O check-in por QR Code impressionou meus pacientes. Eles adoram a praticidade!',
        },
    ],
    // Card 3 - Focus on financial results
    [
        {
            name: 'Dr. Fernando Oliveira',
            role: 'Clínica Geral | CRM 52.31584-RJ',
            quote: 'O sistema TISS nativo economiza 5 horas semanais da minha secretária. O investimento se pagou em 2 meses.',
        },
        {
            name: 'Dra. Beatriz Almeida',
            role: 'Ginecologista | CRM 52.89041-SP',
            quote: 'O controle financeiro me deu visibilidade total. Descobri que estava perdendo 20% em glosas!',
        },
        {
            name: 'Dr. Roberto Nunes',
            role: 'Oftalmologista | CRM 52.52796-MG',
            quote: 'Aumentamos 35% o faturamento depois que automatizamos os lembretes de consulta. Menos faltas, mais receita.',
        },
    ],
]

const faqs = [
    {
        question: 'Quanto tempo leva para implementar o CliniGo?',
        answer: 'A implementação completa leva de 1 a 3 dias úteis, dependendo do tamanho da sua clínica. Oferecemos treinamento online gratuito para toda a equipe e suporte dedicado durante a migração.',
    },
    {
        question: 'Preciso instalar algum software?',
        answer: 'Não! O CliniGo é 100% na nuvem (cloud). Você acessa pelo navegador de qualquer dispositivo, e seus dados ficam seguros em servidores com certificação SOC 2.',
    },
    {
        question: 'E se eu quiser cancelar?',
        answer: 'Você pode cancelar a qualquer momento, sem multas ou burocracia. Seus dados permanecem disponíveis para exportação por 30 dias após o cancelamento.',
    },
    {
        question: 'O sistema é seguro para dados de pacientes?',
        answer: 'Absolutamente. Utilizamos Row Level Security (RLS) no PostgreSQL, criptografia AES-256, e somos 100% compatíveis com a LGPD. Cada clínica tem isolamento físico de dados.',
    },
    {
        question: 'Vocês oferecem teste grátis?',
        answer: 'Sim! Oferecemos 7 dias de teste grátis com todas as funcionalidades, sem precisar de cartão de crédito. Você só paga se decidir continuar.',
    },
]

const differentiators = [
    { icon: CreditCard, text: 'Sem cartão de crédito para testar' },
    { icon: Clock, text: 'Cancele quando quiser' },
    { icon: Headphones, text: 'Suporte em português 24/7' },
    { icon: Shield, text: 'LGPD Compliant + Certificado CFM' },
    { icon: TrendingUp, text: 'SLA 99,5% garantido' },
]

// ============================================================================
// COMPONENTS
// ============================================================================

function ScrollProgress() {
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const handleScroll = () => {
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
            const scrolled = (window.scrollY / scrollHeight) * 100
            setProgress(scrolled)
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return <div className="scroll-progress" style={{ width: `${progress}%` }} />
}

function DynamicIsland() {
    // Removed - badge is in hero section only
    return null
}

function Header() {
    const [scrolled, setScrolled] = useState(false)
    const [loginMenuOpen, setLoginMenuOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50)
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const loginOptions = [
        { label: 'Paciente', href: '/paciente', icon: Users },
        { label: 'Clínica', href: '/clinica', icon: Stethoscope },
        { label: 'Médico', href: '/medico', icon: Shield },
        { label: 'Gestão', href: '/login', icon: Settings },
    ]

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
                }`}
        >
            <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <img
                        src={scrolled ? "/logo_black.svg" : "/logo_white.svg"}
                        alt="CliniGo"
                        className="h-12 w-auto"
                    />
                </Link>

                <nav className="hidden md:flex items-center gap-8">
                    {['Funcionalidades', 'Planos', 'Depoimentos', 'FAQ'].map((item) => (
                        <a
                            key={item}
                            href={`#${item.toLowerCase()}`}
                            className={`text-sm font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'
                                }`}
                        >
                            {item}
                        </a>
                    ))}
                </nav>

                <div className="flex items-center gap-4">
                    {/* Login Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setLoginMenuOpen(!loginMenuOpen)}
                            onBlur={() => setTimeout(() => setLoginMenuOpen(false), 150)}
                            className={`text-sm font-medium transition-colors flex items-center gap-1 ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'
                                }`}
                        >
                            Entrar
                            <ChevronRight className={`w-4 h-4 transition-transform ${loginMenuOpen ? 'rotate-90' : ''}`} />
                        </button>

                        {loginMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                                {loginOptions.map((option) => (
                                    <Link
                                        key={option.href}
                                        href={option.href}
                                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#14B8A6] transition-colors"
                                    >
                                        <option.icon className="w-4 h-4" />
                                        {option.label}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <Link
                        href="/cadastro"
                        className="bg-[#14B8A6] hover:bg-[#2DD4BF] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                    >
                        Teste Grátis
                    </Link>
                </div>
            </div>
        </header>
    )
}

function HeroSection() {
    return (
        <section className="hero-section">
            {/* Particles */}
            <div className="hero-particles">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="particle"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${6 + Math.random() * 4}s`,
                        }}
                    />
                ))}
                <div className="hero-glow" style={{ top: '-200px', left: '-100px' }} />
                <div className="hero-glow" style={{ bottom: '-200px', right: '-100px' }} />
            </div>

            <div className="hero-content">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8 pulse-badge fade-in-up">
                    <span className="w-2 h-2 rounded-full bg-[#2DD4BF] animate-pulse" />
                    <span className="text-sm text-white/90">+500 clínicas já usam CliniGo no Rio de Janeiro</span>
                </div>

                {/* Title */}
                <h1 className="hero-title fade-in-up delay-100">
                    Gestão médica completa para{' '}
                    <span className="shimmer-text">clínicas e consultórios</span>
                </h1>

                {/* Subtitle */}
                <p className="hero-subtitle fade-in-up delay-200">
                    Sistema médico completo: agenda anti-overbooking, prontuário eletrônico,
                    teleconsulta HD e faturamento TISS nativo. Tudo em uma plataforma.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 fade-in-up delay-300">
                    <Link
                        href="/cadastro"
                        className="group inline-flex items-center gap-2 bg-white text-[#0A3F3F] px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all hover:scale-105 shadow-lg btn-breathing"
                    >
                        Experimentar Grátis
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {/* iPad Mockup */}
                <div className="ipad-container fade-in-up delay-400" style={{ maxWidth: '550px', marginTop: '32px' }}>
                    <div className="ipad-frame">
                        <div className="ipad-screen">
                            <Image
                                src="/landing/dashboard.png"
                                alt="CliniGo Dashboard"
                                fill
                                className="object-cover object-top"
                                priority
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function TrustBar() {
    return (
        <section className="trust-bar">
            <div className="max-w-[1200px] mx-auto">
                <p className="text-center text-sm text-gray-500 mb-6">
                    Confiado por mais de 500 clínicas no Rio de Janeiro
                </p>
                <div className="trust-logos">
                    <div className="flex items-center gap-3 text-gray-500">
                        <Shield className="w-5 h-5" />
                        <span className="text-sm font-medium">LGPD Compliant</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500">
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-sm font-medium">99.5% Uptime</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500">
                        <Headphones className="w-5 h-5" />
                        <span className="text-sm font-medium">Suporte 24/7</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-500">
                        <Users className="w-5 h-5" />
                        <span className="text-sm font-medium">+500 Clínicas</span>
                    </div>
                </div>
            </div>
        </section>
    )
}

function BentoGridSection() {
    const cardRef = useRef<HTMLDivElement>(null)

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const card = e.currentTarget
        const rect = card.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const rotateX = (y - centerY) / 20
        const rotateY = (centerX - x) / 20

        card.style.setProperty('--rotateX', `${-rotateX}deg`)
        card.style.setProperty('--rotateY', `${rotateY}deg`)
    }, [])

    const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.setProperty('--rotateX', '0deg')
        e.currentTarget.style.setProperty('--rotateY', '0deg')
    }, [])

    return (
        <section id="funcionalidades" className="bento-section">
            <div className="max-w-[1200px] mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Tudo que sua clínica precisa
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Funcionalidades premium desenhadas para clínicas que querem crescer com eficiência.
                    </p>
                </div>

                <div className="bento-grid" ref={cardRef}>
                    {bentoFeatures.map((feature, i) => (
                        <div
                            key={feature.id}
                            className={`bento-card tilt-card ${feature.large ? 'large' : ''}`}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            <div className="bento-icon">
                                <feature.icon className="w-7 h-7" />
                            </div>
                            <h3 className="bento-title">{feature.title}</h3>
                            <p className="bento-description">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function PricingSection() {
    return (
        <section id="planos" className="pricing-section">
            <div className="pricing-container">
                <div className="pricing-header">
                    <h2 className="pricing-title">Planos transparentes</h2>
                    <p className="pricing-subtitle">
                        Sem pegadinhas. Sem asteriscos. O que você vê é o que você paga.
                    </p>
                </div>

                <div className="pricing-grid">
                    {plans.map((plan, i) => (
                        <div
                            key={plan.name}
                            className={`pricing-card ${plan.recommended ? 'recommended' : ''}`}
                        >
                            {plan.recommended && (
                                <div className="pricing-badge pulse-badge">Mais Escolhido</div>
                            )}

                            <p className="pricing-name">{plan.name}</p>
                            <p className="pricing-price">
                                {plan.price}
                                <span className="pricing-period">/mês</span>
                            </p>
                            <p className="pricing-target">{plan.target}</p>

                            <ul className="pricing-features">
                                {plan.features.map((feature, j) => (
                                    <li key={j} className="pricing-feature">
                                        <Check className="pricing-feature-icon" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={plan.href}
                                className={`pricing-cta ${plan.recommended ? 'primary' : 'secondary'}`}
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

function WebsiteBanner() {
    return (
        <section className="py-8 px-4">
            <div className="max-w-[1000px] mx-auto">
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <Globe className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-white font-medium">
                                Sua clínica ainda não tem site?
                            </p>
                            <p className="text-sm text-gray-400">
                                Desenvolvemos sites profissionais integrados ao CliniGo
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/site"
                        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium transition-colors whitespace-nowrap"
                    >
                        Saiba mais
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </section>
    )
}

function TestimonialsSection() {
    const [indices, setIndices] = useState([0, 0, 0])

    useEffect(() => {
        const intervals = testimonialsGroups.map((group, groupIndex) => {
            return setInterval(() => {
                setIndices(prev => {
                    const newIndices = [...prev]
                    newIndices[groupIndex] = (prev[groupIndex] + 1) % group.length
                    return newIndices
                })
            }, 4000 + groupIndex * 500) // Staggered timing for each card
        })
        return () => intervals.forEach(clearInterval)
    }, [])

    return (
        <section id="depoimentos" className="py-16 bg-gradient-to-b from-slate-900 to-slate-800">
            <div className="max-w-[1200px] mx-auto px-6">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-white mb-2">
                        O que nossos clientes dizem
                    </h2>
                    <p className="text-sm text-white/60">
                        Histórias reais de clínicas que transformaram sua gestão
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {testimonialsGroups.map((group, groupIndex) => {
                        const testimonial = group[indices[groupIndex]]
                        return (
                            <div
                                key={groupIndex}
                                className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10 transition-all duration-500"
                            >
                                <div className="flex items-center gap-1 mb-4">
                                    {[...Array(5)].map((_, j) => (
                                        <Star key={j} className="w-4 h-4 text-yellow-400 fill-current" />
                                    ))}
                                </div>
                                <p className="text-white/90 text-sm leading-relaxed mb-4 min-h-[80px] transition-opacity duration-300">
                                    "{testimonial.quote}"
                                </p>
                                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                                    <div className="w-10 h-10 rounded-full bg-emerald-600/30 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium text-sm">{testimonial.name}</p>
                                        <p className="text-white/50 text-xs">{testimonial.role}</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}


function DifferentiatorsSection() {
    return (
        <section className="py-24 bg-white">
            <div className="max-w-[1200px] mx-auto px-6">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    {/* Video Mockup */}
                    <div className="relative aspect-video bg-gradient-to-br from-[#0A3F3F] to-[#14B8A6] rounded-2xl overflow-hidden shadow-2xl">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <button className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all hover:scale-110">
                                <Play className="w-8 h-8 text-white ml-1" />
                            </button>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 flex justify-between text-white/80 text-sm">
                            <span>Demo CliniGo</span>
                            <span>2:45</span>
                        </div>
                    </div>

                    {/* Differentiators List */}
                    <div>
                        <h2 className="text-4xl font-bold text-gray-900 mb-8">
                            Por que escolher CliniGo?
                        </h2>

                        <div className="space-y-6">
                            {differentiators.map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-4 reveal"
                                    style={{ animationDelay: `${i * 100}ms` }}
                                >
                                    <div className="w-12 h-12 rounded-xl bg-[#14B8A6]/10 flex items-center justify-center">
                                        <item.icon className="w-6 h-6 text-[#14B8A6]" />
                                    </div>
                                    <span className="text-lg text-gray-700">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null)

    return (
        <section id="faq" className="faq-section">
            <div className="faq-container">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Perguntas Frequentes
                    </h2>
                    <p className="text-lg text-gray-600">
                        Tire suas dúvidas sobre o CliniGo
                    </p>
                </div>

                <div>
                    {faqs.map((faq, i) => (
                        <div key={i} className={`faq-item ${openIndex === i ? 'open' : ''}`}>
                            <button
                                className="faq-question"
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                            >
                                <span>{faq.question}</span>
                                <Plus className="faq-icon" />
                            </button>
                            <div className="faq-answer">
                                <p className="faq-answer-text">{faq.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function FinalCTASection() {
    return (
        <section className="final-cta-section">
            <div className="final-cta-content">
                <h2 className="final-cta-title">
                    Pronto para transformar sua clínica?
                </h2>

                <div className="final-cta-buttons">
                    <Link href="/cadastro" className="cta-btn primary btn-breathing">
                        Experimentar Grátis
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link href="/contato" className="cta-btn secondary">
                        Falar com Especialista
                        <ChevronRight className="w-5 h-5" />
                    </Link>
                </div>

                <div className="cta-checklist">
                    <span className="cta-check-item">
                        <Check className="cta-check-icon" />
                        Sem cartão
                    </span>
                    <span className="cta-check-item">
                        <Check className="cta-check-icon" />
                        7 dias grátis
                    </span>
                    <span className="cta-check-item">
                        <Check className="cta-check-icon" />
                        Suporte incluído
                    </span>
                </div>
            </div>
        </section>
    )
}

function Footer() {
    const footerLinks = {
        produto: [
            { label: 'Funcionalidades', href: '#funcionalidades' },
            { label: 'Planos', href: '#planos' },
            { label: 'Integrações', href: '#integracoes' },
        ],
        empresa: [
            { label: 'Sobre nós', href: '/sobre' },
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
        <footer className="bg-gray-900 text-gray-400 py-16">
            <div className="max-w-[1200px] mx-auto px-6">
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                    <div>
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <Image
                                src="/logo_white.svg"
                                alt="CliniGo"
                                width={140}
                                height={36}
                                className="h-9 w-auto"
                            />
                        </Link>
                        <p className="text-sm">
                            A plataforma de gestão médica mais completa do Brasil.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white mb-4">Produto</h4>
                        <ul className="space-y-2">
                            {footerLinks.produto.map((link, i) => (
                                <li key={i}>
                                    <Link href={link.href} className="text-sm hover:text-white transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white mb-4">Empresa</h4>
                        <ul className="space-y-2">
                            {footerLinks.empresa.map((link, i) => (
                                <li key={i}>
                                    <Link href={link.href} className="text-sm hover:text-white transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white mb-4">Legal</h4>
                        <ul className="space-y-2">
                            {footerLinks.legal.map((link, i) => (
                                <li key={i}>
                                    <Link href={link.href} className="text-sm hover:text-white transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm">
                        © 2026 CliniGo. Todos os direitos reservados.
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
                        <span className="text-sm text-[#14B8A6]">Sistema Online</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}

function FloatingChatbot() {
    return (
        <div className="floating-chatbot">
            <button className="chatbot-button" aria-label="Abrir chat">
                <MessageCircle className="chatbot-icon" />
            </button>
        </div>
    )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function PremiumLandingPage() {
    // Reveal on scroll effect
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible')
                    }
                })
            },
            { threshold: 0.1 }
        )

        document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))

        return () => observer.disconnect()
    }, [])

    return (
        <main className="premium-landing">
            <ScrollProgress />
            <DynamicIsland />
            <Header />
            <HeroSection />
            <TrustBar />
            <BentoGridSection />
            <PricingSection />
            <WebsiteBanner />
            <TestimonialsSection />
            <DifferentiatorsSection />
            <FAQSection />
            <FinalCTASection />
            <Footer />
        </main>
    )
}
