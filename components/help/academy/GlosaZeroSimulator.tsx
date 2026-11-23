'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Clock,
    FileCheck2,
    FileCode2,
    FileText,
    MessageSquareQuote,
    RotateCcw,
    ScanFace,
    ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GlosaZeroSimulatorProps {
    canOpenTissRoute: boolean
    showFounderScript: boolean
}

const SIM_STEPS = [
    {
        step: 1,
        short: '1. Escudo (Ctrl+L)',
        title: 'Escudo Anti-Glosa antes do faturamento',
        founderCue:
            'Fale ao cliente: "Antes de enviar uma única guia para a operadora, o CliniGo acende 4 travas: carteirinha, senha, biometria facial e evolução assinada. Só libera com Ctrl+L quando está 100% blindado."',
    },
    {
        step: 2,
        short: '2. Remessa XML',
        title: 'Fechamento de Remessa XML TISS-ANS',
        founderCue:
            'Fale ao cliente: "Com as contas liberadas, em 1 clique você fecha o lote da competência e baixa o XML padrão ANS validado para subir no portal da operadora."',
    },
    {
        step: 3,
        short: '3. Glosa 3 Níveis',
        title: 'Conferência de Retorno e Classificação ANS',
        founderCue:
            'Fale ao cliente: "Quando o convênio paga com glosa, o sistema abre em 3 níveis (Remessa > Conta > Item) já com o código da Tabela 38 da ANS para você separar o que é recuperável do que não é."',
    },
    {
        step: 4,
        short: '4. Dossiê 1-Clique',
        title: 'Dossiê Probatório Automático e Recuperação',
        founderCue:
            'Fale ao cliente: "Aqui é onde sua clínica para de perder dinheiro: em 1 clique o CliniGo junta espelho da guia + biometria facial + evolução assinada no recurso. O valor volta para o caixa e para o repasse."',
    },
]

