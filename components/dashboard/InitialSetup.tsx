'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, UserPlus, Users, Clock, Mail, MessageSquare, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface SetupStatus {
    hasDoctor: boolean
    hasPatient: boolean
    hasSchedule: boolean
    hasSmtp: boolean
    planType: string
}

export function InitialSetup() {
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
            title: 'Cadastrar Primeiro Médico',
            description: 'Adicione os médicos que irão atender na clínica',
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
            description: 'Defina os horários de cada médico',
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

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Configure seu CliniGo</CardTitle>
                    <p className="text-muted-foreground">
                        Complete as etapas essenciais para começar a usar o sistema
                    </p>
                </CardHeader>
                <CardContent>
                    {allCompleted && (
                        <Alert className="mb-6 bg-green-50 border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                <strong>Parabéns!</strong> Configuração inicial concluída! Seu
                                sistema está pronto para uso.
                            </AlertDescription>
                        </Alert>
                    )}

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

            {/* Configurações Opcionais */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Configurações Opcionais
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* SMTP */}
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <Mail className="w-5 h-5 text-blue-600 mt-1" />
                            <div className="flex-1">
                                <h3 className="font-semibold mb-1">
                                    Configuração de E-mail (SMTP)
                                </h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Para que todas as funcionalidades de envio de e-mail
                                    funcionem corretamente (confirmações, lembretes, links de
                                    teleconsulta), é necessário configurar o SMTP.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Link href="/dashboard/configuracoes">
                                        <Button variant="outline" size="sm">
                                            <Mail className="w-4 h-4 mr-2" />
                                            Configurar Agora
                                        </Button>
                                    </Link>
                                    <Link href="/help/smtp">
                                        <Button variant="ghost" size="sm">
                                            Ver Tutorial Completo →
                                        </Button>
                                    </Link>
                                </div>

                                {!status.hasSmtp && (
                                    <Alert className="mt-3">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription className="text-sm">
                                            <strong>Não sabe como configurar?</strong>
                                            <br />
                                            Consulte seu departamento de TI ou{' '}
                                            <Link
                                                href="/help/smtp"
                                                className="text-primary underline"
                                            >
                                                veja nosso tutorial passo a passo
                                            </Link>
                                            .
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-6" />

                    {/* WhatsApp */}
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <MessageSquare className="w-5 h-5 text-green-600 mt-1" />
                            <div className="flex-1">
                                <h3 className="font-semibold mb-1">
                                    WhatsApp Automático
                                </h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    O envio automático de mensagens via WhatsApp está disponível
                                    apenas nos planos:
                                </p>

                                <ul className="text-sm space-y-1 mb-3">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span><strong>Professional</strong> (R$ 549/mês)</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span><strong>Enterprise</strong> (R$ 799/mês)</span>
                                    </li>
                                </ul>

                                {(status.planType === 'BASIC' || status.planType === 'STARTER') ? (
                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription className="text-sm">
                                            <strong>Seu plano atual: {status.planType}</strong>
                                            <br />
                                            Atualize para Professional ou Enterprise e desfrute de
                                            todos os recursos do CliniGo.
                                            <div className="mt-3">
                                                <Link href="/dashboard/planos?upgrade=whatsapp">
                                                    <Button size="sm" className="w-full sm:w-auto">
                                                        Atualizar Plano e Desfrutar de Todos os Recursos →
                                                    </Button>
                                                </Link>
                                            </div>
                                        </AlertDescription>
                                    </Alert>
                                ) : (
                                    <Alert className="bg-green-50 border-green-200">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <AlertDescription className="text-green-800">
                                            <strong>WhatsApp disponível no seu plano!</strong>
                                            <br />
                                            Configure em Configurações → Integrações.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
