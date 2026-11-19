'use client'

import { useState, type KeyboardEvent } from 'react'
import {
    Activity,
    AlertTriangle,
    Camera,
    Check,
    ClipboardCheck,
    Coins,
    FileCheck2,
    FileSignature,
    QrCode,
    ScanFace,
    ShieldCheck,
    Smartphone,
    Tablet,
} from 'lucide-react'
import { DAY_IN_LIFE_CONTENT, MOCKUP_DISCLAIMER, type DayStepId } from './content'

function StageMockup({ stepId }: { stepId: DayStepId }) {
    const [bioSurface, setBioSurface] = useState<'tablet' | 'webcam' | 'mobile'>('tablet')

    return (
        <div className="rounded-xl border border-[#E6E8E5] bg-white shadow-[0_14px_40px_-28px_rgba(15,31,27,0.16)] overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-[#E6E8E5] bg-[#FAFAF8] flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                    <span className="w-2 h-2 rounded-full bg-[#D5DAD7]" />
                    <span className="w-2 h-2 rounded-full bg-[#D5DAD7]" />
                    <span className="w-2 h-2 rounded-full bg-[#D5DAD7]" />
                </div>
                <span className="font-tech-mono text-[11px] text-[#114D3E] font-medium">
                    {stepId === 'pre-sessao' && 'Pré-cadastro e Termo · Lei 14.063/2020'}
                    {stepId === 'chegada' && 'Check-in Biométrico Multi-superfície'}
                    {stepId === 'sessao' && 'Prontuário e Plano Terapêutico'}
                    {stepId === 'gestao' && 'BI de Terapia e Conformidade'}
                    {stepId === 'fechamento' && 'Convênios TISS e Repasse Individual'}
                </span>
            </div>

            <div className="p-5 sm:p-7 min-h-[380px] flex flex-col justify-between">
                {stepId === 'pre-sessao' && (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                        <div className="sm:col-span-6 rounded-xl border border-[#E6E8E5] bg-[#FAFAF8] p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F1F1B]">
                                    <Smartphone className="w-4 h-4 text-[#155E4B]" strokeWidth={1.75} />
                                    Link enviado à família
                                </span>
                                <span className="font-tech-mono text-[10px] px-2 py-0.5 rounded bg-[#E6F2EE] text-[#114D3E]">
                                    Sem login
                                </span>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="rounded-md bg-white border border-[#E6E8E5] px-3 py-2 flex justify-between">
                                    <span className="text-[#4B5B56]">Ficha do paciente</span>
                                    <span className="font-medium text-[#114D3E]">Preenchida</span>
                                </div>
                                <div className="rounded-md bg-white border border-[#E6E8E5] px-3 py-2 flex justify-between">
                                    <span className="text-[#4B5B56]">Foto da carteirinha</span>
                                    <span className="font-medium text-[#114D3E]">Anexada</span>
                                </div>
                            </div>
                            <div className="rounded-md bg-white border border-dashed border-[#155E4B]/50 p-3">
                                <div className="text-[11px] text-[#4B5B56] mb-1.5">Assinatura na tela do celular</div>
                                <svg
                                    viewBox="0 0 220 44"
                                    className="w-full h-9 text-[#0F1F1B]"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M12 30 C 32 8, 48 36, 68 20 C 84 8, 96 34, 118 24 C 138 14, 152 30, 178 18 C 190 12, 200 22, 208 20"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>
                        </div>

                        <div className="sm:col-span-6 space-y-3">
                            <div className="rounded-lg border border-[#E6E8E5] bg-white p-4">
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#0F1F1B]">
                                    <QrCode className="w-4 h-4 text-[#155E4B]" strokeWidth={1.75} />
                                    QR Code ou link direto
                                </div>
                                <p className="mt-1.5 text-xs text-[#4B5B56] leading-relaxed">
                                    A família envia dados e documentos antes da primeira sessão, eliminando espera na recepção.
                                </p>
                            </div>
                            <div className="rounded-lg border border-[#C8DFD6] bg-[#E6F2EE]/60 p-4 space-y-1.5">
                                <div className="text-xs font-semibold text-[#114D3E]">Evidência eletrônica gerada</div>
                                <div className="font-tech-mono text-[11px] text-[#0F1F1B]">
                                    Lei 14.063/2020 · Carimbo UTC
                                </div>
                                <div className="font-tech-mono text-[11px] text-[#4B5B56] break-all">
                                    SHA-256: 9f4c8e2b...d10a74e1
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {stepId === 'chegada' && (
                    <div className="space-y-5">
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'tablet' as const, label: 'Dispositivo na sala', icon: Tablet },
                                { id: 'webcam' as const, label: 'Webcam da terapeuta', icon: Camera },
                                { id: 'mobile' as const, label: 'Link temporário no celular', icon: Smartphone },
                            ].map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setBioSurface(id)}
                                    className={`min-h-[40px] px-3 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                        bioSurface === id
                                            ? 'bg-[#155E4B] border-[#155E4B] text-white'
                                            : 'bg-[#FAFAF8] border-[#E6E8E5] text-[#4B5B56] hover:text-[#0F1F1B]'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                            <div className="sm:col-span-5 rounded-xl bg-[#0D1F1B] p-6 text-white flex flex-col items-center justify-center min-h-[190px]">
                                <ScanFace className="w-14 h-14 text-[#7CD4B6]" strokeWidth={1.4} />
                                <span className="mt-3 font-tech-mono text-[11px] text-[#A8E0CC]">
                                    Validação facial concluída
                                </span>
                                <span className="mt-1 text-[11px] text-[#8DA89F]">
                                    {bioSurface === 'tablet' && 'Tablet pareado · Sala 02'}
                                    {bioSurface === 'webcam' && 'Estação da terapeuta'}
                                    {bioSurface === 'mobile' && 'Token temporário · Sem logout'}
                                </span>
                            </div>

                            <div className="sm:col-span-7 space-y-2.5 text-xs">
                                {[
                                    ['Presença registrada', 'Paciente ou responsável validado'],
                                    ['Sessão do computador', 'Mantida ativa sem interrupção'],
                                    ['Dupla comprovação', 'Vinculada ao prontuário e ao TISS'],
                                ].map(([k, v]) => (
                                    <div
                                        key={k}
                                        className="rounded-lg border border-[#E6E8E5] bg-[#FAFAF8] px-4 py-3 flex items-center justify-between gap-2"
                                    >
                                        <span className="text-[#4B5B56]">{k}</span>
                                        <span className="font-semibold text-[#0F1F1B] text-right">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {stepId === 'sessao' && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E6E8E5]">
                            <div>
                                <div className="text-sm font-semibold text-[#0F1F1B]">
                                    Evolução Clínica · Lucas M. (ABA)
                                </div>
                                <div className="font-tech-mono text-[11px] text-[#4B5B56]">
                                    Sessão 18 · 50 min · Comparativo com Sessão 17
                                </div>
                            </div>
                            <span className="px-2.5 py-1 rounded bg-[#E6F2EE] text-[#114D3E] font-tech-mono text-[11px] font-medium">
                                CRP / CRFa / CREFITO
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-lg border border-[#E6E8E5] bg-[#FAFAF8] p-3.5">
                                <div className="font-tech-mono text-[11px] text-[#155E4B] font-semibold">
                                    PAR01 · Pareamento
                                </div>
                                <div className="mt-1 text-xs text-[#0F1F1B] font-medium">
                                    Sessão anterior: 72% · Hoje: 88%
                                </div>
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                    <span className="px-2 py-0.5 rounded bg-[#155E4B] text-white text-[10px] font-medium">
                                        Independente
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-white border border-[#E6E8E5] text-[#4B5B56] text-[10px]">
                                        Dica gestual
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-lg border border-[#E6E8E5] bg-[#FAFAF8] p-3.5">
                                <div className="font-tech-mono text-[11px] text-[#155E4B] font-semibold">
                                    COM03 · Mando funcional
                                </div>
                                <div className="mt-1 text-xs text-[#0F1F1B] font-medium">
                                    8 de 10 respostas com dica leve
                                </div>
                                <div className="mt-2.5 h-1.5 rounded-full bg-[#E6E8E5] overflow-hidden">
                                    <div className="h-full w-4/5 bg-[#155E4B] rounded-full" />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-[#C8DFD6] bg-[#E6F2EE]/60 px-4 py-3 flex items-center justify-between gap-2 text-xs">
                            <span className="inline-flex items-center gap-2 font-medium text-[#114D3E]">
                                <FileSignature className="w-4 h-4" strokeWidth={1.75} />
                                Assinado digitalmente com registro de conselho profissional
                            </span>
                            <Check className="w-4 h-4 text-[#155E4B] shrink-0" strokeWidth={2} />
                        </div>
                    </div>
                )}

                {stepId === 'gestao' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {[
                                { label: 'Retenção', val: 'Ativa', icon: Activity },
                                { label: 'Risco evasão', val: '14+ dias', icon: AlertTriangle },
                                { label: 'Conformidade', val: '96%', icon: ClipboardCheck },
                                { label: 'Fila espera', val: 'Por área', icon: ShieldCheck },
                            ].map(({ label, val, icon: Icon }) => (
                                <div key={label} className="rounded-lg border border-[#E6E8E5] bg-[#FAFAF8] p-3">
                                    <Icon className="w-4 h-4 text-[#155E4B]" strokeWidth={1.75} />
                                    <div className="mt-2 text-[11px] text-[#4B5B56]">{label}</div>
                                    <div className="font-tech-mono text-sm font-semibold text-[#0F1F1B] mt-0.5">
                                        {val}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-lg border border-[#E6E8E5] bg-white p-4 space-y-2.5">
                            <div className="flex items-center justify-between text-xs font-semibold text-[#0F1F1B]">
                                <span>Conformidade de evoluções por disciplina</span>
                                <span className="font-tech-mono text-[#114D3E]">Auditoria diária</span>
                            </div>
                            {[
                                { area: 'ABA e Neurodesenvolvimento', ratio: '84/84', pct: 100 },
                                { area: 'Psicologia', ratio: '61/63', pct: 97 },
                                { area: 'Fonoaudiologia', ratio: '42/45', pct: 93 },
                            ].map((row) => (
                                <div key={row.area} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-[#4B5B56]">{row.area}</span>
                                        <span className="font-tech-mono font-medium text-[#0F1F1B]">
                                            {row.ratio} ({row.pct}%)
                                        </span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-[#F2F5F3] overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-[#155E4B]"
                                            style={{ width: `${row.pct}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {stepId === 'fechamento' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-lg border border-[#E6E8E5] bg-[#FAFAF8] p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F1F1B]">
                                    <FileCheck2 className="w-4 h-4 text-[#155E4B]" strokeWidth={1.75} />
                                    Lotes TISS e Glosas
                                </span>
                                <span className="font-tech-mono text-[10px] px-2 py-0.5 rounded bg-[#E6F2EE] text-[#114D3E]">
                                    ANS 4.01 / 4.02
                                </span>
                            </div>
                            <ul className="space-y-2 text-xs text-[#4B5B56]">
                                <li className="flex items-center gap-2">
                                    <Check className="w-3.5 h-3.5 text-[#155E4B] shrink-0" strokeWidth={2} />
                                    Validação XSD e conferência de saldo de guias
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-3.5 h-3.5 text-[#155E4B] shrink-0" strokeWidth={2} />
                                    Gestão de glosas, contestação e dossiê de recursos
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-3.5 h-3.5 text-[#155E4B] shrink-0" strokeWidth={2} />
                                    Dupla comprovação biométrica anexada
                                </li>
                            </ul>
                        </div>

                        <div className="rounded-lg border border-[#C8DFD6] bg-[#E6F2EE]/50 p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F1F1B]">
                                    <Coins className="w-4 h-4 text-[#155E4B]" strokeWidth={1.75} />
                                    Produção da Terapeuta
                                </span>
                                <span className="font-tech-mono text-[10px] text-[#114D3E]">Sigilo RBAC</span>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="rounded bg-white border border-[#D4E6DF] px-3 py-2 flex justify-between">
                                    <span className="text-[#4B5B56]">Sessões realizadas</span>
                                    <span className="font-tech-mono font-semibold text-[#0F1F1B]">64</span>
                                </div>
                                <div className="rounded bg-white border border-[#D4E6DF] px-3 py-2 flex justify-between">
                                    <span className="text-[#4B5B56]">Reposições válidas</span>
                                    <span className="font-tech-mono font-semibold text-[#0F1F1B]">6</span>
                                </div>
                                <div className="rounded bg-white border border-[#D4E6DF] px-3 py-2 flex justify-between">
                                    <span className="text-[#4B5B56]">Demonstrativo</span>
                                    <span className="font-tech-mono font-semibold text-[#114D3E]">
                                        Pronto para conferência
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 pt-3 border-t border-[#E6E8E5] flex items-center justify-between text-[11px] text-[#4B5B56]">
                    <span className="font-tech-mono">{MOCKUP_DISCLAIMER}</span>
                </div>
            </div>
        </div>
    )
}

export function DayInLifeSection() {
    const steps = DAY_IN_LIFE_CONTENT.steps
    const [activeIndex, setActiveIndex] = useState(0)
    const activeStep = steps[activeIndex]

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault()
            setActiveIndex((idx + 1) % steps.length)
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault()
            setActiveIndex((idx - 1 + steps.length) % steps.length)
        }
    }

    return (
        <section aria-label="Um dia inteiro no CliniGo" className="py-20 lg:py-28">
            <div className="max-w-7xl mx-auto px-5 sm:px-8">
                <div className="max-w-3xl">
                    <p className="font-tech-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#155E4B]">
                        {DAY_IN_LIFE_CONTENT.kicker}
                    </p>
                    <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-[-0.03em] leading-[1.08] text-[#0F1F1B]">
                        {DAY_IN_LIFE_CONTENT.headlineBefore}
                        <span className="font-serif-accent text-[#155E4B] font-normal text-[1.08em]">
                            {DAY_IN_LIFE_CONTENT.headlineAccent}
                        </span>
                        {DAY_IN_LIFE_CONTENT.headlineAfter}
                    </h2>
                    <p className="mt-3.5 text-base text-[#4B5B56] leading-relaxed">
                        {DAY_IN_LIFE_CONTENT.subtitle}
                    </p>
                </div>

                <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                    {/* Coluna esquerda: 5 etapas clicáveis com linha de progresso vertical */}
                    <div
                        role="tablist"
                        aria-label="Etapas do dia operacional no CliniGo"
                        className="lg:col-span-5 relative pl-6 space-y-2.5"
                    >
                        {/* Trilho vertical de progresso */}
                        <div
                            aria-hidden="true"
                            className="absolute left-2 top-3 bottom-3 w-px bg-[#E6E8E5]"
                        />
                        <div
                            aria-hidden="true"
                            className="absolute left-2 top-3 w-px bg-[#155E4B] transition-all duration-200"
                            style={{ height: `${((activeIndex + 1) / steps.length) * 100}%`, maxHeight: 'calc(100% - 24px)' }}
                        />

                        {steps.map((step, idx) => {
                            const selected = idx === activeIndex
                            return (
                                <button
                                    key={step.id}
                                    role="tab"
                                    type="button"
                                    id={`day-tab-${step.id}`}
                                    aria-selected={selected}
                                    aria-controls="day-stage-panel"
                                    onClick={() => setActiveIndex(idx)}
                                    onKeyDown={(e) => handleKeyDown(e, idx)}
                                    className={`relative w-full text-left rounded-lg border p-4 sm:p-5 transition-all duration-200 cursor-pointer ${
                                        selected
                                            ? 'bg-white border-[#155E4B] shadow-[0_8px_24px_-18px_rgba(21,94,75,0.28)]'
                                            : 'bg-transparent border-transparent hover:bg-white/70 hover:border-[#E6E8E5]'
                                    }`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`absolute -left-[21px] top-6 w-2.5 h-2.5 rounded-full border-2 transition-colors ${
                                            selected
                                                ? 'bg-[#155E4B] border-[#155E4B]'
                                                : idx < activeIndex
                                                    ? 'bg-[#E6F2EE] border-[#155E4B]'
                                                    : 'bg-[#FAFAF8] border-[#C7CFCB]'
                                        }`}
                                    />
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-tech-mono text-[11px] font-semibold text-[#155E4B]">
                                            {step.number} · {step.stage}
                                        </span>
                                        <span className="font-tech-mono text-[10px] px-2 py-0.5 rounded bg-[#F2F5F3] text-[#4B5B56]">
                                            {step.tag}
                                        </span>
                                    </div>
                                    <h3 className="mt-1.5 text-sm sm:text-base font-semibold text-[#0F1F1B]">
                                        {step.title}
                                    </h3>
                                    <p
                                        className={`mt-1.5 text-xs sm:text-sm leading-relaxed ${
                                            selected ? 'text-[#4B5B56]' : 'text-[#6A7974]'
                                        }`}
                                    >
                                        {step.description}
                                    </p>
                                </button>
                            )
                        })}
                    </div>

                    {/* Coluna direita: painel sticky interativo */}
                    <div
                        id="day-stage-panel"
                        role="tabpanel"
                        aria-labelledby={`day-tab-${activeStep.id}`}
                        className="lg:col-span-7 lg:sticky lg:top-24"
                    >
                        <StageMockup stepId={activeStep.id} />
                    </div>
                </div>
            </div>
        </section>
    )
}

