'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, UserPlus, Users, Clock, Mail, MessageCircle, Calendar, ArrowRight, Circle } from 'lucide-react'
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
            description: `Defina os horários de atendimento de cada ${profLabel.singular.toLowerCase()}`,
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
            description: 'Integre o WhatsApp para enviar lembretes e se comunicar',
            icon: MessageCircle,
            completed: status.hasWhatsApp,
            href: '/dashboard/whatsapp',
            action: 'Conectar',
        },
        {
            title: 'Testar Agendamento',
            description: 'Crie um agendamento para validar o fluxo completo',
            icon: Calendar,
            completed: status.hasAppointment,
            href: '/dashboard/agenda',
            action: 'Agendar',
        },
    ]

    const completedCount = setupSteps.filter(s => s.completed).length
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
            <Card>
                <CardContent className="py-8">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Oculta onboarding completamente se a clínica já tiver os cadastros básicos (médico, paciente e agendamento) ou se for uma clínica antiga (> 30 dias)
    const hasBasicSetup = status.hasDoctor && status.hasPatient && status.hasAppointment;
    if (hasBasicSetup || !isNewClinic || allCompleted) {
        return null;
    }

    // Setup completo mas SMTP pendente → banner discreto
    if (allCompleted && !status.hasSmtp) {
        return (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
                <Mail className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
                    Configure o <strong>SMTP</strong> para habilitar envio de e-mails (confirmações, lembretes, consultas).
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href="/help/smtp">
                        <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                            Tutorial
                        </Button>
                    </Link>
                    <Link href="/dashboard/configuracoes">
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                            <Mail className="w-3 h-3 mr-1" />
                            Configurar
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    // Setup incompleto + clínica nova → mostra card completo com barra de progresso
    return (
        <div className="space-y-4">
            {/* Barra de progresso */}
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">Progresso do Onboarding</h3>
                            <Badge variant={progressPercent === 100 ? 'default' : 'secondary'} className="text-xs">
                                {progressPercent}%
                            </Badge>
                        </div>
                        <Link href="/dashboard/onboarding">
                            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                                Ver checklist completo
                                <ArrowRight className="w-3 h-3" />
                            </Button>
                        </Link>
                    </div>
                    <Progress value={progressPercent} className="h-2.5" />
                    <p className="text-xs text-muted-foreground mt-2">
                        {completedCount} de {totalSteps} etapas concluídas
                    </p>
                </CardContent>
            </Card>

            {/* Etapas de configuração */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Configure seu CliniGo</CardTitle>
                    <p className="text-muted-foreground text-sm">
                        Complete as etapas para começar a usar o sistema
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {setupSteps.map((step, index) => (
                            <Card
                                key={step.title}
                                className={`h-full flex flex-col transition-all ${step.completed
                                        ? 'border-green-200 bg-green-50/60 dark:bg-green-950/20'
                                        : 'hover:shadow-sm hover:border-primary/30'
                                    }`}
                            >
                                <CardContent className="p-4 pt-5 flex-1 flex flex-col justify-between">
                                    <div className="flex flex-col items-center text-center flex-1">
                                        {/* Step number + icon */}
                                        <div className="relative mb-3">
                                            <div
                                                className={`p-2.5 rounded-full ${step.completed
                                                        ? 'bg-green-100 dark:bg-green-900/30'
                                                        : 'bg-primary/10'
                                                    }`}
                                            >
                                                <step.icon
                                                    className={`w-5 h-5 ${step.completed
                                                            ? 'text-green-600'
                                                            : 'text-primary'
                                                        }`}
                                                />
                                            </div>
                                            <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step.completed
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-muted text-muted-foreground'
                                                }`}>
                                                {step.completed ? '✓' : index + 1}
                                            </span>
                                        </div>

                                        <div className="flex flex-col items-center justify-center flex-1 w-full space-y-1.5 mb-3">
                                            <h3 className="font-semibold text-sm leading-tight min-h-[2.5rem] flex items-center justify-center text-center">
                                                {step.title}
                                            </h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed min-h-[2.5rem] flex items-center justify-center text-center line-clamp-2">
                                                {step.description}
                                            </p>
                                        </div>

                                        <div className="w-full mt-auto pt-1">
                                            {step.completed ? (
                                                <div className="flex items-center justify-center gap-1.5 text-green-600 min-h-[44px]">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span className="text-xs font-medium">Concluído</span>
                                                </div>
                                            ) : (
                                                <Link href={step.href} className="w-full block">
                                                    <Button size="sm" className="w-full text-xs min-h-[44px]">
                                                        {step.action}
                                                    </Button>
                                                </Link>
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
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
                    <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <p className="text-sm text-blue-800 dark:text-blue-300 flex-1">
                        <strong>Opcional:</strong> Configure o SMTP para habilitar envio de e-mails.
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Link href="/help/smtp">
                            <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                                Tutorial
                            </Button>
                        </Link>
                        <Link href="/dashboard/configuracoes">
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                                <Mail className="w-3 h-3 mr-1" />
                                Configurar
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
