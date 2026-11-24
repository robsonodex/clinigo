'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
    Activity,
    Calendar,
    CheckCircle2,
    Clock,
    FileSignature,
    HeartHandshake,
    RefreshCw,
    ScanFace,
    User,
    Video,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface MyDaySession {
    appointmentId: string
    patientId: string
    patientName: string
    patientBirthDate: string | null
    patientPhone: string | null
    time: string
    status: string
    appointmentType: string
    evolutionSigned: boolean
    evolutionDraft: boolean
    hasBiometrics: boolean
}

interface MyDayResponse {
    date: string
    doctorName: string
    specialty: string | null
    summary: {
        total: number
        completed: number
        signed: number
        pendingSignature: number
    }
    sessions: MyDaySession[]
}

function formatStatusLabel(status: string): { label: string; className: string } {
    switch (status) {
        case 'COMPLETED':
            return { label: 'Concluída', className: 'bg-[#E6F2EE] text-[#114D3E] border-[#C4E1D7]' }
        case 'IN_PROGRESS':
            return { label: 'Em atendimento', className: 'bg-blue-50 text-blue-800 border-blue-200' }
        case 'CHECKED_IN':
        case 'WAITING':
            return { label: 'Na recepção', className: 'bg-amber-50 text-amber-800 border-amber-200' }
        case 'CONFIRMED':
            return { label: 'Confirmada', className: 'bg-slate-100 text-slate-700 border-slate-200' }
        default:
            return { label: 'Agendada', className: 'bg-slate-50 text-slate-600 border-slate-200' }
    }
}

