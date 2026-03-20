'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, UserPlus, Users, Clock, Mail } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useProfessionalLabel } from '@/lib/hooks/use-professional-label'

interface SetupStatus {
    hasDoctor: boolean
    hasPatient: boolean
    hasSchedule: boolean
    hasSmtp: boolean
    planType: string
}

export function InitialSetup() {
    const profLabel = useProfessionalLabel()
    const [status, setStatus] = useState<SetupStatus>({
        hasDoctor: false,
        hasPatient: false,
        hasSchedule: false,
        hasSmtp: false,
        planType: 'BASIC'
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
            title: `Cadastrar Primeiro ${profLabel.singular}`,
            description: `Adicione os ${profLabel.plural.toLowerCase()} que irão atender na clínica`,
            icon: UserPlus,
            completed: status.hasDoctor,
            href: '/dashboard/medicos?action=novo',
            action: 'Começar'
        },
        {
            title: 'Cadastrar Primeiro Paciente',
            description: 'Registre seus pacientes no sistema',
            icon: Users,
            completed: status.hasPatient,
            href: '/dashboard/pacientes?action=novo',
            action: 'Começar'
        },
        {
            title: 'Configurar Horários de Atendimento',
            description: `Defina os horários de cada ${profLabel.singular.toLowerCase()}`,
            icon: Clock,
            completed: status.hasSchedule,
            href: '/dashboard/horarios',
            action: 'Começar'
        }
    ]

    const allCompleted = status.hasDoctor && status.hasPatient && status.hasSchedule

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

    // Tudo completo (setup + SMTP) → não renderiza nada
    if (allCompleted && status.hasSmtp) {
        return null
    }

    // Setup completo mas SMTP pendente → apenas banner discreto
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

    // Setup incompleto → mostra card principal de configuração + banner SMTP discreto
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Configure seu CliniGo</CardTitle>
                    <p className="text-muted-foreground">
                        Complete as etapas essenciais para começar a usar o sistema
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                        {setupSteps.map((step) => (
                            <Card
                                key={step.title}
                                className={step.completed ? 'border-green-200 bg-green-50' : ''}
                            >
                                <CardContent className="pt-6">
                                    <div className="flex flex-col items-center text-center space-y-3">
                                        <div
                                            className={`p-3 rounded-full ${step.completed
                                                ? 'bg-green-100'
                                                : 'bg-primary/10'
                                                }`}
                                        >
                                            <step.icon
                                                className={`w-6 h-6 ${step.completed
                                                    ? 'text-green-600'
                                                    : 'text-primary'
                                                    }`}
                                            />
                                        </div>

                                        <h3 className="font-semibold">{step.title}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {step.description}
                                        </p>

                                        {step.completed ? (
                                            <div className="flex items-center gap-2 text-green-600">
                                                <CheckCircle className="w-4 h-4" />
                                                <span className="text-sm font-medium">Concluído</span>
                                            </div>
                                        ) : (
                                            <Link href={step.href} className="w-full">
                                                <Button className="w-full">{step.action}</Button>
                                            </Link>
                                        )}
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
