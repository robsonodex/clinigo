import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, MessageSquare } from 'lucide-react'
import { FINAL_CTA_CONTENT } from './content'

export function FinalCtaSection() {
    return (
        <section aria-label="Avalie o CliniGo na prática" className="px-5 sm:px-8 pb-20 lg:pb-24">
            <div className="max-w-7xl mx-auto rounded-2xl overflow-hidden border border-[#1D3831] bg-[#0D1F1B] text-white shadow-[0_24px_60px_-34px_rgba(13,31,27,0.45)]">
                <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                    {/* Lado Esquerdo: Copy forte + CTAs */}
                    <div className="lg:col-span-7 px-6 py-10 sm:px-12 sm:py-14 flex flex-col justify-center">
                        <p className="font-tech-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#7CD4B6]">
                            {FINAL_CTA_CONTENT.kicker}
                        </p>
                        <h2 className="mt-3 text-2xl sm:text-3xl lg:text-[40px] font-semibold tracking-[-0.03em] text-white leading-[1.08]">
                            {FINAL_CTA_CONTENT.title}
                        </h2>
                        <p className="mt-4 text-sm sm:text-base text-[#B6CCC4] leading-relaxed max-w-xl">
                            {FINAL_CTA_CONTENT.subtitle}
                        </p>

                        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#D6EFE5]">
                            {FINAL_CTA_CONTENT.trustPoints.map((point) => (
                                <span key={point} className="inline-flex items-center gap-1.5">
                                    <Check className="w-3.5 h-3.5 text-[#7CD4B6] shrink-0" strokeWidth={2.2} />
                                    {point}
                                </span>
                            ))}
                        </div>

                        <div className="mt-8 flex flex-col sm:flex-row gap-3">
                            <Link
                                href={FINAL_CTA_CONTENT.primaryHref}
                                className="min-h-[48px] px-6 rounded-md bg-[#7CD4B6] hover:bg-[#95E0C6] text-[#0D1F1B] text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 group"
                            >
                                {FINAL_CTA_CONTENT.primaryLabel}
                                <ArrowRight
                                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                                    strokeWidth={2}
                                />
                            </Link>
                            <a
                                href={FINAL_CTA_CONTENT.secondaryHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-h-[48px] px-6 rounded-md border border-[#2A5347] bg-[#112823] hover:bg-[#17352E] text-white text-sm font-medium transition-colors inline-flex items-center justify-center gap-2"
                            >
                                <MessageSquare className="w-4 h-4 text-[#7CD4B6]" strokeWidth={1.75} />
                                {FINAL_CTA_CONTENT.secondaryLabel}
                            </a>
                        </div>
                    </div>

                    {/* Lado Direito: Fotografia editorial arquitetônica viva */}
                    <div className="lg:col-span-5 relative min-h-[260px] sm:min-h-[320px] lg:min-h-full border-t lg:border-t-0 lg:border-l border-[#1D3831]">
                        <Image
                            src={FINAL_CTA_CONTENT.imageSrc}
                            alt={FINAL_CTA_CONTENT.imageAlt}
                            fill
                            sizes="(max-width: 1024px) 100vw, 42vw"
                            className="object-cover object-center"
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}