export function TherapistClinicalDayPanel({ compact = false }: { compact?: boolean }) {
    const [filter, setFilter] = useState<'all' | 'pending' | 'signed'>('all')

    const { data, isLoading, isFetching, refetch } = useQuery<MyDayResponse | null>({
        queryKey: ['doctor-my-day-clinical'],
        queryFn: async () => {
            const res = await fetch('/api/doctor/my-day')
            if (!res.ok) return null
            const json = await res.json()
            return json.success ? json.data : null
        },
        staleTime: 60_000,
    })

    const filteredSessions = useMemo(() => {
        const list = data?.sessions || []
        if (filter === 'pending') return list.filter((s) => !s.evolutionSigned)
        if (filter === 'signed') return list.filter((s) => s.evolutionSigned)
        return list
    }, [data?.sessions, filter])

    if (isLoading) {
        return (
            <Card className="border-border bg-card shadow-xs">
                <CardContent className="py-8 text-center text-xs text-muted-foreground">
                    Carregando sua fila clínica de hoje...
                </CardContent>
            </Card>
        )
    }

    if (!data) {
        return null
    }

    const displayDate = data.date ? data.date.split('-').reverse().join('/') : ''
    const visibleSessions = compact ? filteredSessions.slice(0, 6) : filteredSessions

    return (
        <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                            <Calendar className="w-4 h-4 text-[#155E4B]" />
                            Meu Dia Clínico · {displayDate}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            Acesse Prontuário, Planos/Tatame e CliniGo Família de cada paciente do dia em 1 clique.
                        </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {compact && (
                            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                                <Link href="/dashboard/meu-dia">Tela cheia</Link>
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="h-8 px-2.5 text-xs gap-1"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                    </div>
                </div>

                {/* KPIs compactos + filtros */}
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline" className="bg-slate-50 text-slate-800 border-slate-200 tabular-nums">
                            {data.summary.total} sessões hoje
                        </Badge>
                        <Badge variant="outline" className="bg-[#E6F2EE] text-[#114D3E] border-[#C4E1D7] tabular-nums">
                            {data.summary.signed} evoluções assinadas
                        </Badge>
                        {data.summary.pendingSignature > 0 && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 tabular-nums">
                                {data.summary.pendingSignature} pendente(s)
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        {(
                            [
                                { id: 'all', label: 'Todas' },
                                { id: 'pending', label: 'Pendentes' },
                                { id: 'signed', label: 'Assinadas' },
                            ] as const
                        ).map((tab) => (
                            <Button
                                key={tab.id}
                                type="button"
                                size="sm"
                                variant={filter === tab.id ? 'default' : 'outline'}
                                onClick={() => setFilter(tab.id)}
                                className={`h-7 px-2.5 text-xs ${
                                    filter === tab.id
                                        ? 'bg-[#155E4B] hover:bg-[#0F4C3A] text-white'
                                        : 'border-border'
                                }`}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-4">
                {visibleSessions.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-[#FAFAF8] py-8 px-4 text-center space-y-2">
                        <p className="text-sm font-medium text-foreground">
                            {data.sessions.length === 0
                                ? 'Nenhum atendimento agendado para hoje.'
                                : 'Nenhuma sessão corresponde ao filtro selecionado.'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Consulte sua agenda completa para visualizar outros dias da semana.
                        </p>
                        <Button asChild variant="outline" size="sm" className="mt-1 h-8 text-xs">
                            <Link href="/dashboard/minha-agenda">Abrir Minha Agenda</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {visibleSessions.map((session) => {
                            const st = formatStatusLabel(session.status)
                            return (
                                <div
                                    key={session.appointmentId}
                                    className="rounded-lg border border-border bg-white p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:border-[#155E4B]/40 transition-colors"
                                >
                                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                                        <div className="px-2.5 py-2 rounded-md bg-[#E6F2EE] text-[#114D3E] font-mono text-sm font-semibold tabular-nums shrink-0 flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {session.time || '--:--'}
                                        </div>

                                        <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-semibold text-foreground truncate">
                                                    {session.patientName}
                                                </p>
                                                <Badge variant="outline" className={`text-[10px] ${st.className}`}>
                                                    {st.label}
                                                </Badge>
                                                {session.evolutionSigned ? (
                                                    <Badge className="bg-[#155E4B] text-white hover:bg-[#155E4B] text-[10px] gap-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Assinada
                                                    </Badge>
                                                ) : session.evolutionDraft ? (
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
                                                        Rascunho
                                                    </Badge>
                                                ) : null}
                                                {session.appointmentType === 'online' && (
                                                    <Badge variant="outline" className="text-[10px] gap-1">
                                                        <Video className="w-3 h-3" />
                                                        Online
                                                    </Badge>
                                                )}
                                                {session.hasBiometrics && (
                                                    <span
                                                        className="inline-flex items-center text-[11px] text-[#155E4B]"
                                                        title="Biometria facial ativa"
                                                    >
                                                        <ScanFace className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                            </div>
                                            {session.patientBirthDate && (
                                                <p className="text-[11px] text-muted-foreground">
                                                    Nascimento: {session.patientBirthDate.split('-').reverse().join('/')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3 ações diretas sem navegar por menus */}
                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                        <Button
                                            asChild
                                            size="sm"
                                            className="min-h-[40px] px-3 text-xs bg-[#155E4B] hover:bg-[#0F4C3A] text-white gap-1.5"
                                        >
                                            <Link href={`/dashboard/prontuarios/${session.appointmentId}`}>
                                                <FileSignature className="w-3.5 h-3.5" />
                                                {session.evolutionSigned ? 'Ver Evolução' : 'Evoluir / Assinar'}
                                            </Link>
                                        </Button>

                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="min-h-[40px] px-3 text-xs border-border gap-1.5"
                                        >
                                            <Link href={`/dashboard/pacientes/${session.patientId}?tab=evolutions`}>
                                                <Activity className="w-3.5 h-3.5 text-[#155E4B]" />
                                                Planos / Tatame
                                            </Link>
                                        </Button>

                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="min-h-[40px] px-3 text-xs border-border gap-1.5"
                                        >
                                            <Link href={`/dashboard/pacientes/${session.patientId}`}>
                                                <User className="w-3.5 h-3.5 text-muted-foreground" />
                                                <HeartHandshake className="w-3.5 h-3.5 text-[#155E4B]" />
                                                Ficha
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

