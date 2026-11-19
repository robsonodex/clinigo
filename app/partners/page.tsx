'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    ArrowRight,
    Calendar,
    Check,
    DollarSign,
    LogIn,
    RotateCcw,
    Shield,
    TrendingUp,
    Users,
} from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'

const OFFICIAL_PLANS = [
    { id: 'BASICO', name: 'Básico', price: 149, desc: '1 licença' },
    { id: 'AVANCADO', name: 'Avançado', price: 249, desc: 'Até 5 licenças' },
    { id: 'PROFESSIONAL', name: 'Professional', price: 449, desc: 'Até 30 licenças' },
] as const

const STEPS = [
    { step: '01', title: 'Cadastre-se', desc: 'Preencha seus dados e receba seu código exclusivo na hora.' },
    { step: '02', title: 'Apresente o CliniGo', desc: 'Indique para clínicas de terapias multidisciplinares da sua rede.' },
    { step: '03', title: 'Assinatura confirmada', desc: 'A clínica contrata com seu código e paga a primeira mensalidade.' },
    { step: '04', title: 'Receba via Pix', desc: 'Comissão paga todo dia 5 + recorrência mensal enquanto a clínica seguir ativa.' },
]

function getCommissionRate(sales: number): number {
    if (sales >= 10) return 0.45
    if (sales >= 5) return 0.4
    return 0.35
}

