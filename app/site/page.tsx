'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    ArrowRight,
    Check,
    ChevronDown,
    ChevronUp,
    Code,
    Globe,
    Headphones,
    MessageCircle,
    Palette,
    Shield,
    Smartphone,
    Zap,
} from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'

const PACKAGES = [
    {
        name: 'Site Essencial',
        price: 'R$ 790',
        description: 'Presença digital rápida e objetiva',
        features: [
            'Página institucional responsiva (mobile e desktop)',
            'Até 4 seções estratégicas com suas especialidades',
            'Botão WhatsApp e formulário de contato',
            'SEO técnico inicial e certificado SSL',
            'Link direto para agendamento online CliniGo',
            'Entrega estimada em até 5 dias úteis',
        ],
        highlight: false,
    },
    {
        name: 'Site Profissional',
        price: 'R$ 1.990',
        description: 'Mais escolhido por clínicas multidisciplinares',
        features: [
            'Tudo do Essencial incluído',
            'Até 8 páginas (equipe, terapias, convênios e contato)',
            'Integração direta com o fluxo de agendamento CliniGo',
            'Estrutura editorial otimizada para buscas no Google',
            'Configuração de domínio próprio e SSL',
            'Entrega estimada em até 10 dias úteis',
        ],
        highlight: true,
    },
    {
        name: 'Site Premium',
        price: 'R$ 3.900',
        description: 'Projeto sob medida para clínicas consolidadas',
        features: [
            'Tudo do Profissional incluído',
            'Direção de arte exclusiva alinhada à marca da clínica',
            'Estrutura de páginas sob demanda',
            'Agendamento online avançado e acesso ao Portal do Paciente',
            'Suporte prioritário de ajustes por 3 meses',
            'Entrega estimada em até 21 dias úteis',
        ],
        highlight: false,
    },
]

const BENEFITS = [
    {
        icon: Globe,
        title: 'Domínio Próprio',
        description: 'Endereço profissional com o nome da sua clínica e certificado SSL ativo.',
    },
    {
        icon: Smartphone,
        title: 'Responsivo para Celular',
        description: 'Leitura confortável e botões acessíveis para famílias que pesquisam pelo celular.',
    },
    {
        icon: Zap,
        title: 'Carregamento Rápido',
        description: 'Arquitetura leve pensada para desempenho em conexões móveis e indexação no Google.',
    },
    {
        icon: Palette,
        title: 'Identidade Coesa',
        description: 'Visual sóbrio e confiável adaptado à paleta e ao posicionamento da sua equipe.',
    },
    {
        icon: Code,
        title: 'Conectado ao CliniGo',
        description: 'Botões de agendamento e pré-cadastro integrados diretamente à sua unidade.',
    },
    {
        icon: Headphones,
        title: 'Suporte de Publicação',
        description: 'Acompanhamento técnico do briefing até a colocação do site no ar.',
    },
]

const PROCESS = [
    { step: '01', title: 'Contato', desc: 'Alinhamos o perfil da clínica e as especialidades atendidas.' },
    { step: '02', title: 'Briefing', desc: 'Reunimos identidade visual, fotos, textos e convênios aceitos.' },
    { step: '03', title: 'Desenvolvimento', desc: 'Construímos o layout responsivo e conectamos ao CliniGo.' },
    { step: '04', title: 'Publicação', desc: 'Site no ar no seu domínio próprio pronto para receber famílias.' },
]

const SITE_FAQS = [
    {
        q: 'Preciso ser assinante do CliniGo para contratar o site?',
        a: 'Não é obrigatório, mas clínicas que operam no CliniGo aproveitam a integração direta com o link de agendamento online e o Portal do Paciente.',
    },
    {
        q: 'Qual o prazo médio de entrega?',
        a: 'O Site Essencial é entregue em até 5 dias úteis após o envio do briefing, o Profissional em até 10 dias úteis e o Premium em até 21 dias úteis.',
    },
    {
        q: 'O site pertence à clínica após a entrega?',
        a: 'Sim. Após a entrega e quitação, o domínio e os arquivos do site pertencem integralmente à clínica.',
    },
    {
        q: 'Existe opção de manutenção mensal?',
        a: 'Sim. Oferecemos planos opcionais de manutenção e atualização a partir de R$ 149/mês.',
    },
]

