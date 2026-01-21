'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
    FileSpreadsheet,
    Calendar,
    Video,
    ClipboardList,
    Wallet,
    FolderOpen,
    Shield,
    Building2,
    Cloud,
    Lock
} from 'lucide-react'
import './landing.css'

// ============================================================================
// DESIGN SYSTEM
// ============================================================================
const colors = {
    primaryStart: '#0B4D2C',
    primaryEnd: '#0D6938',
    gradient: 'linear-gradient(135deg, #0B4D2C 0%, #0D6938 100%)',
    bg: '#FFFFFF',
    surface: '#F8F9FA',
    border: '#E9ECEF',
    text: '#212529',
    textMuted: '#6C757D',
    accent: '#0D6938',
}

// ============================================================================
// DATA
// ============================================================================
const rotatingWords = ['Profissional', 'Inteligente', 'Completa']

const featureIcons = {
    tiss: FileSpreadsheet,
    agenda: Calendar,
    telemedicina: Video,
    prontuario: ClipboardList,
    financeiro: Wallet,
    documentos: FolderOpen,
}

const features = [
    {
        iconKey: 'tiss' as const,
        title: 'Faturamento TISS',
        description: 'Geração de XML 4.02, validação automática de guias, processamento de retornos e análise de glosas.',
        items: ['Validação 10 regras ANS', 'Processamento de retornos', 'Dashboard de glosas', 'Verificação de elegibilidade'],
    },
    {
        iconKey: 'agenda' as const,
        title: 'Agenda Inteligente',
        description: 'Sistema anti-overbooking com bloqueios automáticos, confirmação via WhatsApp e check-in por QR Code.',
        items: ['Bloqueio de conflitos', 'Confirmação automática', 'Check-in QR Code', 'Fila de espera'],
    },
    {
        iconKey: 'telemedicina' as const,
        title: 'Telemedicina',
        description: 'Videoconsulta em HD com prontuário integrado, gravação automática e prescrição digital.',
        items: ['WebRTC HD', 'Gravação automática', 'Prontuário integrado', 'Prescrição digital'],
    },
    {
        iconKey: 'prontuario' as const,
        title: 'Prontuário Eletrônico',
        description: 'Anamnese completa, prescrições, atestados em PDF, upload de exames e histórico centralizado.',
        items: ['Modelos personalizáveis', 'Geração de PDF', 'Assinatura digital', 'Histórico completo'],
    },
    {
        iconKey: 'financeiro' as const,
        title: 'Gestão Financeira',
        description: 'Fluxo de caixa, DRE automático, repasse médico e integração com Mercado Pago.',
        items: ['DRE por unidade', 'Repasse automático', 'Auditoria financeira', 'Múltiplas formas de pagamento'],
    },
    {
        iconKey: 'documentos' as const,
        title: 'Gestão de Documentos',
        description: 'Upload seguro de exames, laudos e documentos com versionamento e auditoria de acesso.',
        items: ['Storage seguro', 'Categorização automática', 'Busca inteligente', 'Log de visualizações'],
    },
]

