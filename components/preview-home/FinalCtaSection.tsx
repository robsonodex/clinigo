import Link from 'next/link'
import { ArrowRight, MessageSquare } from 'lucide-react'
import { FINAL_CTA_CONTENT } from './content'

export function FinalCtaSection() {
    return (
        <section aria-label="Avalie o CliniGo na prática" className="px-5 sm:px-8 pb-20 lg:pb-24">
            <div className="max-w-7xl mx-auto rounded-xl border border-[#C8DFD6] bg-[#F2F5F3] px-6 py-10 sm:px-12 sm:py-14">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="max-w-2xl">
                        <p className="font-tech-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#155E4B]">
                            {FINAL_CTA_CONTENT.kicker}
                        </p>
                        <h2 className="mt-2.5 text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-[-0.03em] text-[#0F1F1B] leading-[1.1]">
                            {FINAL_CTA_CONTENT.title}
                        </h2>
                        <p className="mt-3 text-sm sm:text-base text-[#4B5B56] leading-relaxed">
                            {FINAL_CTA_CONTENT.subtitle}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                        <Link
                            href={FINAL_CTA_CONTENT.primaryHref}
                            className="min-h-[48px] px-6 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 group"
                        >
                            {FINAL_CTA_CONTENT.primaryLabel}
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
                        </Link>
                        <a
                            href={FINAL_CTA_CONTENT.secondaryHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[48px] px-6 rounded-md border border-[#C8DFD6] bg-white hover:bg-[#E6F2EE] text-[#0F1F1B] text-sm font-medium transition-colors inline-flex items-center justify-center gap-2"
                        >
                            <MessageSquare className="w-4 h-4 text-[#155E4B]" strokeWidth={1.75} />
                            {FINAL_CTA_CONTENT.secondaryLabel}
                        </a>
                    </div>
                </div>
            </div>
        </section>
    )
}