export default function SitePage() {
    const [openFaq, setOpenFaq] = useState<number | null>(0)

    return (
        <EditorialShell>
            <main className="flex-1">
                {/* Hero */}
                <section className="py-14 sm:py-20 px-5 sm:px-8 border-b border-[#E6E8E5]">
                    <div className="max-w-4xl mx-auto text-center">
                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-3">
                            SERVIÇO ADICIONAL CLINIGO
                        </p>
                        <h1 className="text-3xl sm:text-5xl font-semibold text-[#0F1F1B] tracking-tight leading-[1.1] mb-5">
                            Sites profissionais para{' '}
                            <span className="font-serif-accent text-[#155E4B] font-normal">
                                clínicas de terapias
                            </span>{' '}
                            integrados ao agendamento.
                        </h1>
                        <p className="text-base sm:text-lg text-[#4B5B56] max-w-2xl mx-auto mb-8 leading-relaxed">
                            Apresente suas especialidades, equipe e convênios com credibilidade no Google e direcione famílias direto para o WhatsApp ou agendamento online da sua clínica.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <a
                                href="https://wa.me/5521975129005?text=Ol%C3%A1!%20Tenho%20interesse%20em%20desenvolver%20um%20site%20para%20minha%20cl%C3%ADnica%20de%20terapias"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-h-[48px] w-full sm:w-auto px-6 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Solicitar orçamento no WhatsApp
                            </a>
                            <a
                                href="#pacotes"
                                className="min-h-[48px] w-full sm:w-auto px-6 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-[#0F1F1B] text-sm font-medium inline-flex items-center justify-center transition-colors"
                            >
                                Ver pacotes disponíveis
                            </a>
                        </div>
                    </div>
                </section>

                {/* Benefícios */}
                <section className="py-14 sm:py-16 px-5 sm:px-8 bg-white border-b border-[#E6E8E5]">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-10">
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                                DIFERENCIAIS
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight">
                                Por que estruturar a presença digital da clínica
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {BENEFITS.map((benefit) => (
                                <div key={benefit.title} className="p-6 rounded-xl bg-[#FAFAF8] border border-[#E6E8E5]">
                                    <div className="w-11 h-11 rounded-lg bg-[#E6F2EE] text-[#155E4B] flex items-center justify-center mb-4">
                                        <benefit.icon className="w-5 h-5" strokeWidth={1.75} />
                                    </div>
                                    <h3 className="font-semibold text-[#0F1F1B] text-base mb-1.5">{benefit.title}</h3>
                                    <p className="text-sm text-[#4B5B56] leading-relaxed">{benefit.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Pacotes */}
                <section id="pacotes" className="scroll-mt-20 py-14 sm:py-16 px-5 sm:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-10">
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                                INVESTIMENTO ÚNICO
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight mb-2">
                                Pacotes de desenvolvimento
                            </h2>
                            <p className="text-sm text-[#4B5B56]">
                                Escolha o formato ideal para o momento da sua clínica.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12 items-stretch">
                            {PACKAGES.map((pkg) => (
                                <div
                                    key={pkg.name}
                                    className={`bg-white rounded-xl p-7 flex flex-col justify-between ${
                                        pkg.highlight
                                            ? 'border-2 border-[#155E4B] shadow-sm'
                                            : 'border border-[#E6E8E5]'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <h3 className="text-xl font-semibold text-[#0F1F1B]">{pkg.name}</h3>
                                            {pkg.highlight && (
                                                <span className="ec-pill px-2.5 py-1 bg-[#E6F2EE] text-[#114D3E] font-tech-mono text-[10px] font-semibold uppercase tracking-[0.1em]">
                                                    Mais popular
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-[#4B5B56] mb-5">{pkg.description}</p>

                                        <div className="pb-5 mb-5 border-b border-[#E6E8E5]">
                                            <div className="font-tech-mono text-3xl sm:text-4xl font-semibold text-[#0F1F1B]">
                                                {pkg.price}
                                            </div>
                                            <p className="font-tech-mono text-[11px] uppercase tracking-[0.12em] text-[#4B5B56] mt-1">
                                                pagamento único pelo desenvolvimento
                                            </p>
                                        </div>

                                        <ul className="space-y-3 mb-7">
                                            {pkg.features.map((feature) => (
                                                <li key={feature} className="flex items-start gap-2.5 text-sm text-[#0F1F1B]">
                                                    <Check className="w-4 h-4 text-[#155E4B] shrink-0 mt-0.5" strokeWidth={2.25} />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <a
                                        href={`https://wa.me/5521975129005?text=${encodeURIComponent(`Olá! Tenho interesse no pacote ${pkg.name} para desenvolvimento de site da minha clínica.`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`min-h-[46px] w-full rounded-md font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors ${
                                            pkg.highlight
                                                ? 'bg-[#155E4B] hover:bg-[#0F493A] text-white'
                                                : 'bg-[#0F1F1B] hover:bg-[#155E4B] text-white'
                                        }`}
                                    >
                                        Solicitar {pkg.name}
                                        <ArrowRight className="w-4 h-4" />
                                    </a>
                                </div>
                            ))}
                        </div>

                        {/* Bloco Integrado Site + Sistema CliniGo (comercialmente fiel) */}
                        <div className="bg-[#0D1F1B] text-white rounded-xl p-7 sm:p-10 border border-[#1D3831]">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                                <div className="lg:col-span-7 space-y-4">
                                    <span className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ED3C2]">
                                        SITE + OPERAÇÃO INTEGRADA
                                    </span>
                                    <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                                        Conecte seu novo site diretamente ao sistema CliniGo.
                                    </h3>
                                    <p className="text-sm sm:text-base text-white/80 leading-relaxed">
                                        Unifique a captação de famílias no Google com o agendamento online, pré-cadastro pelo celular e prontuário da sua unidade. Planos CliniGo a partir de R$ 149/mês com taxa única de implantação e Guia de Uso integrado.
                                    </p>
                                    <div className="flex flex-wrap gap-3 pt-2">
                                        <a
                                            href="https://wa.me/5521975129005?text=Ol%C3%A1!%20Quero%20receber%20uma%20proposta%20do%20Site%20Profissional%20integrado%20ao%20CliniGo"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="min-h-[46px] px-5 rounded-md bg-[#155E4B] hover:bg-[#1B735C] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                                        >
                                            Solicitar proposta integrada
                                            <ArrowRight className="w-4 h-4" />
                                        </a>
                                        <Link
                                            href="/planos"
                                            className="min-h-[46px] px-5 rounded-md border border-white/20 hover:bg-white/10 text-white text-sm font-medium inline-flex items-center justify-center transition-colors"
                                        >
                                            Ver planos do sistema
                                        </Link>
                                    </div>
                                </div>

                                <div className="lg:col-span-5 bg-white/5 border border-[#1D3831] rounded-xl p-6 space-y-3 text-sm">
                                    <div className="flex items-center gap-2 text-[#9ED3C2] font-tech-mono text-[11px] uppercase tracking-[0.12em] mb-2">
                                        <Shield className="w-4 h-4" />
                                        O QUE ESTÁ INTEGRADO
                                    </div>
                                    {[
                                        'Site institucional publicado no seu domínio com SSL',
                                        'Botões de agendamento conectados à agenda do CliniGo',
                                        'Link direto de pré-cadastro e Portal do Paciente',
                                        'Manutenção mensal opcional a partir de R$ 149/mês',
                                    ].map((item) => (
                                        <div key={item} className="flex items-start gap-2.5 text-white/90">
                                            <Check className="w-4 h-4 text-[#9ED3C2] shrink-0 mt-0.5" />
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Como Funciona */}
                <section className="py-14 sm:py-16 px-5 sm:px-8 bg-white border-y border-[#E6E8E5]">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-10">
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                                ETAPAS DO PROJETO
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight">
                                Como funciona o desenvolvimento
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {PROCESS.map((item) => (
                                <div key={item.step} className="p-5 rounded-xl bg-[#FAFAF8] border border-[#E6E8E5]">
                                    <span className="font-tech-mono text-xs font-semibold text-[#155E4B] px-2.5 py-1 rounded bg-[#E6F2EE] inline-block mb-3">
                                        {item.step}
                                    </span>
                                    <h3 className="font-semibold text-[#0F1F1B] mb-1.5">{item.title}</h3>
                                    <p className="text-sm text-[#4B5B56] leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section className="py-14 sm:py-16 px-5 sm:px-8">
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-8">
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                                DÚVIDAS FREQUENTES
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight">
                                Perguntas sobre sites para clínicas
                            </h2>
                        </div>
                        <div className="space-y-3">
                            {SITE_FAQS.map((faq, idx) => {
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
                                                {faq.a}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </section>
            </main>
        </EditorialShell>
    )
}
