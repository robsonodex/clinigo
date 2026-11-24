'use client'

import { useState, type KeyboardEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, CheckCircle2, XCircle } from 'lucide-react'
import { MOCKUP_DISCLAIMER, PAIN_CHAPTERS_CONTENT } from './content'

export function OperationalContrastSection() {
    const chapters = PAIN_CHAPTERS_CONTENT.chapters
    const [activeId, setActiveId] = useState(chapters[0].id)

    const activeIdx = Math.max(0, chapters.findIndex((c) => c.id === activeId))
    const chapter = chapters[activeIdx] || chapters[0]

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveId(chapters[(idx + 1) % chapters.length].id)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveId(chapters[(idx - 1 + chapters.length) % chapters.length].id)
        }
    }

    return (
        <section id="operacao" className="scroll-mt-20 py-16 lg:py-24 bg-white border-y border-[#E6E8E5]">
            <div className="max-w-7xl mx-auto px-5 sm:px-8">
                {/* Cabeçalho atacando dores reais */}
                <div className="max-w-3xl">
                    <p className="font-tech-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#155E4B]">
                        {PAIN_CHAPTERS_CONTENT.kicker}
                    </p>
                    <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[44px] font-semibold tracking-[-0.03em] leading-[1.07] text-[#0F1F1B]">
                        {PAIN_CHAPTERS_CONTENT.headlineBefore}
                        <span className="font-serif-accent text-[#155E4B] font-normal text-[1.08em]">
                            {PAIN_CHAPTERS_CONTENT.headlineAccent}
                        </span>
                        {PAIN_CHAPTERS_CONTENT.headlineAfter}
                    </h2>
                    <p className="mt-4 text-base text-[#4B5B56] leading-relaxed">
                        {PAIN_CHAPTERS_CONTENT.subtitle}
                    </p>
                </div>

                {/* Abas das 4 dores reais */}
                <div
                    role="tablist"
                    aria-label="Selecionar a dor da clínica"
                    className="mt-9 grid grid-cols-2 lg:grid-cols-4 gap-2.5"
                >
                    {chapters.map((item, idx) => {
                        const selected = item.id === chapter.id
                        return (
                            <button
                                key={item.id}
                                role="tab"
                                type="button"
                                id={`pain-tab-${item.id}`}
                                aria-selected={selected}
                                aria-controls="pain-panel"
                                onClick={() => setActiveId(item.id)}
                                onKeyDown={(e) => handleKeyDown(e, idx)}
                                className={`min-h-[64px] text-left rounded-xl border px-3.5 sm:px-4 py-3 transition-all duration-200 cursor-pointer ${
                                    selected
                                        ? 'bg-[#155E4B] border-[#155E4B] text-white shadow-[0_12px_28px_-20px_rgba(21,94,75,0.65)]'
                                        : 'bg-[#FAFAF8] border-[#E6E8E5] text-[#0F1F1B] hover:border-[#C7CFCB] hover:bg-white'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`font-tech-mono text-[11px] font-semibold ${
                                            selected ? 'text-[#A8E0CC]' : 'text-[#155E4B]'
                                        }`}
                                    >
                                        {item.number}
                                    </span>
                                    <span className="text-xs sm:text-sm font-semibold leading-snug">
                                        {item.tabLabel}
                                    </span>
                                </div>
                                <div
                                    className={`mt-1 text-[11px] sm:text-xs leading-snug ${
                                        selected ? 'text-[#D6EFE5]' : 'text-[#4B5B56]'
                                    }`}
                                >
                                    {item.tabHint}
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Painel da dor selecionada: fotografia + virada no CliniGo */}
                <article
                    id="pain-panel"
                    role="tabpanel"
                    aria-labelledby={`pain-tab-${chapter.id}`}
                    className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center"
                >
                    <div className="lg:col-span-6">
                        <div className="relative rounded-2xl overflow-hidden border border-[#E6E8E5] bg-[#F2F5F3] shadow-[0_24px_60px_-36px_rgba(15,31,27,0.28)]">
                            <div className="relative aspect-[16/10] w-full overflow-hidden">
                                <Image
                                    key={chapter.imageSrc}
                                    src={chapter.imageSrc}
                                    alt={chapter.imageAlt}
                                    fill
                                    sizes="(max-width: 1024px) 100vw, 50vw"
                                    className={`object-cover ${chapter.imagePosition || 'object-center'}`}
                                />
                            </div>
                            <div className="p-4 bg-white border-t border-[#E6E8E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="font-tech-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#155E4B]">
                                        {chapter.overlayBadge}
                                    </div>
                                    <div className="mt-0.5 text-sm font-semibold text-[#0F1F1B]">
                                        {chapter.overlayTitle}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {chapter.overlayMetrics.map((metric) => (
                                        <div
                                            key={metric.label}
                                            className="rounded-lg border border-[#E6E8E5] bg-[#FAFAF8] px-3 py-1.5"
                                        >
                                            <div className="text-[10px] text-[#4B5B56] leading-tight">
                                                {metric.label}
                                            </div>
                                            <div className="font-tech-mono text-xs font-semibold text-[#114D3E] mt-0.5">
                                                {metric.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-6">
                        <span className="font-tech-mono text-[11px] uppercase tracking-[0.12em] text-[#4B5B56]">
                            {chapter.eyebrow}
                        </span>

                        <blockquote className="mt-3 pl-4 border-l-2 border-[#C89B54] text-sm italic text-[#5C4A28] bg-[#FCF8F0] py-2.5 pr-4 rounded-r-lg">
                            {chapter.painQuote}
                        </blockquote>

                        <h3 className="mt-4 text-2xl sm:text-[28px] font-semibold tracking-[-0.025em] leading-[1.12] text-[#0F1F1B]">
                            {chapter.headlineBefore}
                            <span className="font-serif-accent text-[#155E4B] font-normal text-[1.08em]">
                                {chapter.headlineAccent}
                            </span>
                            {chapter.headlineAfter}
                        </h3>

                        <p className="mt-3 text-sm text-[#4B5B56] leading-relaxed">{chapter.story}</p>

                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-xl border border-[#EFE2DC] bg-[#FBF6F4] p-3.5">
                                <div className="inline-flex items-center gap-1.5 font-tech-mono text-[11px] font-semibold uppercase tracking-wider text-[#9A3D28]">
                                    <XCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
                                    {chapter.beforeLabel}
                                </div>
                                <p className="mt-1.5 text-xs text-[#5B433D] leading-relaxed">{chapter.beforeText}</p>
                            </div>
                            <div className="rounded-xl border border-[#C8DFD6] bg-[#F2FAF7] p-3.5">
                                <div className="inline-flex items-center gap-1.5 font-tech-mono text-[11px] font-semibold uppercase tracking-wider text-[#114D3E]">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#155E4B] shrink-0" strokeWidth={1.8} />
                                    {chapter.afterLabel}
                                </div>
                                <p className="mt-1.5 text-xs text-[#0F1F1B] leading-relaxed">{chapter.afterText}</p>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {chapter.capabilities.map((cap) => (
                                <span
                                    key={cap}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#E6E8E5] bg-[#FAFAF8] text-xs font-medium text-[#0F1F1B]"
                                >
                                    <Check className="w-3.5 h-3.5 text-[#155E4B] shrink-0" strokeWidth={2} />
                                    {cap}
                                </span>
                            ))}
                        </div>
                    </div>
                </article>

                {/* Transição para a CliniGo IA */}
                <div className="mt-10 pt-5 border-t border-[#E6E8E5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="font-tech-mono text-[11px] text-[#4B5B56]">
                        {MOCKUP_DISCLAIMER} · Fluxos ativos no CliniGo 2.0
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                        <a
                            href="#clinigo-ia"
                            className="min-h-[44px] px-4 rounded-md border border-[#C8DFD6] bg-[#E6F2EE] hover:bg-[#D7EBE4] text-[#114D3E] text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-1.5"
                        >
                            Ver a CliniGo IA em ação
                            <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                        </a>
                        <Link
                            href="/trial"
                            className="min-h-[44px] px-4 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs sm:text-sm font-medium transition-colors inline-flex items-center gap-1.5"
                        >
                            Começar teste de 7 dias
                            <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}
