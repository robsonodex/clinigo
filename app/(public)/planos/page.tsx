'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, ChevronDown, ChevronUp, MessageCircle, Minus, Shield } from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'
import { FAQ_CONTENT, PLANS_CONTENT, WHATSAPP_URL } from '@/components/preview-home/content'

interface ComparisonRow {
    label: string
    basico: string | boolean
    avancado: string | boolean
    professional: string | boolean
}

const COMPARISON_ROWS: ComparisonRow[] = [
    { label: 'Licenças de profissionais incluídas', basico: '1 licença', avancado: 'Até 5 licenças', professional: 'Até 30 licenças' },
    { label: 'Unidade operacional', basico: '1 unidade', avancado: '1 unidade', professional: '1 unidade' },
    { label: 'Licença adicional avulsa', basico: 'R$ 49,90/mês', avancado: 'R$ 49,90/mês', professional: 'R$ 49,90/mês' },
    { label: 'Atendimentos e agenda recorrente', basico: 'Ilimitado', avancado: 'Ilimitado', professional: 'Ilimitado' },
    { label: 'Prontuário por especialidade e planos ABA', basico: true, avancado: true, professional: true },
    { label: 'Teleconsulta WebRTC integrada', basico: true, avancado: true, professional: true },
    { label: 'Check-in QR Code e pré-cadastro online', basico: true, avancado: true, professional: true },
    { label: 'Guia de Uso integrado (treinamento autônomo)', basico: true, avancado: true, professional: true },
    { label: 'BI de Terapia e conformidade de evoluções', basico: false, avancado: true, professional: true },
    { label: 'Motor de repasse com sigilo RBAC', basico: false, avancado: true, professional: true },
    { label: 'WhatsApp integrado por setores e CRM', basico: false, avancado: true, professional: true },
    { label: 'Importação em lote via Excel e CSV', basico: false, avancado: true, professional: true },
    { label: 'Faturamento TISS completo e lotes XML ANS', basico: false, avancado: false, professional: true },
    { label: 'Check-in biométrico facial multi-superfície', basico: false, avancado: false, professional: true },
    { label: 'Totem de autoatendimento e Painel de TV', basico: false, avancado: false, professional: true },
    { label: 'API, webhooks e SLA 99,5%', basico: false, avancado: false, professional: true },
]

function ComparisonCell({ value }: { value: string | boolean }) {
    if (typeof value === 'string') {
        return <span className="text-xs sm:text-sm font-medium text-[#0F1F1B]">{value}</span>
    }
    if (value) {
        return <Check className="w-4 h-4 text-[#155E4B] mx-auto" strokeWidth={2.25} aria-label="Incluído" />
    }
    return <Minus className="w-4 h-4 text-[#4B5B56]/40 mx-auto" strokeWidth={2} aria-label="Não incluído" />
}

