'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Minus, Plus } from 'lucide-react'
import { PLANS_CONTENT } from './content'

export function PlansSection() {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})

    return (
        <section id="planos" className="scroll-mt-20 py-20 lg:py-28 bg-white border-y border-[#E6E8E5]">
            <div className="max-w-7xl mx-auto px-5 sm:px-8">
                <div className="max-w-3xl mb-12">
                    <p className="font-tech-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#155E4B]">
                        {PLANS_CONTENT.kicker}
                    </p>
                    <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-[-0.03em] leading-[1.08] text-[#0F1F1B]">
                        {PLANS_CONTENT.headlineBefore}
                        <span className="font-serif-accent text-[#155E4B] font-normal text-[1.08em]">
                            {PLANS_CONTENT.headlineAccent}
                        </span>
                        {PLANS_CONTENT.headlineAfter}
                    </h2>
                    <p className="mt-3.5 text-base text-[#4B5B56]">
                        {PLANS_CONTENT.subtitle}
                    </p>
                </div>

                {/* 3 colunas alinhadas com perfeição */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
                    {PLANS_CONTENT.plans.map((plan) => {
                        const isOpen = !!expanded[plan.id]
                        return (
                            <article
                                key={plan.id}
                                className={`rounded-xl p-6 sm:p-7 flex flex-col justify-between border transition-colors ${
                                    plan.featured
                                        ? 'bg-[#FAFAF8] border-[#155E4B] ring-1 ring-[#155E4B]/20'
                                        : 'bg-white border-[#E6E8E5]'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-lg font-semibold text-[#0F1F1B]">
                                            CliniGo {plan.name}
                                        </h3>
                                        {plan.badge && (
                                            <span className="font-tech-mono text-[11px] font-medium px-2.5 py-0.5 rounded bg-[#E6F2EE] text-[#114D3E]">
                                                {plan.badge}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-[#4B5B56]">{plan.audience}</p>

                                    <div className="mt-6 flex items-baseline gap-1">
                                        <span className="font-tech-mono text-sm text-[#4B5B56]">R$</span>
                                        <span className="font-tech-mono text-4xl sm:text-5xl font-semibold tracking-tight text-[#0F1F1B]">
                                            {plan.price}
                                        </span>
                                        <span className="font-tech-mono text-sm text-[#4B5B56]">/mês</span>
                                    </div>
                                    <div className="mt-1.5 font-tech-mono text-xs text-[#114D3E]">
                                        {plan.licenses}
                                    </div>

                                    <Link
                                        href={PLANS_CONTENT.ctaHref}
                                        className={`mt-6 w-full min-h-[46px] px-4 rounded-md text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5 group ${
                                            plan.featured
                                                ? 'bg-[#155E4B] hover:bg-[#0F493A] text-white'
                                                : 'bg-[#0F1F1B] hover:bg-[#155E4B] text-white'
                                        }`}
                                    >
                                        {PLANS_CONTENT.ctaLabel}
                                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
                                    </Link>

                                    <ul className="mt-6 pt-6 border-t border-[#E6E8E5] space-y-3">
                                        {plan.core.map((feat) => (
                                            <li key={feat} className="flex items-start gap-2.5 text-sm text-[#0F1F1B]">
                                                <Check className="w-4 h-4 text-[#155E4B] mt-0.5 shrink-0" strokeWidth={2} />
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {isOpen && (
                                        <ul
                                            id={`plan-extra-${plan.id}`}
                                            className="mt-3 pt-3 border-t border-[#E6E8E5]/70 space-y-2.5"
                                        >
                                            {plan.extra.map((feat) => (
                                                <li key={feat} className="flex items-start gap-2.5 text-sm text-[#4B5B56]">
                                                    <Check className="w-4 h-4 text-[#155E4B] mt-0.5 shrink-0" strokeWidth={1.75} />
                                                    <span>{feat}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    aria-expanded={isOpen}
                                    aria-controls={`plan-extra-${plan.id}`}
                                    onClick={() =>
                                        setExpanded((prev) => ({ ...prev, [plan.id]: !prev[plan.id] }))
                                    }
                                    className="mt-6 min-h-[40px] self-start inline-flex items-center gap-1.5 text-xs font-semibold text-[#155E4B] hover:text-[#0F1F1B] transition-colors cursor-pointer"
                                >
                                    {isOpen ? (
                                        <Minus className="w-3.5 h-3.5" strokeWidth={1.75} />
                                    ) : (
                                        <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                                    )}
                                    {isOpen ? PLANS_CONTENT.collapseLabel : PLANS_CONTENT.expandLabel}
                                </button>
                            </article>
                        )
                    })}
                </div>

                {/* Nota comercial obrigatória */}
                <div className="mt-8 rounded-xl border border-[#E6E8E5] bg-[#F2F5F3] p-5 sm:p-6">
                    <p className="text-xs sm:text-sm text-[#0F1F1B] leading-relaxed">
                        {PLANS_CONTENT.commercialNote}
                    </p>
                </div>
            </div>
        </section>
    )
}
