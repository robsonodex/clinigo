'use client'

import { useState, type KeyboardEvent } from 'react'
import { Check, ClipboardList, Target } from 'lucide-react'
import { MOCKUP_DISCLAIMER, SPECIALTIES_XRAY_CONTENT } from './content'

export function SpecialtyXRaySection() {
    const specialties = SPECIALTIES_XRAY_CONTENT.specialties
    const [activeId, setActiveId] = useState(specialties[0].id)

    const activeIdx = Math.max(0, specialties.findIndex((s) => s.id === activeId))
    const active = specialties[activeIdx] || specialties[0]

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault()
            setActiveId(specialties[(idx + 1) % specialties.length].id)
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            setActiveId(specialties[(idx - 1 + specialties.length) % specialties.length].id)
        }
    }

    return (
        <section id="especialidades" className="scroll-mt-20 py-20 lg:py-28 bg-white border-t border-[#E6E8E5]">
            <div className="max-w-7xl mx-auto px-5 sm:px-8">
                <div className="max-w-3xl">
                    <p className="font-tech-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#155E4B]">
                        {SPECIALTIES_XRAY_CONTENT.kicker}
                    </p>
                    <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-[-0.03em] leading-[1.08] text-[#0F1F1B]">
                        {SPECIALTIES_XRAY_CONTENT.headlineBefore}
                        <span className="font-serif-accent text-[#155E4B] font-normal text-[1.08em]">
                            {SPECIALTIES_XRAY_CONTENT.headlineAccent}
                        </span>
                        {SPECIALTIES_XRAY_CONTENT.headlineAfter}
                    </h2>
                    <p className="mt-3.5 text-base text-[#4B5B56] leading-relaxed">
                        {SPECIALTIES_XRAY_CONTENT.subtitle}
                    </p>
                </div>

                {/* Seletor em pílulas elegantes */}
                <div
                    role="tablist"
                    aria-label="Selecionar especialidade clínica"
                    className="mt-9 flex flex-wrap gap-2"
                >
                    {specialties.map((spec, idx) => {
                        const selected = spec.id === active.id
                        return (
                            <button
                                key={spec.id}
                                role="tab"
                                type="button"
                                id={`xray-tab-${spec.id}`}
                                aria-selected={selected}
                                aria-controls={`xray-panel-${spec.id}`}
                                onClick={() => setActiveId(spec.id)}
                                onKeyDown={(e) => handleKeyDown(e, idx)}
                                className={`ec-pill min-h-[44px] px-4 sm:px-5 border text-xs sm:text-sm font-medium transition-colors duration-200 cursor-pointer ${
                                    selected
                                        ? 'bg-[#155E4B] border-[#155E4B] text-white'
                                        : 'bg-[#FAFAF8] border-[#E6E8E5] text-[#4B5B56] hover:border-[#C7CFCB] hover:text-[#0F1F1B]'
                                }`}
                            >
                                {spec.label}
                            </button>
                        )
                    })}
                </div>

                {/* Split: Benefícios da equipe + Ficha de Plano de Sessão fiel */}
                <div
                    id={`xray-panel-${active.id}`}
                    role="tabpanel"
                    aria-labelledby={`xray-tab-${active.id}`}
                    className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch"
                >
                    <div className="lg:col-span-5 rounded-xl border border-[#E6E8E5] bg-[#FAFAF8] p-6 sm:p-7 flex flex-col justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-tech-mono text-[11px] px-2.5 py-1 rounded bg-[#E6F2EE] text-[#114D3E] font-medium">
                                    {active.council}
                                </span>
                                <span className="font-tech-mono text-[11px] px-2.5 py-1 rounded bg-white border border-[#E6E8E5] text-[#4B5B56]">
                                    {active.modelBadge}
                                </span>
                            </div>

                            <h3 className="mt-5 text-xl sm:text-2xl font-semibold tracking-[-0.02em] text-[#0F1F1B]">
                                {active.label}
                            </h3>
                            <p className="mt-2.5 text-sm text-[#4B5B56] leading-relaxed">
                                {active.summary}
                            </p>

                            <ul className="mt-6 space-y-3.5">
                                {active.benefits.map((benefit) => (
                                    <li key={benefit} className="flex items-start gap-2.5 text-sm text-[#0F1F1B] leading-relaxed">
                                        <span className="w-5 h-5 rounded bg-[#E6F2EE] text-[#155E4B] flex items-center justify-center shrink-0 mt-0.5">
                                            <Check className="w-3.5 h-3.5" strokeWidth={2} />
                                        </span>
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-7 pt-4 border-t border-[#E6E8E5] font-tech-mono text-[11px] text-[#4B5B56]">
                            Template ativo no prontuário e no plano de sessão.
                        </div>
                    </div>

                    {/* Ficha de Plano de Sessão */}
                    <div className="lg:col-span-7 rounded-xl border border-[#E6E8E5] bg-white shadow-[0_14px_40px_-28px_rgba(15,31,27,0.14)] overflow-hidden flex flex-col">
                        <div className="px-5 py-3.5 border-b border-[#E6E8E5] bg-[#FAFAF8] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#0F1F1B]">
                                <ClipboardList className="w-4 h-4 text-[#155E4B]" strokeWidth={1.75} />
                                <span>{active.sheet.headerTitle}</span>
                            </div>
                            <span className="font-tech-mono text-[11px] text-[#4B5B56]">
                                {active.sheet.sessionMeta}
                            </span>
                        </div>

                        <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-5">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E6E8E5]">
                                <div>
                                    <div className="text-sm font-semibold text-[#0F1F1B]">
                                        {active.sheet.patientCode}
                                    </div>
                                    <div className="text-xs text-[#4B5B56] mt-0.5">
                                        Domínio ativo: {active.sheet.categoryLabel}
                                    </div>
                                </div>
                                <span className="font-tech-mono text-[11px] px-2.5 py-1 rounded bg-[#F2F5F3] text-[#0F1F1B] font-medium">
                                    {active.sheet.categoryCode}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {active.sheet.objectives.map((obj) => (
                                    <div
                                        key={obj.code}
                                        className="rounded-lg border border-[#E6E8E5] bg-[#FAFAF8]/70 p-4 space-y-2.5"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="inline-flex items-center gap-1.5 font-tech-mono text-xs font-semibold text-[#114D3E]">
                                                <Target className="w-3.5 h-3.5" strokeWidth={1.75} />
                                                {obj.code}
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-white border border-[#E6E8E5] text-[11px] font-medium text-[#4B5B56]">
                                                Nível de ajuda: {obj.helpLevel}
                                            </span>
                                        </div>
                                        <div className="text-sm font-semibold text-[#0F1F1B]">
                                            {obj.title}
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#4B5B56]">
                                            <span>Critério: {obj.criterion}</span>
                                            <span className="font-tech-mono font-semibold text-[#155E4B]">
                                                {obj.progress}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-[#E6E8E5] overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-[#155E4B] transition-all duration-300"
                                                style={{ width: `${obj.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-lg border border-[#C8DFD6] bg-[#E6F2EE]/50 p-4">
                                <div className="font-tech-mono text-[10px] uppercase tracking-wider text-[#114D3E] font-semibold">
                                    Conduta para a próxima sessão
                                </div>
                                <p className="mt-1 text-xs sm:text-sm text-[#0F1F1B] leading-relaxed">
                                    {active.sheet.nextConduct}
                                </p>
                            </div>

                            <div className="pt-2 border-t border-[#E6E8E5] font-tech-mono text-[11px] text-[#4B5B56]">
                                {MOCKUP_DISCLAIMER}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