export default function PartnersPage() {
    const [selectedPlanId, setSelectedPlanId] = useState<(typeof OFFICIAL_PLANS)[number]['id']>('AVANCADO')
    const [salesCount, setSalesCount] = useState(5)

    const currentPlan = OFFICIAL_PLANS.find((p) => p.id === selectedPlanId) || OFFICIAL_PLANS[1]
    const rate = getCommissionRate(salesCount)
    const firstMonthTotal = Math.round(salesCount * currentPlan.price * rate)
    const recurringMonthly = Math.round(salesCount * currentPlan.price * 0.08)

    const formatBRL = (val: number) =>
        val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

    return (
        <EditorialShell>
            <main className="flex-1">
                {/* Hero */}
                <section className="py-14 sm:py-20 px-5 sm:px-8 border-b border-[#E6E8E5]">
                    <div className="max-w-4xl mx-auto text-center">
                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-3">
                            PROGRAMA DE PARCEIROS CLINIGO
                        </p>
                        <h1 className="text-3xl sm:text-5xl font-semibold text-[#0F1F1B] tracking-tight leading-[1.1] mb-5">
                            Ganhe{' '}
                            <span className="font-serif-accent text-[#155E4B] font-normal">
                                35% a 45% + 8% recorrente
                            </span>{' '}
                            por cada clínica ativa indicada.
                        </h1>
                        <p className="text-base sm:text-lg text-[#4B5B56] max-w-2xl mx-auto mb-8 leading-relaxed">
                            Indique o CliniGo para clínicas de terapias multidisciplinares e receba comissão na primeira mensalidade paga, além de 8% recorrente mensal enquanto a clínica permanecer assinante.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link
                                href="/partners/register"
                                className="min-h-[48px] w-full sm:w-auto px-6 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                            >
                                Quero ser parceiro
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                href="/partners/login"
                                className="min-h-[48px] w-full sm:w-auto px-6 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-[#0F1F1B] text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
                            >
                                <LogIn className="w-4 h-4 text-[#155E4B]" />
                                Já sou parceiro (Entrar)
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Como Funciona */}
                <section className="py-14 sm:py-16 px-5 sm:px-8 bg-white border-b border-[#E6E8E5]">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-10">
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                                PASSO A PASSO
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight">
                                Como funciona a parceria
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {STEPS.map((item) => (
                                <div key={item.step} className="p-6 rounded-xl bg-[#FAFAF8] border border-[#E6E8E5]">
                                    <span className="font-tech-mono text-xs font-semibold text-[#155E4B] px-2.5 py-1 rounded bg-[#E6F2EE] inline-block mb-4">
                                        ETAPA {item.step}
                                    </span>
                                    <h3 className="text-base font-semibold text-[#0F1F1B] mb-2">{item.title}</h3>
                                    <p className="text-sm text-[#4B5B56] leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Benefícios */}
                <section className="py-14 sm:py-16 px-5 sm:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-white rounded-xl border border-[#E6E8E5]">
                                <div className="w-11 h-11 rounded-lg bg-[#E6F2EE] text-[#155E4B] flex items-center justify-center mb-4">
                                    <TrendingUp className="w-5 h-5" strokeWidth={1.75} />
                                </div>
                                <h3 className="text-lg font-semibold text-[#0F1F1B] mb-2">Comissão escalável</h3>
                                <p className="text-sm text-[#4B5B56] leading-relaxed">
                                    35% base de 1 a 4 vendas no mês, 40% de 5 a 9 vendas e 45% a partir de 10 vendas confirmadas.
                                </p>
                            </div>
                            <div className="p-6 bg-white rounded-xl border border-[#E6E8E5]">
                                <div className="w-11 h-11 rounded-lg bg-[#E6F2EE] text-[#155E4B] flex items-center justify-center mb-4">
                                    <Calendar className="w-5 h-5" strokeWidth={1.75} />
                                </div>
                                <h3 className="text-lg font-semibold text-[#0F1F1B] mb-2">Repasse via Pix todo dia 5</h3>
                                <p className="text-sm text-[#4B5B56] leading-relaxed">
                                    Pagamentos centralizados diretamente na chave Pix cadastrada no seu painel de parceiro.
                                </p>
                            </div>
                            <div className="p-6 bg-white rounded-xl border border-[#E6E8E5]">
                                <div className="w-11 h-11 rounded-lg bg-[#E6F2EE] text-[#155E4B] flex items-center justify-center mb-4">
                                    <Users className="w-5 h-5" strokeWidth={1.75} />
                                </div>
                                <h3 className="text-lg font-semibold text-[#0F1F1B] mb-2">Sem teto de indicações</h3>
                                <p className="text-sm text-[#4B5B56] leading-relaxed">
                                    Indique clínicas de terapia em todo o Brasil e acompanhe cada status no seu painel em tempo real.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Simulador Interativo com Preços Oficiais (R$ 149 / R$ 249 / R$ 449) */}
                <section className="py-14 sm:py-16 px-5 sm:px-8 bg-white border-y border-[#E6E8E5]">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-10">
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                                SIMULADOR TRANSPARENTE
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight mb-2">
                                Simule seus ganhos com os planos oficiais
                            </h2>
                            <p className="text-sm text-[#4B5B56]">
                                Valores calculados sobre as mensalidades vigentes: Básico (R$ 149), Avançado (R$ 249) e Professional (R$ 449).
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                            {/* Controles */}
                            <div className="lg:col-span-7 bg-[#FAFAF8] border border-[#E6E8E5] rounded-xl p-6 space-y-6">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-[#4B5B56] mb-2.5">
                                        1. Selecione o plano indicado
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                        {OFFICIAL_PLANS.map((plan) => {
                                            const active = plan.id === selectedPlanId
                                            return (
                                                <button
                                                    key={plan.id}
                                                    type="button"
                                                    onClick={() => setSelectedPlanId(plan.id)}
                                                    className={`min-h-[56px] p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                                                        active
                                                            ? 'bg-[#155E4B] border-[#155E4B] text-white'
                                                            : 'bg-white border-[#E6E8E5] text-[#0F1F1B] hover:border-[#155E4B]'
                                                    }`}
                                                >
                                                    <span className="block text-sm font-semibold">{plan.name}</span>
                                                    <span className={`font-tech-mono text-xs ${active ? 'text-white/85' : 'text-[#4B5B56]'}`}>
                                                        R$ {plan.price}/mês · {plan.desc}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label htmlFor="partner-sales-slider" className="text-xs font-semibold uppercase tracking-[0.1em] text-[#4B5B56]">
                                            2. Clínicas fechadas no mês
                                        </label>
                                        <span className="font-tech-mono text-sm font-semibold text-[#155E4B]">
                                            {salesCount} {salesCount === 1 ? 'venda' : 'vendas'} · Faixa {Math.round(rate * 100)}%
                                        </span>
                                    </div>
                                    <input
                                        id="partner-sales-slider"
                                        type="range"
                                        min={1}
                                        max={20}
                                        value={salesCount}
                                        onChange={(e) => setSalesCount(Number(e.target.value))}
                                        className="w-full h-2 cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[11px] font-tech-mono text-[#4B5B56] mt-1.5">
                                        <span>1 (35%)</span>
                                        <span>5 (40%)</span>
                                        <span>10+ (45%)</span>
                                        <span>20</span>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedPlanId('AVANCADO')
                                            setSalesCount(5)
                                        }}
                                        className="min-h-[40px] px-3 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-xs font-medium text-[#4B5B56] inline-flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Restaurar simulação
                                    </button>
                                </div>
                            </div>

                            {/* Resultado */}
                            <div className="lg:col-span-5 bg-[#0D1F1B] text-white rounded-xl p-6 sm:p-7 flex flex-col justify-between border border-[#1D3831]">
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 font-tech-mono text-[11px] uppercase tracking-[0.14em] text-[#9ED3C2]">
                                        <DollarSign className="w-4 h-4" />
                                        ESTIMATIVA DE COMISSÃO
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/70 mb-1">Comissão na primeira mensalidade</p>
                                        <p className="font-tech-mono text-3xl sm:text-4xl font-semibold text-white">
                                            {formatBRL(firstMonthTotal)}
                                        </p>
                                        <p className="font-tech-mono text-xs text-white/60 mt-1">
                                            {salesCount} x R$ {currentPlan.price} x {Math.round(rate * 100)}%
                                        </p>
                                    </div>
                                    <div className="pt-4 border-t border-[#1D3831]">
                                        <p className="text-xs text-white/70 mb-1">Recorrência mensal adicional (8%)</p>
                                        <p className="font-tech-mono text-xl font-semibold text-[#9ED3C2]">
                                            + {formatBRL(recurringMonthly)}/mês
                                        </p>
                                        <p className="text-xs text-white/60 mt-1">
                                            Pago mensalmente enquanto as clínicas permanecerem ativas.
                                        </p>
                                    </div>
                                </div>

                                <Link
                                    href="/partners/register"
                                    className="mt-6 min-h-[46px] w-full px-4 rounded-md bg-[#155E4B] hover:bg-[#1B735C] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                                >
                                    Gerar meu código de parceiro
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Transparência e Código */}
                <section className="py-14 sm:py-16 px-5 sm:px-8">
                    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div>
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#155E4B] mb-2">
                                PAINEL DO PARCEIRO
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight mb-5">
                                Transparência total em cada indicação
                            </h2>
                            <ul className="space-y-3 text-sm text-[#4B5B56]">
                                {[
                                    'Painel exclusivo para acompanhar indicações e status de pagamento',
                                    'Histórico completo de repasses e comissões recorrentes',
                                    'Link direto de cadastro com rastreamento automático do seu código',
                                    'Termo comercial claro disponível antes de concluir o cadastro',
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-2.5 text-[#0F1F1B]">
                                        <Check className="w-4 h-4 text-[#155E4B] shrink-0 mt-0.5" strokeWidth={2.25} />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-white border border-[#E6E8E5] rounded-xl p-7 text-center">
                            <div className="w-11 h-11 rounded-lg bg-[#E6F2EE] text-[#155E4B] flex items-center justify-center mx-auto mb-4">
                                <Shield className="w-5 h-5" strokeWidth={1.75} />
                            </div>
                            <p className="text-xs font-tech-mono uppercase tracking-[0.12em] text-[#4B5B56] mb-3">
                                EXEMPLO DE CÓDIGO EXCLUSIVO
                            </p>
                            <div className="bg-[#FAFAF8] border border-[#E6E8E5] rounded-lg py-4 px-5 font-tech-mono text-2xl font-semibold text-[#155E4B]">
                                MARIANA-8472
                            </div>
                            <p className="text-xs text-[#4B5B56] mt-3">
                                Gerado automaticamente assim que você conclui seu cadastro de parceiro.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        </EditorialShell>
    )
}
