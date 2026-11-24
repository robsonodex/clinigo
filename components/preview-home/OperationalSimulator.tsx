'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Clock, Minus, Plus, RotateCcw } from 'lucide-react'
import { SIMULATOR_CONTENT } from './content'

const DEFAULTS = {
    therapists: 6,
    sessionsPerWeekPerTherapist: 22,
    avgSessionValue: 130,
    occupancyGainPercent: 8,
    usesTiss: true,
}

function formatBRL(value: number) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
    }).format(value)
}

export function OperationalSimulator() {
    const [therapists, setTherapists] = useState(DEFAULTS.therapists)
    const [sessionsPerWeek, setSessionsPerWeek] = useState(DEFAULTS.sessionsPerWeekPerTherapist)
    const [avgSessionValue, setAvgSessionValue] = useState(DEFAULTS.avgSessionValue)
    const [occupancyGainPercent, setOccupancyGainPercent] = useState(DEFAULTS.occupancyGainPercent)
    const [usesTiss, setUsesTiss] = useState(DEFAULTS.usesTiss)

    const result = useMemo(() => {
        const monthlySessions = therapists * sessionsPerWeek * 4
        const monthlyVolume = monthlySessions * avgSessionValue
        // 9 minutos economizados por sessão entre confirmação automática, Modo Tatame, CliniGo IA e repasse
        const hoursSavedPerMonth = Math.max(6, Math.round((monthlySessions * 9) / 60))
        const monthlyGain = Math.round(monthlyVolume * (occupancyGainPercent / 100))
        const annualGain = monthlyGain * 12

        let recommendedPlanName = 'CliniGo Básico'
        let monthlyPlanCost = 149

        if (usesTiss || therapists > 5) {
            recommendedPlanName = 'CliniGo Professional'
            monthlyPlanCost = 449
        } else if (therapists > 1) {
            recommendedPlanName = 'CliniGo Avançado'
            monthlyPlanCost = 249
        }

        return {
            monthlySessions,
            hoursSavedPerMonth,
            monthlyGain,
            annualGain,
            recommendedPlanName,
            monthlyPlanCost,
        }
    }, [therapists, sessionsPerWeek, avgSessionValue, occupancyGainPercent, usesTiss])

    const handleReset = () => {
        setTherapists(DEFAULTS.therapists)
        setSessionsPerWeek(DEFAULTS.sessionsPerWeekPerTherapist)
        setAvgSessionValue(DEFAULTS.avgSessionValue)
        setOccupancyGainPercent(DEFAULTS.occupancyGainPercent)
        setUsesTiss(DEFAULTS.usesTiss)
    }

    return (
        <section id="simulador" className="scroll-mt-20 py-20 lg:py-28">
            <div className="max-w-7xl mx-auto px-5 sm:px-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                    <div className="max-w-2xl">
                        <p className="font-tech-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#155E4B]">
                            {SIMULATOR_CONTENT.kicker}
                        </p>
                        <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-[-0.03em] leading-[1.08] text-[#0F1F1B]">
                            {SIMULATOR_CONTENT.headlineBefore}
                            <span className="font-serif-accent text-[#155E4B] font-normal text-[1.08em]">
                                {SIMULATOR_CONTENT.headlineAccent}
                            </span>
                            {SIMULATOR_CONTENT.headlineAfter}
                        </h2>
                        <p className="mt-3 text-base text-[#4B5B56] leading-relaxed">
                            {SIMULATOR_CONTENT.subtitle}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleReset}
                        className="self-start sm:self-auto min-h-[44px] px-4 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-xs font-medium text-[#0F1F1B] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                        {SIMULATOR_CONTENT.resetLabel}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    {/* Card de controles */}
                    <div className="lg:col-span-7 rounded-xl border border-[#E6E8E5] bg-white p-6 sm:p-8 space-y-6">
                        {/* Número de terapeutas */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <label htmlFor="sim-therapists" className="text-sm font-medium text-[#0F1F1B]">
                                    Profissionais na equipe clínica
                                </label>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        aria-label="Diminuir número de profissionais"
                                        onClick={() => setTherapists((v) => Math.max(1, v - 1))}
                                        className="w-11 h-11 sm:w-9 sm:h-9 rounded-md border border-[#E6E8E5] bg-[#FAFAF8] hover:bg-[#F2F5F3] inline-flex items-center justify-center text-[#0F1F1B] cursor-pointer"
                                    >
                                        <Minus className="w-3.5 h-3.5" strokeWidth={1.75} />
                                    </button>
                                    <span className="font-tech-mono min-w-[44px] text-center text-sm font-semibold text-[#0F1F1B]">
                                        {therapists}
                                    </span>
                                    <button
                                        type="button"
                                        aria-label="Aumentar número de profissionais"
                                        onClick={() => setTherapists((v) => Math.min(30, v + 1))}
                                        className="w-11 h-11 sm:w-9 sm:h-9 rounded-md border border-[#E6E8E5] bg-[#FAFAF8] hover:bg-[#F2F5F3] inline-flex items-center justify-center text-[#0F1F1B] cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                                    </button>
                                </div>
                            </div>
                            <input
                                id="sim-therapists"
                                type="range"
                                min={1}
                                max={30}
                                step={1}
                                value={therapists}
                                onChange={(e) => setTherapists(Number(e.target.value))}
                                className="w-full cursor-pointer"
                            />
                        </div>

                        {/* Média de sessões/semana por terapeuta */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <label htmlFor="sim-weekly" className="text-sm font-medium text-[#0F1F1B]">
                                    Média de atendimentos por semana por profissional
                                </label>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        aria-label="Diminuir sessões por semana"
                                        onClick={() => setSessionsPerWeek((v) => Math.max(5, v - 1))}
                                        className="w-11 h-11 sm:w-9 sm:h-9 rounded-md border border-[#E6E8E5] bg-[#FAFAF8] hover:bg-[#F2F5F3] inline-flex items-center justify-center text-[#0F1F1B] cursor-pointer"
                                    >
                                        <Minus className="w-3.5 h-3.5" strokeWidth={1.75} />
                                    </button>
                                    <span className="font-tech-mono min-w-[44px] text-center text-sm font-semibold text-[#0F1F1B]">
                                        {sessionsPerWeek}
                                    </span>
                                    <button
                                        type="button"
                                        aria-label="Aumentar sessões por semana"
                                        onClick={() => setSessionsPerWeek((v) => Math.min(40, v + 1))}
                                        className="w-11 h-11 sm:w-9 sm:h-9 rounded-md border border-[#E6E8E5] bg-[#FAFAF8] hover:bg-[#F2F5F3] inline-flex items-center justify-center text-[#0F1F1B] cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                                    </button>
                                </div>
                            </div>
                            <input
                                id="sim-weekly"
                                type="range"
                                min={5}
                                max={40}
                                step={1}
                                value={sessionsPerWeek}
                                onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
                                className="w-full cursor-pointer"
                            />
                            <div className="font-tech-mono text-[11px] text-[#4B5B56]">
                                Volume mensal estimado: {result.monthlySessions.toLocaleString('pt-BR')} sessões/mês
                            </div>
                        </div>

                        {/* Valor médio por sessão */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <label htmlFor="sim-value" className="text-sm font-medium text-[#0F1F1B]">
                                    Valor médio por sessão
                                </label>
                                <span className="font-tech-mono text-sm font-semibold text-[#0F1F1B]">
                                    {formatBRL(avgSessionValue)}
                                </span>
                            </div>
                            <input
                                id="sim-value"
                                type="range"
                                min={60}
                                max={350}
                                step={10}
                                value={avgSessionValue}
                                onChange={(e) => setAvgSessionValue(Number(e.target.value))}
                                className="w-full cursor-pointer"
                            />
                        </div>

                        {/* Ganho de ocupação na agenda e Convênios TISS */}
                        <div className="pt-4 border-t border-[#E6E8E5] grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs font-medium text-[#4B5B56] mb-2">
                                    Ganho de ocupação (WhatsApp + fila)
                                </div>
                                <div className="inline-flex rounded-md border border-[#E6E8E5] bg-[#FAFAF8] p-1 gap-1">
                                    {[5, 8, 12].map((pct) => (
                                        <button
                                            key={pct}
                                            type="button"
                                            onClick={() => setOccupancyGainPercent(pct)}
                                            className={`min-h-[40px] px-3.5 rounded-md font-tech-mono text-xs font-semibold transition-colors cursor-pointer ${
                                                occupancyGainPercent === pct
                                                    ? 'bg-[#155E4B] text-white'
                                                    : 'text-[#4B5B56] hover:text-[#0F1F1B]'
                                            }`}
                                        >
                                            +{pct}%
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="text-xs font-medium text-[#4B5B56] mb-2">
                                    Atende convênios TISS
                                </div>
                                <div className="inline-flex rounded-md border border-[#E6E8E5] bg-[#FAFAF8] p-1 gap-1">
                                    {[
                                        { val: true, label: 'Sim' },
                                        { val: false, label: 'Não' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.label}
                                            type="button"
                                            onClick={() => setUsesTiss(opt.val)}
                                            className={`min-h-[40px] px-4 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                                                usesTiss === opt.val
                                                    ? 'bg-[#155E4B] text-white'
                                                    : 'text-[#4B5B56] hover:text-[#0F1F1B]'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Painel de leitura executiva (#EBF4F0) */}
                    <div className="lg:col-span-5 rounded-xl border border-[#C8DFD6] bg-[#EBF4F0] p-6 sm:p-8 flex flex-col justify-between text-[#0F1F1B]">
                        <div className="space-y-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="font-tech-mono text-[11px] uppercase tracking-wider text-[#114D3E] font-medium">
                                        Tempo devolvido à equipe
                                    </div>
                                    <div className="mt-1.5 font-tech-mono text-2xl font-semibold text-[#0F1F1B] flex items-baseline gap-1.5">
                                        <Clock className="w-4 h-4 text-[#155E4B] self-center" strokeWidth={1.75} />
                                        <span>{result.hoursSavedPerMonth}h</span>
                                        <span className="text-xs font-normal text-[#4B5B56]">/ mês</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-tech-mono text-[11px] uppercase tracking-wider text-[#114D3E] font-medium">
                                        Volume organizado
                                    </div>
                                    <div className="mt-1.5 font-tech-mono text-lg font-semibold text-[#0F1F1B]">
                                        {result.monthlySessions.toLocaleString('pt-BR')}
                                        <span className="text-xs font-normal text-[#4B5B56]"> sessões</span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-[#C8DFD6] bg-white p-5">
                                <div className="font-tech-mono text-[11px] uppercase tracking-wider text-[#155E4B] font-semibold">
                                    {SIMULATOR_CONTENT.recoveryLabel} (+{occupancyGainPercent}% ocupação)
                                </div>
                                <div className="mt-1.5 font-tech-mono text-3xl sm:text-4xl font-semibold text-[#0F1F1B]">
                                    {formatBRL(result.monthlyGain)}
                                    <span className="text-sm font-normal text-[#4B5B56]"> / mês</span>
                                </div>
                                <div className="mt-1.5 font-tech-mono text-xs text-[#4B5B56]">
                                    Projeção anual de capacidade: {formatBRL(result.annualGain)}
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#C8DFD6] text-sm">
                                <span className="text-[#4B5B56]">Plano recomendado</span>
                                <span className="font-tech-mono font-semibold text-[#114D3E]">
                                    {result.recommendedPlanName} · {formatBRL(result.monthlyPlanCost)}/mês
                                </span>
                            </div>
                        </div>

                        <div className="mt-7 space-y-3">
                            <Link
                                href={SIMULATOR_CONTENT.ctaHref}
                                className="w-full min-h-[48px] px-5 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 group"
                            >
                                {SIMULATOR_CONTENT.ctaLabel}
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
                            </Link>
                            <p className="text-[11px] text-[#4B5B56] leading-relaxed">
                                {SIMULATOR_CONTENT.disclaimer}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
