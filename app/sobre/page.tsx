'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
    ArrowRight,
    Check,
    Code2,
    Copy,
    FileCheck,
    Headphones,
    Heart,
    Layers,
    Mail,
    MapPin,
    Phone,
    Shield,
    Target,
    Users,
} from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'

const PILLARS = [
    {
        code: 'ESPECIALIDADES',
        title: '6 disciplinas terapêuticas nativas',
        detail: 'Psicologia, ABA e Neurodesenvolvimento, Fonoaudiologia, Terapia Ocupacional, Psicomotricidade e Fisioterapia.',
    },
    {
        code: 'GOVERNANÇA',
        title: 'Sigilo clínico RBAC e RLS',
        detail: 'Isolamento real de perfis aplicado na camada de banco de dados e autenticação, em conformidade com a LGPD.',
    },
    {
        code: 'PROBATÓRIO',
        title: 'Assinatura Lei 14.063/2020',
        detail: 'Termos eletrônicos e evoluções com carimbo de data, registro de IP e integridade verificável por hash SHA-256.',
    },
    {
        code: 'OPERACIONAL',
        title: 'TISS ANS e repasse individual',
        detail: 'Guias e lotes XML no padrão ANS somados ao motor de produção individual por terapeuta, contrato e paciente.',
    },
]

const VALUES = [
    {
        icon: Heart,
        title: 'Foco no cuidado contínuo',
        description:
            'Construímos ferramentas que eliminam planilhas paralelas para que terapeutas e coordenadores dediquem tempo ao acompanhamento clínico.',
    },
    {
        icon: Shield,
        title: 'Privacidade como arquitetura',
        description:
            'Dados de saúde são sensíveis. Adotamos isolamento por clínica, sessão única auditada e URLs temporárias criptografadas para documentos.',
    },
    {
        icon: Layers,
        title: 'Precisão operacional',
        description:
            'Cada fluxo é desenhado para a realidade das terapias seriadas: recorrência flexível, co-terapia, salas sensoriais e reposições.',
    },
    {
        icon: Users,
        title: 'Evolução guiada pelo uso real',
        description:
            'Ouvimos gestores, recepcionistas e terapeutas para aprimorar cada módulo sem inflar a interface com complexidade desnecessária.',
    },
]

const TEAMS = [
    {
        icon: Code2,
        name: 'Engenharia e Segurança',
        role: 'Arquitetura web, banco de dados, LGPD e conformidade TISS',
    },
    {
        icon: Layers,
        name: 'Produto e Design Clínico',
        role: 'Fluxos multidisciplinares, acessibilidade e usabilidade mobile',
    },
    {
        icon: Headphones,
        name: 'Suporte Técnico',
        role: 'Acompanhamento de implantação e resolução de chamados',
    },
    {
        icon: FileCheck,
        name: 'Comercial e Parcerias',
        role: 'Atendimento a clínicas e rede de vendedores parceiros',
    },
]

const TIMELINE = [
    {
        year: '2024',
        title: 'Fundação e pesquisa de campo',
        description: 'Início do desenvolvimento da arquitetura multi-tenant do CliniGo com foco em operação clínica brasileira.',
    },
    {
        year: '2025',
        title: 'Primeira versão em produção',
        description: 'Lançamento dos módulos de agendamento, prontuário eletrônico, financeiro operacional e teleconsulta WebRTC.',
    },
    {
        year: '2026',
        title: 'Especialização em terapias multidisciplinares',
        description: 'Lançamento dos workspaces de ABA, Psicologia, Fonoaudiologia, TO, Psicomotricidade e Fisioterapia, BI clínico, TISS completo e biometria facial.',
    },
    {
        year: '2027',
        title: 'Governança e identidade editorial',
        description: 'Padronização integral de performance, sessão única auditada, Guia de Uso integrado por perfil e arquitetura editorial de ponta a ponta.',
    },
]

