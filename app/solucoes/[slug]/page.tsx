import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Layers, Shield } from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'
import { getSolutionBySlug, SOLUTIONS_DATA } from '@/lib/seo/solutions-data'
import { getBlogArticleBySlug } from '@/lib/seo/blog-articles'
import { PLANS_CONTENT, WHATSAPP_URL } from '@/components/preview-home/content'

interface SolutionPageProps {
    params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
    return SOLUTIONS_DATA.map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({ params }: SolutionPageProps): Promise<Metadata> {
    const { slug } = await params
    const solution = getSolutionBySlug(slug)
    if (!solution) {
        return { title: 'Solução não encontrada' }
    }

    const url = `https://clinigo.app/solucoes/${solution.slug}`
    return {
        title: solution.seoTitle,
        description: solution.seoDescription,
        alternates: {
            canonical: url,
        },
        keywords: solution.keywords,
        openGraph: {
            title: `${solution.seoTitle} | CliniGo`,
            description: solution.seoDescription,
            url,
            siteName: 'CliniGo',
            type: 'website',
            locale: 'pt_BR',
            images: [
                {
                    url: 'https://clinigo.app/dashboard-preview.png',
                    width: 1200,
                    height: 630,
                    alt: `${solution.seoTitle} — CliniGo`,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${solution.seoTitle} | CliniGo`,
            description: solution.seoDescription,
            images: ['https://clinigo.app/dashboard-preview.png'],
        },
    }
}

export default async function SolutionDetailPage({ params }: SolutionPageProps) {
    const { slug } = await params
    const solution = getSolutionBySlug(slug)
    if (!solution) {
        notFound()
    }

    const canonicalUrl = `https://clinigo.app/solucoes/${solution.slug}`
    const relatedSolutions = solution.relatedSlugs
        .map((s) => getSolutionBySlug(s))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))

    const relatedArticles = solution.relatedBlogSlugs
        .map((s) => getBlogArticleBySlug(s))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))

    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://clinigo.app' },
                    { '@type': 'ListItem', position: 2, name: 'Soluções', item: 'https://clinigo.app/solucoes' },
                    { '@type': 'ListItem', position: 3, name: solution.shortLabel, item: canonicalUrl },
                ],
            },
            {
                '@type': 'SoftwareApplication',
                name: `CliniGo — ${solution.shortLabel}`,
                applicationCategory: 'BusinessApplication',
                applicationSubCategory: solution.seoTitle,
                operatingSystem: 'Web, Android, iOS (PWA)',
                inLanguage: 'pt-BR',
                url: canonicalUrl,
                description: solution.seoDescription,
                featureList: solution.directAnswerFacts,
                provider: {
                    '@type': 'Organization',
                    name: 'CliniGo',
                    url: 'https://clinigo.app',
                },
                offers: PLANS_CONTENT.plans.map((plan) => ({
                    '@type': 'Offer',
                    name: `Plano ${plan.name} CliniGo`,
                    price: plan.price,
                    priceCurrency: 'BRL',
                    availability: 'https://schema.org/InStock',
                    url: 'https://clinigo.app/planos',
                })),
            },
            {
                '@type': 'FAQPage',
                mainEntity: solution.faqs.map((faq) => ({
                    '@type': 'Question',
                    name: faq.question,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: faq.answer,
                    },
                })),
            },
        ],
    }

    return (
        <EditorialShell>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <main className="flex-1">
                {/* Hero */}
                <section className="py-12 sm:py-20 px-5 sm:px-8 border-b border-[#E6E8E5]">
                    <div className="max-w-5xl mx-auto">
                        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-[#4B5B56]">
                            <Link href="/" className="hover:text-[#0F1F1B] transition-colors">
                                Início
                            </Link>
                            <span aria-hidden="true">/</span>
                            <Link href="/solucoes" className="hover:text-[#0F1F1B] transition-colors">
                                Soluções
                            </Link>
                            <span aria-hidden="true">/</span>
                            <span className="text-[#0F1F1B] font-medium">{solution.shortLabel}</span>
                        </nav>

                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-3">
                            {solution.councilBadge}
                        </p>

                        <h1 className="text-3xl sm:text-5xl font-semibold text-[#0F1F1B] tracking-tight leading-[1.08] mb-5 max-w-4xl">
                            {solution.h1Before}
                            <span className="font-serif-accent text-[#155E4B] font-normal">
                                {solution.h1Accent}
                            </span>
                            {solution.h1After}
                        </h1>

                        <p className="text-base sm:text-lg text-[#4B5B56] max-w-3xl leading-relaxed mb-8">
                            {solution.subtitle}
                        </p>

                        <div className="flex flex-wrap items-center gap-3">
                            <Link
                                href="/trial"
                                className="min-h-[44px] px-5 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
                            >
                                Testar 7 dias grátis
                                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                            </Link>
                            <Link
                                href="/planos"
                                className="min-h-[44px] px-5 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-[#0F1F1B] text-sm font-medium inline-flex items-center justify-center transition-colors"
                            >
                                Ver planos e preços
                            </Link>
                            <a
                                href={WHATSAPP_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-h-[44px] px-5 rounded-md border border-[#E6E8E5] bg-[#FAFAF8] hover:bg-[#F2F5F3] text-[#0F1F1B] text-sm font-medium inline-flex items-center justify-center transition-colors"
                            >
                                Falar no WhatsApp
                            </a>
                        </div>
                    </div>
                </section>

                {/* Bloco Answer-First (Resumo Objetivo para Gestores, Busca e IAs) */}
                <section className="py-12 sm:py-14 px-5 sm:px-8 bg-white border-b border-[#E6E8E5]">
                    <div className="max-w-5xl mx-auto">
                        <div className="bg-[#FAFAF8] border border-[#E6E8E5] rounded-xl p-6 sm:p-8">
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#155E4B] mb-2">
                                RESUMO TÉCNICO
                            </p>
                            <h2 className="text-xl sm:text-2xl font-semibold text-[#0F1F1B] tracking-tight mb-3">
                                {solution.directAnswerTitle}
                            </h2>
                            <p className="text-sm sm:text-base text-[#4B5B56] leading-relaxed mb-6">
                                {solution.directAnswerBody}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {solution.directAnswerFacts.map((fact) => (
                                    <div
                                        key={fact}
                                        className="bg-white border border-[#E6E8E5] rounded-lg p-4 flex items-start gap-3"
                                    >
                                        <Check className="w-4 h-4 text-[#155E4B] shrink-0 mt-0.5" strokeWidth={2.25} />
                                        <span className="text-sm text-[#0F1F1B] leading-relaxed">{fact}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-5 border-t border-[#E6E8E5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <p className="font-tech-mono text-[11px] uppercase tracking-[0.12em] text-[#155E4B] font-semibold">
                                        PLANO RECOMENDADO · {solution.recommendedPlan.name} ({solution.recommendedPlan.price})
                                    </p>
                                    <p className="text-xs sm:text-sm text-[#4B5B56] mt-1">
                                        {solution.recommendedPlan.reason}
                                    </p>
                                </div>
                                <Link
                                    href="/planos"
                                    className="min-h-[44px] px-4 rounded-md border border-[#155E4B] text-[#155E4B] hover:bg-[#E6F2EE] text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors"
                                >
                                    Comparar planos
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Módulos da Especialidade */}
                <section className="py-14 sm:py-16 px-5 sm:px-8 border-b border-[#E6E8E5]">
                    <div className="max-w-5xl mx-auto">
                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                            FLUXO OPERACIONAL E CLÍNICO
                        </p>
                        <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight mb-8">
                            Recursos nativos para {solution.shortLabel}
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {solution.features.map((feat) => (
                                <div
                                    key={feat.code}
                                    className="bg-white border border-[#E6E8E5] rounded-xl p-6"
                                >
                                    <p className="font-tech-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#155E4B] mb-2">
                                        {feat.code}
                                    </p>
                                    <h3 className="text-lg font-semibold text-[#0F1F1B] mb-2">
                                        {feat.title}
                                    </h3>
                                    <p className="text-sm text-[#4B5B56] leading-relaxed">
                                        {feat.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Tabela Comparativa */}
                <section className="py-14 sm:py-16 px-5 sm:px-8 bg-white border-b border-[#E6E8E5]">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                            <div>
                                <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                                    COMPARATIVO OBJETIVO
                                </p>
                                <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight">
                                    Software genérico vs. CliniGo em {solution.shortLabel}
                                </h2>
                            </div>
                            <Link
                                href="/comparativo"
                                className="min-h-[44px] px-4 rounded-md border border-[#E6E8E5] bg-[#FAFAF8] hover:bg-[#F2F5F3] text-xs font-semibold text-[#0F1F1B] inline-flex items-center gap-1.5 shrink-0 transition-colors"
                            >
                                <Layers className="w-3.5 h-3.5 text-[#155E4B]" />
                                Ver matriz completa (12 critérios)
                            </Link>
                        </div>

                        <div className="overflow-x-auto border border-[#E6E8E5] rounded-xl">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="bg-[#FAFAF8] border-b border-[#E6E8E5]">
                                        <th className="py-3.5 px-4 text-xs font-tech-mono uppercase tracking-[0.1em] text-[#4B5B56] w-1/4">
                                            Critério
                                        </th>
                                        <th className="py-3.5 px-4 text-xs font-tech-mono uppercase tracking-[0.1em] text-[#4B5B56] w-[37%]">
                                            Software Médico Genérico / Planilhas
                                        </th>
                                        <th className="py-3.5 px-4 text-xs font-tech-mono uppercase tracking-[0.1em] text-[#114D3E] bg-[#E6F2EE]/50 w-[38%]">
                                            CliniGo (Especializado em Terapias)
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E6E8E5] text-sm">
                                    {solution.comparison.map((row) => (
                                        <tr key={row.criterion}>
                                            <td className="py-4 px-4 font-semibold text-[#0F1F1B] align-top">
                                                {row.criterion}
                                            </td>
                                            <td className="py-4 px-4 text-[#4B5B56] align-top leading-relaxed">
                                                {row.genericSoftware}
                                            </td>
                                            <td className="py-4 px-4 text-[#0F1F1B] bg-[#E6F2EE]/25 align-top leading-relaxed font-medium">
                                                {row.clinigo}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section className="py-14 sm:py-16 px-5 sm:px-8 border-b border-[#E6E8E5]">
                    <div className="max-w-4xl mx-auto">
                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                            PERGUNTAS FREQUENTES
                        </p>
                        <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight mb-8">
                            Dúvidas comuns sobre {solution.shortLabel} no CliniGo
                        </h2>

                        <div className="space-y-3">
                            {solution.faqs.map((faq, idx) => (
                                <details
                                    key={faq.question}
                                    open={idx === 0}
                                    className="group bg-white border border-[#E6E8E5] rounded-xl overflow-hidden"
                                >
                                    <summary className="list-none cursor-pointer px-5 py-4 min-h-[52px] flex items-center justify-between gap-4 text-sm sm:text-base font-semibold text-[#0F1F1B] hover:bg-[#FAFAF8] transition-colors">
                                        <span>{faq.question}</span>
                                        <ChevronDown className="w-4 h-4 text-[#155E4B] shrink-0 transition-transform group-open:rotate-180" />
                                    </summary>
                                    <div className="px-5 pb-5 pt-1 text-sm text-[#4B5B56] leading-relaxed border-t border-[#E6E8E5]/60">
                                        {faq.answer}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Artigos e Especialidades Relacionadas */}
                <section className="py-14 px-5 sm:px-8 bg-white">
                    <div className="max-w-5xl mx-auto space-y-12">
                        {relatedArticles.length > 0 && (
                            <div>
                                <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                                    CONTEÚDO TÉCNICO RELACIONADO
                                </p>
                                <h2 className="text-xl sm:text-2xl font-semibold text-[#0F1F1B] mb-5">
                                    Guias práticos para aprofundar sua operação
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {relatedArticles.map((article) => (
                                        <Link
                                            key={article.id}
                                            href={`/blog/${article.id}`}
                                            className="bg-[#FAFAF8] border border-[#E6E8E5] hover:border-[#155E4B] rounded-xl p-5 flex flex-col justify-between transition-colors"
                                        >
                                            <div>
                                                <span className="font-tech-mono text-[10px] uppercase tracking-[0.1em] text-[#155E4B] font-semibold">
                                                    {article.category}
                                                </span>
                                                <h3 className="text-base font-semibold text-[#0F1F1B] mt-2 mb-2 leading-snug">
                                                    {article.title}
                                                </h3>
                                                <p className="text-xs text-[#4B5B56] leading-relaxed">
                                                    {article.excerpt}
                                                </p>
                                            </div>
                                            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#155E4B]">
                                                Ler guia completo
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {relatedSolutions.length > 0 && (
                            <div>
                                <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                                    OUTRAS ESPECIALIDADES NA MESMA PLATAFORMA
                                </p>
                                <div className="flex flex-wrap gap-2.5 mt-3">
                                    {relatedSolutions.map((rel) => (
                                        <Link
                                            key={rel.slug}
                                            href={`/solucoes/${rel.slug}`}
                                            className="min-h-[44px] px-4 rounded-md border border-[#E6E8E5] bg-[#FAFAF8] hover:border-[#155E4B] hover:bg-[#E6F2EE]/40 text-sm font-medium text-[#0F1F1B] inline-flex items-center gap-1.5 transition-colors"
                                        >
                                            {rel.shortLabel}
                                            <ArrowRight className="w-3.5 h-3.5 text-[#155E4B]" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* CTA Final */}
                        <div className="bg-[#0D1F1B] text-white rounded-xl p-7 sm:p-9 border border-[#1D3831] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div>
                                <div className="inline-flex items-center gap-2 font-tech-mono text-[11px] uppercase tracking-[0.14em] text-[#9ED3C2] mb-2">
                                    <Shield className="w-4 h-4" />
                                    AVALIAÇÃO PRÁTICA SEM CARTÃO
                                </div>
                                <h2 className="text-2xl font-semibold tracking-tight mb-2">
                                    Teste o CliniGo na rotina de {solution.shortLabel}
                                </h2>
                                <p className="text-sm text-white/80 max-w-xl leading-relaxed">
                                    Crie sua conta gratuita de 7 dias e valide na prática agenda recorrente, prontuário estruturado, sigilo LGPD e repasses.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 shrink-0">
                                <Link
                                    href="/trial"
                                    className="min-h-[44px] px-5 rounded-md bg-[#155E4B] hover:bg-[#1B735C] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                                >
                                    Começar teste grátis
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link
                                    href="/solucoes"
                                    className="min-h-[44px] px-4 rounded-md border border-white/20 hover:bg-white/10 text-white text-sm font-medium inline-flex items-center gap-1.5 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Todas as soluções
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </EditorialShell>
    )
}

