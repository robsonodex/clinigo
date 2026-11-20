import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, Layers, Shield } from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'
import { SOLUTIONS_DATA } from '@/lib/seo/solutions-data'
import { WHATSAPP_URL } from '@/components/preview-home/content'

export const metadata: Metadata = {
    title: 'Soluções para Clínicas de Terapias por Especialidade',
    description:
        'Conheça os módulos especializados do CliniGo para Clínicas Multidisciplinares, ABA e Neurodesenvolvimento, Psicologia (CRP), Fonoaudiologia (CRFa), Terapia Ocupacional (CREFITO), Psicomotricidade, Fisioterapia e Faturamento TISS com Biometria Facial.',
    alternates: {
        canonical: 'https://clinigo.app/solucoes',
    },
    keywords: [
        'soluções para clínicas de terapias',
        'sistema para clínica multidisciplinar',
        'software clínica ABA',
        'sistema psicologia fonoaudiologia terapia ocupacional',
        'sistema psicomotricidade e fisioterapia',
        'faturamento TISS biometria facial terapias',
    ],
    openGraph: {
        title: 'Soluções por Especialidade | CliniGo para Clínicas de Terapias',
        description:
            'Workspaces clínicos e operacionais dedicados para cada especialidade de clínicas de terapias multidisciplinares.',
        url: 'https://clinigo.app/solucoes',
        siteName: 'CliniGo',
        type: 'website',
        locale: 'pt_BR',
    },
}

const solutionsHubJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://clinigo.app' },
                { '@type': 'ListItem', position: 2, name: 'Soluções por Especialidade', item: 'https://clinigo.app/solucoes' },
            ],
        },
        {
            '@type': 'ItemList',
            name: 'Soluções CliniGo para Clínicas de Terapias Multidisciplinares',
            itemListElement: SOLUTIONS_DATA.map((item, idx) => ({
                '@type': 'ListItem',
                position: idx + 1,
                name: item.seoTitle,
                description: item.seoDescription,
                url: `https://clinigo.app/solucoes/${item.slug}`,
            })),
        },
    ],
}

export default function SolucoesHubPage() {
    return (
        <EditorialShell>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(solutionsHubJsonLd) }}
            />
            <main className="flex-1">
                {/* Hero */}
                <section className="py-14 sm:py-20 px-5 sm:px-8 border-b border-[#E6E8E5]">
                    <div className="max-w-5xl mx-auto">
                        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-[#4B5B56]">
                            <Link href="/" className="hover:text-[#0F1F1B] transition-colors">
                                Início
                            </Link>
                            <span aria-hidden="true">/</span>
                            <span className="text-[#0F1F1B] font-medium">Soluções</span>
                        </nav>

                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-3">
                            ARQUITETURA POR ESPECIALIDADE E OPERAÇÃO
                        </p>
                        <h1 className="text-3xl sm:text-5xl font-semibold text-[#0F1F1B] tracking-tight leading-[1.1] mb-5 max-w-4xl">
                            Uma plataforma feita para{' '}
                            <span className="font-serif-accent text-[#155E4B] font-normal">
                                cada disciplina
                            </span>{' '}
                            da sua clínica de terapias.
                        </h1>
                        <p className="text-base sm:text-lg text-[#4B5B56] max-w-3xl leading-relaxed mb-8">
                            Diferente de softwares médicos genéricos, o CliniGo oferece workspaces clínicos, regras de sigilo, controle de salas e faturamento TISS desenhados para a realidade das terapias seriadas.
                        </p>

                        <div className="flex flex-wrap items-center gap-3">
                            <Link
                                href="/trial"
                                className="min-h-[44px] px-5 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
                            >
                                Começar teste grátis de 7 dias
                                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                            </Link>
                            <Link
                                href="/comparativo"
                                className="min-h-[44px] px-5 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-[#0F1F1B] text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
                            >
                                Ver comparativo técnico
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Grid de Soluções */}
                <section className="py-14 sm:py-16 px-5 sm:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {SOLUTIONS_DATA.map((solution) => (
                                <article
                                    key={solution.slug}
                                    className="bg-white border border-[#E6E8E5] hover:border-[#155E4B] rounded-xl p-6 sm:p-7 flex flex-col justify-between transition-colors"
                                >
                                    <div>
                                        <p className="font-tech-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#155E4B] mb-2">
                                            {solution.councilBadge}
                                        </p>
                                        <h2 className="text-xl sm:text-2xl font-semibold text-[#0F1F1B] tracking-tight mb-3">
                                            {solution.seoTitle}
                                        </h2>
                                        <p className="text-sm text-[#4B5B56] leading-relaxed mb-5">
                                            {solution.subtitle}
                                        </p>

                                        <ul className="space-y-2 mb-6">
                                            {solution.directAnswerFacts.slice(0, 3).map((fact) => (
                                                <li key={fact} className="flex items-start gap-2.5 text-sm text-[#0F1F1B]">
                                                    <Check className="w-4 h-4 text-[#155E4B] shrink-0 mt-0.5" strokeWidth={2.25} />
                                                    <span>{fact}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="pt-4 border-t border-[#E6E8E5] flex flex-wrap items-center justify-between gap-3">
                                        <span className="font-tech-mono text-xs text-[#4B5B56]">
                                            {solution.recommendedPlan.price}
                                        </span>
                                        <Link
                                            href={`/solucoes/${solution.slug}`}
                                            className="min-h-[44px] px-4 rounded-md bg-[#F2F5F3] hover:bg-[#E6F2EE] text-[#114D3E] text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
                                        >
                                            Explorar solução
                                            <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Faixa de Governança & CTA */}
                <section className="py-14 px-5 sm:px-8 border-t border-[#E6E8E5] bg-white">
                    <div className="max-w-5xl mx-auto bg-[#0D1F1B] text-white rounded-xl p-7 sm:p-10 border border-[#1D3831]">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                            <div className="lg:col-span-8">
                                <div className="inline-flex items-center gap-2 font-tech-mono text-[11px] uppercase tracking-[0.14em] text-[#9ED3C2] mb-3">
                                    <Shield className="w-4 h-4" strokeWidth={1.75} />
                                    TODAS AS ESPECIALIDADES NO MESMO SISTEMA
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
                                    Precisa comparar o CliniGo com planilhas ou softwares médicos genéricos?
                                </h2>
                                <p className="text-sm sm:text-base text-white/80 leading-relaxed">
                                    Veja nossa matriz técnica com 12 critérios reais de operação para clínicas de terapias multidisciplinares ou inicie sua avaliação gratuita de 7 dias.
                                </p>
                            </div>
                            <div className="lg:col-span-4 flex flex-col gap-3">
                                <Link
                                    href="/comparativo"
                                    className="min-h-[44px] px-5 rounded-md bg-white hover:bg-[#F2F5F3] text-[#0F1F1B] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Layers className="w-4 h-4 text-[#155E4B]" strokeWidth={1.75} />
                                    Abrir comparativo técnico
                                </Link>
                                <a
                                    href={WHATSAPP_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="min-h-[44px] px-5 rounded-md border border-white/20 hover:bg-white/10 text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
                                >
                                    Falar com especialista no WhatsApp
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </EditorialShell>
    )
}
