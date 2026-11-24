'use client'

import { useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import {
    ArrowRight,
    BrainCircuit,
    Check,
    FileText,
    HeartHandshake,
    Lock,
    Scale,
    ShieldCheck,
} from 'lucide-react'
import {
    CLINIGO_AI_CONTENT,
    MOCKUP_DISCLAIMER,
    type ClinigoAiTabId,
    type ReportToneId,
} from './content'

export function ClinigoAiShowcaseSection() {
    const [activeTabId, setActiveTabId] = useState<ClinigoAiTabId>('evolucao')
    const [reportTone, setReportTone] = useState<ReportToneId>('convenio')

    const tabs = CLINIGO_AI_CONTENT.tabs
    const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0]
    const activeTone = CLINIGO_AI_CONTENT.reportTones[reportTone]

    const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault()
            setActiveTabId(tabs[(idx + 1) % tabs.length].id)
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            setActiveTabId(tabs[(idx - 1 + tabs.length) % tabs.length].id)
        }
    }

    const renderTabIcon = (id: ClinigoAiTabId) => {
        if (id === 'evolucao') return <BrainCircuit className="w-4 h-4 shrink-0" strokeWidth={1.75} />
        if (id === 'familia') return <HeartHandshake className="w-4 h-4 shrink-0" strokeWidth={1.75} />
        if (id === 'laudos') return <FileText className="w-4 h-4 shrink-0" strokeWidth={1.75} />
        return <Scale className="w-4 h-4 shrink-0" strokeWidth={1.75} />
    }

    return (
        <section
            id="clinigo-ia"
            className="scroll-mt-20 py-20 lg:py-28 bg-[#0D1F1B] text-white border-b border-[#1D3831]"
        >
            <div className="max-w-7xl mx-auto px-5 sm:px-8">
                {/* Cabeçalho de impacto */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-md border border-[#1D3831] bg-[#112823] px-3 py-1.5 font-tech-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#7CD4B6]">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" strokeWidth={1.85} />
                            <span>{CLINIGO_AI_CONTENT.kicker}</span>
                        </div>
                        <h2 className="mt-4 text-3xl sm:text-4xl lg:text-[46px] font-semibold tracking-[-0.03em] leading-[1.06] text-white">
                            {CLINIGO_AI_CONTENT.headlineBefore}
                            <span className="font-serif-accent text-[#7CD4B6] font-normal text-[1.08em]">
                                {CLINIGO_AI_CONTENT.headlineAccent}
                            </span>
                            {CLINIGO_AI_CONTENT.headlineAfter}
                        </h2>
                        <p className="mt-4 text-base text-[#A8BCB5] leading-relaxed">
                            {CLINIGO_AI_CONTENT.subtitle}
                        </p>
                    </div>

                    <Link
                        href="/trial"
                        className="self-start lg:self-auto min-h-[48px] px-5 rounded-md bg-[#7CD4B6] hover:bg-[#95E0C6] text-[#0D1F1B] text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 shrink-0 group"
                    >
                        Testar a CliniGo IA por 7 dias
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                    </Link>
                </div>

                {/* Pipeline visual do Escudo LGPD */}
                <div className="mt-10 rounded-xl border border-[#1D3831] bg-[#112823] p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-[#1D3831]">
                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
                            <Lock className="w-3.5 h-3.5 text-[#7CD4B6]" strokeWidth={1.85} />
                            Fluxo de Privacidade do Escudo LGPD (executado no servidor)
                        </span>
                        <span className="font-tech-mono text-[11px] text-[#7CD4B6]">
                            Zero PII enviado ao modelo externo
                        </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {CLINIGO_AI_CONTENT.shieldSteps.map((step) => (
                            <div
                                key={step.code}
                                className="rounded-lg border border-[#1D3831] bg-[#0D1F1B] px-3.5 py-3"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-tech-mono text-[10px] font-semibold text-[#7CD4B6]">
                                        {step.code}
                                    </span>
                                    <span className="text-xs font-semibold text-white">
                                        {step.label}
                                    </span>
                                </div>
                                <div className="mt-1.5 font-tech-mono text-[11px] text-[#9BB4AB]">
                                    {step.detail}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Seletor interativo dos 4 fluxos da CliniGo IA */}
                <div
                    role="tablist"
                    aria-label="Testar os 4 fluxos reais da CliniGo IA"
                    className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5"
                >
                    {tabs.map((tab, idx) => {
                        const selected = tab.id === activeTab.id
                        return (
                            <button
                                key={tab.id}
                                role="tab"
                                type="button"
                                id={`ai-tab-${tab.id}`}
                                aria-selected={selected}
                                aria-controls="ai-workbench-panel"
                                onClick={() => setActiveTabId(tab.id)}
                                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                                className={`text-left rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                                    selected
                                        ? 'bg-[#15352D] border-[#7CD4B6] text-white'
                                        : 'bg-[#112823] border-[#1D3831] text-[#A8BCB5] hover:border-[#2E544A] hover:text-white'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span
                                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                                            selected ? 'text-[#7CD4B6]' : 'text-[#8DA89F]'
                                        }`}
                                    >
                                        {renderTabIcon(tab.id)}
                                        {tab.badge}
                                    </span>
                                    {selected && (
                                        <span className="font-tech-mono text-[10px] px-2 py-0.5 rounded bg-[#7CD4B6] text-[#0D1F1B] font-semibold">
                                            Ativo
                                        </span>
                                    )}
                                </div>
                                <div className="mt-2 text-sm font-semibold text-white">
                                    {tab.label}
                                </div>
                                <p className="mt-1 text-xs text-[#9BB4AB] leading-relaxed">
                                    {tab.shortDesc}
                                </p>
                            </button>
                        )
                    })}
                </div>

                {/* Workbench interativo Antes -> Depois */}
                <div
                    id="ai-workbench-panel"
                    role="tabpanel"
                    aria-labelledby={`ai-tab-${activeTab.id}`}
                    className="mt-6 rounded-2xl border border-[#1D3831] bg-[#112823] overflow-hidden"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-12">
                        {/* Lado Esquerdo: Entrada da clínica */}
                        <div className="lg:col-span-5 p-6 sm:p-7 border-b lg:border-b-0 lg:border-r border-[#1D3831] flex flex-col justify-between gap-6">
                            <div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-tech-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded bg-[#0D1F1B] border border-[#1D3831] text-[#A8BCB5]">
                                        Entrada da equipe
                                    </span>
                                    <span className="font-tech-mono text-[11px] text-[#7CD4B6]">
                                        Escudo LGPD ativo
                                    </span>
                                </div>

                                <h3 className="mt-4 text-base sm:text-lg font-semibold text-white">
                                    {activeTab.inputTitle}
                                </h3>
                                <p className="mt-1 font-tech-mono text-[11px] text-[#8DA89F]">
                                    {activeTab.inputMeta}
                                </p>

                                <div className="mt-4 rounded-xl border border-[#1D3831] bg-[#0D1F1B] p-4 sm:p-5 text-sm text-[#D8E7E1] leading-relaxed">
                                    “{activeTab.inputText}”
                                </div>

                                {/* Aviso de privacidade visual */}
                                <div className="mt-4 rounded-lg border border-[#1D3831] bg-[#0D1F1B]/70 px-3.5 py-2.5 flex items-center justify-between gap-2 font-tech-mono text-[11px]">
                                    <span className="text-[#8DA89F]">Identificação protegida:</span>
                                    <span className="text-[#7CD4B6]">[PACIENTE] · [CONSELHO_OK]</span>
                                </div>
                            </div>

                            {/* Checklist de validação técnica */}
                            <div className="pt-4 border-t border-[#1D3831]">
                                <div className="font-tech-mono text-[10px] uppercase tracking-wider text-[#7CD4B6] mb-3">
                                    Verificação automática do fluxo
                                </div>
                                <ul className="space-y-2">
                                    {activeTab.auditChecks.map((check) => (
                                        <li key={check} className="flex items-start gap-2 text-xs text-[#CBE2D8]">
                                            <Check className="w-3.5 h-3.5 text-[#7CD4B6] mt-0.5 shrink-0" strokeWidth={2} />
                                            <span>{check}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Lado Direito: Saída estruturada pronta para revisão */}
                        <div className="lg:col-span-7 p-6 sm:p-7 bg-[#0F241F] flex flex-col justify-between gap-5">
                            <div>
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#1D3831]">
                                    <div>
                                        <h3 className="text-base sm:text-lg font-semibold text-white">
                                            {activeTab.outputTitle}
                                        </h3>
                                        <p className="mt-0.5 font-tech-mono text-[11px] text-[#7CD4B6]">
                                            {activeTab.outputMeta}
                                        </p>
                                    </div>
                                    <span className="font-tech-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded bg-[#155E4B] text-white font-semibold">
                                        Pronto para revisar e assinar
                                    </span>
                                </div>

                                {/* Caso especial: Fluxo 03 com seletor real de 3 tons */}
                                {activeTab.id === 'laudos' ? (
                                    <div className="mt-5 space-y-4">
                                        <div className="flex flex-wrap gap-2">
                                            {(['convenio', 'medico', 'escola'] as ReportToneId[]).map((toneKey) => {
                                                const tone = CLINIGO_AI_CONTENT.reportTones[toneKey]
                                                const isToneActive = reportTone === toneKey
                                                return (
                                                    <button
                                                        key={toneKey}
                                                        type="button"
                                                        onClick={() => setReportTone(toneKey)}
                                                        className={`min-h-[42px] px-3.5 rounded-md border text-xs font-semibold transition-colors cursor-pointer ${
                                                            isToneActive
                                                                ? 'bg-[#7CD4B6] border-[#7CD4B6] text-[#0D1F1B]'
                                                                : 'bg-[#0D1F1B] border-[#1D3831] text-[#CBE2D8] hover:border-[#7CD4B6]/60'
                                                        }`}
                                                    >
                                                        {tone.label}
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        <div className="rounded-xl border border-[#23473E] bg-[#0D1F1B] p-5 space-y-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="font-tech-mono text-[11px] text-[#7CD4B6] font-semibold">
                                                    {activeTone.audienceBadge}
                                                </span>
                                                <span className="font-tech-mono text-[10px] text-[#8DA89F]">
                                                    Mesmos dados clínicos · Tom adaptado
                                                </span>
                                            </div>
                                            <div className="text-sm sm:text-base font-semibold text-white">
                                                {activeTone.heading}
                                            </div>
                                            <p className="text-sm text-[#D8E7E1] leading-relaxed">
                                                {activeTone.body}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-5 space-y-3.5">
                                        {activeTab.outputSections.map((sec) => (
                                            <div
                                                key={sec.heading}
                                                className="rounded-xl border border-[#1D3831] bg-[#0D1F1B] p-4 sm:p-4.5"
                                            >
                                                <div className="font-tech-mono text-[11px] font-semibold text-[#7CD4B6]">
                                                    {sec.heading}
                                                </div>
                                                <p className="mt-1.5 text-xs sm:text-sm text-[#D8E7E1] leading-relaxed">
                                                    {sec.body}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-[#1D3831] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#8DA89F]">
                                <span className="font-tech-mono">{MOCKUP_DISCLAIMER}</span>
                                <span>A decisão e assinatura final são sempre do profissional habilitado.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

