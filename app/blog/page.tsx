'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    ArrowRight,
    BookOpen,
    Calendar,
    Check,
    ClipboardList,
    Clock,
    Copy,
    FileSpreadsheet,
    Layers,
    Loader2,
    Lock,
    Search,
    Send,
    Shield,
    Smartphone,
    TrendingUp,
    X,
} from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'
import { BLOG_ARTICLES, type BlogIconKey } from '@/lib/seo/blog-articles'

const ICON_MAP: Record<BlogIconKey, typeof Calendar> = {
    calendar: Calendar,
    clipboard: ClipboardList,
    lock: Lock,
    spreadsheet: FileSpreadsheet,
    trending: TrendingUp,
    smartphone: Smartphone,
    shield: Shield,
    layers: Layers,
}

export default function BlogPage() {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('Todas')
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const [newsletterEmail, setNewsletterEmail] = useState('')
    const [newsletterSubmitting, setNewsletterSubmitting] = useState(false)
    const [newsletterSent, setNewsletterSent] = useState(false)

    // Compatibilidade com links antigos no formato /blog#<slug>
    useEffect(() => {
        if (typeof window === 'undefined') return
        const hash = window.location.hash.replace('#', '')
        if (hash && BLOG_ARTICLES.some((a) => a.id === hash)) {
            router.replace(`/blog/${hash}`)
        }
    }, [router])

    const categories = useMemo(() => {
        const counts = new Map<string, number>()
        for (const post of BLOG_ARTICLES) {
            counts.set(post.category, (counts.get(post.category) || 0) + 1)
        }
        return [
            { name: 'Todas', count: BLOG_ARTICLES.length },
            ...Array.from(counts.entries()).map(([name, count]) => ({ name, count })),
        ]
    }, [])

    const filteredArticles = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        return BLOG_ARTICLES.filter((post) => {
            const matchesCat = selectedCategory === 'Todas' || post.category === selectedCategory
            if (!matchesCat) return false
            if (!q) return true
            return (
                post.title.toLowerCase().includes(q) ||
                post.excerpt.toLowerCase().includes(q) ||
                post.category.toLowerCase().includes(q) ||
                post.takeaways.some((t) => t.toLowerCase().includes(q))
            )
        })
    }, [searchQuery, selectedCategory])

    const copyArticleLink = (id: string) => {
        if (typeof window === 'undefined') return
        const url = `${window.location.origin}/blog/${id}`
        navigator.clipboard.writeText(url)
        setCopiedId(id)
        toast.success('Link do artigo copiado!')
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleNewsletterSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newsletterEmail.trim()) {
            toast.error('Informe um e-mail válido')
            return
        }
        setNewsletterSubmitting(true)
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: 'Inscrito Blog CliniGo',
                    email: newsletterEmail.trim(),
                    telefone: '',
                    assunto: 'Newsletter do Blog CliniGo',
                    mensagem: `Solicitação de inscrição na newsletter do Blog CliniGo pelo e-mail: ${newsletterEmail.trim()}`,
                }),
            })
            if (!res.ok) throw new Error('Falha ao registrar inscrição')
            setNewsletterSent(true)
            setNewsletterEmail('')
            toast.success('Inscrição confirmada! Você receberá nossas próximas publicações.')
        } catch {
            toast.error('Não foi possível concluir a inscrição agora. Tente novamente.')
        } finally {
            setNewsletterSubmitting(false)
        }
    }

    const featured = filteredArticles[0] || null
    const restArticles = featured ? filteredArticles.slice(1) : []

    return (
        <EditorialShell>
            <main className="flex-1 py-12 sm:py-16 px-5 sm:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Hero + Busca */}
                    <div className="max-w-3xl mb-10">
                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-3">
                            PUBLICAÇÕES E BOAS PRÁTICAS
                        </p>
                        <h1 className="text-3xl sm:text-5xl font-semibold text-[#0F1F1B] tracking-tight leading-[1.1] mb-4">
                            Conteúdo técnico para{' '}
                            <span className="font-serif-accent text-[#155E4B] font-normal">
                                clínicas de terapias
                            </span>{' '}
                            multidisciplinares.
                        </h1>
                        <p className="text-base sm:text-lg text-[#4B5B56] leading-relaxed">
                            Guias práticos sobre agenda recorrente, planos terapêuticos ABA, governança LGPD, faturamento TISS e repasses por profissional.
                        </p>
                    </div>

                    {/* Barra de Pesquisa + Filtro Mobile/Desktop */}
                    <div className="bg-white border border-[#E6E8E5] rounded-xl p-4 mb-8 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-[#4B5B56] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Pesquisar artigos por tema, TISS, ABA, LGPD, repasse..."
                                aria-label="Pesquisar artigos do blog"
                                className="w-full min-h-[44px] pl-10 pr-10 py-2 bg-[#FAFAF8] border border-[#E6E8E5] rounded-lg text-base sm:text-sm text-[#0F1F1B] placeholder:text-[#4B5B56]/70 focus:bg-white focus:border-[#155E4B] outline-none transition-colors"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Limpar pesquisa"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-[#4B5B56] hover:text-[#0F1F1B] cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {categories.map((cat) => {
                                const active = selectedCategory === cat.name
                                return (
                                    <button
                                        key={cat.name}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat.name)}
                                        className={`ec-pill min-h-[38px] px-3.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                                            active
                                                ? 'bg-[#155E4B] border-[#155E4B] text-white'
                                                : 'bg-[#FAFAF8] border-[#E6E8E5] text-[#4B5B56] hover:text-[#0F1F1B] hover:bg-[#F2F5F3]'
                                        }`}
                                    >
                                        {cat.name} ({cat.count})
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Lista de Artigos */}
                        <div className="lg:col-span-8 space-y-6">
                            {filteredArticles.length === 0 ? (
                                <div className="bg-white border border-[#E6E8E5] rounded-xl p-10 text-center">
                                    <BookOpen className="w-8 h-8 text-[#4B5B56] mx-auto mb-3" strokeWidth={1.75} />
                                    <h2 className="text-lg font-semibold text-[#0F1F1B] mb-1">
                                        Nenhum artigo encontrado
                                    </h2>
                                    <p className="text-sm text-[#4B5B56] mb-5">
                                        Tente outro termo de pesquisa ou redefina a categoria selecionada.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery('')
                                            setSelectedCategory('Todas')
                                        }}
                                        className="min-h-[44px] px-5 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-sm font-medium transition-colors cursor-pointer"
                                    >
                                        Limpar filtros
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Artigo em Destaque */}
                                    {featured && (
                                        <article className="bg-[#0D1F1B] text-white rounded-xl p-7 sm:p-9 border border-[#1D3831]">
                                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                                <span className="ec-pill px-3 py-1 bg-[#155E4B] text-white font-tech-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
                                                    Em destaque · {featured.category}
                                                </span>
                                                <span className="text-xs text-white/70 flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {featured.date}
                                                </span>
                                                <span className="text-xs text-white/70 flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {featured.readTime} de leitura
                                                </span>
                                            </div>
                                            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug mb-3">
                                                <Link href={`/blog/${featured.id}`} className="hover:underline">
                                                    {featured.title}
                                                </Link>
                                            </h2>
                                            <p className="text-sm sm:text-base text-white/80 leading-relaxed mb-6">
                                                {featured.excerpt}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <Link
                                                    href={`/blog/${featured.id}`}
                                                    className="min-h-[44px] px-5 rounded-md bg-white text-[#0F1F1B] hover:bg-[#F2F5F3] text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                                                >
                                                    Ler artigo completo
                                                    <ArrowRight className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => copyArticleLink(featured.id)}
                                                    className="min-h-[44px] px-4 rounded-md border border-white/20 hover:bg-white/10 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                                >
                                                    {copiedId === featured.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                    {copiedId === featured.id ? 'Copiado' : 'Copiar link'}
                                                </button>
                                            </div>
                                        </article>
                                    )}

                                    {/* Grid dos demais artigos */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {restArticles.map((post) => {
                                            const Icon = ICON_MAP[post.iconKey] || Calendar
                                            return (
                                                <article
                                                    key={post.id}
                                                    className="bg-white border border-[#E6E8E5] rounded-xl p-6 flex flex-col justify-between hover:border-[#155E4B] transition-colors"
                                                >
                                                    <div>
                                                        <div className="flex items-center justify-between gap-2 mb-4">
                                                            <div className="w-10 h-10 rounded-lg bg-[#E6F2EE] text-[#155E4B] flex items-center justify-center">
                                                                <Icon className="w-5 h-5" strokeWidth={1.75} />
                                                            </div>
                                                            <span className="font-tech-mono text-[10px] font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded bg-[#F2F5F3] text-[#4B5B56]">
                                                                {post.category}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-lg font-semibold text-[#0F1F1B] leading-snug mb-2">
                                                            <Link href={`/blog/${post.id}`} className="hover:text-[#155E4B] transition-colors">
                                                                {post.title}
                                                            </Link>
                                                        </h3>
                                                        <p className="text-sm text-[#4B5B56] leading-relaxed mb-5">
                                                            {post.excerpt}
                                                        </p>
                                                    </div>

                                                    <div className="pt-4 border-t border-[#E6E8E5] flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-3 text-xs text-[#4B5B56]">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {post.date}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                {post.readTime}
                                                            </span>
                                                        </div>
                                                        <Link
                                                            href={`/blog/${post.id}`}
                                                            className="min-h-[40px] px-3 rounded-md text-xs font-semibold text-[#155E4B] hover:bg-[#E6F2EE] inline-flex items-center gap-1 transition-colors"
                                                        >
                                                            Ler artigo
                                                            <ArrowRight className="w-3.5 h-3.5" />
                                                        </Link>
                                                    </div>
                                                </article>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Sidebar */}
                        <aside className="lg:col-span-4 space-y-6">
                            {/* Newsletter funcional */}
                            <div className="bg-white border border-[#E6E8E5] rounded-xl p-6">
                                <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#155E4B] mb-2">
                                    BOLETIM EDITORIAL
                                </p>
                                <h3 className="text-lg font-semibold text-[#0F1F1B] mb-2">
                                    Receba novos artigos por e-mail
                                </h3>
                                <p className="text-sm text-[#4B5B56] mb-4 leading-relaxed">
                                    Guias práticos sobre gestão de clínicas de terapias, TISS e LGPD sem spam.
                                </p>
                                {newsletterSent ? (
                                    <div className="p-4 rounded-lg bg-[#E6F2EE] text-[#114D3E] text-sm flex items-center gap-2.5">
                                        <Check className="w-4 h-4 shrink-0" />
                                        <span>Inscrição registrada com sucesso.</span>
                                    </div>
                                ) : (
                                    <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                                        <input
                                            type="email"
                                            required
                                            value={newsletterEmail}
                                            onChange={(e) => setNewsletterEmail(e.target.value)}
                                            placeholder="seu@email.com.br"
                                            aria-label="Seu e-mail para newsletter"
                                            className="w-full min-h-[44px] px-3.5 py-2 bg-[#FAFAF8] border border-[#E6E8E5] rounded-lg text-base sm:text-sm text-[#0F1F1B] focus:bg-white focus:border-[#155E4B] outline-none"
                                        />
                                        <button
                                            type="submit"
                                            disabled={newsletterSubmitting}
                                            className="w-full min-h-[44px] px-4 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                            {newsletterSubmitting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Enviando...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    Inscrever-se
                                                </>
                                            )}
                                        </button>
                                    </form>
                                )}
                            </div>

                            {/* Soluções por Especialidade */}
                            <div className="bg-[#F2F5F3] border border-[#E6E8E5] rounded-xl p-6">
                                <h3 className="text-base font-semibold text-[#0F1F1B] mb-2">
                                    Explore por especialidade
                                </h3>
                                <p className="text-sm text-[#4B5B56] mb-4 leading-relaxed">
                                    Veja os módulos dedicados para ABA, Psicologia, Fonoaudiologia, TO, Psicomotricidade, Fisioterapia e TISS.
                                </p>
                                <div className="space-y-2">
                                    <Link
                                        href="/solucoes"
                                        className="min-h-[44px] w-full px-4 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#FAFAF8] text-[#0F1F1B] text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
                                    >
                                        Ver todas as soluções
                                        <ArrowRight className="w-4 h-4 text-[#155E4B]" />
                                    </Link>
                                    <Link
                                        href="/comparativo"
                                        className="min-h-[44px] w-full px-4 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#FAFAF8] text-[#0F1F1B] text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
                                    >
                                        Comparativo técnico
                                        <ArrowRight className="w-4 h-4 text-[#155E4B]" />
                                    </Link>
                                </div>
                            </div>

                            {/* CTA Avaliação */}
                            <div className="bg-[#0D1F1B] text-white rounded-xl p-6 border border-[#1D3831]">
                                <div className="flex items-center gap-2 text-[#9ED3C2] font-tech-mono text-[11px] uppercase tracking-[0.14em] mb-2">
                                    <Shield className="w-4 h-4" />
                                    TESTE NA PRÁTICA
                                </div>
                                <h3 className="text-lg font-semibold mb-2">Avalie o CliniGo por 7 dias</h3>
                                <p className="text-sm text-white/75 mb-5 leading-relaxed">
                                    Experimente os fluxos de agenda recorrente, prontuário por especialidade e repasse sem cartão de crédito.
                                </p>
                                <Link
                                    href="/trial"
                                    className="min-h-[44px] w-full px-4 rounded-md bg-[#155E4B] hover:bg-[#1B735C] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                                >
                                    Começar teste de 7 dias
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </EditorialShell>
    )
}