const plans = [
    {
        name: 'CliniGo Básico',
        subtitle: 'Para consultórios com até 2 médicos',
        price: 'R$ 149',
        period: '/mês',

        features: [
            'Até 2 médicos',
            'Check-in QR Code',
            'Prontuário eletrônico',
            'Teleconsulta integrada',
            'WhatsApp manual',
            'SMTP próprio',
            'Financeiro básico',
            'Relatórios básicos',
            'Agenda anti-overbooking',
            'Suporte padrão',
        ],
        recommended: false,
        cta: 'Iniciar teste',
    },
    {
        name: 'CliniGo Avançado',
        subtitle: 'Para clínicas com até 5 médicos',
        price: 'R$ 299',
        period: '/mês',

        features: [
            'Até 5 médicos',
            'Tudo do Básico +',
            'Check-in avançado + Upload',
            'Prontuário completo',
            'Teleconsulta WebRTC',
            'WhatsApp automação',
            'SMTP próprio',
            'CRM completo',
            'Financeiro completo',
            'Relatórios avançados',
            'Suporte prioritário',
        ],
        recommended: true,
        cta: 'Iniciar teste',
    },
    {
        name: 'CliniGo Profissional',
        subtitle: 'Para centros com até 30 médicos',
        price: 'R$ 549',
        period: '/mês',

        features: [
            'Até 30 médicos',
            'Consultas ilimitadas',
            'Tudo do Clínica +',
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
        recommended: false,
        cta: 'Iniciar teste',
    },
    {
        name: 'CliniGo Enterprise',
        subtitle: 'Para redes com médicos ilimitados',
        price: 'A partir de R$ 799',
        period: '/mês',

        features: [
            'Médicos ilimitados',
            'Tudo do Centro Clínico +',
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
        recommended: false,
        cta: 'Falar com vendas',
    },
]

const trustIcons = {
    lgpd: Shield,
    ans: Building2,
    aws: Cloud,
    crypto: Lock,
}

const trustItems = [
    { iconKey: 'lgpd' as const, title: 'LGPD Compliant', description: 'Adequação total à Lei Geral de Proteção de Dados' },
    { iconKey: 'ans' as const, title: 'Certificado ANS', description: 'Padrão TISS 4.02 homologado' },
    { iconKey: 'aws' as const, title: 'AWS Infrastructure', description: 'Hospedagem em cloud tier-1 com SLA 99.9%' },
    { iconKey: 'crypto' as const, title: 'Criptografia E2E', description: 'Dados protegidos com AES-256' },
]

const footerLinks = {
    produto: [
        { label: 'Funcionalidades', href: '#funcionalidades' },
        { label: 'Planos', href: '#planos' },
        { label: 'Atualizações', href: '/changelog' },
    ],
    suporte: [
        { label: 'Documentação', href: '/docs' },
        { label: 'API', href: '/api' },
        { label: 'Status', href: '/status' },
    ],
    empresa: [
        { label: 'Sobre', href: '/sobre' },
        { label: 'Contato', href: '/contato' },
        { label: 'Blog', href: '/blog' },
    ],
    legal: [
        { label: 'Termos de Uso', href: '/termos' },
        { label: 'Privacidade', href: '/privacidade' },
        { label: 'LGPD', href: '/lgpd' },
    ],
}

// ============================================================================
// COMPONENTS
// ============================================================================

function Navbar() {
    return (
        <nav style={styles.navbar}>
            <div style={styles.navContainer}>
                <Link href="/" style={styles.logo}>
                    <Image
                        src="/logo-clinigo.png"
                        alt="CliniGo"
                        width={280}
                        height={80}
                        style={{ height: 40, width: 'auto' }}
                        priority
                        quality={100}
                    />
                </Link>

                <div style={styles.navLinks}>
                    <a href="#funcionalidades" style={styles.navLink}>Funcionalidades</a>
                    <a href="#planos" style={styles.navLink}>Planos</a>
                    <a href="#suporte" style={styles.navLink}>Suporte</a>
                </div>

                <div style={styles.navActions}>
                    <Link href="/login" style={styles.btnText}>Entrar</Link>
                    <Link href="/cadastro" style={styles.btnPrimary}>Iniciar Teste</Link>
                </div>
            </div>
        </nav>
    )
}

function HeroSection() {
    const [wordIndex, setWordIndex] = useState(0)
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const interval = setInterval(() => {
            setIsVisible(false)
            setTimeout(() => {
                setWordIndex((prev) => (prev + 1) % rotatingWords.length)
                setIsVisible(true)
            }, 300)
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    return (
        <section style={styles.hero}>
            <div style={styles.heroContent}>
                <h1 style={styles.heroTitle}>
                    <span>Gestão Clínica </span>
                    <span style={{
                        ...styles.titleDynamic,
                        opacity: isVisible ? 1 : 0,
                    }}>
                        {rotatingWords[wordIndex]}
                    </span>
                </h1>

                <p style={styles.heroDescription}>
                    Faturamento TISS automatizado, telemedicina integrada e
                    agenda sem overbooking. Para clínicas que levam gestão a sério.
                </p>

                <div style={styles.heroCta}>
                    <Link href="/cadastro" style={styles.btnPrimaryLg}>
                        Teste gratuito 7 dias
                    </Link>
                </div>

                <div style={styles.heroStats}>
                    <div style={styles.stat}>
                        <span style={styles.statValue}>500+</span>
                        <span style={styles.statLabel}>Clínicas</span>
                    </div>
                    <div style={styles.stat}>
                        <span style={styles.statValue}>4.9/5</span>
                        <span style={styles.statLabel}>Avaliação</span>
                    </div>
                    <div style={styles.stat}>
                        <span style={styles.statValue}>ANS</span>
                        <span style={styles.statLabel}>Certificado</span>
                    </div>
                </div>
            </div>

            <div style={styles.heroVisual}>
                <Image
                    src="/landing/dashboard.png"
                    alt="Dashboard CliniGo"
                    width={800}
                    height={500}
                    style={styles.screenshot}
                    priority
                />
            </div>
        </section>
    )
}

function FeaturesSection() {
    return (
        <section id="funcionalidades" style={styles.features}>
            <div style={styles.container}>
                <h2 style={styles.sectionTitle}>Funcionalidades</h2>

                <div style={styles.featuresGrid}>
                    {features.map((feature, index) => {
                        const IconComponent = featureIcons[feature.iconKey]
                        return (
                            <div key={index} style={styles.featureCard}>
                                <div style={styles.featureHeader}>
                                    <div style={styles.featureIcon}>
                                        <IconComponent size={28} color="#0B4D2C" strokeWidth={1.5} />
                                    </div>
                                    <h3 style={styles.featureTitle}>{feature.title}</h3>
                                </div>
                                <div style={styles.featureBody}>
                                    <p style={styles.featureDescription}>{feature.description}</p>
                                    <ul style={styles.featureList}>
                                        {feature.items.map((item, i) => (
                                            <li key={i} style={styles.featureListItem}>
                                                <span style={styles.checkmark}>✓</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

function PricingSection() {
    return (
        <section id="planos" style={styles.pricing}>
            <div style={styles.container}>
                <h2 style={styles.sectionTitle}>Planos</h2>

                <div style={styles.pricingGrid}>
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            style={{
                                ...styles.pricingCard,
                                ...(plan.recommended ? styles.pricingCardRecommended : {}),
                            }}
                        >
                            {plan.recommended && (
                                <div style={styles.planBadge}>Recomendado</div>
                            )}

                            <div style={styles.planHeader}>
                                <span style={styles.planName}>{plan.name}</span>
                                <p style={styles.planSubtitle}>{plan.subtitle}</p>
                            </div>

                            <div style={styles.planPrice}>
                                <span style={styles.priceValue}>{plan.price}</span>
                                <span style={styles.pricePeriod}>{plan.period}</span>
                            </div>

                            <ul style={styles.planFeatures}>
                                {plan.features.map((feature, i) => (
                                    <li key={i} style={styles.planFeatureItem}>
                                        <span style={styles.checkmarkGreen}>✓</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>



                            <Link
                                href={plan.cta === 'Falar com vendas' ? '/contato' : '/cadastro'}
                                style={{
                                    ...styles.btnPlan,
                                    ...(plan.recommended ? styles.btnPlanPrimary : {}),
                                }}
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

function TrustSection() {
    return (
        <section style={styles.trust}>
            <div style={styles.container}>
                <h2 style={styles.sectionTitle}>Segurança e Conformidade</h2>

                <div style={styles.trustGrid}>
                    {trustItems.map((item, index) => {
                        const IconComponent = trustIcons[item.iconKey]
                        return (
                            <div key={index} style={styles.trustItem}>
                                <div style={styles.trustIcon}>
                                    <IconComponent size={40} color="#0B4D2C" strokeWidth={1.5} />
                                </div>
                                <h3 style={styles.trustTitle}>{item.title}</h3>
                                <p style={styles.trustDescription}>{item.description}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

function CtaSection() {
    return (
        <section style={styles.ctaFinal}>
            <div style={styles.container}>
                <div style={styles.ctaContent}>
                    <h2 style={styles.ctaTitle}>Teste gratuitamente por 7 dias</h2>
                    <p style={styles.ctaDescription}>
                        Sem cartão de crédito. Cancelamento a qualquer momento.
                    </p>
                    <Link href="/cadastro" style={styles.btnPrimaryLg}>
                        Criar conta gratuita
                    </Link>
                </div>
            </div>
        </section>
    )
}

function Footer() {
    return (
        <footer style={styles.footer}>
            <div style={styles.container}>
                <div style={styles.footerGrid}>
                    <div style={styles.footerCol}>
                        <h4 style={styles.footerHeading}>Produto</h4>
                        {footerLinks.produto.map((link, i) => (
                            <Link key={i} href={link.href} style={styles.footerLink}>{link.label}</Link>
                        ))}
                    </div>

                    <div style={styles.footerCol}>
                        <h4 style={styles.footerHeading}>Suporte</h4>
                        {footerLinks.suporte.map((link, i) => (
                            <Link key={i} href={link.href} style={styles.footerLink}>{link.label}</Link>
                        ))}
                    </div>

                    <div style={styles.footerCol}>
                        <h4 style={styles.footerHeading}>Empresa</h4>
                        {footerLinks.empresa.map((link, i) => (
                            <Link key={i} href={link.href} style={styles.footerLink}>{link.label}</Link>
                        ))}
                    </div>

                    <div style={styles.footerCol}>
                        <h4 style={styles.footerHeading}>Legal</h4>
                        {footerLinks.legal.map((link, i) => (
                            <Link key={i} href={link.href} style={styles.footerLink}>{link.label}</Link>
                        ))}
                    </div>
                </div>

                <div style={styles.footerBottom}>
                    <p style={styles.footerCopyright}>© 2026 CliniGo. Todos os direitos reservados.</p>
                </div>
            </div>
        </footer>
    )
}

// ============================================================================
// STYLES
// ============================================================================
const styles: Record<string, React.CSSProperties> = {
    // Layout
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
    },

    // Navbar
    navbar: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '72px',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderBottom: `1px solid ${colors.border}`,
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
    },
    navContainer: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    logo: {
        fontSize: '24px',
        fontWeight: 700,
        color: colors.primaryStart,
        textDecoration: 'none',
    },
    navLinks: {
        display: 'flex',
        gap: '32px',
    },
    navLink: {
        fontSize: '16px',
        color: colors.text,
        textDecoration: 'none',
        transition: 'color 0.2s',
    },
    navActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    btnText: {
        fontSize: '16px',
        color: colors.text,
        textDecoration: 'none',
        padding: '8px 16px',
    },
    btnPrimary: {
        fontSize: '16px',
        fontWeight: 500,
        color: '#FFFFFF',
        background: colors.gradient,
        padding: '10px 20px',
        borderRadius: '8px',
        textDecoration: 'none',
        transition: 'opacity 0.2s',
    },

    // Hero
    hero: {
        paddingTop: '120px',
        paddingBottom: '80px',
        backgroundColor: colors.bg,
    },
    heroContent: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        textAlign: 'center' as const,
    },
    heroTitle: {
        fontSize: '48px',
        fontWeight: 600,
        color: colors.text,
        marginBottom: '24px',
        lineHeight: 1.2,
    },
    titleDynamic: {
        color: colors.accent,
        transition: 'opacity 0.3s ease',
    },
    heroDescription: {
        fontSize: '18px',
        color: colors.textMuted,
        maxWidth: '600px',
        margin: '0 auto 32px',
        lineHeight: 1.6,
    },
    heroCta: {
        marginBottom: '48px',
    },
    btnPrimaryLg: {
        display: 'inline-block',
        fontSize: '18px',
        fontWeight: 600,
        color: '#FFFFFF',
        background: colors.gradient,
        padding: '16px 32px',
        borderRadius: '8px',
        textDecoration: 'none',
        transition: 'opacity 0.2s, transform 0.2s',
    },
    heroStats: {
        display: 'flex',
        justifyContent: 'center',
        gap: '64px',
        marginBottom: '64px',
    },
    stat: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
    },
    statValue: {
        fontSize: '32px',
        fontWeight: 700,
        color: colors.text,
    },
    statLabel: {
        fontSize: '14px',
        color: colors.textMuted,
        marginTop: '4px',
    },
    heroVisual: {
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '0 24px',
    },
    screenshot: {
        width: '100%',
        height: 'auto',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
    },

    // Features
    features: {
        padding: '80px 0',
        backgroundColor: colors.surface,
    },
    sectionTitle: {
        fontSize: '32px',
        fontWeight: 600,
        color: colors.text,
        textAlign: 'center' as const,
        marginBottom: '48px',
    },
    featuresGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
    },
    featureCard: {
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        padding: '32px',
        transition: 'box-shadow 0.2s',
    },
    featureHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
    },
    featureIcon: {
        fontSize: '32px',
    },
    featureTitle: {
        fontSize: '18px',
        fontWeight: 600,
        color: colors.text,
    },
    featureBody: {},
    featureDescription: {
        fontSize: '14px',
        color: colors.textMuted,
        lineHeight: 1.6,
        marginBottom: '16px',
    },
    featureList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
    },
    featureListItem: {
        fontSize: '14px',
        color: colors.text,
        padding: '6px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    checkmark: {
        color: colors.accent,
        fontWeight: 600,
    },

    // Pricing
    pricing: {
        padding: '80px 0',
        backgroundColor: colors.bg,
    },
    pricingGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '24px',
    },
    pricingCard: {
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column' as const,
        position: 'relative' as const,
    },
    pricingCardRecommended: {
        border: `2px solid ${colors.accent}`,
    },
    planBadge: {
        position: 'absolute' as const,
        top: '-12px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: colors.accent,
        color: '#FFFFFF',
        fontSize: '12px',
        fontWeight: 600,
        padding: '4px 12px',
        borderRadius: '12px',
    },
    planHeader: {
        marginBottom: '16px',
    },
    planName: {
        fontSize: '18px',
        fontWeight: 600,
        color: colors.text,
    },
    planSubtitle: {
        fontSize: '14px',
        color: colors.textMuted,
        marginTop: '4px',
    },
    planPrice: {
        marginBottom: '24px',
    },
    priceValue: {
        fontSize: '32px',
        fontWeight: 700,
        color: colors.text,
    },
    pricePeriod: {
        fontSize: '16px',
        color: colors.textMuted,
    },
    planFeatures: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        flex: 1,
        marginBottom: '16px',
    },
    planFeatureItem: {
        fontSize: '14px',
        color: colors.text,
        padding: '6px 0',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
    },
    checkmarkGreen: {
        color: colors.accent,
        fontWeight: 600,
        flexShrink: 0,
    },
    planStorage: {
        fontSize: '14px',
        color: colors.textMuted,
        marginBottom: '16px',
        paddingTop: '16px',
        borderTop: `1px solid ${colors.border}`,
    },
    btnPlan: {
        display: 'block',
        textAlign: 'center' as const,
        padding: '14px 24px',
        fontSize: '16px',
        fontWeight: 500,
        color: colors.text,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        textDecoration: 'none',
        transition: 'background-color 0.2s',
    },
    btnPlanPrimary: {
        color: '#FFFFFF',
        background: colors.gradient,
        border: 'none',
    },

    // Trust
    trust: {
        padding: '80px 0',
        backgroundColor: colors.surface,
    },
    trustGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '32px',
    },
    trustItem: {
        textAlign: 'center' as const,
    },
    trustIcon: {
        fontSize: '48px',
        marginBottom: '16px',
    },
    trustTitle: {
        fontSize: '18px',
        fontWeight: 600,
        color: colors.text,
        marginBottom: '8px',
    },
    trustDescription: {
        fontSize: '14px',
        color: colors.textMuted,
        lineHeight: 1.5,
    },

    // CTA Final
    ctaFinal: {
        padding: '80px 0',
        background: colors.gradient,
    },
    ctaContent: {
        textAlign: 'center' as const,
    },
    ctaTitle: {
        fontSize: '32px',
        fontWeight: 600,
        color: '#FFFFFF',
        marginBottom: '16px',
    },
    ctaDescription: {
        fontSize: '18px',
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: '32px',
    },

    // Footer
    footer: {
        padding: '64px 0 32px',
        backgroundColor: colors.text,
    },
    footerGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '32px',
        marginBottom: '48px',
    },
    footerCol: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '12px',
    },
    footerHeading: {
        fontSize: '14px',
        fontWeight: 600,
        color: '#FFFFFF',
        marginBottom: '4px',
    },
    footerLink: {
        fontSize: '14px',
        color: 'rgba(255, 255, 255, 0.6)',
        textDecoration: 'none',
        transition: 'color 0.2s',
    },
    footerBottom: {
        paddingTop: '32px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        textAlign: 'center' as const,
    },
    footerCopyright: {
        fontSize: '14px',
        color: 'rgba(255, 255, 255, 0.4)',
    },
}

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function LandingPageV2() {
    return (
        <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            <Navbar />
            <HeroSection />
            <FeaturesSection />
            <PricingSection />
            <TrustSection />
            <CtaSection />
            <Footer />
        </div>
    )
}
