'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
    ClipboardCheck,
    Building2,
    Stethoscope,
    Calendar,
    ArrowRight,
    CheckCircle2,
    Clock,
    BookOpen,
} from 'lucide-react'
import Link from 'next/link'
import { useProfessionalLabel } from '@/lib/hooks/use-professional-label'

interface ChecklistItem {
    id: string
    title: string
    description: string
    icon: any
    link: string
    required: boolean
    planRequired?: 'BASICO' | 'AVANCADO' | 'PROFESSIONAL'
}

const getChecklistItems = (profLabel: { singular: string; plural: string }): ChecklistItem[] => [
    {
        id: 'clinic-profile',
        title: 'Configurar Dados da Clínica',
        description: 'Nome, CNPJ, endereço e logotipo institucional',
        icon: Building2,
        link: '/dashboard/configuracoes',
        required: true,
    },
    {
        id: 'first-doctor',
        title: `Cadastrar Primeiro ${profLabel.singular}`,
        description: 'Conselho profissional (CRP, CRFa, CREFITO, CRM), especialidade e valor',
        icon: Stethoscope,
        link: '/dashboard/medicos',
        required: true,
    },
    {
        id: 'schedule-setup',
        title: 'Configurar Horários de Atendimento',
        description: `Dias e turnos em que o ${profLabel.singular.toLowerCase()} atende`,
        icon: Calendar,
        link: '/dashboard/horarios',
        required: true,
    },
]

export default function OnboardingChecklist() {
    const profLabel = useProfessionalLabel()
    const CHECKLIST_ITEMS = getChecklistItems(profLabel)
    const [completed, setCompleted] = useState<string[]>([])
    const [isVisible, setIsVisible] = useState(true)

    // Load from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('clinigo_onboarding_completed')
            if (saved) {
                setCompleted(JSON.parse(saved))
            }

            const savedVisibility = localStorage.getItem('clinigo_onboarding_visible')
            if (savedVisibility === 'false') {
                setIsVisible(false)
            }
        } catch {
            // Ignore storage errors
        }
    }, [])

    const toggleItem = (id: string) => {
        const newCompleted = completed.includes(id)
            ? completed.filter((i) => i !== id)
            : [...completed, id]

        setCompleted(newCompleted)
        try {
            localStorage.setItem('clinigo_onboarding_completed', JSON.stringify(newCompleted))
        } catch {
            // Ignore storage errors
        }
    }

    const hideChecklist = () => {
        setIsVisible(false)
        try {
            localStorage.setItem('clinigo_onboarding_visible', 'false')
        } catch {
            // Ignore storage errors
        }
    }

    const showChecklist = () => {
        setIsVisible(true)
        try {
            localStorage.setItem('clinigo_onboarding_visible', 'true')
        } catch {
            // Ignore storage errors
        }
    }

    const requiredItems = CHECKLIST_ITEMS.filter((item) => item.required)
    const completedRequired = requiredItems.filter((item) => completed.includes(item.id)).length
    const progressPercent = (completed.length / CHECKLIST_ITEMS.length) * 100

    if (!isVisible) {
        return (
            <Card className="border-l-4 border-l-primary border-border bg-card">
                <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                                <ClipboardCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="font-semibold text-sm text-foreground">Guia de Configuração Inicial</div>
                                <div className="text-xs text-muted-foreground font-mono tabular-nums">
                                    {completed.length} de {CHECKLIST_ITEMS.length} concluídos ({Math.round(progressPercent)}%)
                                </div>
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
        <Card className="border-l-4 border-l-primary border-border bg-card">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-accent text-accent-foreground rounded-lg shrink-0">
                            <ClipboardCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                                Configuração Inicial
                                {progressPercent === 100 && (
                                    <Badge variant="success" className="text-[11px] gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Concluído
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-1.5 mt-1 text-xs">
                                <span>Configure seu CliniGo em 3 passos essenciais. Tempo estimado:</span>
                                <span className="inline-flex items-center gap-1 font-mono text-foreground">
                                    <Clock className="h-3 w-3 text-primary" /> 5–10 min
                                </span>
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button asChild variant="outline" size="sm" className="text-xs gap-1.5">
                            <Link prefetch={false} href="/dashboard/help">
                                <BookOpen className="h-3.5 w-3.5 text-primary" />
                                Ajuda
                            </Link>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={hideChecklist} className="text-xs">
                            Ocultar
                        </Button>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">Progresso Geral</span>
                        <span className="text-muted-foreground font-mono tabular-nums">
                            {completed.length}/{CHECKLIST_ITEMS.length} etapas
                        </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                </div>

                {/* Required Items Progress */}
                {completedRequired < requiredItems.length && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span>
                            {requiredItems.length - completedRequired} etapa(s) essencial(is) pendente(s)
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
                            className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border transition-all ${
                                isCompleted
                                    ? 'bg-accent/35 border-primary/25'
                                    : 'bg-background/60 hover:bg-muted/40 border-border'
                            }`}
                        >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <Checkbox
                                    checked={isCompleted}
                                    onCheckedChange={() => toggleItem(item.id)}
                                    className="mt-1"
                                />

                                <div className={`p-2 rounded-lg shrink-0 ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'}`}>
                                    <Icon className="h-4 w-4" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h4 className={`font-semibold text-sm ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                            {item.title}
                                        </h4>
                                        {item.required && !isCompleted && (
                                            <Badge variant="outline" className="text-[10px]">
                                                Essencial
                                            </Badge>
                                        )}
                                        {item.planRequired && (
                                            <Badge variant="secondary" className="text-[10px]">
                                                {item.planRequired}+
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {item.description}
                                    </p>
                                </div>
                            </div>

                            <Button asChild variant={isCompleted ? 'outline' : 'default'} size="sm" className="shrink-0">
                                <Link prefetch={false} href={item.link}>
                                    {isCompleted ? 'Revisar' : 'Configurar'}
                                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                </Link>
                            </Button>
                        </div>
                    )
                })}

                {/* Success Message */}
                {progressPercent === 100 && (
                    <Card className="border-primary/25 bg-accent/40 mt-4">
                        <CardContent className="p-5">
                            <div className="flex flex-col sm:flex-row items-start gap-4">
                                <div className="p-2.5 bg-primary text-primary-foreground rounded-lg shrink-0">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-sm text-foreground">
                                        Configuração inicial concluída
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Seu CliniGo está pronto para uso. Agora você já pode agendar consultas e atender pacientes.
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        <Button asChild size="sm">
                                            <Link prefetch={false} href="/dashboard/agenda">
                                                Ir para Agenda
                                            </Link>
                                        </Button>
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
