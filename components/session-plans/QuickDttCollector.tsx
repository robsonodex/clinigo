'use client'

import React, { useState } from 'react'
import {
    Check,
    HandHelping,
    X,
    Undo2,
    RotateCcw,
    AlertTriangle,
    Plus,
    Minus,
    Target,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
    computeDttMetrics,
    INTERFERING_BEHAVIOR_PRESETS,
    PROMPT_LEVEL_OPTIONS,
    type DttRecord,
    type DttTrialEvent,
    type InterferingBehaviorEntry,
    type PromptLevel,
} from '@/lib/session-plans/learning-curve'

interface QuickDttCollectorProps {
    registroDesempenho: any[]
    onUpdateRegistro: (next: any[]) => void
    sessionInterfering: InterferingBehaviorEntry[]
    onUpdateSessionInterfering: (next: InterferingBehaviorEntry[]) => void
}

function normalizeDtt(raw?: Partial<DttRecord> | null): DttRecord {
    return {
        independent: Math.max(0, Number(raw?.independent) || 0),
        prompted: Math.max(0, Number(raw?.prompted) || 0),
        error: Math.max(0, Number(raw?.error) || 0),
        promptLevel: (raw?.promptLevel as PromptLevel) || 'independente',
        history: Array.isArray(raw?.history) ? [...raw!.history] : [],
        interfering: Array.isArray(raw?.interfering) ? [...raw!.interfering] : [],
    }
}

