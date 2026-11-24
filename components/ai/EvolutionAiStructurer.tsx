'use client'

import React, { useState } from 'react'
import {
    AlertTriangle,
    CheckCircle2,
    Copy,
    Cpu,
    FileCheck2,
    Loader2,
    RefreshCw,
    ShieldCheck,
    X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface AntiGlosaCheckItem {
    id: string
    label: string
    status: 'ok' | 'atencao'
    hint: string
}

interface EvolutionAiStructurerProps {
    patientId?: string
    patientName?: string
    specialty: string
    defaultFormat: 'SOAP' | 'PSICOLOGICA' | 'TERAPEUTICA' | 'CIF'
    currentRawText: string
    structuredContext?: {
        estadosGerais?: string[]
        objetivos?: string[]
        limitador?: string
        proximaMeta?: string
        orientacaoFamilia?: string
    }
    disabled?: boolean
    onApplyText: (structuredText: string, suggestedConduct?: string) => void
}

const FORMAT_OPTIONS: Array<{ id: 'SOAP' | 'PSICOLOGICA' | 'TERAPEUTICA' | 'CIF'; label: string }> = [
    { id: 'TERAPEUTICA', label: 'Terapia / ABA' },
    { id: 'SOAP', label: 'Padrão SOAP' },
    { id: 'PSICOLOGICA', label: 'Psicologia (CRP)' },
    { id: 'CIF', label: 'Eixos CIF' },
]

export function EvolutionAiStructurer({
    patientId,
    patientName,
    specialty,
    defaultFormat,
    currentRawText,
    structuredContext,
    disabled = false,
    onApplyText,
}: EvolutionAiStructurerProps) {
    const [open, setOpen] = useState(false)
    const [format, setFormat] = useState<'SOAP' | 'PSICOLOGICA' | 'TERAPEUTICA' | 'CIF'>(
        defaultFormat
    )
    const [quickTopics, setQuickTopics] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{
        structuredText: string
        suggestedConduct: string
        antiGlosaChecklist: AntiGlosaCheckItem[]
        antiGlosaScorePct: number
        latencyMs: number
        disclaimer: string
    } | null>(null)

    const handleStructure = async () => {
        const combinedRaw = [currentRawText?.trim(), quickTopics.trim()].filter(Boolean).join('\n')
        if (combinedRaw.length < 8 && !structuredContext) {
            toast.error('Digite ao menos alguns tópicos rápidos da sessão antes de estruturar.')
            return
        }

        try {
            setLoading(true)
            const res = await fetch('/api/ai/structure-evolution', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientId,
                    patientName,
                    specialty,
                    format,
                    rawNotes: combinedRaw,
                    structuredContext,
                }),
            })
            const json = await res.json()
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Não foi possível estruturar a evolução.')
            }
            setResult(json.data)
            toast.success('Evolução estruturada com Escudo LGPD. Revise antes de aplicar.')
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao estruturar evolução.')
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = async () => {
        if (!result?.structuredText) return
        try {
            await navigator.clipboard.writeText(result.structuredText)
            toast.success('Evolução copiada para a área de transferência.')
        } catch {
            toast.error('Não foi possível copiar o texto.')
        }
    }

    if (disabled) return null

    return (
        <div className="rounded-lg border border-[#C4E1D7] bg-[#FAFAF8] p-3.5 space-y-3 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#E6F2EE] text-[#155E4B] shrink-0">
                        <Cpu className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-semibold text-[#0F1F1B]">
                                Assistente CliniGo IA — Estruturador de Evolução + Check Anti-Glosa
                            </span>
                            <Badge
                                variant="outline"
                                className="text-[10px] border-[#C4E1D7] bg-white text-[#114D3E] gap-1"
                            >
                                <ShieldCheck className="w-3 h-3" />
                                Escudo LGPD
                            </Badge>
                        </div>
                        <p className="text-[11px] text-slate-600">
                            Transforme tópicos rápidos ou dados da sessão em evolução técnica auditável sem inventar fatos.
                        </p>
                    </div>
                </div>

                <Button
                    type="button"
                    size="sm"
                    variant={open ? 'outline' : 'default'}
                    onClick={() => setOpen((prev) => !prev)}
                    className={
                        open
                            ? 'h-9 min-h-[36px] text-xs shrink-0'
                            : 'h-9 min-h-[36px] text-xs bg-[#155E4B] hover:bg-[#0F493A] text-white shrink-0 gap-1.5'
                    }
                >
                    {open ? (
                        <>
                            <X className="w-3.5 h-3.5" />
                            Fechar Assistente
                        </>
                    ) : (
                        <>
                            <Cpu className="w-3.5 h-3.5" />
                            Estruturar com IA
                        </>
                    )}
                </Button>
            </div>

            {open && (
                <div className="space-y-3 pt-2 border-t border-[#DCE2DF]">
                    {/* Seletor de formato */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-medium text-slate-600 mr-1">Formato:</span>
                        {FORMAT_OPTIONS.map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setFormat(opt.id)}
                                className={`h-8 px-2.5 rounded-md text-xs font-medium border transition-colors ${
                                    format === opt.id
                                        ? 'bg-[#155E4B] text-white border-[#155E4B]'
                                        : 'bg-white text-slate-700 border-slate-200 hover:border-[#155E4B]/50'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="ai-quick-topics" className="text-[11px] text-slate-700">
                            Tópicos rápidos da sessão (opcional se você já escreveu acima ou marcou no Tatame)
                        </Label>
                        <Textarea
                            id="ai-quick-topics"
                            rows={2}
                            value={quickTopics}
                            onChange={(e) => setQuickTopics(e.target.value)}
                            placeholder="Ex.: chegou regulado, realizou circuito motor com ajuda gestual leve, manteve foco por 15 min, orientar rotina visual em casa..."
                            className="text-xs bg-white"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            disabled={loading}
                            onClick={handleStructure}
                            className="h-9 min-h-[38px] px-3.5 text-xs bg-[#155E4B] hover:bg-[#0F493A] text-white gap-1.5"
                        >
                            {loading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : result ? (
                                <RefreshCw className="w-3.5 h-3.5" />
                            ) : (
                                <Cpu className="w-3.5 h-3.5" />
                            )}
                            <span>
                                {loading
                                    ? 'Estruturando com Escudo LGPD...'
                                    : result
                                      ? 'Regerar Evolução'
                                      : 'Gerar Evolução Estruturada'}
                            </span>
                        </Button>
                        {quickTopics && (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setQuickTopics('')}
                                className="h-9 text-xs text-slate-500"
                            >
                                Limpar tópicos
                            </Button>
                        )}
                    </div>

                    {result && (
                        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-[#0F1F1B]">
                                    Rascunho Estruturado (Editável após aplicar)
                                </span>
                                <Badge
                                    variant="outline"
                                    className={`text-[11px] font-semibold ${
                                        result.antiGlosaScorePct >= 75
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                            : 'border-amber-200 bg-amber-50 text-amber-800'
                                    }`}
                                >
                                    Qualidade Anti-Glosa: {result.antiGlosaScorePct}%
                                </Badge>
                            </div>

                            <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed bg-slate-50 border border-slate-200 rounded-md p-3 max-h-[260px] overflow-y-auto">
                                {result.structuredText}
                            </pre>

                            {/* Checklist Anti-Glosa */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {result.antiGlosaChecklist.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`rounded-md border px-2.5 py-1.5 text-[11px] flex items-start gap-1.5 ${
                                            item.status === 'ok'
                                                ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                                                : 'border-amber-200 bg-amber-50/60 text-amber-900'
                                        }`}
                                    >
                                        {item.status === 'ok' ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            <div className="font-semibold">{item.label}</div>
                                            <div className="opacity-85">{item.hint}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                <p className="text-[10.5px] text-slate-500 max-w-md">
                                    {result.disclaimer}
                                </p>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCopy}
                                        className="h-9 text-xs gap-1"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        Copiar
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => {
                                            onApplyText(result.structuredText, result.suggestedConduct)
                                            toast.success('Texto aplicado no prontuário para sua revisão final.')
                                        }}
                                        className="h-9 text-xs bg-[#155E4B] hover:bg-[#0F493A] text-white gap-1.5"
                                    >
                                        <FileCheck2 className="w-3.5 h-3.5" />
                                        Aplicar no Prontuário
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

