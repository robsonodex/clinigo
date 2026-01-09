'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
    CheckCircle2, Circle, Rocket, Building2, Stethoscope,
    Calendar, Users, Settings, Zap, FileText, ArrowRight,
    Award, Clock, HelpCircle
} from 'lucide-react'
import Link from 'next/link'

interface ChecklistItem {
    id: string
    title: string
    description: string
    icon: any
    link: string
    required: boolean
    planRequired?: 'BASIC' | 'STARTER' | 'PRO' | 'ENTERPRISE'
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
    {
        id: 'clinic-profile',
        title: 'Configurar Dados da Clínica',
        description: 'Nome, CNPJ, endereço e logo',
        icon: Building2,
        link: '/dashboard/configuracoes',
        required: true,
    },
    {
        id: 'first-doctor',
        title: 'Cadastrar Primeiro Médico',
        description: 'CRM, especialidade e valor da consulta',
        icon: Stethoscope,
        link: '/dashboard/medicos',
        required: true,
    },
    {
        id: 'schedule-setup',
        title: 'Configurar Horários de Atendimento',
        description: 'Dias e horários que o médico atende',
        icon: Calendar,
        link: '/dashboard/horarios',
        required: true,
    },
    {
        id: 'first-appointment',
        title: 'Criar Primeiro Agendamento (Teste)',
        description: 'Faça um teste completo do fluxo',
        icon: CheckCircle2,
        link: '/dashboard/agenda',
        required: true,
    },
    {
        id: 'notifications',
        title: 'Ativar Notificações Automáticas',
        description: 'Lembretes 24h e 1h antes da consulta',
        icon: Zap,
        link: '/dashboard/notificacoes',
        required: false,
        planRequired: 'STARTER',
    },
    {
        id: 'whatsapp-config',
        title: 'Configurar WhatsApp',
        description: 'Envio automático de mensagens',
        icon: Zap,
        link: '/dashboard/whatsapp',
        required: false,
        planRequired: 'PRO',
    },
    {
        id: 'financial-setup',
        title: 'Configurar Financeiro',
        description: 'Categorias de receitas e despesas',
        icon: FileText,
        link: '/dashboard/financeiro',
        required: false,
        planRequired: 'PRO',
    },
]

export default function OnboardingChecklist() {
    const [completed, setCompleted] = useState<string[]>([])
    const [isVisible, setIsVisible] = useState(true)

    // Load from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('clinigo_onboarding_completed')
        if (saved) {
            setCompleted(JSON.parse(saved))
        }

        // Auto-hide if 100% complete
        const savedVisibility = localStorage.getItem('clinigo_onboarding_visible')
        if (savedVisibility === 'false') {
            setIsVisible(false)
        }
    }, [])

    const toggleItem = (id: string) => {
        const newCompleted = completed.includes(id)
            ? completed.filter(i => i !== id)
            : [...completed, id]

        setCompleted(newCompleted)
        localStorage.setItem('clinigo_onboarding_completed', JSON.stringify(newCompleted))
    }

    const hideChecklist = () => {
        setIsVisible(false)
        localStorage.setItem('clinigo_onboarding_visible', 'false')
    }

    const showChecklist = () => {
        setIsVisible(true)
        localStorage.setItem('clinigo_onboarding_visible', 'true')
    }

    const requiredItems = CHECKLIST_ITEMS.filter(item => item.required)
    const completedRequired = requiredItems.filter(item => completed.includes(item.id)).length
    const progressPercent = (completed.length / CHECKLIST_ITEMS.length) * 100

    if (!isVisible) {
        return (
            <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
                <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Rocket className="h-5 w-5 text-primary" />
                            <div>
                                <p className="font-medium">Guia de Configuração Inicial</p>
                                <p className="text-sm text-muted-foreground">
                                    {completed.length} de {CHECKLIST_ITEMS.length} concluídos ({Math.round(progressPercent)}%)
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={showChecklist}>
                            Mostrar Checklist
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-l-4 border-l-primary bg-gradient-to-br from-primary/5 via-background to-background">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Rocket className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="flex items-center gap 2">
                                🚀 Configuração Inicial
                                {progressPercent === 100 && (
                                    <Badge className="ml-2 bg-green-500">
                                        <Award className="h-3 w-3 mr-1" />
                                        Completo!
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Configure seu CliniGo em poucos passos. Tempo estimado: <Clock className="inline h-3 w-3" /> 15-20 minutos
                            </CardDescription>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={hideChecklist}>
                        Ocultar
                    </Button>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Progresso Geral</span>
                        <span className="text-muted-foreground">
                            {completed.length}/{CHECKLIST_ITEMS.length} itens
                        </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                </div>

                {/* Required Items Progress */}
                {completedRequired < requiredItems.length && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
                        <HelpCircle className="h-4 w-4" />
                        <span>
                            {requiredItems.length - completedRequired} itens obrigatórios restantes
                        </span>
                    </div>
                )}
            </CardHeader>

            <CardContent className="space-y-3">
                {CHECKLIST_ITEMS.map((item) => {
                    const isCompleted = completed.includes(item.id)
                    const Icon = item.icon

                    return (
                        <div
                            key={item.id}
                            className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${isCompleted
                                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                                    : 'bg-card hover:bg-muted/50 border-border'
                                }`}
                        >
                            <Checkbox
                                checked={isCompleted}
                                onCheckedChange={() => toggleItem(item.id)}
                                className="mt-1"
                            />

                            <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-100 dark:bg-green-900/30' : 'bg-primary/10'}`}>
                                <Icon className={`h-5 w-5 ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-primary'}`} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                        {item.title}
                                    </h4>
                                    {item.required && (
                                        <Badge variant="destructive" className="text-xs">
                                            Obrigatório
                                        </Badge>
                                    )}
                                    {item.planRequired && (
                                        <Badge variant="secondary" className="text-xs">
                                            {item.planRequired}+
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {item.description}
                                </p>
                            </div>

                            <Link href={item.link}>
                                <Button variant={isCompleted ? "outline" : "default"} size="sm">
                                    {isCompleted ? 'Revisar' : 'Configurar'}
                                    <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                            </Link>
                        </div>
                    )
                })}

                {/* Success Message */}
                {progressPercent === 100 && (
                    <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 mt-6">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                                    <Award className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-green-900 dark:text-green-100">
                                        🎉 Parabéns! Configuração Concluída
                                    </h3>
                                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                        Seu CliniGo está pronto para uso. Agora você pode começar a agendar consultas e atender pacientes!
                                    </p>
                                    <div className="flex gap-2 mt-4">
                                        <Link href="/dashboard/agenda">
                                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                                Ir para Agenda
                                            </Button>
                                        </Link>
                                        <Button variant="outline" size="sm" onClick={hideChecklist}>
                                            Ocultar Checklist
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </CardContent>
        </Card>
    )
}
