'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    CheckCircle2,
    UserPlus,
    Clock,
    Users,
    MessageCircle,
    Calendar,
    ArrowRight,
    ArrowLeft,
    RefreshCw,
    ClipboardCheck,
    BookOpen,
    Building2,
    Mail,
    ShieldCheck,
    Stethoscope,
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
            title: `Cadastrar ${profLabel.singular}`,
            description: `Adicione os ${profLabel.plural.toLowerCase()} que atendem na clínica com conselho profissional e especialidade.`,
            icon: UserPlus,
            completed: status.hasDoctor,
            href: '/dashboard/medicos?action=novo',
            helpAnchor: 'equipe-profissionais-medicos',
            action: `Cadastrar ${profLabel.singular}`,
            estimatedTime: '2 min',
            tip: `Caminho no menu: Equipe → ${profLabel.plural} → Novo.`,
        },
        {
            key: 'schedule',
            title: 'Configurar Grade de Horários',
            description: `Defina os dias, turnos e duração das consultas de cada ${profLabel.singular.toLowerCase()} para liberar agendamentos.`,
            icon: Clock,
            completed: status.hasSchedule,
            href: '/dashboard/horarios',
            helpAnchor: 'fila-espera-horarios',
            action: 'Configurar Horários',
            estimatedTime: '3 min',
            tip: 'Caminho no menu: Agendamento → Horários.',
        },
        {
            key: 'patient',
            title: 'Cadastrar Primeiro Paciente',
            description: 'Registre um paciente ou importe sua base existente em planilha CSV/Excel para começar.',
            icon: Users,
            completed: status.hasPatient,
            href: '/dashboard/pacientes?action=novo',
            helpAnchor: 'diretorio-pacientes-cadastro',
            action: 'Cadastrar Paciente',
            estimatedTime: '1 min',
            tip: 'Caminho no menu: Equipe → Pacientes → Novo Paciente.',
        },
        {
            key: 'whatsapp',
            title: 'Conectar WhatsApp da Clínica',
            description: 'Automatize lembretes de sessão, confirmações de presença e mensagens diretas com pacientes.',
            icon: MessageCircle,
            completed: status.hasWhatsApp,
            href: '/dashboard/whatsapp',
            helpAnchor: 'crm-whatsapp-automacoes',
            action: 'Conectar WhatsApp',
            estimatedTime: '2 min',
            tip: 'Caminho no menu: Comunicação → WhatsApp → Escanear QR Code.',
        },
        {
            key: 'appointment',
            title: 'Realizar Primeiro Agendamento',
            description: 'Crie um atendimento na agenda para validar recepção, confirmações e fluxo clínico ponta a ponta.',
            icon: Calendar,
            completed: status.hasAppointment,
            href: '/dashboard/agenda',
            helpAnchor: 'agenda-agendamento-atendimento',
            action: 'Abrir Agenda',
            estimatedTime: '1 min',
            tip: 'Caminho no menu: Agendamento → Agenda → Novo Agendamento.',
        },
    ] : []

    const completedCount = steps.filter((s) => s.completed).length
    const totalSteps = steps.length
    const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0
    const allCompleted = totalSteps > 0 && completedCount === totalSteps
    const nextStep = steps.find((s) => !s.completed)

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto py-4 space-y-6">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto py-2 space-y-6">
            {/* Cabeçalho Editorial */}
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <Link prefetch={false} href="/dashboard">
                                <Button variant="ghost" size="sm" className="gap-1.5 h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Voltar ao Painel
                                </Button>
                            </Link>
                        </div>
                        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary pt-1">
                            <ClipboardCheck className="w-4 h-4 shrink-0" />
                            <span>Implantação Guiada da Clínica</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            Primeiros Passos no CliniGo
                        </h1>
                        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                            Siga a sequência abaixo para deixar sua operação pronta em menos de 10 minutos. O progresso é atualizado automaticamente conforme você configura cada módulo.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                            <Link prefetch={false} href="/dashboard/help">
                                <BookOpen className="w-3.5 h-3.5 text-primary" />
                                Manual de Uso (Help)
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadStatus(true)}
                            disabled={refreshing}
                            className="gap-1.5"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                    </div>
                </div>

                {/* Barra de Progresso */}
                <div
                    className={`rounded-lg border p-4 transition-colors ${
                        allCompleted
                            ? 'border-primary/30 bg-accent/50'
                            : 'border-border bg-muted/40'
                    }`}
                >
                    {allCompleted ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-base text-foreground">
                                        Configuração inicial concluída com sucesso
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Sua clínica já está pronta para agendar, atender e acompanhar resultados no CliniGo.
                                    </p>
                                </div>
                            </div>
                            <Button asChild size="sm" className="shrink-0 gap-1.5">
                                <Link prefetch={false} href="/dashboard/agenda">
                                    Ir para a Agenda
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-sm font-semibold text-foreground">
                                        Progresso da implantação: {completedCount} de {totalSteps} etapas
                                    </span>
                                    <Badge variant="success" className="tabular-nums text-xs">
                                        {progressPercent}%
                                    </Badge>
                                </div>
                                {nextStep && (
                                    <Link prefetch={false} href={nextStep.href}>
                                        <Button size="sm" className="h-8 gap-1.5 text-xs">
                                            Próximo passo: {nextStep.action}
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Button>
                                    </Link>
                                )}
                            </div>
                            <Progress value={progressPercent} className="h-2" />
                        </div>
                    )}
                </div>
            </div>

            {/* Fluxo Resumido em 3 Pilares para Novos Usuários */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="border-border bg-card">
                    <CardContent className="p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 mt-0.5">
                            <Building2 className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wider text-primary font-semibold">
                                1 · Estrutura
                            </p>
                            <p className="text-sm font-semibold text-foreground">Dados, Logo e Equipe</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Personalize sua clínica e cadastre os profissionais que realizam atendimentos.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card">
                    <CardContent className="p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 mt-0.5">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wider text-primary font-semibold">
                                2 · Operação
                            </p>
                            <p className="text-sm font-semibold text-foreground">Horários e Agendamentos</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Libere grades de atendimento, recepção e confirmações automáticas por WhatsApp.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card">
                    <CardContent className="p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 mt-0.5">
                            <Stethoscope className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wider text-primary font-semibold">
                                3 · Assistência e Gestão
                            </p>
                            <p className="text-sm font-semibold text-foreground">Prontuário e Financeiro</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Registre evoluções clínicas, controle recebimentos e consulte o manual no botão Help.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Lista Interativa de Etapas */}
            <div className="space-y-3">
                {steps.map((step, index) => (
                    <Card
                        key={step.key}
                        className={`transition-all ${
                            step.completed
                                ? 'border-primary/25 bg-accent/30'
                                : 'border-border bg-card hover:border-primary/40 hover:shadow-xs'
                        }`}
                    >
                        <CardContent className="p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                {/* Número / Status */}
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                    <div className="shrink-0 mt-0.5">
                                        {step.completed ? (
                                            <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-muted text-foreground border border-border flex items-center justify-center text-sm font-bold tabular-nums">
                                                {index + 1}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <step.icon className="w-4 h-4 text-primary shrink-0" />
                                            <h3 className="font-semibold text-sm sm:text-base text-foreground">
                                                {step.title}
                                            </h3>
                                            {step.completed ? (
                                                <Badge variant="success" className="text-[10px] px-2 py-0 h-5">
                                                    Concluído
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs px-2 py-0 h-5">
                                                    ~{step.estimatedTime}
                                                </Badge>
                                            )}
                                        </div>

                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {step.description}
                                        </p>

                                        {!step.completed && (
                                            <p className="text-xs text-muted-foreground pt-0.5">
                                                {step.tip}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="flex items-center gap-2 shrink-0 sm:self-center pl-14 sm:pl-0">
                                    <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                                        <Link prefetch={false} href={`/dashboard/help#${step.helpAnchor}`}>
                                            Ver guia
                                        </Link>
                                    </Button>

                                    {step.completed ? (
                                        <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                                            <Link prefetch={false} href={step.href}>
                                                Revisar
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button asChild size="sm" className="gap-1.5 text-xs">
                                            <Link prefetch={false} href={step.href}>
                                                {step.action}
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Extras Recomendados: Identidade da Clínica + SMTP + Treinamento Autônomo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border bg-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary" />
                            Identidade Visual e Dados da Clínica
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Cadastre logotipo, CNPJ, endereço e dados de cabeçalho para receituários e documentos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2 flex items-center gap-2">
                        <Button asChild variant="outline" size="sm" className="text-xs gap-1.5">
                            <Link prefetch={false} href="/dashboard/configuracoes">
                                Personalizar Clínica
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </Button>
                        {status && !status.hasSmtp && (
                            <Button asChild variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground">
                                <Link prefetch={false} href="/dashboard/configuracoes">
                                    <Mail className="w-3.5 h-3.5" />
                                    Configurar E-mail (SMTP)
                                </Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-primary/25 bg-accent/35">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary" />
                            Treinamento da Equipe (Manual Integrado)
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Todos os perfis (Recepção, Profissionais e Financeiro) têm guias passo a passo no botão Help do menu lateral.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <Button asChild size="sm" variant="default" className="text-xs gap-1.5">
                            <Link prefetch={false} href="/dashboard/help">
                                Abrir Central de Ajuda
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
