'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
    ArrowRight,
    BookOpen,
    ChevronDown,
    ChevronUp,
    FileText,
    HelpCircle,
    Mail,
    MessageSquare,
    Monitor,
    Search,
    Tv,
    X,
} from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'

const HELP_CARDS = [
    {
        id: 'smtp',
        icon: Mail,
        title: 'E-mail (SMTP)',
        description:
            'Configure o envio próprio de e-mails para confirmações de sessões, lembretes e links de teleatendimento.',
        ctaLabel: 'Ver tutorial SMTP',
        href: '/help/smtp',
        keywords: 'smtp email gmail outlook sendgrid notificacoes',
    },
    {
        id: 'whatsapp',
        icon: MessageSquare,
        title: 'WhatsApp Automático',
        description:
            'Envie confirmações e lembretes de sessões via WhatsApp por setores (disponível nos planos Avançado e Professional).',
        ctaLabel: 'Consultar planos',
        href: '/planos',
        keywords: 'whatsapp lembrete confirmacao automatico setores',
    },
    {
        id: 'totem',
        icon: Monitor,
        title: 'Totem de Autoatendimento',
        description:
            'Realize check-in digital na tela por biometria facial, QR Code ou código digital na fila da recepção — 100% sem papel.',
        ctaLabel: 'Ver guia do Totem',
        href: '#totem-section',
        keywords: 'totem autoatendimento senha digital facial qrcode check-in',
    },
    {
        id: 'tv',
        icon: Tv,
        title: 'Painel de TV (Chamadas)',
        description:
            'Exiba chamadas em tempo real com 4 layouts profissionais (incluindo Conforto Sensorial), voz neural e privacidade LGPD.',
        ctaLabel: 'Ver guia do Painel de TV',
        href: '#tv-section',
        keywords: 'tv painel sala espera voz chamada som editorial sensorial lgpd',
    },
    {
        id: 'primeiros-passos',
        icon: FileText,
        title: 'Guia de Uso Integrado',
        description:
            'Treinamento 100% autônomo dentro do painel: cadastrar profissionais, salas, pacientes e agenda recorrente.',
        ctaLabel: 'Acessar sistema',
        href: '/login',
        keywords: 'guia uso treinamento primeiros passos cadastrar terapeutas salas agenda',
    },
    {
        id: 'suporte',
        icon: HelpCircle,
        title: 'Falar com Suporte',
        description:
            'Precisa de apoio técnico com sua unidade ativa? Entre em contato com nossa equipe pelo formulário ou WhatsApp.',
        ctaLabel: 'Contatar suporte',
        href: '/contato',
        keywords: 'suporte contato ajuda atendimento whatsapp',
    },
]

const TOTEM_GUIDES = [
    {
        title: 'Senha Digital na Tela (100% Sem Impressão)',
        what: 'Opção interativa na tela inicial do totem que gera um código digital de fila exibido diretamente na tela, sem necessidade de impressora ou papel.',
        why: 'Permite que pacientes ou responsáveis sem agendamento prévio entrem na fila da recepção com agilidade, sem custo de bobinas nem manutenção de impressora térmica.',
        how: 'Ao chegar à clínica, o paciente toca em "Senha Digital (Fila)", seleciona a prioridade e visualiza seu código na tela para acompanhar a chamada no Painel de TV.',
    },
    {
        title: 'Seleção de Prioridade: Geral e Preferencial',
        what: 'Etapa do fluxo que separa atendimentos convencionais das prioridades previstas em lei.',
        why: 'Garante chamadas prioritárias com prefixo "P-" para idosos, gestantes, pessoas com TEA ou deficiência, e "N-" para atendimento geral.',
        how: 'Exibida logo após tocar em "Senha Digital (Fila)". Basta selecionar a categoria correspondente para exibir o código digital na tela (sem impressão em papel).',
    },
    {
        title: 'Identificação Opcional e Controle Mobile/PWA',
        what: 'Tela opcional para informar Nome Completo e CPF, projetada para tablets e telas touch sem zoom indesejado.',
        why: 'Vincula o check-in diretamente ao cadastro do paciente ou permite entrada rápida na fila sem digitar dados.',
        how: 'Preencha nome ou CPF e toque em "Confirmar com Identificação", ou escolha "Entrar na Fila (Código Rápido)" para agilidade.',
    },
]

