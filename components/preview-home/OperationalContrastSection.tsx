import { CheckCircle2 } from 'lucide-react'
import { OPERATIONAL_CONTRAST } from './content'

export function OperationalContrastSection() {
    return (
        <section id="operacao" className="scroll-mt-20 py-20 lg:py-28 bg-white border-y border-[#E6E8E5]">
            <div className="max-w-7xl mx-auto px-5 sm:px-8">
                <div className="max-w-3xl">
                    <p className="font-tech-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#155E4B]">
                        {OPERATIONAL_CONTRAST.kicker}
                    </p>
                    <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-[-0.03em] leading-[1.08] text-[#0F1F1B]">
                        {OPERATIONAL_CONTRAST.headlineBefore}
                        <span className="font-serif-accent text-[#155E4B] font-normal text-[1.08em]">
                            {OPERATIONAL_CONTRAST.headlineAccent}
                        </span>
                        {OPERATIONAL_CONTRAST.headlineAfter}
                    </h2>
                    <p className="mt-4 text-base text-[#4B5B56] leading-relaxed">
                        {OPERATIONAL_CONTRAST.subtitle}
                    </p>
                </div>

                {/* Matriz editorial de entregas e resultados reais (6 frentes integradas) */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border border-[#E6E8E5] rounded-xl overflow-hidden bg-[#E6E8E5] gap-px">
                    {OPERATIONAL_CONTRAST.items.map((item) => (
                        <article
                            key={item.index}
                            className="bg-[#FAFAF8] hover:bg-white transition-colors duration-200 p-6 sm:p-7 flex flex-col justify-between gap-5"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-tech-mono text-xs font-semibold text-[#155E4B]">
                                        {item.index}
                                    </span>
                                    <span className="font-tech-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded bg-[#E6F2EE] text-[#114D3E] font-medium">
                                        {item.metricBadge}
                                    </span>
                                </div>

                                <h3 className="mt-4 text-lg font-semibold text-[#0F1F1B] leading-snug tracking-[-0.015em]">
                                    {item.solutionTitle}
                                </h3>
                                <p className="mt-2.5 text-sm text-[#4B5B56] leading-relaxed">
                                    {item.solutionDetail}
                                </p>
                            </div>

                            <div className="pt-4 border-t border-[#E6E8E5] flex items-center gap-2 text-xs font-medium text-[#114D3E]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#155E4B] shrink-0" strokeWidth={1.85} />
                                <span>{item.resultHighlight}</span>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}