export function GlosaZeroSimulator({
    canOpenTissRoute,
    showFounderScript,
}: GlosaZeroSimulatorProps) {
    const [activeStep, setActiveStep] = useState<number>(1)
    const [step1AuthFixed, setStep1AuthFixed] = useState(false)
    const [step1Released, setStep1Released] = useState(false)
    const [step2XmlGenerated, setStep2XmlGenerated] = useState(false)
    const [step3Classified, setStep3Classified] = useState<'recuperavel' | 'irrecuperavel' | null>(null)
    const [step4Recovered, setStep4Recovered] = useState(false)

    const handleReset = () => {
        setActiveStep(1)
        setStep1AuthFixed(false)
        setStep1Released(false)
        setStep2XmlGenerated(false)
        setStep3Classified(null)
        setStep4Recovered(false)
    }

    const currentMeta = SIM_STEPS[activeStep - 1]

    return (
        <section className="rounded-xl border border-[#155E4B]/25 bg-white p-5 sm:p-6 space-y-5 shadow-sm">
            {/* Cabeçalho do Simulador */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#155E4B]">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>Simulador Prático Interativo (Dados Fictícios)</span>
                    </div>
                    <h2 className="text-xl font-bold text-[#0F1F1B] tracking-tight">
                        Simulador Glosa Zero — Do Atendimento ao Recurso Pago
                    </h2>
                    <p className="text-sm text-[#4B5B56] max-w-3xl leading-relaxed">
                        Clique livremente nos 4 passos abaixo para testar na prática como o CliniGo evita glosas e monta o Dossiê Probatório sem alterar nenhum dado real da clínica.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        className="min-h-[44px] sm:min-h-[38px] px-3.5 gap-1.5 text-xs font-medium rounded-md shadow-none"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reiniciar Simulação
                    </Button>
                    {canOpenTissRoute && (
                        <Button
                            asChild
                            className="min-h-[44px] sm:min-h-[38px] px-3.5 gap-1.5 text-xs font-semibold rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white shadow-none"
                        >
                            <Link href="/dashboard/tiss/glosas" prefetch={false}>
                                Abrir Glosas Reais
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            {/* Navegação livre dos 4 passos (nunca trava!) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {SIM_STEPS.map((item) => {
                    const isActive = activeStep === item.step
                    const isDone =
                        (item.step === 1 && step1Released) ||
                        (item.step === 2 && step2XmlGenerated) ||
                        (item.step === 3 && step3Classified !== null) ||
                        (item.step === 4 && step4Recovered)
                    return (
                        <button
                            key={item.step}
                            type="button"
                            onClick={() => setActiveStep(item.step)}
                            className={`min-h-[48px] px-3 py-2.5 rounded-lg border text-left transition-all flex items-center justify-between gap-2 ${
                                isActive
                                    ? 'border-[#155E4B] bg-[#155E4B] text-white'
                                    : isDone
                                      ? 'border-[#155E4B]/35 bg-[#E8F2EE]/70 text-[#0F1F1B] hover:border-[#155E4B]'
                                      : 'border-[#E6E8E5] bg-[#FAFAF8] text-[#354540] hover:border-[#155E4B]/40'
                            }`}
                        >
                            <span className="text-xs font-semibold truncate">{item.short}</span>
                            {isDone && (
                                <CheckCircle2
                                    className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#155E4B]'}`}
                                />
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Área Interativa do Passo Atual */}
            <div className="rounded-xl border border-[#E6E8E5] bg-[#FAFAF8] p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6E8E5] pb-3">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#155E4B]">
                            Caso Fictício: Lucas M. • Sessão Terapia ABA • Operadora Exemplo Saúde
                        </p>
                        <h3 className="text-base font-semibold text-[#0F1F1B] mt-0.5">
                            {currentMeta.title}
                        </h3>
                    </div>
                    <span className="text-sm font-bold text-[#0F1F1B] bg-white border border-[#E6E8E5] px-3 py-1 rounded-md tabular-nums">
                        Guia #2026-0841 • R$ 180,00
                    </span>
                </div>

                {/* PASSO 1 */}
                {activeStep === 1 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            {[
                                { label: 'Carteirinha Ativa', detail: '0042.9918.2201-0', ok: true },
                                { label: 'Check-in Facial', detail: 'Validado 13:57 (98,4%)', ok: true },
                                { label: 'Evolução ABA', detail: 'Assinada Lei 14.063', ok: true },
                                {
                                    label: 'Senha Autorização',
                                    detail: step1AuthFixed ? 'Senha #884120 válida' : 'Pendente na guia',
                                    ok: step1AuthFixed,
                                },
                            ].map((check) => (
                                <div
                                    key={check.label}
                                    className={`rounded-lg border p-3 space-y-1 ${
                                        check.ok
                                            ? 'bg-white border-[#155E4B]/30'
                                            : 'bg-amber-50 border-amber-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F1F1B]">
                                        {check.ok ? (
                                            <CheckCircle2 className="w-4 h-4 text-[#155E4B] shrink-0" />
                                        ) : (
                                            <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                                        )}
                                        <span>{check.label}</span>
                                    </div>
                                    <p className="text-[11px] text-[#4B5B56]">{check.detail}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            {!step1AuthFixed ? (
                                <Button
                                    type="button"
                                    onClick={() => setStep1AuthFixed(true)}
                                    className="min-h-[44px] px-4 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                                >
                                    Informar Senha de Autorização #884120
                                </Button>
                            ) : !step1Released ? (
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setStep1Released(true)
                                        setActiveStep(2)
                                    }}
                                    className="min-h-[44px] px-4 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold gap-2"
                                >
                                    <ShieldCheck className="w-4 h-4" />
                                    Encerrar e Liberar Conta (Ctrl+L)
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={() => setActiveStep(2)}
                                    className="min-h-[44px] px-4 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold gap-2"
                                >
                                    Conta já liberada — Avançar para Remessa XML
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* PASSO 2 */}
                {activeStep === 2 && (
                    <div className="space-y-4">
                        <div className="bg-white border border-[#E6E8E5] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-[#0F1F1B]">
                                    Lote Competência 11/2026 — Operadora Exemplo Saúde
                                </p>
                                <p className="text-xs text-[#4B5B56]">
                                    1 conta liberada vinculada • Estrutura TISS-ANS 4.01.00 • Hash automático
                                </p>
                                {step2XmlGenerated && (
                                    <p className="text-xs font-semibold text-[#155E4B] pt-1">
                                        XML ENVIO_LOTE_GUIAS gerado com sucesso • Protocolo ANS-2026-99142
                                    </p>
                                )}
                            </div>
                            <Button
                                type="button"
                                onClick={() => {
                                    setStep2XmlGenerated(true)
                                    setActiveStep(3)
                                }}
                                className="min-h-[44px] px-4 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold gap-2 shrink-0"
                            >
                                <FileCode2 className="w-4 h-4" />
                                {step2XmlGenerated ? 'Ir para Retorno com Glosa' : 'Fechar Remessa e Gerar XML ANS'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* PASSO 3 */}
                {activeStep === 3 && (
                    <div className="space-y-4">
                        <div className="bg-white border border-red-200 rounded-lg p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="inline-flex items-center gap-2 text-xs font-semibold text-red-700">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>Retorno da Operadora: Glosa no Nível 3 (Item da Conta)</span>
                                </div>
                                <span className="text-xs font-mono bg-red-50 text-red-700 px-2 py-0.5 rounded">
                                    Tabela 38 ANS • Código 1705
                                </span>
                            </div>
                            <p className="text-xs text-[#354540] leading-relaxed">
                                Motivo informado pela operadora: <strong>&quot;Ausência de comprovação de presença na sessão terapêutica&quot;</strong> — Valor glosado: <strong className="tabular-nums">R$ 180,00</strong>.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setStep3Classified('recuperavel')
                                        setActiveStep(4)
                                    }}
                                    className="min-h-[44px] px-4 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Classificar como Recuperável e Abrir Dossiê
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep3Classified('irrecuperavel')}
                                    className="min-h-[44px] px-4 rounded-md text-xs font-medium shadow-none"
                                >
                                    Marcar como Irrecuperável (Perda Contábil)
                                </Button>
                            </div>
                            {step3Classified === 'irrecuperavel' && (
                                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2.5">
                                    Como a clínica possui Check-in Biométrico e Evolução Assinada, esta glosa é <strong>100% recuperável</strong>. Clique em &quot;Classificar como Recuperável&quot; para ver o Dossiê em 1 Clique.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* PASSO 4 */}
                {activeStep === 4 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {[
                                {
                                    icon: FileCheck2,
                                    title: '1. Espelho da Guia TISS',
                                    desc: 'Guia #2026-0841 + Senha #884120 + TUSS validado',
                                },
                                {
                                    icon: ScanFace,
                                    title: '2. Prova Biométrica Facial',
                                    desc: 'Check-in na recepção às 13:57 com 98,4% de confiança',
                                },
                                {
                                    icon: FileText,
                                    title: '3. Evolução ABA Assinada',
                                    desc: 'Prontuário assinado eletronicamente (Lei 14.063/2020)',
                                },
                            ].map((proof) => {
                                const ProofIcon = proof.icon
                                return (
                                    <div
                                        key={proof.title}
                                        className={`rounded-lg border p-3.5 space-y-1.5 transition-all ${
                                            step4Recovered
                                                ? 'bg-[#E8F2EE]/75 border-[#155E4B]/35'
                                                : 'bg-white border-[#E6E8E5]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 text-xs font-semibold text-[#0F1F1B]">
                                            <ProofIcon className="w-4 h-4 text-[#155E4B] shrink-0" />
                                            <span>{proof.title}</span>
                                        </div>
                                        <p className="text-[11px] text-[#4B5B56] leading-relaxed">{proof.desc}</p>
                                    </div>
                                )
                            })}
                        </div>

                        {step4Recovered ? (
                            <div className="rounded-lg border border-[#155E4B]/30 bg-[#E8F2EE] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-[#0F1F1B] inline-flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-[#155E4B]" />
                                        Recurso Deferido — R$ 180,00 Recuperados para o Caixa
                                    </p>
                                    <p className="text-xs text-[#354540]">
                                        O Dossiê Probatório e o XML de Recurso ANS foram gerados em 1 clique e a liquidação já atualiza o repasse da terapeuta.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleReset}
                                    className="min-h-[44px] sm:min-h-[38px] px-3.5 text-xs font-medium bg-white shrink-0"
                                >
                                    Testar novamente
                                </Button>
                            </div>
                        ) : (
                            <Button
                                type="button"
                                onClick={() => setStep4Recovered(true)}
                                className="min-h-[44px] px-5 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold gap-2"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                Compilar Dossiê Probatório em 1 Clique e Gerar Recurso ANS
                            </Button>
                        )}
                    </div>
                )}

                {/* Dica de fala exclusiva para SUPER_ADMIN no Modo Roteiro de Demo */}
                {showFounderScript && (
                    <div className="rounded-lg border border-[#155E4B]/30 bg-[#F2F7F5] p-3.5 flex items-start gap-2.5">
                        <MessageSquareQuote className="w-4 h-4 text-[#155E4B] shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs text-[#0F1F1B]">
                            <p className="font-semibold uppercase tracking-wider text-[10px] text-[#155E4B]">
                                Roteiro de Demo (Exclusivo Super Admin)
                            </p>
                            <p className="leading-relaxed">{currentMeta.founderCue}</p>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}

