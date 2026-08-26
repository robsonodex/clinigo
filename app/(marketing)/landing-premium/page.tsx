"use client"

import { useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Check, ChevronRight, Play, Server, ShieldCheck, Globe, Users, Building2, Activity, ArrowRight, ScanFace, Sparkles, LayoutGrid, Zap, Lock, Calendar, Video, FileText, QrCode, Receipt, UserCircle, Fingerprint, Monitor, Tablet, Stethoscope, Smartphone, MessageCircle, PieChart } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import AudienceSelector from '@/components/sections/AudienceSelector'

export default function LandingPremium() {
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 200]);
    const y2 = useTransform(scrollY, [0, 500], [0, -150]);

    const [isLoginDropdownOpen, setIsLoginDropdownOpen] = useState(false)
    const [activeFeatureTab, setActiveFeatureTab] = useState<'recepcao' | 'atendimento' | 'tiss' | 'financas'>('recepcao')

    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'SoftwareApplication',
                '@id': 'https://clinigo.app/#software',
                'name': 'CliniGO',
                'applicationCategory': 'HealthApplication',
                'operatingSystem': 'Web, Windows, iOS, Android',
                'url': 'https://clinigo.app',
                'description': 'Software completo para gestão de clínicas e consultórios médicos. Prontuário eletrônico, agendamento online, faturamento TISS e check-in facial.',
                'image': 'https://clinigo.app/dashboard-preview.png',
                'offers': {
                    '@type': 'Offer',
                    'price': '99.00',
                    'priceCurrency': 'BRL',
                    'priceValidUntil': '2027-12-31',
                    'availability': 'https://schema.org/InStock',
                    'url': 'https://clinigo.app/#planos',
                },
                'aggregateRating': {
                    '@type': 'AggregateRating',
                    'ratingValue': '4.9',
                    'ratingCount': '128',
                    'reviewCount': '128',
                },
                'author': {
                    '@id': 'https://clinigo.app/#organization',
                },
            },
            {
                '@type': 'Organization',
                '@id': 'https://clinigo.app/#organization',
                'name': 'CliniGO Software Médico',
                'url': 'https://clinigo.app',
                'logo': 'https://clinigo.app/logo-clinigo.png',
                'sameAs': [
                    'https://clinigo.app',
                ],
                'contactPoint': {
                    '@type': 'ContactPoint',
                    'contactType': 'customer service',
                    'availableLanguage': 'Portuguese',
                },
            },
        ],
    }

    return (
        <div className="min-h-screen bg-navy-deep font-sans text-slate-300 selection:bg-teal-vibrant selection:text-white overflow-x-hidden">
            {/* JSON-LD Dados Estruturados para o Google */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* 1. NAVBAR PREMIUM - COM LOGO REAL */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-navy-deep/80 backdrop-blur-xl transition-all duration-300">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between relative">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                        <Image src="/logo-clinigo.png" alt="CliniGo" width={160} height={40} className="h-10 w-auto" />
                    </Link>

                    {/* Links no Centro (Apenas Desktop) */}
                    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
                        <a href="#funcionalidades" className="text-sm font-medium hover:text-teal-vibrant transition-colors">Funcionalidades</a>
                        <a href="#planos" className="text-sm font-medium hover:text-teal-vibrant transition-colors">Planos</a>
                    </div>

                    {/* Acesso Rápido Móvel (Exibido apenas em celulares) */}
                    <div className="flex md:hidden items-center gap-2">
                        <div className="relative">
                            <button 
                                onClick={() => setIsLoginDropdownOpen(!isLoginDropdownOpen)}
                                className="h-9 px-4 rounded-full border border-white/10 text-white bg-white/5 hover:bg-white/10 font-semibold text-xs transition-all flex items-center justify-center gap-1 active:scale-95"
                            >
                                Entrar
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isLoginDropdownOpen ? 'rotate-90' : ''}`} />
                            </button>

                            {isLoginDropdownOpen && (
                                <>
                                    {/* Backdrop para fechar ao clicar fora no mobile */}
                                    <div className="fixed inset-0 z-40" onClick={() => setIsLoginDropdownOpen(false)} />
                                    
                                    {/* Dropdown móvel */}
                                    <div className="absolute right-0 mt-2 w-48 rounded-xl bg-navy-deep/95 border border-white/10 p-1.5 shadow-[0_10px_25px_rgba(0,0,0,0.5)] backdrop-blur-xl z-50 flex flex-col gap-0.5">
                                        <Link 
                                            href="/clinica" 
                                            onClick={() => setIsLoginDropdownOpen(false)}
                                            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 text-slate-200 hover:text-white transition-all text-xs font-semibold"
                                        >
                                            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                                            Sou Clínica
                                        </Link>
                                        <Link 
                                            href="/medico" 
                                            onClick={() => setIsLoginDropdownOpen(false)}
                                            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 text-slate-200 hover:text-white transition-all text-xs font-semibold"
                                        >
                                            <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />
                                            Sou Médico
                                        </Link>
                                        <Link 
                                            href="/paciente" 
                                            onClick={() => setIsLoginDropdownOpen(false)}
                                            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 text-slate-200 hover:text-white transition-all text-xs font-semibold"
                                        >
                                            <UserCircle className="w-3.5 h-3.5 text-purple-400" />
                                            Sou Paciente
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>

                        <Link 
                            href="/trial" 
                            className="h-9 px-4 rounded-full bg-teal-vibrant text-navy-deep font-bold text-xs hover:bg-teal-vibrant-dark hover:text-white transition-all flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.2)] active:scale-95"
                        >
                            Testar grátis
                        </Link>
                    </div>

                    {/* Botões no Canto Direito (Desktop) */}
                    <div className="hidden md:flex items-center gap-4">
                        <div className="relative">
                            <button 
                                onClick={() => setIsLoginDropdownOpen(!isLoginDropdownOpen)}
                                className="h-10 px-5 rounded-full border border-white/10 text-white hover:bg-white/5 font-semibold text-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                            >
                                Entrar
                                <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isLoginDropdownOpen ? 'rotate-90' : ''}`} />
                            </button>

                            {isLoginDropdownOpen && (
                                <>
                                    {/* Backdrop para fechar ao clicar fora */}
                                    <div className="fixed inset-0 z-40" onClick={() => setIsLoginDropdownOpen(false)} />
                                    
                                    {/* Dropdown com opções Clínica, Médico e Paciente */}
                                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-navy-deep/95 border border-white/10 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl z-50 flex flex-col gap-1">
                                        <Link 
                                            href="/clinica" 
                                            onClick={() => setIsLoginDropdownOpen(false)}
                                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 text-slate-200 hover:text-white transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 transition-all">
                                                <Building2 className="w-4 h-4 text-emerald-400" />
                                            </div>
                                            <div className="flex flex-col text-left">
                                                <span className="text-xs font-semibold">Área da Clínica</span>
                                                <span className="text-[10px] text-slate-400 font-light">Sou Clínica / Gestor</span>
                                            </div>
                                        </Link>
                                        <Link 
                                            href="/medico" 
                                            onClick={() => setIsLoginDropdownOpen(false)}
                                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 text-slate-200 hover:text-white transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/30 transition-all">
                                                <Stethoscope className="w-4 h-4 text-cyan-400" />
                                            </div>
                                            <div className="flex flex-col text-left">
                                                <span className="text-xs font-semibold">Portal do Médico</span>
                                                <span className="text-[10px] text-slate-400 font-light">Sou Médico / Profissional</span>
                                            </div>
                                        </Link>
                                        <Link 
                                            href="/paciente" 
                                            onClick={() => setIsLoginDropdownOpen(false)}
                                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 text-slate-200 hover:text-white transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-500/20 group-hover:border-purple-500/30 transition-all">
                                                <UserCircle className="w-4 h-4 text-purple-400" />
                                            </div>
                                            <div className="flex flex-col text-left">
                                                <span className="text-xs font-semibold">Portal do Paciente</span>
                                                <span className="text-[10px] text-slate-400 font-light">Sou Paciente / Cliente</span>
                                            </div>
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>

                        <Link 
                            href="/trial" 
                            className="h-10 px-6 rounded-full bg-teal-vibrant text-navy-deep font-bold text-sm hover:bg-teal-vibrant-dark hover:text-white transition-all flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.2)] hover:shadow-[0_0_30px_rgba(20,184,166,0.3)]"
                        >
                            Testar grátis
                        </Link>
                    </div>
                </div>
            </nav>

            {/* 2. HERO SECTION - SPLIT LAYOUT (TEXTO ESQUERDA, DASHBOARD DIREITA) */}
            <main className="pt-32 pb-20 relative overflow-hidden">
                {/* Background Glows Premium */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-teal-vibrant/5 rounded-full blur-[120px] -z-10 animate-pulse" />
                <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] -z-10" />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                        {/* LADO ESQUERDO - TEXTO */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="flex-1 text-left"
                        >
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight leading-[1.1]">
                                Sistema para Gestão de{' '}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-vibrant via-teal-200 to-white">
                                    Clínicas e Consultórios
                                </span>{' '}
                                <span className="relative inline-block">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-vibrant via-teal-200 to-white">All-in-One</span>
                                    <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-gradient-to-r from-teal-vibrant via-teal-200 to-transparent rounded-full" />
                                </span>
                            </h1>
                            <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-10 leading-relaxed font-light">
                                Do agendamento ao prontuário, do check-in ao faturamento. Tudo integrado, tudo automático — para você focar no que importa: <strong className="text-teal-vibrant font-semibold">cuidar de quem precisa.</strong>
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link href="/trial" className="h-14 px-8 rounded-full bg-teal-vibrant text-navy-deep font-bold text-lg hover:bg-teal-vibrant-dark hover:text-white transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)] flex items-center justify-center gap-2">
                                    Testar Grátis por 7 dias
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                            </div>
                        </motion.div>

                        {/* LADO DIREITO - DASHBOARD IMAGE */}
                        <motion.div
                            initial={{ opacity: 0, x: 60, rotateY: -10 }}
                            animate={{ opacity: 1, x: 0, rotateY: 0 }}
                            transition={{ duration: 1, delay: 0.2, type: "spring", stiffness: 50 }}
                            className="flex-1 relative max-w-2xl w-full"
                        >
                            {/* Animação Premium Atrás do Dashboard */}
                            <div className="absolute -inset-12 pointer-events-none" style={{ zIndex: 0 }}>
                                {/* Glow Central Pulsante */}
                                <motion.div
                                    className="absolute rounded-full"
                                    style={{
                                        top: '50%',
                                        left: '50%',
                                        width: '140%',
                                        height: '140%',
                                        transform: 'translate(-50%, -50%)',
                                        background: 'radial-gradient(circle, rgba(20, 184, 166, 0.3) 0%, rgba(20, 184, 166, 0.15) 40%, transparent 70%)',
                                        filter: 'blur(40px)',
                                    }}
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        opacity: [0.7, 1, 0.7]
                                    }}
                                    transition={{
                                        duration: 5,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                />

                                {/* Orb Flutuante 1 - Superior Direita */}
                                <motion.div
                                    className="absolute rounded-full"
                                    style={{
                                        top: '-30px',
                                        right: '-30px',
                                        width: '200px',
                                        height: '200px',
                                        background: 'radial-gradient(circle, rgba(45, 212, 191, 0.5) 0%, rgba(45, 212, 191, 0.2) 50%, transparent 70%)',
                                        filter: 'blur(30px)',
                                    }}
                                    animate={{
                                        y: [0, -25, 0],
                                        x: [0, 20, 0],
                                        opacity: [0.6, 1, 0.6]
                                    }}
                                    transition={{
                                        duration: 7,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                />

                                {/* Orb Flutuante 2 - Inferior Esquerda */}
                                <motion.div
                                    className="absolute rounded-full"
                                    style={{
                                        bottom: '-40px',
                                        left: '-40px',
                                        width: '220px',
                                        height: '220px',
                                        background: 'radial-gradient(circle, rgba(34, 211, 238, 0.45) 0%, rgba(34, 211, 238, 0.15) 50%, transparent 70%)',
                                        filter: 'blur(35px)',
                                    }}
                                    animate={{
                                        y: [0, 30, 0],
                                        x: [0, -20, 0],
                                        opacity: [0.5, 0.9, 0.5]
                                    }}
                                    transition={{
                                        duration: 9,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: 1
                                    }}
                                />

                                {/* Orb Flutuante 3 - Centro Superior */}
                                <motion.div
                                    className="absolute rounded-full"
                                    style={{
                                        top: '-20px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: '160px',
                                        height: '160px',
                                        background: 'radial-gradient(circle, rgba(94, 234, 212, 0.4) 0%, rgba(94, 234, 212, 0.15) 50%, transparent 70%)',
                                        filter: 'blur(25px)',
                                    }}
                                    animate={{
                                        y: [0, -15, 0],
                                        opacity: [0.4, 0.8, 0.4]
                                    }}
                                    transition={{
                                        duration: 6,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: 2
                                    }}
                                />
                            </div>

                            {/* Dashboard Screenshot */}
                            <div className="rounded-2xl shadow-2xl overflow-hidden border border-slate-700/30 relative" style={{ zIndex: 10 }}>
                                {/* Borda Brilhante Animada */}
                                <motion.div
                                    className="absolute inset-0 rounded-2xl pointer-events-none"
                                    style={{
                                        zIndex: 20,
                                        boxShadow: '0 0 50px rgba(20, 184, 166, 0.25), 0 0 100px rgba(20, 184, 166, 0.15), inset 0 0 3px rgba(20, 184, 166, 0.5)'
                                    }}
                                    animate={{
                                        opacity: [0.5, 1, 0.5]
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                />
                                <Image
                                    src="/agenda-preview-premium.png"
                                    alt="CliniGo Dashboard - Sistema de Gestão para Clínicas"
                                    width={800}
                                    height={500}
                                    className="w-full h-auto"
                                            priority
                                />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </main>

            {/* SEÇÃO PARA QUEM É O CLINIGO */}
            <AudienceSelector />

            {/* SHOWCASE DE RECURSOS - BENTO-TABS PREMIUM */}
            <section id="funcionalidades" className="py-24 container mx-auto px-4 border-t border-slate-800/30">
                <div className="text-center mb-16">
                    <span className="text-teal-vibrant font-semibold tracking-wider uppercase text-sm mb-3 block">Recursos Integrados</span>
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                        Tudo que sua clínica precisa. <br /><span className="text-teal-vibrant">Em um único sistema.</span>
                    </h2>
                </div>

                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                    {/* MENU DE ABAS (ESQUERDA) */}
                    <div className="lg:col-span-4 flex flex-col gap-3">
                        <button
                            onClick={() => setActiveFeatureTab('recepcao')}
                            className={`p-5 rounded-2xl border text-left transition-all duration-300 flex items-start gap-4 ${
                                activeFeatureTab === 'recepcao'
                                    ? 'bg-teal-vibrant/10 border-teal-vibrant/40 shadow-[0_0_20px_rgba(20,184,166,0.1)]'
                                    : 'bg-navy-deep-light border-slate-800 hover:border-slate-700'
                            }`}
                        >
                            <div className={`p-2.5 rounded-xl border transition-colors ${
                                activeFeatureTab === 'recepcao'
                                    ? 'bg-teal-vibrant/20 border-teal-vibrant/30 text-teal-vibrant'
                                    : 'bg-[#060a13] border-slate-800 text-slate-400'
                            }`}>
                                <ScanFace className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white mb-1">Recepção do Futuro</h3>
                                <p className="text-slate-400 text-xs leading-relaxed">Check-in facial por biometria e totem automatizado.</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveFeatureTab('atendimento')}
                            className={`p-5 rounded-2xl border text-left transition-all duration-300 flex items-start gap-4 ${
                                activeFeatureTab === 'atendimento'
                                    ? 'bg-teal-vibrant/10 border-teal-vibrant/40 shadow-[0_0_20px_rgba(20,184,166,0.1)]'
                                    : 'bg-navy-deep-light border-slate-800 hover:border-slate-700'
                            }`}
                        >
                            <div className={`p-2.5 rounded-xl border transition-colors ${
                                activeFeatureTab === 'atendimento'
                                    ? 'bg-teal-vibrant/20 border-teal-vibrant/30 text-teal-vibrant'
                                    : 'bg-[#060a13] border-slate-800 text-slate-400'
                            }`}>
                                <Fingerprint className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white mb-1">Atendimento Clínico</h3>
                                <p className="text-slate-400 text-xs leading-relaxed">Prontuário eletrônico de alta performance e telemedicina.</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveFeatureTab('tiss')}
                            className={`p-5 rounded-2xl border text-left transition-all duration-300 flex items-start gap-4 ${
                                activeFeatureTab === 'tiss'
                                    ? 'bg-teal-vibrant/10 border-teal-vibrant/40 shadow-[0_0_20px_rgba(20,184,166,0.1)]'
                                    : 'bg-navy-deep-light border-slate-800 hover:border-slate-700'
                            }`}
                        >
                            <div className={`p-2.5 rounded-xl border transition-colors ${
                                activeFeatureTab === 'tiss'
                                    ? 'bg-teal-vibrant/20 border-teal-vibrant/30 text-teal-vibrant'
                                    : 'bg-[#060a13] border-slate-800 text-slate-400'
                            }`}>
                                <Receipt className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white mb-1">Faturamento TISS</h3>
                                <p className="text-slate-400 text-xs leading-relaxed">Emissão de guias e exportação de lotes XML para convênios.</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveFeatureTab('financas')}
                            className={`p-5 rounded-2xl border text-left transition-all duration-300 flex items-start gap-4 ${
                                activeFeatureTab === 'financas'
                                    ? 'bg-teal-vibrant/10 border-teal-vibrant/40 shadow-[0_0_20px_rgba(20,184,166,0.1)]'
                                    : 'bg-navy-deep-light border-slate-800 hover:border-slate-700'
                            }`}
                        >
                            <div className={`p-2.5 rounded-xl border transition-colors ${
                                activeFeatureTab === 'financas'
                                    ? 'bg-teal-vibrant/20 border-teal-vibrant/30 text-teal-vibrant'
                                    : 'bg-[#060a13] border-slate-800 text-slate-400'
                            }`}>
                                <PieChart className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white mb-1">Financeiro & WhatsApp</h3>
                                <p className="text-slate-400 text-xs leading-relaxed">Split de honorários automatizado e lembretes integrados.</p>
                            </div>
                        </button>
                    </div>

                    {/* PAINEL DE CONTEÚDO (DIREITA) */}
                    <div className="lg:col-span-8 bg-navy-deep-light border border-slate-850 rounded-3xl p-8 lg:p-12 flex flex-col justify-center min-h-[380px]">
                        {/* 1. RECEPÇÃO DO FUTURO */}
                        {activeFeatureTab === 'recepcao' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full"
                            >
                                <div className="flex flex-col justify-center">
                                    <span className="text-teal-vibrant font-semibold text-xs tracking-wider uppercase mb-2 block">Exclusividade CliniGo</span>
                                    <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4 leading-tight">Check-in por Biometria Facial</h3>
                                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                        Identificação imediata e segura do paciente no momento da chegada, reduzindo o tempo de espera a zero.
                                    </p>
                                    <ul className="space-y-3.5">
                                        <li className="flex items-start gap-2.5 text-slate-300 text-sm">
                                            <Check className="w-4 h-4 text-teal-vibrant mt-0.5 flex-shrink-0" />
                                            <div>
                                                <strong className="text-white block font-medium">Reconhecimento Biométrico Facial</strong>
                                                O único sistema do Brasil com validação automática de presença.
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-2.5 text-slate-300 text-sm">
                                            <Check className="w-4 h-4 text-teal-vibrant mt-0.5 flex-shrink-0" />
                                            <div>
                                                <strong className="text-white block font-medium">Totem de Autoatendimento</strong>
                                                Triagem autônoma de senhas (Geral e Preferencial).
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-2.5 text-slate-300 text-sm">
                                            <Check className="w-4 h-4 text-teal-vibrant mt-0.5 flex-shrink-0" />
                                            <div>
                                                <strong className="text-white block font-medium">Painel de TV com Voz Sintética</strong>
                                                Chamada inteligente em tempo real e de fácil vocalização.
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                                <div className="flex items-center justify-center p-4 bg-navy-deep/40 rounded-2xl border border-slate-900/60 h-80 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-teal-vibrant/5 z-0" />
                                    <div className="relative w-40 h-40 rounded-2xl border border-slate-800 bg-[#060a13] overflow-hidden flex flex-col items-center justify-center">
                                        <motion.div
                                            className="absolute inset-0 bg-teal-vibrant/5 z-0"
                                            animate={{ opacity: [0.2, 0.5, 0.2] }}
                                            transition={{ duration: 3, repeat: Infinity }}
                                        />
                                        <ScanFace className="w-20 h-20 text-teal-vibrant/50 group-hover:text-teal-vibrant/80 transition-all duration-500 z-10" />
                                        <motion.div
                                            className="absolute w-full h-0.5 bg-teal-vibrant shadow-[0_0_10px_#14b8a6] z-20 top-0"
                                            animate={{ top: ["0%", "100%", "0%"] }}
                                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                        />
                                        <div className="absolute inset-3 border border-teal-vibrant/20 rounded-xl z-10 flex flex-col justify-between p-1">
                                            <div className="flex justify-between">
                                                <div className="w-1.5 h-1.5 border-t border-l border-teal-vibrant" />
                                                <div className="w-1.5 h-1.5 border-t border-r border-teal-vibrant" />
                                            </div>
                                            <div className="flex justify-between">
                                                <div className="w-1.5 h-1.5 border-b border-l border-teal-vibrant" />
                                                <div className="w-1.5 h-1.5 border-b border-r border-teal-vibrant" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-6 left-0 right-0 text-center z-30">
                                        <div className="inline-block bg-teal-vibrant/20 backdrop-blur-md border border-teal-vibrant/30 rounded-full px-3 py-1 text-teal-vibrant text-[9px] font-bold tracking-widest uppercase">
                                            Reconhecimento Ativo
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* 2. ATENDIMENTO CLÍNICO */}
                        {activeFeatureTab === 'atendimento' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full"
                            >
                                <div className="flex flex-col justify-center">
                                    <span className="text-teal-vibrant font-semibold text-xs tracking-wider uppercase mb-2 block">Alta Performance</span>
                                    <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4 leading-tight">Prontuário Inteligente e Telemedicina</h3>
                                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                        Evoluções em menos de 1 minuto com assinatura digital qualificada e consultas em vídeo HD.
                                    </p>
                                    <ul className="space-y-3.5">
                                        <li className="flex items-start gap-2.5 text-slate-300 text-sm">
                                            <Check className="w-4 h-4 text-teal-vibrant mt-0.5 flex-shrink-0" />
                                            <div>
                                                <strong className="text-white block font-medium">Modelos SOAP, CIF e DAP</strong>
                                                Evoluções focadas na sua especialidade para ganhar tempo.
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-2.5 text-slate-300 text-sm">
                                            <Check className="w-4 h-4 text-teal-vibrant mt-0.5 flex-shrink-0" />
                                            <div>
                                                <strong className="text-white block font-medium">Assinatura Digital ICP-Brasil</strong>
                                                Máxima segurança jurídica com certificados tipo A1.
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-2.5 text-slate-300 text-sm">
                                            <Check className="w-4 h-4 text-teal-vibrant mt-0.5 flex-shrink-0" />
                                            <div>
                                                <strong className="text-white block font-medium">Teleconsulta WebRTC Integrada</strong>
                                                Sala virtual estável direto no prontuário, sem softwares externos.
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                                <div className="flex flex-col justify-between p-6 bg-[#060a13] rounded-2xl border border-slate-900/60 h-80 relative overflow-hidden">
                                    <div className="flex justify-between items-center pb-3 border-b border-slate-800/60">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] text-slate-400 font-medium">Teleconsulta Ativa</span>
                                        </div>
                                        <div className="bg-teal-vibrant/10 text-teal-vibrant px-2 py-0.5 rounded text-[8px] font-bold uppercase border border-teal-vibrant/20">
                                            ICP-Brasil
                                        </div>
                                    </div>
                                    <div className="flex-1 py-4 text-left">
                                        <p className="text-[10px] text-teal-200/80 uppercase font-bold tracking-wider mb-1">Evolução do Paciente</p>
                                        <div className="bg-navy-deep/60 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-300 leading-relaxed font-mono">
                                            [Subjetivo] Paciente relata melhora nas dores após exercícios...
                                            <span className="inline-block w-1.5 h-3 bg-teal-vibrant ml-1 animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                                            <Fingerprint className="w-4 h-4 text-teal-vibrant" /> Assinatura digital autorizada
                                        </div>
                                        <span className="text-[9px] text-slate-500">Documento Imutável</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* 3. FATURAMENTO TISS */}
                        {activeFeatureTab === 'tiss' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full"
                            >
                                <div className="flex flex-col justify-center">
                                    <span className="text-teal-vibrant font-semibold text-xs tracking-wider uppercase mb-2 block">Gestão de Convênios</span>
                                    <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4 leading-tight">Faturamento TISS Simplificado</h3>
                                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                        Reduza glosas médicas e burocracias na emissão e validação de guias conforme padrão da ANS.
                                    </p>
                                    <ul className="space-y-3.5">
                                        <li className="flex items-start gap-2.5 text-slate-300 text-sm">
                                            <Check className="w-4 h-4 text-teal-vibrant mt-0.5 flex-shrink-0" />
                                            <div>
                                                <strong className="text-white block font-medium">Lotes XML Automáticos</strong>
                                                Exportação em conformidade imediata com a versão v4.01.00.
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-2.5 text-slate-300 text-sm">
                                            <Check className="w-4 h-4 text-teal-vibrant mt-0.5 flex-shrink-0" />
                                            <div>
                                                <strong className="text-white block font-medium">Auditor Inteligente de Glosas</strong>
                                                Alertas rápidos de erros cadastrais antes do envio da fatura.
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-2.5 text-slate-300 text-sm">
                                            <Check className="w-4 h-4 text-teal-vibrant mt-0.5 flex-shrink-0" />
                                            <div>
                                                <strong className="text-white block font-medium">Elegibilidade Online</strong>
                                                Consulte a situação do beneficiário na operadora com 1 clique.
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                                <div className="flex flex-col justify-between p-6 bg-[#060a13] rounded-2xl border border-slate-900/60 h-80 relative overflow-hidden text-left">
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Validador de Lote TISS</span>
                                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">100% Validado</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[11px] bg-navy-deep/60 p-2.5 rounded border border-slate-800">
                                                <span className="text-slate-400">Verificação XSD ANS</span>
                                                <span className="text-emerald-400 font-mono font-semibold">Sucesso [v4.01.00]</span>
                                            </div>
                                            <div className="flex justify-between text-[11px] bg-navy-deep/60 p-2.5 rounded border border-slate-800">
                                                <span className="text-slate-400">Campos Obrigatórios</span>
                                                <span className="text-emerald-400 font-mono font-semibold">OK (15/15)</span>
                                            </div>
                                            <div className="flex justify-between text-[11px] bg-navy-deep/60 p-2.5 rounded border border-slate-800">
                                                <span className="text-slate-400">Elegibilidade Geral</span>
                                                <span className="text-emerald-400 font-mono font-semibold">Confirmada</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-teal-vibrant/5 border border-teal-vibrant/20 p-2.5 rounded-xl text-center">
                                        <span className="text-[10px] text-teal-200">XML pronto para download e envio à Operadora</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* 4. FINANCEIRO & WHATSAPP */}
                        {activeFeatureTab === 'financas' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full"
                            >
                                <div className="flex flex-col justify-center">
                                    <span className="text-teal-vibrant font-semibold text-xs tracking-wider uppercase mb-2 block">Gestão Integrada</span>
                                    <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4 leading-tight">Split Financeiro e WhatsApp Nativo</h3>
                                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                        Automatize a divisão das receitas da clínica com profissionais de saúde e lembretes automáticos para pacientes.
                                    </p>
                                    <ul className="space-y-3.5">
                                        <li className="flex items-start gap-2.5 text-slate-300 text-sm">
                                            <Check className="w-4 h-4 text-teal-vibrant mt-0.5 flex-shrink-0" />
                                            <div>
                                                <strong className="text-white block font-medium">Repasse (Split) de Honorários</strong>
                                                Cálculo e pagamento automático baseado na agenda e convênios.
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-2.5 text-slate-300 text-sm">
                                            <Check className="w-4 h-4 text-teal-vibrant mt-0.5 flex-shrink-0" />
                                            <div>
                                                <strong className="text-white block font-medium">WhatsApp via QR Code</strong>
                                                Lembretes, confirmações de consulta e receitas automáticos.
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-2.5 text-slate-300 text-sm">
                                            <Check className="w-4 h-4 text-teal-vibrant mt-0.5 flex-shrink-0" />
                                            <div>
                                                <strong className="text-white block font-medium">DRE e Fluxo de Caixa Dinâmico</strong>
                                                Visão exata do lucro líquido da sua clínica em tempo real.
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                                <div className="flex flex-col justify-between p-6 bg-[#060a13] rounded-2xl border border-slate-900/60 h-80 relative overflow-hidden text-left">
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Painel Financeiro & Split</span>
                                            <span className="text-[10px] text-teal-vibrant font-semibold">Repasse Automático</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div className="bg-navy-deep/60 p-2.5 rounded border border-slate-800">
                                                <span className="text-[9px] text-slate-400 block mb-0.5">Receita Total</span>
                                                <span className="text-[13px] text-white font-bold font-mono">R$ 48.520,00</span>
                                            </div>
                                            <div className="bg-navy-deep/60 p-2.5 rounded border border-slate-800">
                                                <span className="text-[9px] text-slate-400 block mb-0.5">Total Repassado</span>
                                                <span className="text-[13px] text-teal-vibrant font-bold font-mono">R$ 29.112,00</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-[10px] bg-slate-900/30 p-2 rounded">
                                                <span className="text-slate-300">Dra. Amanda Silva (60%)</span>
                                                <span className="text-white font-mono">R$ 2.400,00</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] bg-slate-900/30 p-2 rounded">
                                                <span className="text-slate-300">Dr. Rodrigo Souza (55%)</span>
                                                <span className="text-white font-mono">R$ 1.925,00</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[9px] text-slate-400">
                                        <span>Último Lembrete WhatsApp enviado há 4m</span>
                                        <span className="text-emerald-400 flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Conectado
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </section>

            {/* PRICING SECTION - CORRIGIDO E FINAL */}
            <section id="planos" className="py-24 relative container mx-auto px-4 border-t border-slate-800/30">
                <div className="text-center mb-16">
                    <span className="text-teal-vibrant font-semibold tracking-wider uppercase text-sm mb-3 block">Planos Transparentes</span>
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                        Escolha o plano ideal para sua <br /><span className="text-teal-vibrant">fase de crescimento</span>
                    </h2>
                    <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                        Sem fidelidade. Cancele quando quiser.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">

                    {/* PLANO BÁSICO */}
                    <div className="bg-navy-deep-light border border-slate-800 rounded-2xl p-8 flex flex-col hover:border-slate-700 transition-colors">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">CliniGo Básico</h3>
                        <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-sm text-slate-500">R$</span>
                            <span className="text-4xl font-bold text-white">149</span>
                            <span className="text-sm text-slate-500">/mês</span>
                        </div>
                        <p className="text-sm text-slate-400 mb-6 pb-6 border-b border-slate-800">Ideal para profissionais independentes e consultórios individuais</p>

                        <div className="flex-1 mb-5">
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2 text-xs text-slate-300">
                                    <Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> 1 profissional
                                </li>
                                <li className="flex items-center gap-2 text-xs text-slate-300">
                                    <Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Consultas ilimitadas
                                </li>
                                <li className="flex items-center gap-2 text-xs text-slate-300">
                                    <Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Agenda anti-overbooking
                                </li>
                                <li className="flex items-center gap-2 text-xs text-slate-300">
                                    <Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Prontuário eletrônico
                                </li>
                            </ul>

                            <details className="mt-3 group">
                                <summary className="flex items-center gap-1 text-xs text-teal-vibrant font-medium cursor-pointer hover:underline list-none">
                                    <span className="group-open:hidden">+ Ver todas</span>
                                    <span className="hidden group-open:block">- Ver menos</span>
                                </summary>
                                <ul className="space-y-2 mt-2 pt-2 border-t border-slate-800/50">
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Check-in manual</li>
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Financeiro básico</li>
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Relatórios básicos</li>
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> E-mail transacional</li>
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Suporte padrão</li>
                                </ul>
                            </details>
                        </div>

                        <Link href="/cadastro" className="w-full h-12 rounded-lg border border-slate-700 text-white text-base font-semibold hover:bg-slate-800 transition-all flex items-center justify-center">
                            Começar Agora
                        </Link>
                    </div>

                    {/* PLANO AVANÇADO (DESTAQUE) */}
                    <div className="bg-navy-deep/50 border-2 border-teal-vibrant rounded-2xl p-8 flex flex-col relative shadow-[0_0_30px_rgba(20,184,166,0.1)] transform md:-translate-y-4">
                        <div className="absolute top-0 transform -translate-y-1/2 left-1/2 -translate-x-1/2">
                            <span className="bg-teal-vibrant text-navy-deep text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide shadow-lg">
                                Mais Escolhido
                            </span>
                        </div>

                        <h3 className="text-sm font-bold text-teal-vibrant uppercase tracking-widest mb-4">CliniGo Avançado</h3>
                        <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-sm text-slate-500">R$</span>
                            <span className="text-4xl font-bold text-white">249</span>
                            <span className="text-sm text-slate-500">/mês</span>
                        </div>
                        <p className="text-sm text-slate-400 mb-6 pb-6 border-b border-slate-800">Excelente para clínicas e centros consolidados</p>

                        <div className="flex-1 mb-5">
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2 text-xs text-white font-medium">
                                    <Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Até 5 profissionais
                                </li>
                                <li className="flex items-center gap-2 text-xs text-white font-medium">
                                    <Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Tudo do Básico +
                                </li>
                                <li className="flex items-center gap-2 text-xs text-white font-medium">
                                    <Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Teleconsulta WebRTC
                                </li>
                                <li className="flex items-center gap-2 text-xs text-white font-medium">
                                    <Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Check-in QR Code
                                </li>
                                <li className="flex items-center gap-2 text-xs text-white font-medium">
                                    <Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Assinatura ICP-Brasil no PEP
                                </li>
                            </ul>

                            <details className="mt-3 group">
                                <summary className="flex items-center gap-1 text-xs text-teal-vibrant font-medium cursor-pointer hover:underline list-none">
                                    <span className="group-open:hidden">+ Ver todas</span>
                                    <span className="hidden group-open:block">- Ver menos</span>
                                </summary>
                                <ul className="space-y-2 mt-2 pt-2 border-t border-slate-800/50">
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> DRE + Repasse de Honorários</li>
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Fluxo de Caixa</li>
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Templates customizados</li>
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Relatórios avançados</li>
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Lembretes automáticos</li>
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Suporte prioritário</li>
                                </ul>
                            </details>
                        </div>

                        <Link href="/cadastro" className="w-full h-12 rounded-lg bg-teal-vibrant text-white text-base font-semibold hover:bg-teal-vibrant-dark transition-all flex items-center justify-center shadow-lg shadow-teal-vibrant/20">
                            Começar Agora
                        </Link>
                    </div>

                    {/* PLANO PROFESSIONAL */}
                    <div className="bg-navy-deep-light border border-slate-800 rounded-2xl p-8 flex flex-col hover:border-slate-700 transition-colors">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">CliniGo Professional</h3>
                        <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-sm text-slate-500">R$</span>
                            <span className="text-4xl font-bold text-white">449</span>
                            <span className="text-sm text-slate-500">/mês</span>
                        </div>
                        <p className="text-sm text-slate-400 mb-6 pb-6 border-b border-slate-800">Completo para consultórios e clínicas multiprofissionais</p>

                        <div className="flex-1 mb-5">
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2 text-xs text-slate-300">
                                    <Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Até 30 profissionais
                                </li>
                                <li className="flex items-center gap-2 text-xs text-slate-300">
                                    <Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Consultas ilimitadas
                                </li>
                                <li className="flex items-center gap-2 text-xs text-slate-300">
                                    <Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Tudo do Avançado +
                                </li>

                            </ul>

                            <details className="mt-3 group">
                                <summary className="flex items-center gap-1 text-xs text-teal-vibrant font-medium cursor-pointer hover:underline list-none">
                                    <span className="group-open:hidden">+ Ver todas</span>
                                    <span className="hidden group-open:block">- Ver menos</span>
                                </summary>
                                <ul className="space-y-2 mt-2 pt-2 border-t border-slate-800/50">
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> TISS completo</li>
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Check-in Facial</li>
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Totem de Auto Atendimento</li>
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Auditoria financeira</li>
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Dashboards customizados</li>
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> API/Webhooks</li>
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> SLA 99.5%</li>
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Suporte 24/7</li>
                                </ul>
                            </details>
                        </div>

                        <Link href="/cadastro" className="w-full h-12 rounded-lg border border-slate-700 text-white text-base font-semibold hover:bg-slate-800 transition-all flex items-center justify-center">
                            Começar Agora
                        </Link>
                    </div>

                </div>

                {/* PLANO ENTERPRISE - SEÇÃO DEDICADA ABAIXO */}
                <div className="max-w-4xl mx-auto mt-12">
                    <div className="bg-gradient-to-r from-navy-deep-light to-[#0f172a] border border-slate-700 rounded-2xl p-8 md:p-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-vibrant/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                            {/* Cabeçalho Enterprise */}
                            <div className="md:w-1/3">
                                <h3 className="text-sm font-bold text-teal-vibrant uppercase tracking-widest mb-4">CliniGo Enterprise</h3>
                                <div className="mb-2">
                                    <span className="text-sm text-slate-500 block mb-1">A partir de</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm text-slate-500">R$</span>
                                        <span className="text-4xl md:text-5xl font-bold text-white">699</span>
                                        <span className="text-sm text-slate-500">/mês</span>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-400 mb-6">Solução sob demanda para grandes operações de saúde</p>
                                <Link href="/cadastro" className="w-full h-12 rounded-lg bg-white/5 border border-white/10 text-white text-base font-semibold hover:bg-white/10 hover:border-teal-vibrant/30 transition-all flex items-center justify-center">
                                    Começar Agora
                                </Link>
                            </div>

                            {/* Lista de Features Enterprise */}
                            <div className="md:w-2/3 md:border-l md:border-slate-800 md:pl-8">
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
                                    <li className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
                                        <Check className="w-4 h-4 text-teal-vibrant flex-shrink-0" /> Profissionais ilimitados
                                    </li>
                                    <li className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
                                        <Check className="w-4 h-4 text-teal-vibrant flex-shrink-0" /> Tudo do Professional +
                                    </li>

                                    <li className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
                                        <Check className="w-4 h-4 text-teal-vibrant flex-shrink-0" /> Portal Super Admin
                                    </li>
                                    <li className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
                                        <Check className="w-4 h-4 text-teal-vibrant flex-shrink-0" /> Gestão centralizada
                                    </li>
                                    <li className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
                                        <Check className="w-4 h-4 text-teal-vibrant flex-shrink-0" /> Analytics global
                                    </li>
                                    <li className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
                                        <Check className="w-4 h-4 text-teal-vibrant flex-shrink-0" /> Migração dedicada
                                    </li>
                                    <li className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
                                        <Check className="w-4 h-4 text-teal-vibrant flex-shrink-0" /> Atendimento direto
                                    </li>
                                    <li className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
                                        <Check className="w-4 h-4 text-teal-vibrant flex-shrink-0" /> Consultoria de implantação
                                    </li>
                                    <li className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
                                        <Check className="w-4 h-4 text-teal-vibrant flex-shrink-0" /> SLA garantido 99.5%
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* DICA DISCRETA - SITE */}
                    <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-3 text-sm">
                        <span className="text-slate-500">Sua clínica ainda não possui um site profissional?</span>
                        <Link href="/site" className="text-teal-vibrant font-semibold hover:text-teal-300 transition-colors flex items-center gap-1 group">
                            Conheça nossa solução de sites
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>


                </div>
            </section>

            {/* TESTIMONIALS - AVALIAÇÕES COMPACTAS */}
            <section id="beneficios" className="py-12 relative overflow-hidden">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">O que nossos clientes dizem</h2>
                        <p className="text-slate-400 text-sm">Histórias reais de clínicas que transformaram sua gestão</p>
                    </div>

                    {/* Carousel Container */}
                    <div className="relative overflow-hidden">
                        <motion.div
                            className="flex gap-4"
                            animate={{ x: ["0%", "-50%"] }}
                            transition={{ x: { duration: 25, repeat: Infinity, repeatType: "loop", ease: "linear" } }}
                        >
                            {/* Testimonial List Map */}
                            {[
                                {
                                    quote: "O Check-in Facial eliminou as filas da recepção. O paciente chega, olha para a câmera e já está confirmado. Nunca vi nada igual no Brasil.",
                                    name: "Dr. Henrique Bastos",
                                    role: "Ortopedista | BA",
                                    initials: "HB"
                                },
                                {
                                    quote: "Instalamos o Totem de Auto Atendimento e a recepcionista agora foca no acolhimento, não em burocracia. Os pacientes adoram a autonomia.",
                                    name: "Dra. Carolina Mendes",
                                    role: "Diretora Clínica | RJ",
                                    initials: "CM"
                                },
                                {
                                    quote: "O Painel de TV na recepção deu outro nível para a clínica. O paciente vê seu nome na tela e já sabe para qual consultório ir. Zero confusão.",
                                    name: "Dr. Rafael Duarte",
                                    role: "Cardiologista | MG",
                                    initials: "RD"
                                },
                                {
                                    quote: "Com o Check-in por QR Code, 70% dos pacientes já chegam com o pré-cadastro feito. A recepção ficou muito mais ágil e organizada.",
                                    name: "Dra. Patrícia Nunes",
                                    role: "Pediatra | PR",
                                    initials: "PN"
                                },
                                {
                                    quote: "A agenda anti-overbooking acabou com os conflitos de horário. E o prontuário eletrônico é completo e rápido de preencher.",
                                    name: "Dr. Thiago Cardoso",
                                    role: "Psiquiatra | SC",
                                    initials: "TC"
                                },
                                {
                                    quote: "O faturamento TISS integrado economiza 3 dias por mês da minha equipe. Gerar XML e validar com a operadora é automático agora.",
                                    name: "Dra. Larissa Monteiro",
                                    role: "Ginecologista | GO",
                                    initials: "LM"
                                },
                                {
                                    quote: "A teleconsulta WebRTC integrada ao prontuário mudou tudo. Atendo de qualquer lugar com vídeo HD e o histórico do paciente na tela.",
                                    name: "Dr. Gustavo Ferreira",
                                    role: "Endocrinologista | RS",
                                    initials: "GF"
                                },
                                {
                                    quote: "O controle financeiro com DRE e repasse médico me deu visibilidade total. Descobri que estava perdendo 20% em glosas!",
                                    name: "Dra. Fernanda Oliveira",
                                    role: "Dermatologista | MG",
                                    initials: "FO"
                                }
                            ].map((testimonial, index) => (
                                <div key={index} className="flex-shrink-0 w-[280px] bg-navy-deep-light border border-slate-800 rounded-xl p-4">
                                    <div className="flex gap-0.5 mb-2">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <svg key={i} className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
                                        ))}
                                    </div>
                                    <p className="text-slate-300 text-xs mb-3 italic leading-relaxed">
                                        &quot;{testimonial.quote}&quot;
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-teal-vibrant/20 flex items-center justify-center text-teal-vibrant text-[10px] font-bold">{testimonial.initials}</div>
                                        <div>
                                            <div className="text-white text-xs font-medium">{testimonial.name}</div>
                                            <div className="text-slate-500 text-[10px]">{testimonial.role}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Duplicates for Loop Effect */}
                            {[
                                {
                                    quote: "O Check-in Facial eliminou as filas da recepção. O paciente chega, olha para a câmera e já está confirmado. Nunca vi nada igual no Brasil.",
                                    name: "Dr. Henrique Bastos",
                                    role: "Ortopedista | BA",
                                    initials: "HB"
                                },
                                {
                                    quote: "Instalamos o Totem de Auto Atendimento e a recepcionista agora foca no acolhimento, não em burocracia. Os pacientes adoram a autonomia.",
                                    name: "Dra. Carolina Mendes",
                                    role: "Diretora Clínica | RJ",
                                    initials: "CM"
                                },
                                {
                                    quote: "O Painel de TV na recepção deu outro nível para a clínica. O paciente vê seu nome na tela e já sabe para qual consultório ir. Zero confusão.",
                                    name: "Dr. Rafael Duarte",
                                    role: "Cardiologista | MG",
                                    initials: "RD"
                                },
                                {
                                    quote: "Com o Check-in por QR Code, 70% dos pacientes já chegam com o pré-cadastro feito. A recepção ficou muito mais ágil e organizada.",
                                    name: "Dra. Patrícia Nunes",
                                    role: "Pediatra | PR",
                                    initials: "PN"
                                }
                            ].map((testimonial, index) => (
                                <div key={`dup-${index}`} className="flex-shrink-0 w-[280px] bg-navy-deep-light border border-slate-800 rounded-xl p-4">
                                    <div className="flex gap-0.5 mb-2">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <svg key={i} className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
                                        ))}
                                    </div>
                                    <p className="text-slate-300 text-xs mb-3 italic leading-relaxed">
                                        &quot;{testimonial.quote}&quot;
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-teal-vibrant/20 flex items-center justify-center text-teal-vibrant text-[10px] font-bold">{testimonial.initials}</div>
                                        <div>
                                            <div className="text-white text-xs font-medium">{testimonial.name}</div>
                                            <div className="text-slate-500 text-[10px]">{testimonial.role}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>




            {/* CTA Final */}
            <section className="py-24 relative overflow-hidden text-center">
                <div className="container mx-auto px-4 relative z-10 max-w-4xl">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-10 tracking-tight">Pronto para transformar sua <br /> clínica?</h2>

                    <div className="flex justify-center mb-10">
                        <a href="https://wa.me/5521975129005?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20o%20CliniGo" target="_blank" rel="noopener noreferrer" className="h-14 px-10 rounded-full bg-teal-vibrant text-navy-deep font-bold text-lg hover:bg-teal-vibrant-dark hover:text-white transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)] flex items-center justify-center gap-2">
                            Falar com Especialista
                            <ArrowRight className="w-5 h-5" />
                        </a>
                    </div>


                </div>
            </section>


            {/* Footer Final - COM LOGO REAL */}
            <footer className="pt-20 pb-10 border-t border-slate-800 bg-navy-deep text-sm">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                        {/* Coluna 1: Brand */}
                        <div>
                            <Link href="/" className="inline-block hover:opacity-80 transition-opacity mb-6">
                                <Image src="/logo-clinigo.png" alt="CliniGo" width={140} height={35} className="h-9 w-auto" />
                            </Link>
                            <p className="text-slate-400 leading-relaxed mb-6">
                                A plataforma de gestão médica mais completa do Brasil.
                            </p>
                            <div className="flex flex-col gap-4">
                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Certificações</h5>
                                <div className="flex items-center gap-4 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                                    <div className="h-8 px-2 border border-slate-700 rounded flex items-center justify-center text-[10px] text-slate-400 font-mono">
                                        ANS TISS 4.02  ✓
                                    </div>
                                    <div className="h-8 px-2 border border-slate-700 rounded flex items-center justify-center text-[10px] text-slate-400 font-mono">
                                        LGPD COMPLIANT  ✓
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Coluna 2: Produto */}
                        <div>
                            <h4 className="text-white font-bold mb-6">Produto</h4>
                            <ul className="space-y-4 text-slate-400">
                                <li><Link href="#funcionalidades" className="hover:text-teal-vibrant transition-colors">Funcionalidades</Link></li>
                                <li><Link href="/cadastro" className="hover:text-teal-vibrant transition-colors">Planos</Link></li>
                                <li><Link href="/cadastro" className="hover:text-teal-vibrant transition-colors">Integrações</Link></li>
                            </ul>
                        </div>

                        {/* Coluna 3: Empresa */}
                        <div>
                            <h4 className="text-white font-bold mb-6">Empresa</h4>
                            <ul className="space-y-4 text-slate-400">
                                <li><Link href="#sobre" className="hover:text-teal-vibrant transition-colors">Sobre nós</Link></li>
                                <li><Link href="/blog" className="hover:text-teal-vibrant transition-colors">Blog</Link></li>
                                <li><Link href="/contato" className="hover:text-teal-vibrant transition-colors">Contato</Link></li>
                                <li><Link href="/partners/register" className="hover:text-teal-vibrant transition-colors">Seja Parceiro</Link></li>
                            </ul>
                        </div>

                        {/* Coluna 4: Legal */}
                        <div>
                            <h4 className="text-white font-bold mb-6">Legal</h4>
                            <ul className="space-y-4 text-slate-400">
                                <li><Link href="/termos" className="hover:text-teal-vibrant transition-colors">Termos de Uso</Link></li>
                                <li><Link href="/privacidade" className="hover:text-teal-vibrant transition-colors">Privacidade</Link></li>
                                <li><Link href="/lgpd" className="hover:text-teal-vibrant transition-colors">LGPD</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-800 text-slate-600">
                        <div className="flex items-center gap-3">
                            <span>© 2026 CliniGo. Todos os direitos reservados.</span>
                            <Link href="/login" className="text-slate-700 hover:text-slate-500 transition-colors text-xs">Gestão</Link>
                        </div>
                        <div className="flex items-center gap-2 mt-4 md:mt-0">
                            <div className="w-2 h-2 rounded-full bg-teal-vibrant animate-pulse" />
                            <span className="text-teal-vibrant mr-4">Sistema Online</span>

                            <div className="h-4 w-px bg-slate-800" />

                            <a href="https://nodexsolucoes.com.br" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group hover:opacity-80 transition-opacity ml-4">
                                <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">Desenvolvido por</span>
                                <img src="/nodex-logo.png" alt="Nodex Soluções" className="h-9 w-auto" />
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
