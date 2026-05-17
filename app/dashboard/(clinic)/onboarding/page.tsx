'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    CheckCircle2,
    Circle,
    UserPlus,
    Clock,
    Users,
    MessageCircle,
    Calendar,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    PartyPopper,
    RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
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

export default function OnboardingPage() {
    const profLabel = useProfessionalLabel()
    const [status, setStatus] = useState<SetupStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const loadStatus = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        try {
            const res = await fetch('/api/setup/status')
            if (res.ok) {
                setStatus(await res.json())
            }
        } catch (error) {
            console.error('Erro ao carregar status:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        loadStatus()
    }, [loadStatus])

    const steps = status ? [
        {
            key: 'doctor',
            title: `Adicionar ${profLabel.singular}`,
            description: `Cadastre os ${profLabel.plural.toLowerCase()} que irão atender. O sistema precisa de pelo menos um profissional para funcionar.`,
            icon: UserPlus,
            completed: status.hasDoctor,
            href: '/dashboard/medicos?action=novo',
            action: `Cadastrar ${profLabel.singular}`,
            tip: `Vá em Equipe → ${profLabel.plural} e clique em "Novo".`,
        },
        {
            key: 'schedule',
            title: 'Configurar Horários',
            description: `Defina os dias e horários de atendimento de cada ${profLabel.singular.toLowerCase()}. Isso habilita o agendamento online.`,
            icon: Clock,
            completed: status.hasSchedule,
            href: '/dashboard/horarios',
            action: 'Configurar Horários',
            tip: 'Vá em Agendamento → Horários e defina a grade de cada profissional.',
        },
        {
            key: 'patient',
            title: 'Cadastrar Primeiro Paciente',
            description: 'Registre o primeiro paciente no sistema. Você pode importar uma lista depois.',
            icon: Users,
            completed: status.hasPatient,
            href: '/dashboard/pacientes?action=novo',
            action: 'Cadastrar Paciente',
            tip: 'Vá em Equipe → Pacientes e clique em "Novo Paciente".',
        },
        {
            key: 'whatsapp',
            title: 'Conectar WhatsApp',
            description: 'Integre o WhatsApp para enviar lembretes automáticos, confirmações e se comunicar com pacientes.',
            icon: MessageCircle,
            completed: status.hasWhatsApp,
            href: '/dashboard/whatsapp',
            action: 'Conectar WhatsApp',
            tip: 'Vá em Comunicação → WhatsApp e escaneie o QR Code com seu celular.',
        },
        {
            key: 'appointment',
            title: 'Testar Agendamento',
            description: 'Crie um agendamento de teste para validar que o fluxo completo está funcionando corretamente.',
            icon: Calendar,
            completed: status.hasAppointment,
            href: '/dashboard/agenda',
            action: 'Criar Agendamento',
            tip: 'Vá em Agendamento → Agenda, escolha um horário e agende um paciente.',
        },
    ] : []

    const completedCount = steps.filter(s => s.completed).length
    const totalSteps = steps.length
    const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0
    const allCompleted = completedCount === totalSteps

    if (loading) {
        return (
            <div className="container mx-auto py-8 px-4 space-y-6 max-w-4xl">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-4 w-96" />
                <Skeleton className="h-24 w-full" />
                <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 px-4 space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                                <ArrowLeft className="w-3 h-3" />
                                Dashboard
                            </Button>
                        </Link>
                    </div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-primary" />
                        Checklist de Configuração
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Complete as etapas abaixo para começar a usar o CliniGo
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadStatus(true)}
                    disabled={refreshing}
                    className="gap-1"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
            </div>

            {/* Barra de progresso */}
            <Card className={`border-2 transition-all ${allCompleted
                    ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30'
                    : 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30'
                }`}>
                <CardContent className="py-5">
                    {allCompleted ? (
                        <div className="flex items-center justify-center gap-3">
                            <PartyPopper className="w-8 h-8 text-green-600" />
                            <div>
                                <h3 className="font-bold text-green-800 dark:text-green-300 text-lg">
                                    Parabéns! Tudo configurado! 🎉
                                </h3>
                                <p className="text-sm text-green-700 dark:text-green-400">
                                    Sua clínica está pronta para operar com o CliniGo.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold">
                                    Progresso: {completedCount} de {totalSteps} etapas
                                </h3>
                                <Badge variant={progressPercent >= 80 ? 'default' : 'secondary'} className="text-sm px-3">
                                    {progressPercent}%
                                </Badge>
                            </div>
                            <Progress value={progressPercent} className="h-3" />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Lista de etapas */}
            <div className="space-y-3">
                {steps.map((step, index) => (
                    <Card
                        key={step.key}
                        className={`transition-all ${step.completed
                                ? 'border-green-200 bg-green-50/40 dark:bg-green-950/10'
                                : 'hover:shadow-md hover:border-primary/30'
                            }`}
                    >
                        <CardContent className="py-5">
                            <div className="flex items-start gap-4">
                                {/* Status icon */}
                                <div className="flex-shrink-0 mt-0.5">
                                    {step.completed ? (
                                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                            <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <step.icon className={`w-4 h-4 ${step.completed ? 'text-green-600' : 'text-primary'}`} />
                                        <h3 className={`font-semibold ${step.completed ? 'text-green-800 dark:text-green-300' : ''}`}>
                                            {step.title}
                                        </h3>
                                        {step.completed && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-700 border-green-300">
                                                Concluído
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {step.description}
                                    </p>
                                    {!step.completed && (
                                        <p className="text-xs text-muted-foreground/70 mt-1.5 italic">
                                            💡 {step.tip}
                                        </p>
                                    )}
                                </div>

                                {/* Action */}
                                <div className="flex-shrink-0">
                                    {step.completed ? (
                                        <Link href={step.href}>
                                            <Button variant="ghost" size="sm" className="text-xs text-green-700 hover:text-green-800">
                                                Revisar
                                                <ArrowRight className="w-3 h-3 ml-1" />
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Link href={step.href}>
                                            <Button size="sm" className="gap-1">
                                                {step.action}
                                                <ArrowRight className="w-3 h-3" />
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Ações do rodapé */}
            <div className="flex items-center justify-between pt-4 border-t">
                <Link href="/dashboard">
                    <Button variant="outline" className="gap-1">
                        <ArrowLeft className="w-4 h-4" />
                        Voltar ao Dashboard
                    </Button>
                </Link>
                {allCompleted && (
                    <Link href="/dashboard/agenda">
                        <Button className="gap-1">
                            Ir para a Agenda
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                )}
            </div>
        </div>
    )
}
