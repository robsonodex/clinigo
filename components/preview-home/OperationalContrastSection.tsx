import { ArrowRight } from 'lucide-react'
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

                {/* Matriz horizontal minimalista 01 a 04 */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border border-[#E6E8E5] rounded-xl overflow-hidden bg-[#E6E8E5] gap-px">
                    {OPERATIONAL_CONTRAST.items.map((item) => (
                        <article
                            key={item.index}
                            className="bg-[#FAFAF8] hover:bg-white transition-colors duration-200 p-6 sm:p-7 flex flex-col justify-between"
                        >
                            <div>
                                <span className="font-tech-mono text-xs font-semibold text-[#155E4B]">
                                    {item.index}
                                </span>
                                <div className="mt-4 pb-4 border-b border-[#E6E8E5]">
                                    <div className="font-tech-mono text-[10px] uppercase tracking-wider text-[#4B5B56]">
                                        Rotina atual
                                    </div>
                                    <h3 className="mt-1.5 text-base font-semibold text-[#0F1F1B] leading-snug">
                                        {item.problem}
                                    </h3>
                                </div>

                                <div className="mt-4">
                                    <div className="inline-flex items-center gap-1.5 font-tech-mono text-[10px] uppercase tracking-wider text-[#114D3E]">
                                        <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
                                        No CliniGo
                                    </div>
                                    <div className="mt-1.5 text-sm font-semibold text-[#0F1F1B] leading-snug">
                                        {item.solutionTitle}
                                    </div>
                                    <p className="mt-2 text-sm text-[#4B5B56] leading-relaxed">
                                        {item.solutionDetail}
                                    </p>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}

