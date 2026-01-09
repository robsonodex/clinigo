'use client'

/**
 * Triagem AiA - Dashboard da Clínica
 * Página para clínicas usarem triagem com pacientes
 * REQUER: Plano PROFESSIONAL ou superior
 */

import { useState } from 'react'
import { MessageSquare, History, Users, TrendingUp, Lock, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { TriageChat } from '@/components/aia'
import { usePlan } from '@/lib/hooks/use-plan'
import { isPlanAtLeast } from '@/lib/constants/plans'
import Link from 'next/link'
import type { TriageResult } from '@/lib/aia/triage-types'

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
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mb-4">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                        <CardTitle className="text-2xl">Triagem AiA - Recurso PRO</CardTitle>
                        <CardDescription className="text-lg">
                            A triagem com inteligência artificial está disponível a partir do plano Profissional
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-muted rounded-lg p-4 space-y-3">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-emerald-500" />
                                O que você ganha com a Triagem AiA:
                            </h3>
                            <ul className="space-y-2 text-sm">
                                <li>✓ Classificação de urgência automática (protocolo SUS)</li>
                                <li>✓ Detecção de emergências em tempo real</li>
                                <li>✓ Sugestão de especialidade médica</li>
                                <li>✓ Integração com agendamento</li>
                                <li>✓ Histórico de triagens</li>
                            </ul>
                        </div>
                        <div className="flex justify-center">
                            <Button asChild size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-600">
                                <Link href="/dashboard/planos">
                                    Fazer Upgrade para Profissional
                                </Link>
                            </Button>
                        </div>
                        <p className="text-center text-sm text-muted-foreground">
                            Seu plano atual: <strong>{planType || 'Carregando...'}</strong>
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">{/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Triagem AiA</h1>
                <p className="text-muted-foreground">
                    Use a inteligência artificial para realizar triagem de pacientes
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Triagens Hoje</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{triageResults.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Emergências</CardTitle>
                        <TrendingUp className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {triageResults.filter(r => r.triage.level === 'VERMELHO').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Urgentes</CardTitle>
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {triageResults.filter(r => r.triage.level === 'LARANJA').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Rotina</CardTitle>
                        <Users className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
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
                        {/* Chat */}
                        <div>
                            <TriageChat
                                patientId={selectedPatient || undefined}
                                onComplete={handleTriageComplete}
                            />
                        </div>

                        {/* Last Result */}
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
                                                <span className="text-4xl">
                                                    {triageResults[0].triage.level === 'VERMELHO' && '🚨'}
                                                    {triageResults[0].triage.level === 'LARANJA' && '⚠️'}
                                                    {triageResults[0].triage.level === 'AMARELO' && '🟡'}
                                                    {triageResults[0].triage.level === 'VERDE' && '🟢'}
                                                </span>
                                                <div>
                                                    <p className="font-bold text-lg">
                                                        {triageResults[0].triage.level_name}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {triageResults[0].medical_data.especialidade}
                                                    </p>
                                                </div>
                                            </div>
                                            <p>{triageResults[0].triage.immediate_action}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Prazo: {triageResults[0].next_steps.tempo_maximo}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground text-center py-8">
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
                                            className="flex items-center justify-between p-3 border rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">
                                                    {result.triage.level === 'VERMELHO' && '🚨'}
                                                    {result.triage.level === 'LARANJA' && '⚠️'}
                                                    {result.triage.level === 'AMARELO' && '🟡'}
                                                    {result.triage.level === 'VERDE' && '🟢'}
                                                </span>
                                                <div>
                                                    <p className="font-medium">{result.triage.level_name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {result.medical_data.especialidade}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-sm text-muted-foreground">
                                                {result.next_steps.tempo_maximo}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-8">
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