export default function SobrePage() {
    const [copiedKey, setCopiedKey] = useState<string | null>(null)

    const copyValue = (key: string, value: string, label: string) => {
        navigator.clipboard.writeText(value)
        setCopiedKey(key)
        toast.success(`${label} copiado!`)
        setTimeout(() => setCopiedKey(null), 2000)
    }

    return (
        <EditorialShell>
            <main className="flex-1">
                {/* Hero */}
                <section className="py-14 sm:py-20 px-5 sm:px-8 border-b border-[#E6E8E5]">
                    <div className="max-w-4xl mx-auto text-center">
                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-3">
                            SOBRE O CLINIGO
                        </p>
                        <h1 className="text-3xl sm:text-5xl font-semibold text-[#0F1F1B] tracking-tight leading-[1.1] mb-5">
                            Tecnologia desenhada para a{' '}
                            <span className="font-serif-accent text-[#155E4B] font-normal">
                                rotina multidisciplinar
                            </span>{' '}
                            de clínicas de terapia.
                        </h1>
                        <p className="text-base sm:text-lg text-[#4B5B56] max-w-2xl mx-auto leading-relaxed">
                            O CliniGo nasceu para substituir planilhas paralelas e softwares genéricos por uma plataforma objetiva, segura e alinhada aos fluxos de atendimento seriado no Brasil.
                        </p>
                    </div>
                </section>

                {/* Pilares Verificáveis */}
                <section className="py-12 px-5 sm:px-8 bg-white border-b border-[#E6E8E5]">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {PILLARS.map((pillar) => (
                            <div
                                key={pillar.code}
                                className="p-5 rounded-xl bg-[#FAFAF8] border border-[#E6E8E5]"
                            >
                                <p className="font-tech-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#155E4B] mb-2">
                                    {pillar.code}
                                </p>
                                <h2 className="text-base font-semibold text-[#0F1F1B] mb-1.5">
                                    {pillar.title}
                                </h2>
                                <p className="text-xs sm:text-sm text-[#4B5B56] leading-relaxed">
                                    {pillar.detail}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Missão */}
                <section className="py-14 sm:py-16 px-5 sm:px-8">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                        <div className="lg:col-span-7 space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#E6F2EE] text-[#114D3E] font-tech-mono text-[11px] font-semibold uppercase tracking-[0.12em]">
                                <Target className="w-3.5 h-3.5" />
                                Nossa missão
                            </div>
                            <h2 className="text-2xl sm:text-4xl font-semibold text-[#0F1F1B] tracking-tight leading-tight">
                                Estruturar a operação para que a equipe clínica foque na evolução de cada paciente.
                            </h2>
                            <p className="text-sm sm:text-base text-[#4B5B56] leading-relaxed">
                                Clínicas de neurodesenvolvimento, psicologia, fonoaudiologia, terapia ocupacional, psicomotricidade e fisioterapia operam com agendas recorrentes intensas, co-terapia, controle de guias de convênio e regras individuais de repasse.
                            </p>
                            <p className="text-sm sm:text-base text-[#4B5B56] leading-relaxed">
                                Nosso compromisso é entregar uma arquitetura única onde recepção, coordenação, financeiro administrativo e terapeutas trabalham com clareza, sigilo e previsibilidade.
                            </p>
                        </div>

                        <div className="lg:col-span-5 bg-white border border-[#E6E8E5] rounded-xl p-6 sm:p-7 space-y-4">
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#155E4B]">
                                COMO TRABALHAMOS
                            </p>
                            <ul className="space-y-3 text-sm text-[#0F1F1B]">
                                <li className="flex items-start gap-2.5">
                                    <Check className="w-4 h-4 text-[#155E4B] shrink-0 mt-0.5" strokeWidth={2.25} />
                                    <span>Implantação estruturada com taxa única de configuração inicial da unidade.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <Check className="w-4 h-4 text-[#155E4B] shrink-0 mt-0.5" strokeWidth={2.25} />
                                    <span>Treinamento 100% autônomo pelo Guia de Uso integrado em cada tela.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <Check className="w-4 h-4 text-[#155E4B] shrink-0 mt-0.5" strokeWidth={2.25} />
                                    <span>Planos objetivos sem fidelidade, com licenças extras sob demanda a R$ 49,90/mês.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <Check className="w-4 h-4 text-[#155E4B] shrink-0 mt-0.5" strokeWidth={2.25} />
                                    <span>Conformidade LGPD, auditoria de acesso e atendimento em todo o Brasil.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Valores */}
                <section className="py-14 sm:py-16 px-5 sm:px-8 bg-white border-y border-[#E6E8E5]">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-10">
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                                PRINCÍPIOS
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight">
                                Valores que guiam nossa engenharia
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {VALUES.map((value) => (
                                <div key={value.title} className="p-6 bg-[#FAFAF8] border border-[#E6E8E5] rounded-xl">
                                    <div className="w-11 h-11 rounded-lg bg-[#E6F2EE] text-[#155E4B] flex items-center justify-center mb-4">
                                        <value.icon className="w-5 h-5" strokeWidth={1.75} />
                                    </div>
                                    <h3 className="text-base font-semibold text-[#0F1F1B] mb-2">{value.title}</h3>
                                    <p className="text-sm text-[#4B5B56] leading-relaxed">{value.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Equipe */}
                <section className="py-14 sm:py-16 px-5 sm:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-10">
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                                ESTRUTURA INTERNA
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight">
                                Equipes dedicadas à operação
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {TEAMS.map((team) => (
                                <div key={team.name} className="p-6 bg-white border border-[#E6E8E5] rounded-xl">
                                    <div className="w-11 h-11 rounded-lg bg-[#F2F5F3] text-[#155E4B] flex items-center justify-center mb-4">
                                        <team.icon className="w-5 h-5" strokeWidth={1.75} />
                                    </div>
                                    <h3 className="font-semibold text-[#0F1F1B] text-base mb-1.5">{team.name}</h3>
                                    <p className="text-xs sm:text-sm text-[#4B5B56] leading-relaxed">{team.role}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Linha do Tempo */}
                <section className="py-14 sm:py-16 px-5 sm:px-8 bg-white border-y border-[#E6E8E5]">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-10">
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                                TRAJETÓRIA
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight">
                                Evolução da plataforma
                            </h2>
                        </div>
                        <div className="space-y-6">
                            {TIMELINE.map((item) => (
                                <div
                                    key={item.year}
                                    className="flex flex-col sm:flex-row gap-3 sm:gap-6 p-5 rounded-xl bg-[#FAFAF8] border border-[#E6E8E5]"
                                >
                                    <div className="font-tech-mono text-sm font-semibold text-[#155E4B] sm:w-20 shrink-0 pt-0.5">
                                        {item.year}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[#0F1F1B] text-base mb-1">{item.title}</h3>
                                        <p className="text-sm text-[#4B5B56] leading-relaxed">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Localização + CTA */}
                <section className="py-14 sm:py-16 px-5 sm:px-8">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-6 bg-[#0D1F1B] text-white rounded-xl p-7 sm:p-9 border border-[#1D3831]">
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ED3C2] mb-3">
                                ONDE ESTAMOS
                            </p>
                            <h2 className="text-2xl font-semibold mb-5">Atendimento em todo o Brasil</h2>
                            <div className="space-y-4 text-sm">
                                <div className="flex items-center gap-3 text-white/85">
                                    <MapPin className="w-4 h-4 text-[#9ED3C2] shrink-0" />
                                    <span>Rio de Janeiro, RJ — Operação 100% em nuvem nacional</span>
                                </div>
                                <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#1D3831]">
                                    <a href="mailto:contato@clinigo.app" className="flex items-center gap-3 text-white/85 hover:text-white">
                                        <Mail className="w-4 h-4 text-[#9ED3C2] shrink-0" />
                                        <span>contato@clinigo.app</span>
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => copyValue('email', 'contato@clinigo.app', 'E-mail')}
                                        className="min-h-[36px] px-2.5 rounded border border-white/15 hover:bg-white/10 text-xs text-white/80 inline-flex items-center gap-1 cursor-pointer"
                                    >
                                        {copiedKey === 'email' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedKey === 'email' ? 'Copiado' : 'Copiar'}
                                    </button>
                                </div>
                                <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#1D3831]">
                                    <a href="tel:+5521975129005" className="flex items-center gap-3 text-white/85 hover:text-white">
                                        <Phone className="w-4 h-4 text-[#9ED3C2] shrink-0" />
                                        <span>(21) 97512-9005</span>
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => copyValue('phone', '(21) 97512-9005', 'Telefone')}
                                        className="min-h-[36px] px-2.5 rounded border border-white/15 hover:bg-white/10 text-xs text-white/80 inline-flex items-center gap-1 cursor-pointer"
                                    >
                                        {copiedKey === 'phone' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedKey === 'phone' ? 'Copiado' : 'Copiar'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-6 bg-white border border-[#E6E8E5] rounded-xl p-7 sm:p-9 flex flex-col justify-between">
                            <div>
                                <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#155E4B] mb-3">
                                    PRÓXIMO PASSO
                                </p>
                                <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight mb-3">
                                    Conheça a plataforma na prática.
                                </h2>
                                <p className="text-sm sm:text-base text-[#4B5B56] leading-relaxed mb-6">
                                    Avalie o CliniGo gratuitamente por 7 dias ou consulte os planos disponíveis para a estrutura atual da sua clínica.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Link
                                    href="/trial"
                                    className="min-h-[46px] px-5 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                                >
                                    Começar teste de 7 dias
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link
                                    href="/contato"
                                    className="min-h-[46px] px-5 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-[#0F1F1B] text-sm font-medium inline-flex items-center justify-center transition-colors"
                                >
                                    Fale conosco
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </EditorialShell>
    )
}
