'use client'

/**
 * Triagem AiA - Dashboard da Clínica
 * Página para clínicas usarem triagem com pacientes
 * REQUER: Plano PROFESSIONAL ou superior
 */

import { useState } from 'react'
import { MessageSquare, History, Users, TrendingUp, Lock, ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TriageChat } from '@/components/aia'
import { usePlan } from '@/lib/hooks/use-plan'
import { isPlanAtLeast } from '@/lib/constants/plans'
import Link from 'next/link'
import type { TriageResult } from '@/lib/aia/triage-types'

function TriageLevelBadge({ level }: { level: string }) {
    if (level === 'VERMELHO') {
        return (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 shrink-0">
                <AlertCircle className="w-5 h-5" />
            </span>
        )
    }
    if (level === 'LARANJA') {
        return (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900 shrink-0">
                <AlertTriangle className="w-5 h-5" />
            </span>
        )
    }
    if (level === 'AMARELO') {
        return (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 shrink-0">
                <AlertTriangle className="w-5 h-5" />
            </span>
        )
    }
    return (
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground border border-primary/20 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
        </span>
    )
}

export default function TriagemClinicaPage() {
    const { planType, isLoading } = usePlan()
    const [selectedPatient, setSelectedPatient] = useState<string | null>(null)
    const [triageResults, setTriageResults] = useState<TriageResult[]>([])

    const handleTriageComplete = (result: TriageResult) => {
        setTriageResults(prev => [result, ...prev])
    }

    // Check plan access - requires PROFESSIONAL or higher
    const hasAccess = planType && isPlanAtLeast(planType, 'PROFESSIONAL')

    // Show upgrade prompt for STARTER/BASIC plans
    if (!isLoading && !hasAccess) {
        return (
            <div className="container mx-auto p-6">
                <Card className="max-w-2xl mx-auto">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-14 h-14 bg-accent text-accent-foreground rounded-xl flex items-center justify-center mb-4">
                            <Lock className="w-7 h-7" />
                        </div>
                        <CardTitle className="text-2xl">Triagem AiA — Recurso Professional</CardTitle>
                        <CardDescription className="text-sm">
                            A triagem clínica estruturada está disponível a partir do plano Professional
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-primary" />
                                Recursos incluídos na Triagem AiA:
                            </h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Classificação de urgência automática (protocolo SUS)</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Detecção de sinais de alerta em tempo real</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Sugestão de especialidade clínica</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Integração direta com a agenda</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Histórico completo de triagens</li>
                            </ul>
                        </div>
                        <div className="flex justify-center">
                            <Button asChild size="lg">
                                <Link prefetch={false} href="/dashboard/configuracoes/assinatura">
                                    Ver Planos e Assinatura
                                </Link>
                            </Button>
                        </div>
                        <p className="text-center text-xs text-muted-foreground">
                            Seu plano atual: <Badge variant="secondary" className="ml-1">{planType || 'Carregando...'}</Badge>
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Triagem AiA</h1>
                <p className="text-sm text-muted-foreground">
                    Classificação de risco e direcionamento clínico de pacientes
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Triagens Hoje</CardTitle>
                        <MessageSquare className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono tabular-nums">{triageResults.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Emergências</CardTitle>
                        <TrendingUp className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono tabular-nums text-red-600">
                            {triageResults.filter(r => r.triage.level === 'VERMELHO').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Urgentes</CardTitle>
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono tabular-nums text-orange-600">
                            {triageResults.filter(r => r.triage.level === 'LARANJA').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Rotina</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono tabular-nums text-primary">
                            {triageResults.filter(r => r.triage.level === 'VERDE').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="nova" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="nova">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Nova Triagem
                    </TabsTrigger>
                    <TabsTrigger value="historico">
                        <History className="w-4 h-4 mr-2" />
                        Histórico
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="nova" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <TriageChat
                                patientId={selectedPatient || undefined}
                                onComplete={handleTriageComplete}
                            />
                        </div>

                        <div>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Última Triagem</CardTitle>
                                    <CardDescription>
                                        Resultado da triagem mais recente
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {triageResults.length > 0 ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <TriageLevelBadge level={triageResults[0].triage.level} />
                                                <div>
                                                    <p className="font-bold text-lg">
                                                        {triageResults[0].triage.level_name}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {triageResults[0].medical_data.especialidade}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-sm">{triageResults[0].triage.immediate_action}</p>
                                            <p className="text-xs font-mono text-muted-foreground">
                                                Prazo: {triageResults[0].next_steps.tempo_maximo}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground text-center py-8 text-sm">
                                            Nenhuma triagem realizada ainda
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="historico">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Triagens</CardTitle>
                            <CardDescription>
                                Triagens realizadas nesta sessão
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {triageResults.length > 0 ? (
                                <div className="space-y-3">
                                    {triageResults.map((result, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between p-3 border border-border rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <TriageLevelBadge level={result.triage.level} />
                                                <div>
                                                    <p className="font-medium text-sm">{result.triage.level_name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {result.medical_data.especialidade}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-mono text-muted-foreground">
                                                {result.next_steps.tempo_maximo}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-8 text-sm">
                                    Nenhuma triagem no histórico
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
