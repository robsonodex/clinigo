'use client'

import React, { useState } from 'react'
import {
    CheckCircle2,
    ShieldCheck,
    Clock,
    Home,
    Printer,
    HeartHandshake,
    TrendingUp,
    Calendar,
    Award,
    Send,
    School,
    Trophy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    WEEKLY_CONTEXT_OPTIONS,
    type SchoolMicroReturn,
} from '@/lib/family-portal/feedback-codec'

export interface PublicFamilyPortalData {
    id: string
    shareType: 'family' | 'school_doctor'
    title: string
    introMessage: string | null
    patientFirstName: string
    clinicName: string
    clinicLogoUrl: string | null
    clinicPhone: string | null
    especialidade: string | null
    recipientName: string | null
    summaryHighlights: string[]
    progressSnapshot: Array<{ label: string; pct: number; status?: string }>
    homeActivityTitle: string | null
    homeActivityInstructions: string | null
    homeActivityCompleted: boolean
    homeActivityCompletedAt: string | null
    homeActivityFeedback: string | null
    confidenceScore?: number | null
    weeklyContextTags?: string[]
    schoolReturn?: SchoolMicroReturn | null
    parentConsentConfirmed: boolean
    expiresAt: string
    createdAt: string
}

const CONFIDENCE_OPTIONS = [
    { value: 1, label: 'Precisamos alinhar' },
    { value: 2, label: 'Pouca evolução' },
    { value: 3, label: 'Estável' },
    { value: 4, label: 'Boa evolução' },
    { value: 5, label: 'Excelente' },
] as const

interface FamilyPortalPublicViewProps {
    token: string
    initialData: PublicFamilyPortalData
}

