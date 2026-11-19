'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Calendar,
    Check,
    ClipboardList,
    Clock,
    Copy,
    FileSpreadsheet,
    Loader2,
    Lock,
    Printer,
    Search,
    Send,
    Shield,
    Smartphone,
    TrendingUp,
    Video,
    X,
} from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'

interface BlogArticle {
    id: string
    title: string
    excerpt: string
    category: string
    date: string
    readTime: string
    icon: typeof Calendar
    takeaways: string[]
    sections: { heading: string; body: string }[]
}

const BLOG_ARTICLES: BlogArticle[] = [
    {
        id: 'agenda-recorrente-co-terapia',
        title: 'Agenda recorrente e co-terapia sem conflitos em clínicas multidisciplinares',
        excerpt:
            'Como estruturar séries semanais, quinzenais e salas compartilhadas entre Psicologia, ABA, Fonoaudiologia e Terapia Ocupacional sem retrabalho na recepção.',
        category: 'Agenda e Recorrência',
        date: '14 Abr 2026',
        readTime: '6 min',
        icon: Calendar,
        takeaways: [
            'Defina durações reais por modalidade (40, 45, 50 ou 120 min) em vez de forçar blocos fixos de 30 minutos.',
            'Vincule salas temáticas (ex: Sala Sensorial) ao agendamento para evitar colisões entre terapeutas.',
            'Registre faltas justificadas e reposições diretamente na série para preservar o saldo do paciente.',
        ],
        sections: [
            {
                heading: 'Por que agendas genéricas falham em clínicas de terapia',
                body: 'Diferente de atendimentos pontuais, um paciente em acompanhamento de ABA, Fonoaudiologia ou Terapia Ocupacional possui sessões recorrentes por meses. Quando a agenda não suporta séries nativas, qualquer feriado ou mudança de horário exige edição manual de dezenas de eventos.',
            },
            {
                heading: 'Co-terapia e gestão de salas sensoriais',
                body: 'Em atendimentos conjuntos — como dupla de terapeutas ou supervisão em sala — o sistema precisa permitir dois profissionais no mesmo paciente sem acusar falso conflito, mantendo o bloqueio rigoroso da sala física e da disponibilidade de cada profissional.',
            },
            {
                heading: 'Reposições rastreáveis sem planilhas paralelas',
                body: 'Ao controlar o motivo da ausência e gerar o crédito de reposição dentro da própria grade, a recepção e a coordenação enxergam imediatamente quantas sessões restam no ciclo mensal ou na guia de convênio.',
            },
        ],
    },
    {
        id: 'planos-terapeuticos-aba-evolucoes',
        title: 'Planos terapêuticos estruturados e conformidade de evoluções clínicas',
        excerpt:
            'Organize objetivos, níveis de ajuda e revisões periódicas por especialidade, reduzindo evoluções pendentes no fechamento do mês.',
        category: 'Prontuário e ABA',
        date: '06 Abr 2026',
        readTime: '7 min',
        icon: ClipboardList,
        takeaways: [
            'Padronize critérios de aquisição e níveis de ajuda para acompanhar progressão longitudinal.',
            'Monitore evoluções pendentes em tempo real em vez de cobrar a equipe apenas no fim do mês.',
            'Aplique assinatura eletrônica com registro de conselho (CRP, CRFa, CREFITO) em cada prontuário.',
        ],
        sections: [
            {
                heading: 'Continuidade clínica entre sessões',
                body: 'Cada especialidade trabalha com terminologia própria: programas de pareamento e tentativas discretas em ABA, metas SOAP na Psicologia, domínios fonológicos na Fonoaudiologia e desempenho ocupacional na TO. Ter templates por disciplina acelera o registro sem engessar o raciocínio clínico.',
            },
            {
                heading: 'Auditoria de conformidade pela coordenação',
                body: 'Com indicadores de conformidade de evoluções, a supervisão visualiza rapidamente quais sessões realizadas ainda aguardam evolução — sem invadir o sigilo clínico dos conteúdos protegidos de outros conselhos.',
            },
        ],
    },
    {
        id: 'lgpd-sigilo-clinico-rbac',
        title: 'LGPD e sigilo clínico: isolamento real por perfil (RBAC) na equipe',
        excerpt:
            'Entenda como separar o acesso de recepção, coordenação, financeiro e terapeutas diretamente no servidor para cumprir exigências legais e dos conselhos.',
        category: 'LGPD e Sigilo',
        date: '25 Mar 2026',
        readTime: '8 min',
        icon: Lock,
        takeaways: [
            'O sigilo exigido por CRP, CRFa e CREFITO deve ser garantido no banco de dados e na API, não apenas escondido no menu.',
            'Terapeutas acessam exclusivamente seus pacientes e seu extrato de produção individual.',
            'Sessão única auditada impede compartilhamento indevido de senhas entre computadores da clínica.',
        ],
        sections: [
            {
                heading: 'O risco das permissões apenas visuais',
                body: 'Sistemas que ocultam botões apenas na tela ainda expõem dados sensíveis em consultas de rede ou relatórios amplos. O controle de acesso baseado em perfil (RBAC) acoplado a políticas no banco (RLS) garante que cada usuário receba apenas o que compete à sua função.',
            },
            {
                heading: 'Termos eletrônicos com validade probatória',
                body: 'Consentimentos LGPD, contratos de atendimento e autorizações de imagem assinados no celular com carimbo de data, IP e hash SHA-256 (Lei 14.063/2020) eliminam arquivos em papel e facilitam auditorias.',
            },
        ],
    },
    {
        id: 'faturamento-tiss-terapias-glosas',
        title: 'Faturamento TISS em terapias seriadas: como reduzir glosas evitáveis',
        excerpt:
            'Da autorização prévia à dupla comprovação de presença biométrica e geração de lotes XML no padrão ANS.',
        category: 'TISS e Convênios',
        date: '16 Mar 2026',
        readTime: '7 min',
        icon: FileSpreadsheet,
        takeaways: [
            'Valide códigos TUSS, saldo de sessões autorizadas e vigência da guia antes da realização da sessão.',
            'Vincule biometria facial do paciente ou responsável como evidência objetiva de presença.',
            'Trate retornos de glosa com rastreabilidade por guia para montar recursos dentro do prazo da operadora.',
        ],
        sections: [
            {
                heading: 'Onde nascem as glosas em terapias seriadas',
                body: 'A maior parte das glosas ocorre por sessões realizadas após o vencimento da senha de autorização, divergência no código TUSS da especialidade ou ausência de comprovação clara de comparecimento do beneficiário.',
            },
            {
                heading: 'Lotes XML validados e ciclo de recursos',
                body: 'Validar a estrutura XML contra o esquema ANS antes do envio e acompanhar o status de cada guia no retorno da operadora reduz o tempo entre a sessão realizada e o recebimento efetivo.',
            },
        ],
    },
    {
        id: 'repasse-profissional-regras-individuais',
        title: 'Fechamento de repasse por profissional sem planilhas manuais',
        excerpt:
            'Como parametrizar valores por terapeuta, convênio ou paciente específico e liberar demonstrativos transparentes com sigilo.',
        category: 'Gestão e Repasse',
        date: '04 Mar 2026',
        readTime: '5 min',
        icon: TrendingUp,
        takeaways: [
            'Configure regras por contrato, por tabela de convênio ou exceções por paciente em um único motor.',
            'Considere automaticamente apenas sessões realizadas ou reposições válidas conforme a política da clínica.',
            'Permita que cada terapeuta consulte seu próprio resumo de produção sem visualizar dados de colegas.',
        ],
        sections: [
            {
                heading: 'Fim das horas perdidas cruzando agenda e planilhas',
                body: 'Em clínicas multidisciplinares, cada terapeuta pode ter modelo de remuneração distinto: percentual sobre convênio, valor fixo por sessão particular ou regra diferenciada por paciente. Centralizar essas regras no sistema elimina erros de cálculo e retrabalho no fechamento.',
            },
            {
                heading: 'Transparência que fortalece a retenção da equipe',
                body: 'Quando o profissional acompanha sua produção consolidada com clareza ao longo do mês, diminuem dúvidas no fechamento e a gestão ganha previsibilidade financeira.',
            },
        ],
    },
    {
        id: 'confirmacao-whatsapp-reducao-faltas',
        title: 'Confirmação automática no WhatsApp e controle de evasão terapêutica',
        excerpt:
            'Estratégias práticas para diminuir faltas recorrentes, acionar a fila de espera e identificar pacientes com risco de abandono do tratamento.',
        category: 'Teleatendimento',
        date: '22 Fev 2026',
        readTime: '5 min',
        icon: Smartphone,
        takeaways: [
            'Envie confirmações automáticas com antecedência adequada para liberar horários à fila de espera.',
            'Acompanhe faltas consecutivas no BI de terapia para agir antes do abandono do plano terapêutico.',
            'Ofereça teleconsulta WebRTC integrada nos casos elegíveis quando houver imprevisto de deslocamento.',
        ],
        sections: [
            {
                heading: 'Comunicação organizada com famílias e responsáveis',
                body: 'Famílias com crianças em múltiplas terapias por semana lidam com agendas complexas. Lembretes objetivos e confirmação automática direto no WhatsApp reduzem esquecimentos e liberam a recepção para acolhimento humanizado.',
            },
            {
                heading: 'Sinal de alerta precoce de evasão',
                body: 'Cruzar taxa de comparecimento e histórico de reagendamentos permite à coordenação entrar em contato preventivo com a família, preservando a continuidade clínica e a estabilidade da agenda.',
            },
        ],
    },
]

