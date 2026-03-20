"use client"

import { useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Check, ChevronRight, Play, Server, ShieldCheck, Globe, Users, Building2, Activity, ArrowRight, ScanFace, Sparkles, LayoutGrid, Zap, Lock, Calendar, Video, FileText, QrCode, Receipt, UserCircle, Fingerprint, Monitor, Tablet, Stethoscope } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function LandingPremium() {
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 200]);
    const y2 = useTransform(scrollY, [0, 500], [0, -150]);

    return (
        <div className="min-h-screen bg-navy-deep font-sans text-slate-300 selection:bg-teal-vibrant selection:text-white overflow-x-hidden">

            {/* 1. NAVBAR PREMIUM - COM LOGO REAL */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-navy-deep/80 backdrop-blur-xl transition-all duration-300">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                        <Image src="/logo-clinigo.png" alt="CliniGo" width={160} height={40} className="h-10 w-auto" />
                    </Link>

                    <div className="hidden md:flex items-center gap-6">
                        <a href="#funcionalidades" className="text-sm font-medium hover:text-teal-vibrant transition-colors">Funcionalidades</a>
                        <a href="#planos" className="text-sm font-medium hover:text-teal-vibrant transition-colors">Planos</a>

                        {/* Botões de Acesso - Clínica e Médico */}
                        <div className="flex items-center gap-3 ml-2">
                            <Link href="/clinica" className="h-10 px-5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-semibold text-sm hover:bg-emerald-500/25 hover:border-emerald-400/50 hover:text-white transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                                <Building2 className="w-4 h-4" />
                                Sou Clínica
                            </Link>
                            <Link href="/medico" className="h-10 px-5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 font-semibold text-sm hover:bg-cyan-500/25 hover:border-cyan-400/50 hover:text-white transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                                <Stethoscope className="w-4 h-4" />
                                Sou Médico
                            </Link>
                        </div>

                        <Link href="/cadastro" className="h-10 px-6 rounded-full bg-teal-vibrant text-navy-deep font-bold text-sm hover:bg-teal-vibrant-dark hover:text-white transition-all flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.2)] hover:shadow-[0_0_30px_rgba(20,184,166,0.3)]">
                            Criar Conta
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
                            <div className="inline-flex items-center gap-2 py-1 px-4 rounded-full bg-teal-vibrant/5 border border-teal-vibrant/20 text-teal-vibrant text-xs font-bold tracking-wider uppercase mb-8 hover:bg-teal-vibrant/10 transition-colors cursor-default">
                                <Sparkles className="w-3 h-3" />
                                Gestão Médica Inteligente
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight leading-[1.1]">
                                A Plataforma{' '}
                                <span className="relative inline-block">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-vibrant via-teal-200 to-white">All-in-One</span>
                                    <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-gradient-to-r from-teal-vibrant via-teal-200 to-transparent rounded-full" />
                                </span>{' '}
                                para Gestão de{' '}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-vibrant via-teal-200 to-white">
                                    Clínicas e Consultórios
                                </span>
                            </h1>
                            <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-10 leading-relaxed font-light">
                                Tudo que você precisa em um só lugar: Elimine atrasos, reduza faltas e aumente seu faturamento com a solução mais completa do mercado.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link href="/contato" className="h-14 px-8 rounded-full bg-teal-vibrant text-navy-deep font-bold text-lg hover:bg-teal-vibrant-dark hover:text-white transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)] flex items-center justify-center gap-2">
                                    Falar com Especialista
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
                                    src="/dashboard-preview.png"
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



            {/* 4. GRID DE FEATURES - COMPLETO (6 CARDS) */}
            <section id="funcionalidades" className="py-24 container mx-auto px-4">
                <div className="text-center mb-12">
                    <span className="text-teal-vibrant font-semibold tracking-wider uppercase text-sm mb-3 block">Recursos Poderosos</span>
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                        Tudo que sua clínica precisa.{' '}
                        <span className="text-teal-vibrant">Em um único sistema.</span>
                    </h2>
                </div>

                {/* CHECK-IN FACIAL + ASSINATURA TISS - DESTAQUE */}
                <div className="flex flex-col md:flex-row items-stretch gap-6 max-w-6xl mx-auto mb-12">
                    {/* CHECK-IN FACIAL */}
                    <div className="flex-1 bg-navy-deep-light border border-slate-800 rounded-3xl p-8 relative overflow-hidden group hover:border-teal-vibrant/30 transition-all">
                        <span className="text-teal-vibrant font-semibold tracking-wider uppercase text-xs mb-3 block">Exclusivo CliniGo</span>
                        <div className="flex items-start gap-6">
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-white mb-3 leading-tight">
                                    Check-in Facial.{' '}
                                    <span className="text-teal-vibrant">O único do Brasil.</span>
                                </h2>
                                <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                                    Identificação biométrica para validação segura do paciente na recepção.
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-slate-300 text-sm">
                                        <Check className="w-4 h-4 text-teal-vibrant flex-shrink-0" /> Zero filas na recepção
                                    </li>
                                    <li className="flex items-center gap-2 text-slate-300 text-sm">
                                        <Check className="w-4 h-4 text-teal-vibrant flex-shrink-0" /> Validação biométrica de identidade
                                    </li>
                                    <li className="flex items-center gap-2 text-slate-300 text-sm">
                                        <Check className="w-4 h-4 text-teal-vibrant flex-shrink-0" /> Atendimento ágil e automatizado
                                    </li>
                                </ul>
                            </div>
                            {/* FACE SCAN ANIMATION */}
                            <div className="relative w-32 h-32 flex-shrink-0 hidden md:block">
                                <div className="absolute inset-0 rounded-2xl border border-slate-700 bg-[#0a0f1a] overflow-hidden">
                                    <motion.div
                                        className="absolute inset-0 bg-teal-vibrant/5 z-0"
                                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                    />
                                    <ScanFace className="absolute inset-0 m-auto w-16 h-16 text-slate-700 z-10 opacity-50 group-hover:opacity-100 group-hover:text-teal-vibrant/60 transition-all duration-700" />
                                    <motion.div
                                        className="absolute w-full h-0.5 bg-teal-vibrant/50 shadow-[0_0_10px_#14b8a6] z-20 top-0"
                                        animate={{ top: ["0%", "100%", "0%"] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    />
                                    <div className="absolute inset-2 border border-teal-vibrant/30 rounded-xl z-10 flex flex-col justify-between p-1">
                                        <div className="flex justify-between">
                                            <div className="w-2 h-2 border-t border-l border-teal-vibrant" />
                                            <div className="w-2 h-2 border-t border-r border-teal-vibrant" />
                                        </div>
                                        <div className="flex justify-between">
                                            <div className="w-2 h-2 border-b border-l border-teal-vibrant" />
                                            <div className="w-2 h-2 border-b border-r border-teal-vibrant" />
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -bottom-2 left-0 right-0 text-center z-30">
                                    <div className="inline-block bg-teal-vibrant/20 backdrop-blur-md border border-teal-vibrant/30 rounded-full px-2 py-0.5 text-teal-vibrant text-[8px] font-bold tracking-widest uppercase">
                                        Verificado
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -top-12 -right-12 w-40 h-40 bg-teal-vibrant/10 rounded-full blur-[60px] -z-0" />
                    </div>

                    {/* ASSINATURA DIGITAL TISS */}
                    <div className="w-full md:w-80 bg-navy-deep-light border border-slate-800 rounded-3xl p-6 relative overflow-hidden group hover:border-teal-vibrant/30 transition-all flex flex-col">
                        <div className="absolute top-4 right-4">
                            <span className="bg-teal-vibrant text-navy-deep text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                                Novo
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-teal-vibrant/10 flex items-center justify-center mb-4 border border-teal-vibrant/20">
                            <Fingerprint className="w-6 h-6 text-teal-vibrant" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Assinatura Eletrônica TISS</h3>
                        <p className="text-slate-400 text-sm leading-relaxed flex-1">
                            Assinatura eletrônica para lotes TISS com validade jurídica (Lei 14.063/2020). Compatível com certificados A1/A3 quando disponíveis.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {/* Feature 1 - Agenda Anti-Overbooking */}
                    <motion.div whileHover={{ y: -5 }} className="bg-navy-deep-light border border-slate-800 p-8 rounded-[2rem] relative group hover:border-teal-vibrant/30 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-teal-vibrant/10 flex items-center justify-center mb-5 group-hover:bg-teal-vibrant/20 transition-colors border border-teal-vibrant/10">
                            <Calendar className="w-6 h-6 text-teal-vibrant" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Agenda Anti-Overbooking</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Sistema inteligente que previne conflitos de horários automaticamente, mostrando slots em tempo real.
                        </p>
                    </motion.div>

                    {/* Feature 2 - Teleconsulta WebRTC */}
                    <motion.div whileHover={{ y: -5 }} className="bg-navy-deep-light border border-slate-800 p-8 rounded-[2rem] relative group hover:border-teal-vibrant/30 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-teal-vibrant/10 flex items-center justify-center mb-5 group-hover:bg-teal-vibrant/20 transition-colors border border-teal-vibrant/10">
                            <Video className="w-6 h-6 text-teal-vibrant" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Teleconsulta WebRTC</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Vídeo-chamada HD integrada ao prontuário.
                        </p>
                    </motion.div>

                    {/* Feature 3 - Prontuário Eletrônico */}
                    <motion.div whileHover={{ y: -5 }} className="bg-navy-deep-light border border-slate-800 p-8 rounded-[2rem] relative group hover:border-teal-vibrant/30 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-teal-vibrant/10 flex items-center justify-center mb-5 group-hover:bg-teal-vibrant/20 transition-colors border border-teal-vibrant/10">
                            <FileText className="w-6 h-6 text-teal-vibrant" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Prontuário Eletrônico</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Interface completa com histórico do paciente e modelos personalizáveis.
                        </p>
                    </motion.div>

                    {/* Feature 4 - Check-in QR Code */}
                    <motion.div whileHover={{ y: -5 }} className="bg-navy-deep-light border border-slate-800 p-8 rounded-[2rem] relative group hover:border-teal-vibrant/30 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-teal-vibrant/10 flex items-center justify-center mb-5 group-hover:bg-teal-vibrant/20 transition-colors border border-teal-vibrant/10">
                            <QrCode className="w-6 h-6 text-teal-vibrant" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Check-in QR Code</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Redução de 40% na fila com pré-cadastro e chegada autônoma.
                        </p>
                    </motion.div>

                    {/* Feature 5 - Faturamento TISS */}
                    <motion.div whileHover={{ y: -5 }} className="bg-navy-deep-light border border-slate-800 p-8 rounded-[2rem] relative group hover:border-teal-vibrant/30 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-teal-vibrant/10 flex items-center justify-center mb-5 group-hover:bg-teal-vibrant/20 transition-colors border border-teal-vibrant/10">
                            <Receipt className="w-6 h-6 text-teal-vibrant" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Faturamento TISS</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Geração de XML TISS 4.02 nativo para operadoras. Sem intermediários.
                        </p>
                    </motion.div>

                    {/* Feature 6 - CRM de Pacientes */}
                    <motion.div whileHover={{ y: -5 }} className="bg-navy-deep-light border border-slate-800 p-8 rounded-[2rem] relative group hover:border-teal-vibrant/30 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-teal-vibrant/10 flex items-center justify-center mb-5 group-hover:bg-teal-vibrant/20 transition-colors border border-teal-vibrant/10">
                            <UserCircle className="w-6 h-6 text-teal-vibrant" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">CRM de Pacientes</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Gestão completa do relacionamento com pacientes, histórico de interações e acompanhamento.
                        </p>
                    </motion.div>

                    {/* Feature 7 - Painel de TV Dinâmico */}
                    <motion.div whileHover={{ y: -5 }} className="bg-navy-deep-light border border-slate-800 p-8 rounded-[2rem] relative group hover:border-teal-vibrant/30 transition-all">
                        <div className="absolute top-4 right-4">
                            <span className="bg-teal-vibrant text-navy-deep text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                                Novo
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-teal-vibrant/10 flex items-center justify-center mb-5 group-hover:bg-teal-vibrant/20 transition-colors border border-teal-vibrant/10">
                            <Monitor className="w-6 h-6 text-teal-vibrant" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Painel de TV Dinâmico</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Exiba a fila de atendimento em tempo real na TV da recepção. Chamada automática por consultório com atualização instantânea.
                        </p>
                    </motion.div>

                    {/* Feature 8 - Totem de Auto Atendimento */}
                    <motion.div whileHover={{ y: -5 }} className="bg-navy-deep-light border border-slate-800 p-8 rounded-[2rem] relative group hover:border-teal-vibrant/30 transition-all">
                        <div className="absolute top-4 right-4">
                            <span className="bg-teal-vibrant text-navy-deep text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                                Novo
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-teal-vibrant/10 flex items-center justify-center mb-5 group-hover:bg-teal-vibrant/20 transition-colors border border-teal-vibrant/10">
                            <Tablet className="w-6 h-6 text-teal-vibrant" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Totem de Auto Atendimento</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Seus pacientes fazem check-in sozinhos via QR Code ou reconhecimento facial. Sem filas, sem burocracia na recepção.
                        </p>
                    </motion.div>
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
                            <span className="text-4xl font-bold text-white">99</span>
                            <span className="text-sm text-slate-500">/mês</span>
                        </div>
                        <p className="text-sm text-slate-400 mb-6 pb-6 border-b border-slate-800">Para médico solo iniciante</p>

                        <div className="flex-1 mb-5">
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2 text-xs text-slate-300">
                                    <Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> 1 médico
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
                        <p className="text-sm text-slate-400 mb-6 pb-6 border-b border-slate-800">Para clínicas com até 5 médicos</p>

                        <div className="flex-1 mb-5">
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2 text-xs text-white font-medium">
                                    <Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Até 5 médicos
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
                            </ul>

                            <details className="mt-3 group">
                                <summary className="flex items-center gap-1 text-xs text-teal-vibrant font-medium cursor-pointer hover:underline list-none">
                                    <span className="group-open:hidden">+ Ver todas</span>
                                    <span className="hidden group-open:block">- Ver menos</span>
                                </summary>
                                <ul className="space-y-2 mt-2 pt-2 border-t border-slate-800/50">
                                    <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> DRE + Repasse Médico</li>
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
                        <p className="text-sm text-slate-400 mb-6 pb-6 border-b border-slate-800">Para centros com até 30 médicos</p>

                        <div className="flex-1 mb-5">
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2 text-xs text-slate-300">
                                    <Check className="w-3 h-3 text-teal-vibrant flex-shrink-0" /> Até 30 médicos
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
                                <p className="text-sm text-slate-400 mb-6">Para redes com médicos ilimitados</p>
                                <Link href="/cadastro" className="w-full h-12 rounded-lg bg-white/5 border border-white/10 text-white text-base font-semibold hover:bg-white/10 hover:border-teal-vibrant/30 transition-all flex items-center justify-center">
                                    Começar Agora
                                </Link>
                            </div>

                            {/* Lista de Features Enterprise */}
                            <div className="md:w-2/3 md:border-l md:border-slate-800 md:pl-8">
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
                                    <li className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
                                        <Check className="w-4 h-4 text-teal-vibrant flex-shrink-0" /> Médicos ilimitados
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
                        <Link href="/contato" className="h-14 px-10 rounded-full bg-teal-vibrant text-navy-deep font-bold text-lg hover:bg-teal-vibrant-dark hover:text-white transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)] flex items-center justify-center gap-2">
                            Falar com Especialista
                            <ArrowRight className="w-5 h-5" />
                        </Link>
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