export function FamilyPortalPublicView({ token, initialData }: FamilyPortalPublicViewProps) {
    const [completed, setCompleted] = useState(initialData.homeActivityCompleted)
    const [completedAt, setCompletedAt] = useState<string | null>(initialData.homeActivityCompletedAt)
    const [feedback, setFeedback] = useState(initialData.homeActivityFeedback || '')
    const [confidenceScore, setConfidenceScore] = useState<number | null>(
        initialData.confidenceScore ?? null
    )
    const [weeklyContextTags, setWeeklyContextTags] = useState<string[]>(
        Array.isArray(initialData.weeklyContextTags) ? initialData.weeklyContextTags : []
    )

    // Micro-retorno estruturado da Escola (15 segundos, sem chat aberto)
    const [schoolParticipation, setSchoolParticipation] = useState<'alta' | 'moderada' | 'baixa'>(
        initialData.schoolReturn?.participation || 'alta'
    )
    const [schoolRegulation, setSchoolRegulation] = useState<'regulado' | 'oscilante' | 'desregulado'>(
        initialData.schoolReturn?.regulation || 'regulado'
    )
    const [schoolObservation, setSchoolObservation] = useState(
        initialData.schoolReturn?.observation || ''
    )
    const [schoolRespondent, setSchoolRespondent] = useState(
        initialData.schoolReturn?.respondentName || ''
    )
    const [schoolSubmittedAt, setSchoolSubmittedAt] = useState<string | null>(
        initialData.schoolReturn?.submittedAt || null
    )

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const isSchoolDoctor = initialData.shareType === 'school_doctor'
    const masteredGoals = initialData.progressSnapshot.filter(
        (g) => g.status === 'dominada' || g.pct >= 80
    )

    const toggleContextTag = (tag: string) => {
        setWeeklyContextTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, 6)
        )
    }

    const handleConfirmHomeActivity = async () => {
        try {
            setIsSubmitting(true)
            setErrorMessage(null)
            setStatusMessage(null)

            const res = await fetch(`/api/public/familia/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    completed: true,
                    feedback: feedback.trim(),
                    confidenceScore,
                    weeklyContextTags,
                }),
            })

            const payload = await res.json()
            if (!res.ok) {
                throw new Error(payload.error || 'Não foi possível registrar.')
            }

            setCompleted(true)
            setCompletedAt(payload.homeActivityCompletedAt || new Date().toISOString())
            setStatusMessage('Registrado com sucesso. A equipe terapêutica já recebeu seu retorno.')
        } catch (err: any) {
            setErrorMessage(err?.message || 'Erro ao enviar confirmação.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmitSchoolReturn = async () => {
        try {
            setIsSubmitting(true)
            setErrorMessage(null)
            setStatusMessage(null)

            const res = await fetch(`/api/public/familia/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolReturn: {
                        participation: schoolParticipation,
                        regulation: schoolRegulation,
                        observation: schoolObservation.trim(),
                        respondentName: schoolRespondent.trim(),
                    },
                }),
            })

            const payload = await res.json()
            if (!res.ok) {
                throw new Error(payload.error || 'Não foi possível enviar observação.')
            }

            setSchoolSubmittedAt(payload.schoolReturn?.submittedAt || new Date().toISOString())
            setStatusMessage('Observação registrada com sucesso para a equipe clínica.')
        } catch (err: any) {
            setErrorMessage(err?.message || 'Erro ao enviar observação.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const formatDate = (iso?: string | null) => {
        if (!iso) return ''
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) return ''
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    return (
        <div className="min-h-screen bg-[#FAFAF8] text-[#0F1F1B] pb-16">
            {/* Cabeçalho White-Label com a marca da própria clínica */}
            <header className="bg-[#155E4B] text-white print:bg-white print:text-[#0F1F1B] print:border-b print:border-[#E6E8E5]">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            {initialData.clinicLogoUrl ? (
                                <img
                                    src={initialData.clinicLogoUrl}
                                    alt={initialData.clinicName}
                                    className="h-11 w-auto max-w-[140px] object-contain rounded bg-white/95 px-2 py-1"
                                />
                            ) : (
                                <div className="w-11 h-11 rounded-lg bg-white/15 border border-white/25 flex items-center justify-center font-semibold text-lg shrink-0">
                                    {initialData.clinicName.slice(0, 1).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-[0.14em] text-white/80 font-medium print:text-[#155E4B]">
                                    {isSchoolDoctor
                                        ? 'Relatório Temporário · Escola / Equipe Médica'
                                        : 'Boletim da Família'}
                                </p>
                                <h1 className="text-lg sm:text-xl font-semibold truncate">
                                    {initialData.clinicName}
                                </h1>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.print()}
                            className="print:hidden bg-white/10 hover:bg-white/20 text-white border-white/25 h-9 px-3 text-xs gap-1.5 shrink-0"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Imprimir</span>
                        </Button>
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs text-white/90 print:text-[#4B5B56] print:border-[#E6E8E5]">
                        <span>
                            Paciente: <strong className="text-white print:text-[#0F1F1B]">{initialData.patientFirstName}</strong>
                            {initialData.recipientName ? ` · Para: ${initialData.recipientName}` : ''}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Emitido em {formatDate(initialData.createdAt)}
                        </span>
                    </div>
                </div>
            </header>

            {/* Corpo Editorial */}
            <main className="max-w-2xl mx-auto px-4 sm:px-6 -mt-3 sm:-mt-4 space-y-5">
                {/* Título e Recado Inicial */}
                <section className="rounded-xl border border-[#E6E8E5] bg-white p-5 sm:p-6 shadow-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge
                            variant="outline"
                            className="bg-[#E6F2EE] text-[#114D3E] border-[#C4E1D7] text-[11px] font-medium"
                        >
                            {isSchoolDoctor ? 'Link temporário · 7 dias' : 'Acompanhamento Semanal'}
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#4B5B56]">
                            <Clock className="w-3.5 h-3.5" />
                            Válido até {formatDate(initialData.expiresAt)}
                        </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#0F1F1B]">
                        {initialData.title}
                    </h2>

                    {initialData.introMessage && (
                        <p className="text-sm text-[#4B5B56] leading-relaxed whitespace-pre-wrap">
                            {initialData.introMessage}
                        </p>
                    )}

                    {isSchoolDoctor && initialData.parentConsentConfirmed && (
                        <div className="rounded-lg border border-[#C4E1D7] bg-[#E6F2EE]/50 px-3.5 py-2.5 flex items-center gap-2 text-xs text-[#114D3E]">
                            <ShieldCheck className="w-4 h-4 shrink-0 text-[#155E4B]" />
                            <span>
                                Compartilhamento temporário autorizado pelos responsáveis legais (conformidade LGPD).
                            </span>
                        </div>
                    )}
                </section>

                {/* Conquistas da Semana */}
                <section className="rounded-xl border border-[#E6E8E5] bg-white p-5 sm:p-6 shadow-xs space-y-3.5">
                    <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-[#155E4B]" />
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#0F1F1B]">
                            {isSchoolDoctor ? 'Principais Avanços Clínicos' : 'Conquistas Reais da Semana'}
                        </h3>
                    </div>

                    <ul className="space-y-2.5">
                        {initialData.summaryHighlights.map((highlight, idx) => (
                            <li
                                key={idx}
                                className="rounded-lg border border-[#E6E8E5] bg-[#FAFAF8] p-3.5 flex items-start gap-3 text-sm text-[#0F1F1B] leading-relaxed"
                            >
                                <span className="w-5 h-5 rounded-full bg-[#155E4B] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                </span>
                                <span>{highlight}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Mural de Conquistas (Metas Dominadas >= 80%) */}
                {masteredGoals.length > 0 && (
                    <section className="rounded-xl border border-[#C4E1D7] bg-[#E6F2EE]/55 p-5 sm:p-6 shadow-xs space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-[#155E4B]" />
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#114D3E]">
                                    Mural de Conquistas ({masteredGoals.length} marco(s) atingido(s))
                                </h3>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {masteredGoals.map((goal, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-lg border border-[#C4E1D7] bg-white p-3 flex items-center justify-between gap-2"
                                >
                                    <span className="text-xs sm:text-sm font-medium text-[#0F1F1B]">
                                        {goal.label}
                                    </span>
                                    <Badge className="bg-[#155E4B] text-white text-[11px] shrink-0">
                                        {goal.pct}%
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Evolução Simplificada das Metas */}
                {initialData.progressSnapshot.length > 0 && (
                    <section className="rounded-xl border border-[#E6E8E5] bg-white p-5 sm:p-6 shadow-xs space-y-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-[#155E4B]" />
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#0F1F1B]">
                                Evolução das Metas Terapêuticas
                            </h3>
                        </div>

                        <div className="space-y-3.5">
                            {initialData.progressSnapshot.map((goal, idx) => {
                                const isMastered = goal.status === 'dominada' || goal.pct >= 80
                                return (
                                    <div key={idx} className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                                            <span className="font-medium text-[#0F1F1B]">{goal.label}</span>
                                            <span className="font-mono font-semibold text-[#155E4B] shrink-0">
                                                {goal.pct}%
                                            </span>
                                        </div>
                                        <div className="h-2.5 w-full rounded-full bg-[#EEF2F0] overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${
                                                    isMastered ? 'bg-[#155E4B]' : 'bg-teal-600'
                                                }`}
                                                style={{ width: `${Math.min(100, Math.max(5, goal.pct))}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}

                {/* Atividade de Casa (5 min) com botão "Fizemos em casa!" */}
                {!isSchoolDoctor && initialData.homeActivityInstructions && (
                    <section className="rounded-xl border-2 border-[#155E4B]/30 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Home className="w-4 h-4 text-[#155E4B] shrink-0" />
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#155E4B]">
                                        Atividade de Casa (5 min)
                                    </p>
                                    <h3 className="text-base font-semibold text-[#0F1F1B]">
                                        {initialData.homeActivityTitle || 'Prática sugerida para esta semana'}
                                    </h3>
                                </div>
                            </div>
                            {completed && (
                                <Badge className="bg-[#155E4B] text-white text-[11px] shrink-0">
                                    Feito em casa
                                </Badge>
                            )}
                        </div>

                        <p className="text-sm text-[#4B5B56] leading-relaxed whitespace-pre-wrap bg-[#FAFAF8] border border-[#E6E8E5] rounded-lg p-4">
                            {initialData.homeActivityInstructions}
                        </p>

                        <div className="space-y-4 pt-1 print:hidden">
                            {/* Contexto semanal rápido (alimenta correlação Casa x Clínica) */}
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-[#0F1F1B]">
                                    Como foi a semana em casa? (selecione se quiser compartilhar contexto com a equipe)
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {WEEKLY_CONTEXT_OPTIONS.map((tag) => {
                                        const active = weeklyContextTags.includes(tag)
                                        return (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => toggleContextTag(tag)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors min-h-[36px] ${
                                                    active
                                                        ? 'bg-[#155E4B] text-white border-[#155E4B]'
                                                        : 'bg-white text-[#0F1F1B] border-[#E6E8E5] hover:border-[#155E4B]/50'
                                                }`}
                                            >
                                                {tag}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Termômetro de Confiança (1 a 5) */}
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-[#0F1F1B]">
                                    Como vocês sentiram a evolução nesta semana?
                                </p>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {CONFIDENCE_OPTIONS.map((opt) => {
                                        const selected = confidenceScore === opt.value
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setConfidenceScore(opt.value)}
                                                className={`p-2 rounded-md border text-center transition-colors min-h-[52px] flex flex-col items-center justify-center gap-0.5 ${
                                                    selected
                                                        ? 'bg-[#155E4B] text-white border-[#155E4B]'
                                                        : 'bg-[#FAFAF8] text-[#0F1F1B] border-[#E6E8E5] hover:border-[#155E4B]/50'
                                                }`}
                                            >
                                                <span className="font-mono text-sm font-bold">{opt.value}</span>
                                                <span className="text-[10px] leading-tight line-clamp-2">
                                                    {opt.label}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <label
                                htmlFor="family-home-feedback"
                                className="block text-xs font-medium text-[#0F1F1B]"
                            >
                                Conte para a terapeuta como foi em casa (opcional)
                            </label>
                            <Textarea
                                id="family-home-feedback"
                                rows={3}
                                maxLength={600}
                                placeholder="Ex: Conseguiu fazer duas vezes após o lanche e participou com boa atenção..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                className="text-sm bg-[#FAFAF8]"
                                style={{ fontSize: '16px' }}
                            />

                            <Button
                                type="button"
                                onClick={handleConfirmHomeActivity}
                                disabled={isSubmitting}
                                className="w-full min-h-[52px] text-sm sm:text-base font-semibold bg-[#155E4B] hover:bg-[#0F493A] text-white gap-2"
                            >
                                {completed ? (
                                    <>
                                        <Send className="w-4 h-4" />
                                        {isSubmitting ? 'Salvando...' : 'Atualizar retorno da semana'}
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-5 h-5" />
                                        {isSubmitting ? 'Registrando...' : 'Confirmar: fizemos em casa'}
                                    </>
                                )}
                            </Button>

                            {completed && completedAt && (
                                <p className="text-xs text-[#114D3E] flex items-center gap-1.5 font-medium">
                                    <HeartHandshake className="w-4 h-4 text-[#155E4B] shrink-0" />
                                    Confirmado pela família em {formatDate(completedAt)}.
                                </p>
                            )}

                            {statusMessage && (
                                <p className="text-xs text-[#114D3E] bg-[#E6F2EE] border border-[#C4E1D7] rounded-md px-3 py-2">
                                    {statusMessage}
                                </p>
                            )}
                            {errorMessage && (
                                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                                    {errorMessage}
                                </p>
                            )}
                        </div>
                    </section>
                )}

                {/* Micro-Retorno Estruturado da Escola / Mediadora (15s, sem chat aberto) */}
                {isSchoolDoctor && (
                    <section className="rounded-xl border border-[#C4E1D7] bg-white p-5 sm:p-6 shadow-xs space-y-4 print:hidden">
                        <div className="flex items-start gap-2.5">
                            <School className="w-4 h-4 text-[#155E4B] mt-0.5 shrink-0" />
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#155E4B]">
                                    Alinhamento Clínica &harr; Escola
                                </p>
                                <h3 className="text-base font-semibold text-[#0F1F1B]">
                                    Enviar observação estruturada da semana para a equipe clínica
                                </h3>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1.5">
                                <label className="font-medium text-[#0F1F1B] block">
                                    Participação em sala
                                </label>
                                <div className="flex gap-1.5">
                                    {(['alta', 'moderada', 'baixa'] as const).map((opt) => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setSchoolParticipation(opt)}
                                            className={`flex-1 py-2 rounded-md border capitalize font-medium min-h-[40px] ${
                                                schoolParticipation === opt
                                                    ? 'bg-[#155E4B] text-white border-[#155E4B]'
                                                    : 'bg-[#FAFAF8] text-[#0F1F1B] border-[#E6E8E5]'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-medium text-[#0F1F1B] block">
                                    Regulação / rotina escolar
                                </label>
                                <div className="flex gap-1.5">
                                    {(['regulado', 'oscilante', 'desregulado'] as const).map((opt) => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setSchoolRegulation(opt)}
                                            className={`flex-1 py-2 rounded-md border capitalize font-medium min-h-[40px] ${
                                                schoolRegulation === opt
                                                    ? 'bg-[#155E4B] text-white border-[#155E4B]'
                                                    : 'bg-[#FAFAF8] text-[#0F1F1B] border-[#E6E8E5]'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Input
                                value={schoolRespondent}
                                onChange={(e) => setSchoolRespondent(e.target.value)}
                                placeholder="Seu nome e função (ex.: Prof. Carla — Mediadora)"
                                maxLength={100}
                                className="h-10 bg-[#FAFAF8]"
                                style={{ fontSize: '16px' }}
                            />
                            <Textarea
                                rows={3}
                                maxLength={500}
                                value={schoolObservation}
                                onChange={(e) => setSchoolObservation(e.target.value)}
                                placeholder="Registre avanços ou desafios observados na escola nesta semana (opcional)..."
                                className="text-sm bg-[#FAFAF8]"
                                style={{ fontSize: '16px' }}
                            />
                        </div>

                        <Button
                            type="button"
                            onClick={handleSubmitSchoolReturn}
                            disabled={isSubmitting}
                            className="w-full min-h-[48px] text-sm font-semibold bg-[#155E4B] hover:bg-[#0F493A] text-white gap-2"
                        >
                            <Send className="w-4 h-4" />
                            {isSubmitting
                                ? 'Enviando...'
                                : schoolSubmittedAt
                                ? 'Atualizar observação da escola'
                                : 'Enviar observação para a clínica'}
                        </Button>

                        {schoolSubmittedAt && (
                            <p className="text-xs text-[#114D3E]">
                                Último registro enviado em {formatDate(schoolSubmittedAt)}.
                            </p>
                        )}
                        {statusMessage && (
                            <p className="text-xs text-[#114D3E] bg-[#E6F2EE] border border-[#C4E1D7] rounded-md px-3 py-2">
                                {statusMessage}
                            </p>
                        )}
                        {errorMessage && (
                            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                                {errorMessage}
                            </p>
                        )}
                    </section>
                )}

                {/* Rodapé LGPD discreto com logo oficial CliniGo clicável */}
                <footer className="pt-2 text-center text-[11px] text-[#4B5B56] space-y-1.5">
                    <p className="inline-flex items-center gap-1.5 justify-center">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#155E4B]" />
                        Conteúdo resumido e protegido pela LGPD · Link individual sem senha.
                    </p>
                    <p className="inline-flex flex-wrap items-center justify-center gap-1.5">
                        <span>
                            Enviado por <strong>{initialData.clinicName}</strong> · Tecnologia
                        </span>
                        <a
                            href="https://clinigo.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center hover:opacity-80 transition-opacity"
                            title="Conheça o CliniGo"
                        >
                            <img
                                src="/logo_black.svg"
                                alt="CliniGo"
                                className="h-4 w-auto object-contain"
                            />
                        </a>
                    </p>
                </footer>
            </main>
        </div>
    )
}

