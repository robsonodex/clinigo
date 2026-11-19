'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { FAQ_CONTENT } from './content'

export function FaqSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0)

    return (
        <section id="duvidas" className="scroll-mt-20 py-20 lg:py-24">
            <div className="max-w-4xl mx-auto px-5 sm:px-8">
                <div className="mb-10">
                    <p className="font-tech-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#155E4B]">
                        {FAQ_CONTENT.kicker}
                    </p>
                    <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-[-0.03em] text-[#0F1F1B] leading-tight">
                        {FAQ_CONTENT.title}
                    </h2>
                </div>

                <div className="divide-y divide-[#E6E8E5] border-y border-[#E6E8E5]">
                    {FAQ_CONTENT.items.map((item, idx) => {
                        const isOpen = openIndex === idx
                        const panelId = `faq-editorial-panel-${idx}`
                        const buttonId = `faq-editorial-trigger-${idx}`
                        return (
                            <div key={item.question}>
                                <h3>
                                    <button
                                        id={buttonId}
                                        type="button"
                                        aria-expanded={isOpen}
                                        aria-controls={panelId}
                                        onClick={() => setOpenIndex(isOpen ? null : idx)}
                                        className="w-full min-h-[58px] py-4 text-left flex items-center justify-between gap-4 cursor-pointer group"
                                    >
                                        <span className="text-sm sm:text-base font-semibold text-[#0F1F1B] group-hover:text-[#155E4B] transition-colors">
                                            {item.question}
                                        </span>
                                        <ChevronDown
                                            className={`w-4 h-4 text-[#4B5B56] shrink-0 transition-transform duration-200 ${
                                                isOpen ? 'rotate-180 text-[#155E4B]' : ''
                                            }`}
                                            strokeWidth={1.75}
                                        />
                                    </button>
                                </h3>
                                {isOpen && (
                                    <div
                                        id={panelId}
                                        role="region"
                                        aria-labelledby={buttonId}
                                        className="pb-5 pr-8 text-sm text-[#4B5B56] leading-relaxed"
                                    >
                                        {item.answer}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