export default function PlanosPage() {
    const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({})
    const [openFaq, setOpenFaq] = useState<number | null>(0)

    const toggleExpand = (id: string) => {
        setExpandedPlans((prev) => ({ ...prev, [id]: !prev[id] }))
    }

    return (
        <EditorialShell>
            <main className="flex-1">
                {/* Hero */}
                <section className="py-14 sm:py-20 px-5 sm:px-8 border-b border-[#E6E8E5]">
                    <div className="max-w-4xl mx-auto text-center">
                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-3">
                            {PLANS_CONTENT.kicker}
                        </p>
                        <h1 className="text-3xl sm:text-5xl font-semibold text-[#0F1F1B] tracking-tight leading-[1.1] mb-5">
                            {PLANS_CONTENT.headlineBefore}
                            <span className="font-serif-accent text-[#155E4B] font-normal">
                                {PLANS_CONTENT.headlineAccent}
                            </span>
                            {PLANS_CONTENT.headlineAfter}
                        </h1>
                        <p className="text-base sm:text-lg text-[#4B5B56] max-w-2xl mx-auto leading-relaxed">
                            {PLANS_CONTENT.subtitle} Avalie por 7 dias sem compromisso antes de contratar.
                        </p>
                    </div>
                </section>

                {/* Cards de Planos */}
                <section className="py-14 sm:py-16 px-5 sm:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                            {PLANS_CONTENT.plans.map((plan) => {
                                const isExpanded = !!expandedPlans[plan.id]
                                const planQuery = plan.id.toUpperCase()
                                return (
                                    <div
                                        key={plan.id}
                                        className={`bg-white rounded-xl p-7 flex flex-col justify-between transition-colors ${
                                            plan.featured
                                                ? 'border-2 border-[#155E4B] shadow-sm relative'
                                                : 'border border-[#E6E8E5]'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <h2 className="text-xl font-semibold text-[#0F1F1B]">{plan.name}</h2>
                                                {plan.badge && (
                                                    <span className="ec-pill px-2.5 py-1 bg-[#E6F2EE] text-[#114D3E] font-tech-mono text-[10px] font-semibold uppercase tracking-[0.1em]">
                                                        {plan.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-[#4B5B56] min-h-[40px]">{plan.audience}</p>

                                            <div className="mt-5 pb-5 border-b border-[#E6E8E5]">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-sm font-medium text-[#4B5B56]">R$</span>
                                                    <span className="font-tech-mono text-4xl font-semibold text-[#0F1F1B]">
                                                        {plan.price}
                                                    </span>
                                                    <span className="text-sm text-[#4B5B56]">/mês</span>
                                                </div>
                                                <p className="font-tech-mono text-[11px] text-[#155E4B] mt-2">
                                                    {plan.licenses}
                                                </p>
                                            </div>

                                            <ul className="mt-5 space-y-3">
                                                {plan.core.map((item) => (
                                                    <li key={item} className="flex items-start gap-2.5 text-sm text-[#0F1F1B]">
                                                        <Check className="w-4 h-4 text-[#155E4B] shrink-0 mt-0.5" strokeWidth={2.25} />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                                {isExpanded &&
                                                    plan.extra.map((item) => (
                                                        <li key={item} className="flex items-start gap-2.5 text-sm text-[#4B5B56]">
                                                            <Check className="w-4 h-4 text-[#155E4B]/70 shrink-0 mt-0.5" strokeWidth={2} />
                                                            <span>{item}</span>
                                                        </li>
                                                    ))}
                                            </ul>

                                            <button
                                                type="button"
                                                onClick={() => toggleExpand(plan.id)}
                                                className="mt-4 min-h-[44px] w-full text-xs font-medium text-[#155E4B] hover:text-[#0F493A] inline-flex items-center justify-center gap-1.5 rounded-md hover:bg-[#F2F5F3] transition-colors cursor-pointer"
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        {PLANS_CONTENT.collapseLabel}
                                                        <ChevronUp className="w-4 h-4" />
                                                    </>
                                                ) : (
                                                    <>
                                                        {PLANS_CONTENT.expandLabel}
                                                        <ChevronDown className="w-4 h-4" />
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        <div className="mt-6 pt-5 border-t border-[#E6E8E5] space-y-2.5">
                                            <Link
                                                href={`/cadastro?plan=${planQuery}`}
                                                className={`min-h-[46px] w-full rounded-md text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 ${
                                                    plan.featured
                                                        ? 'bg-[#155E4B] hover:bg-[#0F493A] text-white'
                                                        : 'bg-[#0F1F1B] hover:bg-[#155E4B] text-white'
                                                }`}
                                            >
                                                Contratar plano {plan.name}
                                                <ArrowRight className="w-4 h-4" />
                                            </Link>
                                            <Link
                                                href="/trial"
                                                className="min-h-[44px] w-full rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-[#0F1F1B] text-xs font-medium transition-colors inline-flex items-center justify-center"
                                            >
                                                Testar grátis por 7 dias
                                            </Link>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Nota comercial obrigatória */}
                        <div className="mt-8 bg-[#F2F5F3] border border-[#E6E8E5] rounded-xl p-5 sm:p-6 flex items-start gap-3.5">
                            <Shield className="w-5 h-5 text-[#155E4B] shrink-0 mt-0.5" strokeWidth={1.75} />
                            <p className="text-sm text-[#0F1F1B] leading-relaxed">
                                {PLANS_CONTENT.commercialNote}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Tabela Comparativa */}
                <section className="py-14 sm:py-16 px-5 sm:px-8 bg-white border-y border-[#E6E8E5]">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-10">
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                                COMPARATIVO COMPLETO
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight">
                                Recursos por plano
                            </h2>
                            <p className="text-sm text-[#4B5B56] mt-2">
                                Todas as capacidades técnicas detalhadas sem letras miúdas.
                            </p>
                        </div>

                        <div className="overflow-x-auto border border-[#E6E8E5] rounded-xl">
                            <table className="w-full min-w-[640px] border-collapse text-left">
                                <thead>
                                    <tr className="bg-[#F2F5F3] border-b border-[#E6E8E5]">
                                        <th className="p-4 text-xs font-tech-mono uppercase tracking-[0.12em] text-[#4B5B56]">
                                            Recurso
                                        </th>
                                        <th className="p-4 text-center text-sm font-semibold text-[#0F1F1B]">
                                            Básico
                                            <span className="block font-tech-mono text-xs font-normal text-[#4B5B56]">R$ 149/mês</span>
                                        </th>
                                        <th className="p-4 text-center text-sm font-semibold text-[#155E4B] bg-[#E6F2EE]/50">
                                            Avançado
                                            <span className="block font-tech-mono text-xs font-normal text-[#114D3E]">R$ 249/mês</span>
                                        </th>
                                        <th className="p-4 text-center text-sm font-semibold text-[#0F1F1B]">
                                            Professional
                                            <span className="block font-tech-mono text-xs font-normal text-[#4B5B56]">R$ 449/mês</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {COMPARISON_ROWS.map((row) => (
                                        <tr key={row.label} className="border-b border-[#E6E8E5] last:border-b-0 hover:bg-[#FAFAF8]">
                                            <td className="p-4 text-sm font-medium text-[#0F1F1B]">{row.label}</td>
                                            <td className="p-4 text-center">
                                                <ComparisonCell value={row.basico} />
                                            </td>
                                            <td className="p-4 text-center bg-[#E6F2EE]/25">
                                                <ComparisonCell value={row.avancado} />
                                            </td>
                                            <td className="p-4 text-center">
                                                <ComparisonCell value={row.professional} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section className="py-14 sm:py-16 px-5 sm:px-8">
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-10">
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                                {FAQ_CONTENT.kicker}
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight">
                                {FAQ_CONTENT.title}
                            </h2>
                        </div>

                        <div className="space-y-3">
                            {FAQ_CONTENT.items.map((item, idx) => {
                                const isOpen = openFaq === idx
                                return (
                                    <div
                                        key={item.question}
                                        className="bg-white border border-[#E6E8E5] rounded-xl overflow-hidden"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setOpenFaq(isOpen ? null : idx)}
                                            aria-expanded={isOpen}
                                            className="w-full min-h-[56px] px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-[#FAFAF8] transition-colors cursor-pointer"
                                        >
                                            <span className="text-sm sm:text-base font-semibold text-[#0F1F1B]">
                                                {item.question}
                                            </span>
                                            {isOpen ? (
                                                <ChevronUp className="w-4 h-4 text-[#155E4B] shrink-0" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-[#4B5B56] shrink-0" />
                                            )}
                                        </button>
                                        {isOpen && (
                                            <div className="px-5 pb-5 pt-1 text-sm text-[#4B5B56] leading-relaxed border-t border-[#E6E8E5]/60">
                                                {item.answer}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </section>

                {/* CTA Final */}
                <section className="py-16 px-5 sm:px-8 bg-[#0D1F1B] text-white">
                    <div className="max-w-4xl mx-auto text-center">
                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9ED3C2] mb-3">
                            COMECE COM SEGURANÇA
                        </p>
                        <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight mb-4">
                            Avalie o CliniGo na rotina da sua equipe.
                        </h2>
                        <p className="text-sm sm:text-base text-white/75 max-w-xl mx-auto mb-8">
                            Inicie seu teste gratuito de 7 dias ou tire dúvidas comerciais diretamente pelo WhatsApp.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link
                                href="/trial"
                                className="min-h-[48px] w-full sm:w-auto px-6 rounded-md bg-[#155E4B] hover:bg-[#1B735C] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                            >
                                Começar teste de 7 dias
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <a
                                href={WHATSAPP_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-h-[48px] w-full sm:w-auto px-6 rounded-md border border-white/20 hover:bg-white/10 text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Falar no WhatsApp
                            </a>
                        </div>
                    </div>
                </section>
            </main>
        </EditorialShell>
    )
}
