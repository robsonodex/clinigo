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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

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
    parentConsentConfirmed: boolean
    expiresAt: string
    createdAt: string
}

interface FamilyPortalPublicViewProps {
    token: string
    initialData: PublicFamilyPortalData
}

export function FamilyPortalPublicView({ token, initialData }: FamilyPortalPublicViewProps) {
    const [completed, setCompleted] = useState(initialData.homeActivityCompleted)
    const [completedAt, setCompletedAt] = useState<string | null>(initialData.homeActivityCompletedAt)
    const [feedback, setFeedback] = useState(initialData.homeActivityFeedback || '')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const isSchoolDoctor = initialData.shareType === 'school_doctor'

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
                }),
            })

            const payload = await res.json()
            if (!res.ok) {
                throw new Error(payload.error || 'Não foi possível registrar.')
            }

            setCompleted(true)
            setCompletedAt(payload.homeActivityCompletedAt || new Date().toISOString())
            setStatusMessage('Registrado com sucesso! A equipe terapêutica já pode ver que vocês fizeram em casa.')
        } catch (err: any) {
            setErrorMessage(err?.message || 'Erro ao enviar confirmação.')
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

                        <div className="space-y-3 pt-1 print:hidden">
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
                                placeholder="Ex: Conseguiu fazer duas vezes após o lanche e ficou muito feliz..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                className="text-sm bg-[#FAFAF8]"
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
                                        {isSubmitting ? 'Salvando...' : 'Atualizar comentário (Fizemos em casa!)'}
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-5 h-5" />
                                        {isSubmitting ? 'Registrando...' : 'Fizemos em casa!'}
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