const TV_GUIDES = [
    {
        title: '4 Layouts Profissionais e Chamadas em Tempo Real',
        what: 'Tela contínua para a sala de espera conectada em tempo real à fila, com 4 layouts: Editorial Sensorial (claro para clínicas de terapias/ABA), Clínica Executiva, Painel Dividido e Foco Total.',
        why: 'Exibe logotipo da clínica, histórico das últimas chamadas, recado institucional no rodapé e opção de Privacidade LGPD (primeiro nome + inicial), com troca ao vivo sem precisar recarregar a TV.',
        how: 'Em Configurações -> Consultórios e TV (ou direto na Central de Comando da Recepção), clique em "Abrir Painel de TV" e toque uma vez na tela para liberar o som.',
    },
    {
        title: 'Carrilhão Sonoro, Voz Neural e Teste Ao Vivo',
        what: 'Sinalização sonora configurável (4 temas de chime) e sintetizador de voz em português que anuncia o paciente e a sala.',
        why: 'Avisa famílias e pacientes na sala de espera com clareza e acessibilidade, respeitando automaticamente o Modo Privacidade LGPD quando ativado.',
        how: 'Escolha o chime e a voz em Configurações -> Consultórios e TV e utilize "Testar Chamada na TV" para validar visual e áudio ao vivo sem criar agendamentos reais.',
    },
]

const HELP_FAQS = [
    {
        q: 'Como faço para cadastrar terapeutas e profissionais da equipe?',
        a: 'Acesse Menu -> Equipe -> Profissionais -> Novo Profissional. Preencha os dados, conselho profissional (CRP, CRFa, CREFITO ou CRM) e envie o convite para criação de senha.',
    },
    {
        q: 'Como a equipe aprende a operar o sistema no dia a dia?',
        a: 'O CliniGo conta com o Guia de Uso integrado em `/dashboard/help` e ícones de ajuda contextual em cada tela, filtrados automaticamente pelo perfil de acesso (recepção, coordenação ou terapeuta).',
    },
    {
        q: 'Meu e-mail não está sendo enviado. O que verificar?',
        a: 'Confirme se as credenciais SMTP estão preenchidas e testadas em Configurações -> SMTP. Consulte o tutorial completo em /help/smtp.',
        linkHref: '/help/smtp',
        linkLabel: 'Abrir tutorial SMTP',
    },
    {
        q: 'Quais planos incluem WhatsApp integrado e faturamento TISS?',
        a: 'O WhatsApp integrado por setores está incluído a partir do plano Avançado (R$ 249/mês). O faturamento TISS completo, biometria facial, Totem e Painel de TV fazem parte do plano Professional (R$ 449/mês).',
        linkHref: '/planos',
        linkLabel: 'Comparar todos os planos',
    },
]

