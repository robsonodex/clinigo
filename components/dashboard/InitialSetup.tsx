'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
    Check,
    CheckCircle2,
    UserPlus,
    Users,
    Clock,
    Mail,
    MessageCircle,
    Calendar,
    ArrowRight,
    BookOpen,
    ClipboardCheck,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useProfessionalLabel } from '@/lib/hooks/use-professional-label'

interface SetupStatus {
    hasDoctor: boolean
    hasPatient: boolean
    hasSchedule: boolean
    hasWhatsApp: boolean
    hasAppointment: boolean
    hasSmtp: boolean
    planType: string
    clinicCreatedAt: string | null
}

export function InitialSetup() {
    const profLabel = useProfessionalLabel()
    const [status, setStatus] = useState<SetupStatus>({
        hasDoctor: false,
        hasPatient: false,
        hasSchedule: false,
        hasWhatsApp: false,
        hasAppointment: false,
        hasSmtp: false,
        planType: 'BASIC',
        clinicCreatedAt: null,
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadSetupStatus()
    }, [])

    async function loadSetupStatus() {
        try {
            const res = await fetch('/api/setup/status')
            if (res.ok) {
                const data = await res.json()
                setStatus(data)
            }
        } catch (error) {
            console.error('Erro ao carregar status:', error)
        } finally {
            setLoading(false)
        }
    }

    const setupSteps = [
        {
            title: `Adicionar ${profLabel.singular}`,
            description: `Cadastre os ${profLabel.plural.toLowerCase()} que irão atender na clínica`,
            icon: UserPlus,
            completed: status.hasDoctor,
            href: '/dashboard/medicos?action=novo',
            action: 'Cadastrar',
        },
        {
            title: 'Configurar Horários',
            description: `Defina a grade de atendimento de cada ${profLabel.singular.toLowerCase()}`,
            icon: Clock,
            completed: status.hasSchedule,
            href: '/dashboard/horarios',
            action: 'Configurar',
        },
        {
            title: 'Cadastrar Paciente',
            description: 'Registre o primeiro paciente no sistema',
            icon: Users,
            completed: status.hasPatient,
            href: '/dashboard/pacientes?action=novo',
            action: 'Cadastrar',
        },
        {
            title: 'Conectar WhatsApp',
            description: 'Integre o WhatsApp para lembretes e confirmações',
            icon: MessageCircle,
            completed: status.hasWhatsApp,
            href: '/dashboard/whatsapp',
            action: 'Conectar',
        },
        {
            title: 'Primeiro Agendamento',
            description: 'Crie um atendimento para validar o fluxo completo',
            icon: Calendar,
            completed: status.hasAppointment,
            href: '/dashboard/agenda',
            action: 'Agendar',
        },
    ]

    const completedCount = setupSteps.filter((s) => s.completed).length
    const totalSteps = setupSteps.length
    const progressPercent = Math.round((completedCount / totalSteps) * 100)
    const allCompleted = completedCount === totalSteps

    // Verificar se clínica tem menos de 30 dias
    const isNewClinic = (() => {
        if (!status.clinicCreatedAt) return true
        const created = new Date(status.clinicCreatedAt)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays < 30
    })()

    if (loading) {
        return (
            <Card className="border-border bg-card">
                <CardContent className="py-8">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Oculta onboarding completamente se a clínica já tiver os cadastros básicos ou se for uma clínica antiga (> 30 dias)
    const hasBasicSetup = status.hasDoctor && status.hasPatient && status.hasAppointment
    if (hasBasicSetup || !isNewClinic || allCompleted) {
        return null
    }

    // Setup completo mas SMTP pendente → banner discreto
    if (allCompleted && !status.hasSmtp) {
        return (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl border border-amber-300/70 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/25">
                <Mail className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                <p className="text-sm text-amber-900 dark:text-amber-200 flex-1">
                    Configure o <strong>SMTP</strong> para habilitar envio de e-mails (confirmações, lembretes e avisos).
                </p>
                <div className="flex items-center gap-2 shrink-0">
                    <Button asChild variant="ghost" size="sm" className="text-xs h-8 px-2.5">
                        <Link prefetch={false} href="/dashboard/help#configuracoes-minha-clinica">
                            Ver guia
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                        <Link prefetch={false} href="/dashboard/configuracoes">
                            <Mail className="w-3.5 h-3.5 mr-1.5" />
                            Configurar
                        </Link>
                    </Button>
                </div>
            </div>
        )
    }

    // Setup incompleto + clínica nova → mostra painel editorial com progresso e etapas
    return (
        <div className="space-y-4">
            <Card className="border-primary/25 bg-card shadow-xs">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-primary">
                                <ClipboardCheck className="w-4 h-4" />
                                <span>Primeiros Passos</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <CardTitle className="text-lg font-semibold text-foreground">
                                    Configure sua clínica no CliniGo
                                </CardTitle>
                                <Badge variant="success" className="tabular-nums text-xs">
                                    {progressPercent}%
                                </Badge>
                            </div>
                            <p className="text-muted-foreground text-xs sm:text-sm">
                                {completedCount} de {totalSteps} etapas concluídas — complete o fluxo abaixo para iniciar os atendimentos.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Button asChild variant="outline" size="sm" className="text-xs gap-1.5">
                                <Link prefetch={false} href="/dashboard/help">
                                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                                    Manual (Help)
                                </Link>
                            </Button>
                            <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
                                <Link prefetch={false} href="/dashboard/onboarding">
                                    Checklist completo
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="pt-3">
                        <Progress value={progressPercent} className="h-2" />
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {setupSteps.map((step, index) => (
                            <Card
                                key={step.title}
                                className={`h-full flex flex-col transition-all ${
                                    step.completed
                                        ? 'border-primary/30 bg-accent/35'
                                        : 'border-border bg-background/60 hover:border-primary/40 hover:shadow-xs'
                                }`}
                            >
                                <CardContent className="p-4 flex-1 flex flex-col justify-between">
                                    <div className="flex flex-col items-center text-center flex-1">
                                        {/* Step number + icon */}
                                        <div className="relative mb-3">
                                            <div
                                                className={`w-11 h-11 rounded-lg flex items-center justify-center ${
                                                    step.completed
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-accent text-accent-foreground'
                                                }`}
                                            >
                                                <step.icon className="w-5 h-5" />
                                            </div>
                                            <span
                                                className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold border tabular-nums ${
                                                    step.completed
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'bg-card text-muted-foreground border-border'
                                                }`}
                                            >
                                                {step.completed ? <Check className="w-3 h-3" /> : index + 1}
                                            </span>
                                        </div>

                                        <div className="flex flex-col items-center justify-center flex-1 w-full space-y-1.5 mb-3">
                                            <h3 className="font-semibold text-sm leading-tight min-h-[2.25rem] flex items-center justify-center text-center text-foreground">
                                                {step.title}
                                            </h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed min-h-[2.5rem] flex items-center justify-center text-center line-clamp-2">
                                                {step.description}
                                            </p>
                                        </div>

                                        <div className="w-full mt-auto pt-1">
                                            {step.completed ? (
                                                <div className="flex items-center justify-center gap-1.5 text-primary min-h-[36px]">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span className="text-xs font-semibold">Concluído</span>
                                                </div>
                                            ) : (
                                                <Button asChild size="sm" className="w-full text-xs">
                                                    <Link prefetch={false} href={step.href}>
                                                        {step.action}
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Banner SMTP discreto */}
            {!status.hasSmtp && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl border border-border bg-muted/40">
                    <Mail className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-xs sm:text-sm text-foreground flex-1">
                        <strong>Opcional:</strong> Configure o servidor de e-mail (SMTP) para enviar confirmações e avisos com o domínio da sua clínica.
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button asChild variant="ghost" size="sm" className="text-xs h-8 px-2.5">
                            <Link prefetch={false} href="/dashboard/help#configuracoes-minha-clinica">
                                Ver guia
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                            <Link prefetch={false} href="/dashboard/configuracoes">
                                <Mail className="w-3.5 h-3.5 mr-1.5" />
                                Configurar
                            </Link>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
