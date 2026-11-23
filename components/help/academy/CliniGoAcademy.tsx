'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Check,
    CheckCircle2,
    Clock,
    Compass,
    Copy,
    GraduationCap,
    HelpCircle,
    Layers,
    MessageSquareQuote,
    Presentation,
    RotateCcw,
    ShieldCheck,
    Stethoscope,
    Users,
    Wallet,
} from 'lucide-react'
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
import { canAccessHelpRoute, type HelpAccessContext } from '@/lib/help/help-access'
import type { HelpRole } from '@/lib/help/knowledge-base'
import {
    ACADEMY_LESSONS,
    ACADEMY_STATIONS,
    ACADEMY_TRACKS,
    type AcademyStationId,
    type AcademyTrackId,
} from './academy-data'
import { AcademyVisualPreview } from './AcademyVisualPreview'
import { GlosaZeroSimulator } from './GlosaZeroSimulator'

const PROGRESS_STORAGE_KEY = 'clinigo-academy-completed-v1'

const TRACK_ICONS: Record<AcademyTrackId, any> = {
    recepcao: Users,
    terapeutas: Stethoscope,
    administracao: Wallet,
}

interface CliniGoAcademyProps {
    accessContext: HelpAccessContext
    onOpenManualAnchor: (anchor: string) => void
}

