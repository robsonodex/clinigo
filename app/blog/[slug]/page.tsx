import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Calendar, Check, Clock, Shield } from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'
import { ArticleActions } from '@/components/marketing/ArticleActions'
import { BLOG_ARTICLES, getBlogArticleBySlug } from '@/lib/seo/blog-articles'
import { getSolutionBySlug } from '@/lib/seo/solutions-data'

interface BlogArticlePageProps {
    params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
    return BLOG_ARTICLES.map((article) => ({ slug: article.id }))
}

export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
    const { slug } = await params
    const article = getBlogArticleBySlug(slug)
    if (!article) {
        return { title: 'Artigo não encontrado' }
    }

    const url = `https://clinigo.app/blog/${article.id}`
    return {
        title: article.title,
        description: article.excerpt,
        alternates: {
            canonical: url,
        },
        keywords: article.keywords,
        openGraph: {
            title: `${article.title} | Blog CliniGo`,
            description: article.excerpt,
            url,
            siteName: 'CliniGo',
            type: 'article',
            publishedTime: article.isoDate,
            locale: 'pt_BR',
            images: [
                {
                    url: 'https://clinigo.app/dashboard-preview.png',
                    width: 1200,
                    height: 630,
                    alt: article.title,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: article.title,
            description: article.excerpt,
            images: ['https://clinigo.app/dashboard-preview.png'],
        },
    }
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
    const { slug } = await params
    const articleIndex = BLOG_ARTICLES.findIndex((a) => a.id === slug)
    if (articleIndex === -1) {
        notFound()
    }

    const article = BLOG_ARTICLES[articleIndex]
    const prevArticle = articleIndex > 0 ? BLOG_ARTICLES[articleIndex - 1] : null
    const nextArticle = articleIndex < BLOG_ARTICLES.length - 1 ? BLOG_ARTICLES[articleIndex + 1] : null
    const relatedSolution = getSolutionBySlug(article.relatedSolutionSlug)
    const canonicalUrl = `https://clinigo.app/blog/${article.id}`

    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://clinigo.app' },
                    { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://clinigo.app/blog' },
                    { '@type': 'ListItem', position: 3, name: article.title, item: canonicalUrl },
                ],
            },
            {
                '@type': 'Article',
                headline: article.title,
                description: article.excerpt,
                datePublished: article.isoDate,
                dateModified: article.isoDate,
                inLanguage: 'pt-BR',
                mainEntityOfPage: canonicalUrl,
                articleSection: article.category,
                keywords: article.keywords.join(', '),
                image: 'https://clinigo.app/dashboard-preview.png',
                author: {
                    '@type': 'Organization',
                    name: 'Equipe Técnica CliniGo',
                    url: 'https://clinigo.app/sobre',
                },
                publisher: {
                    '@type': 'Organization',
                    name: 'CliniGo',
                    url: 'https://clinigo.app',
                    logo: {
                        '@type': 'ImageObject',
                        url: 'https://clinigo.app/logo-clinigo-terapias.png',
                    },
                },
            },
        ],
    }

    return (
        <EditorialShell>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <main className="flex-1 py-12 sm:py-16 px-5 sm:px-8">
                <article className="max-w-3xl mx-auto">
                    {/* Breadcrumb + Ações */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-[#4B5B56]">
                            <Link href="/" className="hover:text-[#0F1F1B] transition-colors">
                                Início
                            </Link>
                            <span aria-hidden="true">/</span>
                            <Link href="/blog" className="hover:text-[#0F1F1B] transition-colors">
                                Blog
                            </Link>
                            <span aria-hidden="true">/</span>
                            <span className="text-[#0F1F1B] font-medium">{article.category}</span>
                        </nav>
                        <ArticleActions canonicalUrl={canonicalUrl} />
                    </div>

                    {/* Cabeçalho do Artigo */}
                    <header className="pb-8 border-b border-[#E6E8E5] mb-8">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <span className="font-tech-mono text-[10px] font-semibold uppercase tracking-[0.12em] px-2.5 py-1 rounded bg-[#E6F2EE] text-[#114D3E]">
                                {article.category}
                            </span>
                            <span className="text-xs text-[#4B5B56] inline-flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <time dateTime={article.isoDate}>{article.date}</time>
                            </span>
                            <span className="text-xs text-[#4B5B56] inline-flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {article.readTime} de leitura
                            </span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl font-semibold text-[#0F1F1B] tracking-tight leading-[1.14] mb-4">
                            {article.title}
                        </h1>
                        <p className="text-base sm:text-lg text-[#4B5B56] leading-relaxed">
                            {article.excerpt}
                        </p>
                    </header>

                    {/* Pontos Principais (TL;DR GEO) */}
                    <section className="bg-[#F2F5F3] border border-[#E6E8E5] rounded-xl p-6 mb-9">
                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#155E4B] mb-3">
                            PONTOS PRINCIPAIS
                        </p>
                        <ul className="space-y-2.5">
                            {article.takeaways.map((point) => (
                                <li key={point} className="flex items-start gap-2.5 text-sm text-[#0F1F1B] leading-relaxed">
                                    <Check className="w-4 h-4 text-[#155E4B] shrink-0 mt-0.5" strokeWidth={2.25} />
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* Seções do Artigo */}
                    <div className="space-y-8 mb-10">
                        {article.sections.map((section) => (
                            <section key={section.heading}>
                                <h2 className="text-xl sm:text-2xl font-semibold text-[#0F1F1B] tracking-tight mb-3">
                                    {section.heading}
                                </h2>
                                <p className="text-base text-[#4B5B56] leading-relaxed">
                                    {section.body}
                                </p>
                            </section>
                        ))}
                    </div>

                    {/* Solução Relacionada */}
                    {relatedSolution && (
                        <section className="bg-white border border-[#E6E8E5] rounded-xl p-6 mb-8">
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#155E4B] mb-2">
                                SOLUÇÃO RELACIONADA NO CLINIGO
                            </p>
                            <h3 className="text-lg font-semibold text-[#0F1F1B] mb-2">
                                {relatedSolution.seoTitle}
                            </h3>
                            <p className="text-sm text-[#4B5B56] leading-relaxed mb-4">
                                {relatedSolution.subtitle}
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Link
                                    href={`/solucoes/${relatedSolution.slug}`}
                                    className="min-h-[44px] px-4 rounded-md bg-[#F2F5F3] hover:bg-[#E6F2EE] text-[#114D3E] text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
                                >
                                    Ver página completa da solução
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <Link
                                    href="/comparativo"
                                    className="min-h-[44px] px-4 rounded-md border border-[#E6E8E5] hover:bg-[#FAFAF8] text-[#0F1F1B] text-sm font-medium inline-flex items-center transition-colors"
                                >
                                    Ver comparativo técnico
                                </Link>
                            </div>
                        </section>
                    )}

                    {/* CTA */}
                    <div className="bg-[#0D1F1B] text-white rounded-xl p-6 sm:p-8 border border-[#1D3831] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-10">
                        <div>
                            <div className="inline-flex items-center gap-2 font-tech-mono text-[11px] uppercase tracking-[0.14em] text-[#9ED3C2] mb-2">
                                <Shield className="w-4 h-4" />
                                TESTE NA PRÁTICA
                            </div>
                            <p className="text-lg font-semibold">Quer aplicar esse fluxo na sua clínica?</p>
                            <p className="text-sm text-white/75 mt-1">
                                Avalie o CliniGo gratuitamente por 7 dias sem cartão de crédito.
                            </p>
                        </div>
                        <Link
                            href="/trial"
                            className="min-h-[44px] px-5 rounded-md bg-[#155E4B] hover:bg-[#1B735C] text-white text-sm font-semibold inline-flex items-center gap-2 shrink-0 transition-colors"
                        >
                            Começar teste grátis
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Navegação Anterior / Próximo / Voltar */}
                    <nav
                        aria-label="Navegação entre artigos"
                        className="pt-6 border-t border-[#E6E8E5] flex flex-wrap items-center justify-between gap-3"
                    >
                        <Link
                            href="/blog"
                            className="min-h-[44px] px-4 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-xs font-medium text-[#0F1F1B] inline-flex items-center gap-1.5 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar ao Blog
                        </Link>
                        <div className="flex flex-wrap items-center gap-2">
                            {prevArticle && (
                                <Link
                                    href={`/blog/${prevArticle.id}`}
                                    className="min-h-[44px] px-3.5 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-xs font-medium text-[#0F1F1B] inline-flex items-center gap-1.5 transition-colors"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Artigo anterior
                                </Link>
                            )}
                            {nextArticle && (
                                <Link
                                    href={`/blog/${nextArticle.id}`}
                                    className="min-h-[44px] px-3.5 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-xs font-medium text-[#0F1F1B] inline-flex items-center gap-1.5 transition-colors"
                                >
                                    Próximo artigo
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            )}
                        </div>
                    </nav>
                </article>
            </main>
        </EditorialShell>
    )
}