export default function HelpPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [openFaq, setOpenFaq] = useState<number | null>(0)

    const q = searchQuery.trim().toLowerCase()

    const filteredCards = useMemo(() => {
        if (!q) return HELP_CARDS
        return HELP_CARDS.filter(
            (c) =>
                c.title.toLowerCase().includes(q) ||
                c.description.toLowerCase().includes(q) ||
                c.keywords.includes(q)
        )
    }, [q])

    const filteredFaqs = useMemo(() => {
        if (!q) return HELP_FAQS
        return HELP_FAQS.filter(
            (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
        )
    }, [q])

    return (
        <EditorialShell>
            <main className="flex-1 py-12 sm:py-16 px-5 sm:px-8">
                <div className="max-w-6xl mx-auto">
                    {/* Hero + Busca */}
                    <div className="max-w-3xl mx-auto text-center mb-10">
                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-3">
                            CENTRAL DE AJUDA CLINIGO
                        </p>
                        <h1 className="text-3xl sm:text-5xl font-semibold text-[#0F1F1B] tracking-tight leading-[1.1] mb-4">
                            Guias práticos para configurar sua{' '}
                            <span className="font-serif-accent text-[#155E4B] font-normal">
                                unidade clínica
                            </span>
                            .
                        </h1>
                        <p className="text-base text-[#4B5B56] mb-7">
                            Documentação objetiva para SMTP, Totem de autoatendimento, Painel de TV e primeiros passos da equipe.
                        </p>

                        {/* Campo de Pesquisa */}
                        <div className="relative max-w-xl mx-auto">
                            <Search className="w-4 h-4 text-[#4B5B56] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar tutorial (ex: SMTP, WhatsApp, Totem, Painel de TV, TISS)..."
                                aria-label="Buscar na Central de Ajuda"
                                className="w-full min-h-[48px] pl-11 pr-11 py-3 bg-white border border-[#E6E8E5] rounded-xl text-base sm:text-sm text-[#0F1F1B] placeholder:text-[#4B5B56]/70 focus:border-[#155E4B] focus:ring-2 focus:ring-[#155E4B]/15 outline-none shadow-sm"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Limpar busca"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-[#4B5B56] hover:text-[#0F1F1B] cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Grid de Tópicos */}
                    {filteredCards.length === 0 ? (
                        <div className="bg-white border border-[#E6E8E5] rounded-xl p-8 text-center mb-12">
                            <BookOpen className="w-7 h-7 text-[#4B5B56] mx-auto mb-2" />
                            <p className="text-sm font-medium text-[#0F1F1B] mb-1">
                                Nenhum tópico encontrado para &quot;{searchQuery}&quot;
                            </p>
                            <p className="text-xs text-[#4B5B56] mb-4">
                                Limpe a pesquisa ou fale diretamente com nosso suporte técnico.
                            </p>
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="min-h-[44px] px-4 rounded-md bg-[#155E4B] text-white text-xs font-medium cursor-pointer"
                            >
                                Mostrar todos os tópicos
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
                            {filteredCards.map((card) => {
                                const Icon = card.icon
                                const isAnchor = card.href.startsWith('#')
                                return (
                                    <div
                                        key={card.id}
                                        className="bg-white border border-[#E6E8E5] rounded-xl p-6 flex flex-col justify-between hover:border-[#155E4B] transition-colors"
                                    >
                                        <div>
                                            <div className="w-11 h-11 rounded-lg bg-[#E6F2EE] text-[#155E4B] flex items-center justify-center mb-4">
                                                <Icon className="w-5 h-5" strokeWidth={1.75} />
                                            </div>
                                            <h2 className="text-lg font-semibold text-[#0F1F1B] mb-2">
                                                {card.title}
                                            </h2>
                                            <p className="text-sm text-[#4B5B56] leading-relaxed mb-5">
                                                {card.description}
                                            </p>
                                        </div>

                                        {isAnchor ? (
                                            <a
                                                href={card.href}
                                                className="min-h-[44px] px-4 rounded-md border border-[#E6E8E5] bg-[#FAFAF8] hover:bg-[#F2F5F3] text-[#0F1F1B] text-xs font-semibold inline-flex items-center justify-between transition-colors"
                                            >
                                                <span>{card.ctaLabel}</span>
                                                <ArrowRight className="w-3.5 h-3.5 text-[#155E4B]" />
                                            </a>
                                        ) : (
                                            <Link
                                                href={card.href}
                                                className="min-h-[44px] px-4 rounded-md border border-[#E6E8E5] bg-[#FAFAF8] hover:bg-[#F2F5F3] text-[#0F1F1B] text-xs font-semibold inline-flex items-center justify-between transition-colors"
                                            >
                                                <span>{card.ctaLabel}</span>
                                                <ArrowRight className="w-3.5 h-3.5 text-[#155E4B]" />
                                            </Link>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Documentação de Módulos de Recepção (Totem e TV) */}
                    <section className="pt-12 border-t border-[#E6E8E5] mb-16">
                        <div className="text-center mb-10">
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                                MÓDULOS DE RECEPÇÃO
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight">
                                Documentação de Totem e Painel de TV
                            </h2>
                        </div>

                        <div className="space-y-10 max-w-4xl mx-auto">
                            <div id="totem-section" className="scroll-mt-24 space-y-4">
                                <h3 className="text-xl font-semibold text-[#0F1F1B] flex items-center gap-2.5">
                                    <Monitor className="w-5 h-5 text-[#155E4B]" strokeWidth={1.75} />
                                    Totem de Autoatendimento
                                </h3>
                                <div className="space-y-4">
                                    {TOTEM_GUIDES.map((item) => (
                                        <div
                                            key={item.title}
                                            className="bg-white border border-[#E6E8E5] border-l-4 border-l-[#155E4B] rounded-xl p-6 space-y-2.5 text-sm"
                                        >
                                            <h4 className="text-base font-semibold text-[#0F1F1B]">{item.title}</h4>
                                            <p className="text-[#4B5B56]"><strong className="text-[#0F1F1B]">O que é:</strong> {item.what}</p>
                                            <p className="text-[#4B5B56]"><strong className="text-[#0F1F1B]">Para que serve:</strong> {item.why}</p>
                                            <p className="text-[#4B5B56]"><strong className="text-[#0F1F1B]">Como usar:</strong> {item.how}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div id="tv-section" className="scroll-mt-24 space-y-4 pt-6 border-t border-[#E6E8E5]">
                                <h3 className="text-xl font-semibold text-[#0F1F1B] flex items-center gap-2.5">
                                    <Tv className="w-5 h-5 text-[#155E4B]" strokeWidth={1.75} />
                                    Painel de TV (Sala de Espera)
                                </h3>
                                <div className="space-y-4">
                                    {TV_GUIDES.map((item) => (
                                        <div
                                            key={item.title}
                                            className="bg-white border border-[#E6E8E5] border-l-4 border-l-[#0F1F1B] rounded-xl p-6 space-y-2.5 text-sm"
                                        >
                                            <h4 className="text-base font-semibold text-[#0F1F1B]">{item.title}</h4>
                                            <p className="text-[#4B5B56]"><strong className="text-[#0F1F1B]">O que é:</strong> {item.what}</p>
                                            <p className="text-[#4B5B56]"><strong className="text-[#0F1F1B]">Para que serve:</strong> {item.why}</p>
                                            <p className="text-[#4B5B56]"><strong className="text-[#0F1F1B]">Como usar:</strong> {item.how}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Perguntas Frequentes */}
                    <section className="pt-12 border-t border-[#E6E8E5] max-w-4xl mx-auto">
                        <div className="text-center mb-8">
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                                DÚVIDAS FREQUENTES
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight">
                                Respostas rápidas
                            </h2>
                        </div>

                        <div className="space-y-3">
                            {filteredFaqs.map((faq, idx) => {
                                const isOpen = openFaq === idx
                                return (
                                    <div key={faq.q} className="bg-white border border-[#E6E8E5] rounded-xl overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setOpenFaq(isOpen ? null : idx)}
                                            aria-expanded={isOpen}
                                            className="w-full min-h-[54px] px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-[#FAFAF8] transition-colors cursor-pointer"
                                        >
                                            <span className="text-sm sm:text-base font-semibold text-[#0F1F1B]">{faq.q}</span>
                                            {isOpen ? (
                                                <ChevronUp className="w-4 h-4 text-[#155E4B] shrink-0" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-[#4B5B56] shrink-0" />
                                            )}
                                        </button>
                                        {isOpen && (
                                            <div className="px-5 pb-5 pt-1 text-sm text-[#4B5B56] leading-relaxed border-t border-[#E6E8E5]/60">
                                                <p>{faq.a}</p>
                                                {faq.linkHref && (
                                                    <Link
                                                        href={faq.linkHref}
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#155E4B] hover:underline mt-3"
                                                    >
                                                        {faq.linkLabel}
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </Link>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                </div>
            </main>
        </EditorialShell>
    )
}