export function CliniGoAcademy({
    accessContext,
    onOpenManualAnchor,
}: CliniGoAcademyProps) {
    const currentRole = (accessContext.role || '') as HelpRole
    const isSuperAdmin = currentRole === 'SUPER_ADMIN'

    // Filtra trilhas e estações respeitando rigorosamente o RBAC do usuário
    const visibleTracks = useMemo(() => {
        if (!currentRole) return []
        return ACADEMY_TRACKS.filter((track) => track.allowedRoles.includes(currentRole))
    }, [currentRole])

    const visibleStations = useMemo(() => {
        if (!currentRole) return []
        return ACADEMY_STATIONS.filter((st) => st.allowedRoles.includes(currentRole))
    }, [currentRole])

    const visibleLessons = useMemo(() => {
        const trackIds = new Set(visibleTracks.map((t) => t.id))
        return ACADEMY_LESSONS.filter((lesson) => trackIds.has(lesson.trackId))
    }, [visibleTracks])

    const canSeeGlosaSimulator =
        currentRole === 'SUPER_ADMIN' ||
        currentRole === 'CLINIC_ADMIN' ||
        currentRole === 'FINANCIAL'

    const [activeStationId, setActiveStationId] = useState<AcademyStationId>('pre-cadastro')
    const [selectedTrackId, setSelectedTrackId] = useState<AcademyTrackId | 'all'>('all')
    const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([])
    const [founderDemoMode, setFounderDemoMode] = useState(false)
    const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null)

    // Garante que a estação ativa sempre pertence às estações autorizadas para o perfil
    useEffect(() => {
        if (visibleStations.length > 0 && !visibleStations.some((s) => s.id === activeStationId)) {
            setActiveStationId(visibleStations[0].id)
        }
    }, [visibleStations, activeStationId])

    // Carrega progresso opcional do localStorage (puramente informativo — nunca trava nada)
    useEffect(() => {
        try {
            const raw = localStorage.getItem(PROGRESS_STORAGE_KEY)
            if (raw) {
                const parsed = JSON.parse(raw)
                if (Array.isArray(parsed)) {
                    setCompletedLessonIds(parsed.filter((x) => typeof x === 'string'))
                }
            }
        } catch {
            // Ignora erro de storage
        }
    }, [])

    const persistCompleted = (next: string[]) => {
        setCompletedLessonIds(next)
        try {
            localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(next))
        } catch {
            // Ignora erro de storage
        }
    }

    const toggleLessonCompleted = (lessonId: string) => {
        const next = completedLessonIds.includes(lessonId)
            ? completedLessonIds.filter((id) => id !== lessonId)
            : [...completedLessonIds, lessonId]
        persistCompleted(next)
    }

    const handleResetProgress = () => {
        persistCompleted([])
    }

    const handleCopyFounderPitch = async (stationId: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedScriptId(stationId)
            setTimeout(() => setCopiedScriptId(null), 2000)
        } catch {
            setCopiedScriptId(null)
        }
    }

    const activeStationIndex = Math.max(
        0,
        visibleStations.findIndex((s) => s.id === activeStationId)
    )
    const activeStation = visibleStations[activeStationIndex] || visibleStations[0]

    const filteredLessons = useMemo(() => {
        if (selectedTrackId === 'all') return visibleLessons
        return visibleLessons.filter((l) => l.trackId === selectedTrackId)
    }, [visibleLessons, selectedTrackId])

    const completedCount = visibleLessons.filter((l) => completedLessonIds.includes(l.id)).length
    const progressPercent =
        visibleLessons.length > 0 ? Math.round((completedCount / visibleLessons.length) * 100) : 0

    const canOpenTissGlosasRoute = canAccessHelpRoute('/dashboard/tiss/glosas', accessContext, {
        featureKey: 'faturamento_tiss',
    })

    if (visibleStations.length === 0) {
        return null
    }

    const canOpenActiveStationRoute = activeStation
        ? canAccessHelpRoute(activeStation.targetRoute, accessContext, {
              featureKey: activeStation.featureKey,
          })
        : false

    return (
        <div className="space-y-6">
            {/* Banner Editorial de Boas-Vindas da CliniGo Academy */}
            <section className="rounded-xl border border-[#DCE2DF] bg-[#FAFAF8] p-5 sm:p-6 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#155E4B]">
                            <GraduationCap className="w-4 h-4 shrink-0" />
                            <span>CliniGo Academy — Treinamento Visual Interativo</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-[#0F1F1B] tracking-tight">
                            Aprenda o fluxo completo da clínica de terapias clicando na prática
                        </h2>
                        <p className="text-sm text-[#4B5B56] max-w-3xl leading-relaxed">
                            Sem aulas travadas e sem burocracia: clique em qualquer etapa do Mapa Vivo abaixo ou escolha sua função para visualizar, testar em simulação segura e ir direto para a tela real.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* Botão exclusivo SUPER_ADMIN: Modo Roteiro de Demo */}
                        {isSuperAdmin && (
                            <Button
                                type="button"
                                variant={founderDemoMode ? 'default' : 'outline'}
                                onClick={() => setFounderDemoMode((v) => !v)}
                                className={`min-h-[44px] sm:min-h-[38px] px-3.5 gap-2 text-xs font-semibold rounded-md shadow-none ${
                                    founderDemoMode
                                        ? 'bg-[#155E4B] hover:bg-[#0F493A] text-white'
                                        : 'border-[#155E4B]/40 text-[#155E4B] bg-white hover:bg-[#E8F2EE]'
                                }`}
                            >
                                <Presentation className="w-4 h-4 shrink-0" />
                                <span>
                                    {founderDemoMode ? 'Modo Roteiro de Demo: Ativo' : 'Ativar Roteiro de Demo'}
                                </span>
                            </Button>
                        )}

                        {completedCount > 0 && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="min-h-[44px] sm:min-h-[38px] px-3.5 gap-1.5 text-xs font-medium rounded-md shadow-none bg-white"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Reiniciar Progresso
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Reiniciar marcações de estudo?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Todas as {completedCount} etapas marcadas como vistas serão desmarcadas. O acesso livre aos conteúdos não será afetado.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleResetProgress}>
                                            Confirmar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </div>

                {/* Indicador opcional e leve de progresso */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#E6E8E5]">
                    <div className="flex items-center gap-2 text-xs text-[#4B5B56]">
                        <Compass className="w-4 h-4 text-[#155E4B] shrink-0" />
                        <span>
                            Acesso 100% livre — marque etapas como vistas apenas se quiser acompanhar sua equipe.
                        </span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                        <div className="w-32 h-2 rounded-full bg-[#E6E8E5] overflow-hidden">
                            <div
                                className="h-full bg-[#155E4B] rounded-full transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className="text-xs font-semibold text-[#0F1F1B] tabular-nums">
                            {completedCount}/{visibleLessons.length} ({progressPercent}%)
                        </span>
                    </div>
                </div>
            </section>

            {/* PILAR 1: MAPA VIVO DO PACIENTE (8 ESTAÇÕES LIVRES E INTERATIVAS) */}
            <section className="rounded-xl border border-[#DCE2DF] bg-white p-5 sm:p-6 space-y-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#155E4B]">
                            Mapa Vivo da Clínica de Terapias
                        </p>
                        <h3 className="text-lg font-bold text-[#0F1F1B] mt-0.5">
                            Do primeiro contato do paciente até o repasse do terapeuta
                        </h3>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                const prevIdx =
                                    activeStationIndex > 0 ? activeStationIndex - 1 : visibleStations.length - 1
                                setActiveStationId(visibleStations[prevIdx].id)
                            }}
                            aria-label="Etapa anterior do mapa"
                            className="min-h-[40px] min-w-[40px] px-2.5 rounded-md shadow-none"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-xs font-semibold text-[#4B5B56] tabular-nums px-1.5">
                            {activeStationIndex + 1} / {visibleStations.length}
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                const nextIdx =
                                    activeStationIndex < visibleStations.length - 1 ? activeStationIndex + 1 : 0
                                setActiveStationId(visibleStations[nextIdx].id)
                            }}
                            aria-label="Próxima etapa do mapa"
                            className="min-h-[40px] min-w-[40px] px-2.5 rounded-md shadow-none"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Linha horizontal clicável de estações (scroll suave no mobile) */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {visibleStations.map((station) => {
                        const isSelected = station.id === activeStation.id
                        return (
                            <button
                                key={station.id}
                                type="button"
                                onClick={() => setActiveStationId(station.id)}
                                className={`min-h-[56px] min-w-[148px] flex-1 rounded-lg border px-3 py-2 text-left transition-all shrink-0 ${
                                    isSelected
                                        ? 'border-[#155E4B] bg-[#155E4B] text-white'
                                        : 'border-[#E6E8E5] bg-[#FAFAF8] text-[#0F1F1B] hover:border-[#155E4B]/50 hover:bg-white'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1.5">
                                    <span
                                        className={`text-[10px] font-bold uppercase tracking-wider tabular-nums ${
                                            isSelected ? 'text-emerald-200' : 'text-[#155E4B]'
                                        }`}
                                    >
                                        Etapa {station.order}
                                    </span>
                                    <span
                                        className={`text-[10px] font-medium truncate ${
                                            isSelected ? 'text-white/85' : 'text-[#4B5B56]'
                                        }`}
                                    >
                                        {station.ownerBadge}
                                    </span>
                                </div>
                                <p className="text-xs font-semibold mt-1 truncate">{station.shortTitle}</p>
                            </button>
                        )
                    })}
                </div>

                {/* Workspace Visual da Estação Selecionada (2 Colunas: Mini-Tela Viva + Explicação) */}
                {activeStation && (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 pt-2 items-start">
                        {/* Coluna Esquerda: Mini-Tela Visual Interativa */}
                        <div className="xl:col-span-7 space-y-3">
                            <AcademyVisualPreview stationId={activeStation.id} />

                            {/* Fluxo De onde vem -> Para onde vai */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div className="rounded-lg border border-[#E6E8E5] bg-[#FAFAF8] p-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4B5B56]">
                                        De onde vem
                                    </p>
                                    <p className="text-xs font-medium text-[#0F1F1B] mt-1 leading-relaxed">
                                        {activeStation.comesFrom}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-[#155E4B]/25 bg-[#E8F2EE]/50 p-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#155E4B]">
                                        Para onde vai depois
                                    </p>
                                    <p className="text-xs font-semibold text-[#0F1F1B] mt-1 leading-relaxed">
                                        {activeStation.goesTo}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Coluna Direita: Explicação Direta + Botões de Ação */}
                        <div className="xl:col-span-5 space-y-4">
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className="border-[#155E4B]/30 bg-[#E8F2EE] text-[#155E4B] text-[11px] font-semibold"
                                    >
                                        Responsável: {activeStation.ownerBadge}
                                    </Badge>
                                    <span className="inline-flex items-center gap-1 text-xs text-[#4B5B56] tabular-nums">
                                        <Clock className="w-3.5 h-3.5" />
                                        {activeStation.estimatedMinutes} min
                                    </span>
                                </div>

                                <h4 className="text-lg font-bold text-[#0F1F1B] leading-snug">
                                    {activeStation.order}. {activeStation.title}
                                </h4>
                                <p className="text-sm text-[#354540] leading-relaxed">
                                    {activeStation.whatHappens}
                                </p>
                            </div>

                            <ul className="space-y-2">
                                {activeStation.keyBullets.map((bullet) => (
                                    <li
                                        key={bullet}
                                        className="flex items-start gap-2 text-xs text-[#354540] leading-relaxed"
                                    >
                                        <CheckCircle2 className="w-4 h-4 text-[#155E4B] shrink-0 mt-0.5" />
                                        <span>{bullet}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {canOpenActiveStationRoute && (
                                    <Button
                                        asChild
                                        className="min-h-[44px] px-4 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold gap-2 shadow-none"
                                    >
                                        <Link href={activeStation.targetRoute} prefetch={false}>
                                            <span>{activeStation.targetRouteLabel}</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenManualAnchor(activeStation.manualAnchor)}
                                    className="min-h-[44px] px-4 rounded-md text-xs font-medium gap-1.5 shadow-none"
                                >
                                    <BookOpen className="w-3.5 h-3.5 text-[#155E4B]" />
                                    <span>Ver Passo a Passo Escrito</span>
                                </Button>
                            </div>

                            {/* PILAR 4: MODO ROTEIRO DE DEMO (EXCLUSIVO SUPER_ADMIN) */}
                            {isSuperAdmin && founderDemoMode && (
                                <div className="rounded-xl border border-[#155E4B]/35 bg-[#F2F7F5] p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#155E4B]">
                                            <MessageSquareQuote className="w-4 h-4" />
                                            Roteiro de Call — Exclusivo Super Admin
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleCopyFounderPitch(
                                                    activeStation.id,
                                                    activeStation.demoScript.pitch30s
                                                )
                                            }
                                            className="min-h-[34px] px-2.5 rounded-md bg-white border border-[#DCE2DF] hover:border-[#155E4B] text-[11px] font-semibold text-[#0F1F1B] inline-flex items-center gap-1"
                                        >
                                            {copiedScriptId === activeStation.id ? (
                                                <>
                                                    <Check className="w-3.5 h-3.5 text-[#155E4B]" />
                                                    Copiado
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-3.5 h-3.5" />
                                                    Copiar fala
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div className="space-y-2 text-xs text-[#0F1F1B] leading-relaxed">
                                        <p>
                                            <strong className="text-[#155E4B]">O que falar (30s):</strong>{' '}
                                            {activeStation.demoScript.pitch30s}
                                        </p>
                                        <p>
                                            <strong className="text-[#155E4B]">Pergunta de ouro:</strong>{' '}
                                            {activeStation.demoScript.goldenQuestion}
                                        </p>
                                        <div className="rounded-md bg-white border border-[#DCE2DF] p-2.5 space-y-1">
                                            <p className="font-semibold text-[#0F1F1B] inline-flex items-center gap-1.5">
                                                <HelpCircle className="w-3.5 h-3.5 text-[#155E4B] shrink-0" />
                                                Objeção comum: &quot;{activeStation.demoScript.objection}&quot;
                                            </p>
                                            <p className="text-[#354540]">{activeStation.demoScript.objectionAnswer}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </section>

            {/* PILAR 2: TRILHAS PRÁTICAS POR CARGO (RECEPÇÃO / TERAPEUTAS / ADMINISTRAÇÃO & TISS) */}
            <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#155E4B]">
                            Treinamento por Função
                        </p>
                        <h3 className="text-lg font-bold text-[#0F1F1B] mt-0.5">
                            Escolha o cargo para treinar sua equipe sem travas
                        </h3>
                    </div>

                    {visibleTracks.length > 1 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant={selectedTrackId === 'all' ? 'default' : 'outline'}
                                onClick={() => setSelectedTrackId('all')}
                                className={`min-h-[40px] px-3.5 text-xs font-semibold rounded-md shadow-none ${
                                    selectedTrackId === 'all' ? 'bg-[#155E4B] hover:bg-[#0F493A] text-white' : ''
                                }`}
                            >
                                Todas ({visibleLessons.length})
                            </Button>
                            {visibleTracks.map((track) => {
                                const TrackIcon = TRACK_ICONS[track.id]
                                const isActive = selectedTrackId === track.id
                                return (
                                    <Button
                                        key={track.id}
                                        type="button"
                                        variant={isActive ? 'default' : 'outline'}
                                        onClick={() => setSelectedTrackId(track.id)}
                                        className={`min-h-[40px] px-3.5 gap-1.5 text-xs font-semibold rounded-md shadow-none ${
                                            isActive ? 'bg-[#155E4B] hover:bg-[#0F493A] text-white' : ''
                                        }`}
                                    >
                                        <TrackIcon className="w-3.5 h-3.5 shrink-0" />
                                        <span>{track.title.split(' ')[0]}</span>
                                    </Button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Cards resumo das 3 trilhas */}
                {visibleTracks.length > 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        {visibleTracks.map((track) => {
                            const TrackIcon = TRACK_ICONS[track.id]
                            const trackLessons = visibleLessons.filter((l) => l.trackId === track.id)
                            const trackDone = trackLessons.filter((l) => completedLessonIds.includes(l.id)).length
                            const isSelected = selectedTrackId === track.id

                            return (
                                <button
                                    key={track.id}
                                    type="button"
                                    onClick={() => setSelectedTrackId(isSelected ? 'all' : track.id)}
                                    className={`rounded-xl border p-4 text-left transition-all flex flex-col justify-between gap-3 ${
                                        isSelected
                                            ? 'border-[#155E4B] bg-[#E8F2EE]/60'
                                            : 'border-[#DCE2DF] bg-white hover:border-[#155E4B]/50'
                                    }`}
                                >
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="w-9 h-9 rounded-lg bg-[#E8F2EE] text-[#155E4B] flex items-center justify-center shrink-0">
                                                <TrackIcon className="w-4 h-4" />
                                            </span>
                                            <span className="text-[11px] font-semibold text-[#155E4B] tabular-nums">
                                                {trackDone}/{trackLessons.length} vistos
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-[#0F1F1B] pt-1">{track.title}</h4>
                                        <p className="text-[11px] font-medium text-[#155E4B]">{track.audienceLabel}</p>
                                        <p className="text-xs text-[#4B5B56] leading-relaxed">{track.description}</p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* Lista de Cenas Práticas da Trilha */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                    {filteredLessons.map((lesson) => {
                        const isDone = completedLessonIds.includes(lesson.id)
                        const trackMeta = ACADEMY_TRACKS.find((t) => t.id === lesson.trackId)
                        const canOpenRoute = canAccessHelpRoute(lesson.targetRoute, accessContext, {
                            featureKey: lesson.featureKey,
                        })

                        return (
                            <div
                                key={lesson.id}
                                className={`rounded-xl border p-4 sm:p-5 bg-white flex flex-col justify-between gap-4 transition-all ${
                                    isDone ? 'border-[#155E4B]/40 bg-[#FAFAF8]' : 'border-[#E6E8E5]'
                                }`}
                            >
                                <div className="space-y-2.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className="text-[11px] border-[#DCE2DF] bg-[#FAFAF8] text-[#354540]"
                                            >
                                                {trackMeta?.title.split(' ')[0]}
                                            </Badge>
                                            <span className="inline-flex items-center gap-1 text-xs text-[#4B5B56] tabular-nums">
                                                <Clock className="w-3.5 h-3.5" />
                                                {lesson.estimatedMinutes} min
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => toggleLessonCompleted(lesson.id)}
                                            className={`min-h-[34px] px-2.5 rounded-md text-[11px] font-semibold inline-flex items-center gap-1.5 border transition-colors ${
                                                isDone
                                                    ? 'border-[#155E4B]/30 bg-[#E8F2EE] text-[#155E4B]'
                                                    : 'border-[#E6E8E5] bg-white text-[#4B5B56] hover:border-[#155E4B]/40'
                                            }`}
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>{isDone ? 'Dominado' : 'Marcar visto'}</span>
                                        </button>
                                    </div>

                                    <div>
                                        <h4 className="text-sm sm:text-base font-bold text-[#0F1F1B]">
                                            {lesson.title}
                                        </h4>
                                        <p className="text-xs text-[#4B5B56] mt-1 leading-relaxed">
                                            {lesson.summary}
                                        </p>
                                    </div>

                                    {/* Caminho de cliques rápido */}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                        {lesson.quickClicks.map((stepText, idx) => (
                                            <span
                                                key={stepText}
                                                className="inline-flex items-center gap-1 text-[11px] bg-[#F2F5F3] text-[#0F1F1B] px-2 py-1 rounded-md font-medium"
                                            >
                                                <span className="text-[#155E4B] font-bold tabular-nums">{idx + 1}.</span>
                                                {stepText}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E6E8E5]">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setActiveStationId(lesson.linkedStationId)
                                            window.scrollTo({ top: 0, behavior: 'smooth' })
                                        }}
                                        className="min-h-[40px] px-3 text-xs font-semibold gap-1.5 rounded-md shadow-none border-[#155E4B]/35 text-[#155E4B] hover:bg-[#E8F2EE]"
                                    >
                                        <Layers className="w-3.5 h-3.5" />
                                        Ver Visual no Mapa
                                    </Button>

                                    {canOpenRoute && (
                                        <Button
                                            asChild
                                            className="min-h-[40px] px-3 text-xs font-semibold gap-1.5 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white shadow-none"
                                        >
                                            <Link href={lesson.targetRoute} prefetch={false}>
                                                Abrir Tela
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </Button>
                                    )}

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => onOpenManualAnchor(lesson.manualAnchor)}
                                        className="min-h-[40px] px-2.5 text-xs font-medium text-[#4B5B56] hover:text-[#0F1F1B]"
                                    >
                                        Manual detalhado
                                    </Button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* PILAR 3: SIMULADOR INTERATIVO GLOSA ZERO (GESTÃO / FATURAMENTO / SUPER ADMIN) */}
            {canSeeGlosaSimulator && (
                <GlosaZeroSimulator
                    canOpenTissRoute={canOpenTissGlosasRoute}
                    showFounderScript={isSuperAdmin && founderDemoMode}
                />
            )}

            {/* Rodapé informativo de segurança LGPD */}
            <div className="rounded-lg border border-[#E6E8E5] bg-[#FAFAF8] px-4 py-3 flex items-center gap-2.5 text-xs text-[#4B5B56]">
                <ShieldCheck className="w-4 h-4 text-[#155E4B] shrink-0" />
                <span>
                    Todos os exemplos interativos da CliniGo Academy utilizam dados 100% fictícios. Você pode clicar e testar livremente sem impactar nenhum paciente, prontuário ou guia real da sua clínica.
                </span>
            </div>
        </div>
    )
}