export function QuickDttCollector({
    registroDesempenho,
    onUpdateRegistro,
    sessionInterfering,
    onUpdateSessionInterfering,
}: QuickDttCollectorProps) {
    const [selectedInterferingType, setSelectedInterferingType] = useState<string>(
        INTERFERING_BEHAVIOR_PRESETS[0]
    )

    const applyTrial = (code: string, event: DttTrialEvent) => {
        const next = registroDesempenho.map((reg) => {
            if (reg.code !== code) return reg
            const current = normalizeDtt(reg.dtt)
            const updated: DttRecord = {
                ...current,
                independent: current.independent + (event === 'independent' ? 1 : 0),
                prompted: current.prompted + (event === 'prompted' ? 1 : 0),
                error: current.error + (event === 'error' ? 1 : 0),
                promptLevel:
                    event === 'prompted' && current.promptLevel === 'independente'
                        ? 'gestual'
                        : current.promptLevel,
                history: [...(current.history || []).slice(-99), event],
            }
            const metrics = computeDttMetrics(updated)
            return {
                ...reg,
                dtt: updated,
                resultado: metrics.formattedResult,
                assistencia: metrics.promptMeta.label,
                atingida: metrics.suggestedAchieved,
            }
        })
        onUpdateRegistro(next)
    }

    const undoLastTrial = (code: string) => {
        const next = registroDesempenho.map((reg) => {
            if (reg.code !== code) return reg
            const current = normalizeDtt(reg.dtt)
            const history = [...(current.history || [])]
            const last = history.pop()
            if (!last) return reg

            const updated: DttRecord = {
                ...current,
                independent: Math.max(0, current.independent - (last === 'independent' ? 1 : 0)),
                prompted: Math.max(0, current.prompted - (last === 'prompted' ? 1 : 0)),
                error: Math.max(0, current.error - (last === 'error' ? 1 : 0)),
                history,
            }
            const metrics = computeDttMetrics(updated)
            return {
                ...reg,
                dtt: updated,
                resultado: metrics.formattedResult,
                assistencia: metrics.promptMeta.label,
                atingida: metrics.totalTrials > 0 ? metrics.suggestedAchieved : reg.atingida,
            }
        })
        onUpdateRegistro(next)
    }

    const resetObjectiveTrials = (code: string) => {
        const next = registroDesempenho.map((reg) => {
            if (reg.code !== code) return reg
            const updated: DttRecord = {
                independent: 0,
                prompted: 0,
                error: 0,
                promptLevel: 'independente',
                history: [],
                interfering: [],
            }
            return {
                ...reg,
                dtt: updated,
                resultado: '',
                assistencia: 'Independente',
            }
        })
        onUpdateRegistro(next)
    }

    const changePromptLevel = (code: string, promptLevel: PromptLevel) => {
        const next = registroDesempenho.map((reg) => {
            if (reg.code !== code) return reg
            const current = normalizeDtt(reg.dtt)
            const updated: DttRecord = { ...current, promptLevel }
            const metrics = computeDttMetrics(updated)
            return {
                ...reg,
                dtt: updated,
                assistencia: metrics.promptMeta.label,
            }
        })
        onUpdateRegistro(next)
    }

    const adjustInterfering = (type: string, delta: number) => {
        const existing = sessionInterfering.find((e) => e.type === type)
        if (!existing && delta > 0) {
            onUpdateSessionInterfering([...sessionInterfering, { type, count: delta }])
            return
        }
        const next = sessionInterfering
            .map((e) => (e.type === type ? { ...e, count: Math.max(0, e.count + delta) } : e))
            .filter((e) => e.count > 0)
        onUpdateSessionInterfering(next)
    }

    const totalInterfering = sessionInterfering.reduce((acc, e) => acc + e.count, 0)

    return (
        <Card className="border-2 border-[#155E4B]/30 bg-[#FAFAF8] shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60 bg-white rounded-t-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#0F1F1B]">
                            <Target className="w-4 h-4 text-[#155E4B]" />
                            Modo Tatame · Coleta Rápida DTT / NET em 1 Toque
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            Toque a cada tentativa durante a sessão. O percentual de independência, o critério de domínio e os gráficos do PEI são atualizados automaticamente.
                        </CardDescription>
                    </div>
                    <Badge
                        variant="outline"
                        className="self-start sm:self-auto bg-[#E6F2EE] text-[#114D3E] border-[#C4E1D7] font-mono text-[11px]"
                    >
                        {registroDesempenho.length} objetivo(s) na sessão
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
                {registroDesempenho.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-white p-6 text-center text-xs text-muted-foreground">
                        Selecione os objetivos da sessão na <strong>Seção 2</strong> para liberar os botões de coleta rápida 1-toque.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {registroDesempenho.map((reg) => {
                            const dtt = normalizeDtt(reg.dtt)
                            const metrics = computeDttMetrics(dtt)

                            return (
                                <div
                                    key={reg.code}
                                    className="rounded-xl border border-border bg-white p-4 space-y-3.5 shadow-2xs"
                                >
                                    {/* Cabeçalho do objetivo */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <span className="font-mono text-xs font-semibold text-[#155E4B]">
                                                {reg.code}
                                            </span>
                                            <h4 className="text-sm font-semibold text-[#0F1F1B] leading-snug">
                                                {reg.title}
                                            </h4>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                                            <Badge
                                                variant="outline"
                                                className={`font-mono text-xs px-2.5 py-1 ${
                                                    metrics.totalTrials === 0
                                                        ? 'bg-slate-50 text-slate-600'
                                                        : metrics.pctIndependent >= 80
                                                          ? 'bg-[#E6F2EE] text-[#114D3E] border-[#C4E1D7]'
                                                          : metrics.pctIndependent >= 50
                                                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                            : 'bg-rose-50 text-rose-800 border-rose-200'
                                                }`}
                                            >
                                                {metrics.totalTrials > 0
                                                    ? `${metrics.independent}/${metrics.totalTrials} · ${metrics.pctIndependent}% indep.`
                                                    : '0 tentativas'}
                                            </Badge>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={!dtt.history || dtt.history.length === 0}
                                                onClick={() => undoLastTrial(reg.code)}
                                                className="h-9 px-2.5 text-xs gap-1"
                                                title="Desfazer último toque"
                                            >
                                                <Undo2 className="w-3.5 h-3.5" />
                                                Desfazer
                                            </Button>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={metrics.totalTrials === 0}
                                                        className="h-9 px-2.5 text-xs gap-1 text-muted-foreground hover:text-destructive"
                                                        title="Zerar tentativas deste objetivo"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                        Zerar
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>
                                                            Zerar tentativas de {reg.code}?
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Todas as {metrics.totalTrials} tentativa(s) registradas para este objetivo nesta sessão serão limpas. Esta ação não pode ser desfeita.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => resetObjectiveTrials(reg.code)}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            Confirmar e zerar
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>

                                    {/* 3 Botões Táteis Grandes (min 52px para uso no tatame/tablet/celular) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => applyTrial(reg.code, 'independent')}
                                            className="min-h-[54px] px-4 rounded-lg bg-[#155E4B] hover:bg-[#0F493A] active:scale-[0.985] text-white font-semibold text-sm flex items-center justify-between transition-all cursor-pointer"
                                        >
                                            <span className="inline-flex items-center gap-2">
                                                <Check className="w-4 h-4" strokeWidth={2.4} />
                                                + Independente
                                            </span>
                                            <span className="font-mono text-base bg-white/15 px-2.5 py-0.5 rounded">
                                                {dtt.independent}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => applyTrial(reg.code, 'prompted')}
                                            className="min-h-[54px] px-4 rounded-lg border-2 border-amber-300 bg-amber-50 hover:bg-amber-100/80 active:scale-[0.985] text-amber-950 font-semibold text-sm flex items-center justify-between transition-all cursor-pointer"
                                        >
                                            <span className="inline-flex items-center gap-2">
                                                <HandHelping className="w-4 h-4 text-amber-700" strokeWidth={2} />
                                                A · Com Ajuda
                                            </span>
                                            <span className="font-mono text-base bg-amber-200/70 text-amber-950 px-2.5 py-0.5 rounded">
                                                {dtt.prompted}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => applyTrial(reg.code, 'error')}
                                            className="min-h-[54px] px-4 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 active:scale-[0.985] text-slate-800 font-semibold text-sm flex items-center justify-between transition-all cursor-pointer"
                                        >
                                            <span className="inline-flex items-center gap-2">
                                                <X className="w-4 h-4 text-rose-600" strokeWidth={2.2} />
                                                − Erro / Sem Resp.
                                            </span>
                                            <span className="font-mono text-base bg-slate-200/80 text-slate-900 px-2.5 py-0.5 rounded">
                                                {dtt.error}
                                            </span>
                                        </button>
                                    </div>

                                    {/* Seletor rápido de nível de dica (Prompt Fading) */}
                                    <div className="pt-2 border-t border-border/50 flex flex-wrap items-center gap-1.5">
                                        <span className="text-[11px] font-medium text-muted-foreground mr-1">
                                            Nível de dica predominante:
                                        </span>
                                        {PROMPT_LEVEL_OPTIONS.map((opt) => {
                                            const active = dtt.promptLevel === opt.value
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => changePromptLevel(reg.code, opt.value)}
                                                    className={`min-h-[32px] px-2.5 rounded-md border text-[11px] font-medium transition-colors cursor-pointer ${
                                                        active
                                                            ? 'bg-[#0F1F1B] border-[#0F1F1B] text-white'
                                                            : 'bg-[#FAFAF8] border-border text-muted-foreground hover:text-foreground'
                                                    }`}
                                                >
                                                    {opt.shortLabel}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* Trilha visual das últimas 10 tentativas */}
                                    {dtt.history && dtt.history.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1 pt-1">
                                            <span className="text-[10px] text-muted-foreground mr-1">
                                                Sequência:
                                            </span>
                                            {dtt.history.slice(-15).map((ev, i) => (
                                                <span
                                                    key={`${reg.code}-h-${i}`}
                                                    className={`w-5 h-5 rounded text-[10px] font-mono font-semibold inline-flex items-center justify-center ${
                                                        ev === 'independent'
                                                            ? 'bg-[#155E4B] text-white'
                                                            : ev === 'prompted'
                                                              ? 'bg-amber-200 text-amber-950'
                                                              : 'bg-slate-200 text-slate-700'
                                                    }`}
                                                >
                                                    {ev === 'independent' ? '+' : ev === 'prompted' ? 'A' : '−'}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Contador Rápido de Comportamentos Interferentes (Frequência na Sessão) */}
                <div className="rounded-xl border border-amber-200/80 bg-white p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-[#0F1F1B]">
                                    Contador de Comportamentos Interferentes (Frequência)
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    Registre ocorrências com 1 toque para cruzar com a evolução de autonomia no gráfico.
                                </p>
                            </div>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs self-start sm:self-auto">
                            Total na sessão: {totalInterfering}
                        </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {INTERFERING_BEHAVIOR_PRESETS.map((preset) => {
                            const count =
                                sessionInterfering.find((e) => e.type === preset)?.count || 0
                            const selected = selectedInterferingType === preset
                            return (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setSelectedInterferingType(preset)}
                                    className={`min-h-[36px] px-3 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                        selected
                                            ? 'bg-amber-600 border-amber-600 text-white'
                                            : 'bg-[#FAFAF8] border-border text-foreground hover:bg-amber-50'
                                    }`}
                                >
                                    <span>{preset}</span>
                                    {count > 0 && (
                                        <span
                                            className={`font-mono text-[11px] px-1.5 rounded ${
                                                selected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                                            }`}
                                        >
                                            {count}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => adjustInterfering(selectedInterferingType, 1)}
                            className="min-h-[44px] px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold gap-1.5"
                        >
                            <Plus className="w-4 h-4" />
                            Registrar +1 ({selectedInterferingType})
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                                (sessionInterfering.find((e) => e.type === selectedInterferingType)
                                    ?.count || 0) === 0
                            }
                            onClick={() => adjustInterfering(selectedInterferingType, -1)}
                            className="min-h-[44px] px-3 text-xs gap-1"
                        >
                            <Minus className="w-3.5 h-3.5" />
                            Remover 1
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