export default function BlogPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('Todas')
    const [activeArticleId, setActiveArticleId] = useState<string | null>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const [newsletterEmail, setNewsletterEmail] = useState('')
    const [newsletterSubmitting, setNewsletterSubmitting] = useState(false)
    const [newsletterSent, setNewsletterSent] = useState(false)

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

    const activeIndex = useMemo(
        () => (activeArticleId ? BLOG_ARTICLES.findIndex((a) => a.id === activeArticleId) : -1),
        [activeArticleId]
    )
    const activeArticle = activeIndex >= 0 ? BLOG_ARTICLES[activeIndex] : null

    useEffect(() => {
        if (typeof window === 'undefined') return
        const hash = window.location.hash.replace('#', '')
        if (hash && BLOG_ARTICLES.some((a) => a.id === hash)) {
            setActiveArticleId(hash)
        }
    }, [])

    useEffect(() => {
        if (!activeArticle) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setActiveArticleId(null)
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [activeArticle])

    const openArticle = (id: string) => {
        setActiveArticleId(id)
        if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `#${id}`)
        }
    }

    const closeArticle = () => {
        setActiveArticleId(null)
        if (typeof window !== 'undefined' && window.location.hash) {
            window.history.replaceState(null, '', '/blog')
        }
    }

    const copyArticleLink = (id: string) => {
        if (typeof window === 'undefined') return
        const url = `${window.location.origin}/blog#${id}`
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
                                                {featured.title}
                                            </h2>
                                            <p className="text-sm sm:text-base text-white/80 leading-relaxed mb-6">
                                                {featured.excerpt}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => openArticle(featured.id)}
                                                    className="min-h-[44px] px-5 rounded-md bg-white text-[#0F1F1B] hover:bg-[#F2F5F3] text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
                                                >
                                                    Ler artigo completo
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
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
                                            const Icon = post.icon
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
                                                            {post.title}
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
                                                        <button
                                                            type="button"
                                                            onClick={() => openArticle(post.id)}
                                                            className="min-h-[40px] px-3 rounded-md text-xs font-semibold text-[#155E4B] hover:bg-[#E6F2EE] inline-flex items-center gap-1 transition-colors cursor-pointer"
                                                        >
                                                            Ler artigo
                                                            <ArrowRight className="w-3.5 h-3.5" />
                                                        </button>
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

                            {/* Sugerir Pauta */}
                            <div className="bg-[#F2F5F3] border border-[#E6E8E5] rounded-xl p-6">
                                <h3 className="text-base font-semibold text-[#0F1F1B] mb-2">
                                    Sugira um tema técnico
                                </h3>
                                <p className="text-sm text-[#4B5B56] mb-4 leading-relaxed">
                                    Quer um guia sobre alguma rotina específica da sua clínica de psicologia, ABA, fonoaudiologia ou TO?
                                </p>
                                <Link
                                    href="/contato"
                                    className="min-h-[44px] w-full px-4 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#FAFAF8] text-[#0F1F1B] text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
                                >
                                    Enviar sugestão de pauta
                                    <ArrowRight className="w-4 h-4 text-[#155E4B]" />
                                </Link>
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

            {/* Modal de Leitura do Artigo */}
            {activeArticle && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="blog-modal-title"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeArticle()
                    }}
                    className="fixed inset-0 z-50 bg-[#0F1F1B]/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
                >
                    <div className="bg-white border border-[#E6E8E5] rounded-xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl my-auto">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-[#E6E8E5] flex items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-2 text-xs text-[#4B5B56] min-w-0">
                                <span className="font-tech-mono uppercase tracking-[0.1em] px-2.5 py-1 rounded bg-[#E6F2EE] text-[#114D3E] font-semibold">
                                    {activeArticle.category}
                                </span>
                                <span className="hidden sm:inline">{activeArticle.date}</span>
                                <span className="hidden sm:inline">· {activeArticle.readTime}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => copyArticleLink(activeArticle.id)}
                                    aria-label="Copiar link do artigo"
                                    className="min-h-[40px] px-3 rounded-md border border-[#E6E8E5] hover:bg-[#F2F5F3] text-xs font-medium text-[#0F1F1B] inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                    {copiedId === activeArticle.id ? <Check className="w-3.5 h-3.5 text-[#155E4B]" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span className="hidden sm:inline">{copiedId === activeArticle.id ? 'Copiado' : 'Copiar link'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    aria-label="Imprimir artigo"
                                    className="min-h-[40px] px-3 rounded-md border border-[#E6E8E5] hover:bg-[#F2F5F3] text-xs font-medium text-[#0F1F1B] inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Imprimir</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={closeArticle}
                                    aria-label="Fechar artigo"
                                    className="min-w-[40px] min-h-[40px] rounded-md border border-[#E6E8E5] hover:bg-[#F2F5F3] text-[#0F1F1B] flex items-center justify-center cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
                            <div>
                                <h2 id="blog-modal-title" className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight leading-snug mb-3">
                                    {activeArticle.title}
                                </h2>
                                <p className="text-base text-[#4B5B56] leading-relaxed">
                                    {activeArticle.excerpt}
                                </p>
                            </div>

                            <div className="bg-[#F2F5F3] border border-[#E6E8E5] rounded-xl p-5">
                                <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#155E4B] mb-3">
                                    PONTOS PRINCIPAIS
                                </p>
                                <ul className="space-y-2.5">
                                    {activeArticle.takeaways.map((point) => (
                                        <li key={point} className="flex items-start gap-2.5 text-sm text-[#0F1F1B]">
                                            <Check className="w-4 h-4 text-[#155E4B] shrink-0 mt-0.5" strokeWidth={2.25} />
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-5">
                                {activeArticle.sections.map((section) => (
                                    <div key={section.heading}>
                                        <h3 className="text-lg font-semibold text-[#0F1F1B] mb-2">
                                            {section.heading}
                                        </h3>
                                        <p className="text-sm sm:text-base text-[#4B5B56] leading-relaxed">
                                            {section.body}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="p-5 rounded-xl bg-[#0D1F1B] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold">Quer aplicar esse fluxo na sua clínica?</p>
                                    <p className="text-xs text-white/75 mt-0.5">
                                        Teste o CliniGo gratuitamente por 7 dias sem cartão de crédito.
                                    </p>
                                </div>
                                <Link
                                    href="/trial"
                                    className="min-h-[44px] px-4 rounded-md bg-[#155E4B] hover:bg-[#1B735C] text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
                                >
                                    Começar teste grátis
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>

                        {/* Modal Footer Navigation */}
                        <div className="px-6 py-4 border-t border-[#E6E8E5] flex items-center justify-between gap-3 shrink-0 bg-[#FAFAF8] rounded-b-xl">
                            <button
                                type="button"
                                disabled={activeIndex <= 0}
                                onClick={() => activeIndex > 0 && openArticle(BLOG_ARTICLES[activeIndex - 1].id)}
                                className="min-h-[44px] px-3.5 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-xs font-medium text-[#0F1F1B] inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Artigo anterior
                            </button>
                            <button
                                type="button"
                                disabled={activeIndex >= BLOG_ARTICLES.length - 1}
                                onClick={() =>
                                    activeIndex < BLOG_ARTICLES.length - 1 &&
                                    openArticle(BLOG_ARTICLES[activeIndex + 1].id)
                                }
                                className="min-h-[44px] px-3.5 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-xs font-medium text-[#0F1F1B] inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Próximo artigo
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </EditorialShell>
    )
}
