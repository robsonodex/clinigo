'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    MessageCircle,
    Calendar,
    CalendarDays,
    ChevronRight,
    User,
    ArrowRight,
} from 'lucide-react'

interface BirthdayPatient {
    id: string
    full_name: string
    date_of_birth: string
    phone?: string
    email?: string
    birth_day: number
    birth_month: number
    is_today: boolean
    days_until: number
    turning_age: number
}

interface BirthdayApiResponse {
    success: boolean
    today: BirthdayPatient[]
    upcoming: BirthdayPatient[]
    this_month: BirthdayPatient[]
    total_today: number
}

interface BirthdayWidgetProps {
    compact?: boolean
    clinicName?: string
}

export function BirthdayWidget({ compact = false, clinicName = 'CliniGO' }: BirthdayWidgetProps) {
    const [tab, setTab] = useState<'today' | 'upcoming' | 'month'>('today')

    const { data, isLoading, refetch } = useQuery<BirthdayApiResponse>({
        queryKey: ['patients-birthdays'],
        queryFn: async () => {
            const res = await fetch('/api/patients/birthdays')
            if (!res.ok) throw new Error('Falha ao carregar aniversariantes')
            return res.json()
        },
        staleTime: 1000 * 60 * 10, // 10 minutos
    })

    const todayCount = data?.today?.length || 0
    const upcomingCount = data?.upcoming?.length || 0

    // Enviar mensagem de felicitações via WhatsApp
    const sendBirthdayWhatsApp = (patient: BirthdayPatient) => {
        if (!patient.phone) return

        const cleanPhone = patient.phone.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
        const firstName = (patient.full_name || 'Paciente').split(' ')[0]

        const ageText = patient.turning_age > 0 ? ` pelos seus ${patient.turning_age} anos` : ''
        const message = `Olá ${firstName}! Toda a equipe da clínica te deseja um Feliz Aniversário${ageText}! Muita saúde, realizações e momentos especiais neste dia tão importante!`

        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    const currentList =
        tab === 'today'
            ? data?.today || []
            : tab === 'upcoming'
            ? data?.upcoming || []
            : data?.this_month || []

    return (
        <Card className="border border-border overflow-hidden relative">
            <CardHeader className="pb-3 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                            <CalendarDays className="w-4 h-4" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                Aniversariantes
                                {todayCount > 0 && (
                                    <Badge variant="success" className="font-semibold text-xs px-2 py-0.5 inline-flex items-center tabular-nums">
                                        {todayCount} hoje
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {todayCount > 0
                                    ? `Temos ${todayCount} paciente${todayCount > 1 ? 's' : ''} com aniversário hoje.`
                                    : 'Acompanhe os aniversários de hoje e dos próximos dias'}
                            </CardDescription>
                        </div>
                    </div>

                    {/* Filtros em Abas */}
                    <div className="flex items-center bg-muted/70 p-0.5 rounded-lg text-xs self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => setTab('today')}
                            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                                tab === 'today'
                                    ? 'bg-card text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Hoje ({todayCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('upcoming')}
                            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                                tab === 'upcoming'
                                    ? 'bg-card text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Próximos ({upcomingCount})
                        </button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-2">
                {isLoading ? (
                    <div className="space-y-2 py-2">
                        <Skeleton className="h-14 w-full rounded-lg" />
                        <Skeleton className="h-14 w-full rounded-lg" />
                    </div>
                ) : currentList.length === 0 ? (
                    <div className="text-center py-6 px-4 bg-muted/30 rounded-lg border border-dashed border-border">
                        <CalendarDays className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-xs font-semibold text-foreground">
                            {tab === 'today'
                                ? 'Nenhum aniversariante hoje'
                                : 'Nenhum próximo aniversariante no período'}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {tab === 'today' && upcomingCount > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => setTab('upcoming')}
                                    className="text-primary hover:underline font-medium inline-flex items-center gap-1 mt-1"
                                >
                                    Ver {upcomingCount} próximo{upcomingCount > 1 ? 's' : ''} aniversariante{upcomingCount > 1 ? 's' : ''} <ChevronRight className="w-3 h-3" />
                                </button>
                            ) : (
                                'Os aniversários dos pacientes cadastrados aparecerão aqui.'
                            )}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                        {currentList.map((p) => (
                            <div
                                key={p.id}
                                className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                    p.is_today
                                        ? 'bg-accent/40 border-primary/25'
                                        : 'bg-card border-border/80 hover:border-border'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                            p.is_today
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {p.is_today ? <Calendar className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Link
                                                prefetch={false}
                                                href={`/dashboard/pacientes/${p.id}`}
                                                className="font-semibold text-xs sm:text-sm text-foreground hover:text-primary hover:underline transition-colors"
                                            >
                                                {p.full_name}
                                            </Link>
                                            {p.is_today && (
                                                <Badge variant="success" className="text-[10px] font-semibold px-1.5 py-0 h-4">
                                                    HOJE
                                                </Badge>
                                            )}
                                        </div>

                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 tabular-nums">
                                            <span>
                                                {String(p.birth_day).padStart(2, '0')}/{String(p.birth_month).padStart(2, '0')}
                                            </span>
                                            {p.turning_age > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span className="font-medium text-foreground/80">
                                                        {p.turning_age} anos
                                                    </span>
                                                </>
                                            )}
                                            {!p.is_today && p.days_until > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-primary font-medium">
                                                        em {p.days_until} dia{p.days_until > 1 ? 's' : ''}
                                                    </span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Ações rápidas */}
                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                    {p.phone ? (
                                        <Button
                                            size="sm"
                                            onClick={() => sendBirthdayWhatsApp(p)}
                                            className="h-8 gap-1.5 text-xs font-semibold"
                                            title="Enviar mensagem de Parabéns pelo WhatsApp"
                                        >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                            <span>Parabenizar</span>
                                        </Button>
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground italic">
                                            Sem telefone
                                        </span>
                                    )}

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                        className="h-8 text-xs font-medium"
                                    >
                                        <Link prefetch={false} href={`/dashboard/pacientes/${p.id}`}>
                                            Ver Ficha
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
