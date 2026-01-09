'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    Brain,
    CheckCircle,
    AlertTriangle,
    Clock,
    User,
    Building2,
    ChevronRight
} from 'lucide-react'

import { AiAIcon, AiABadge } from '@/components/aia/aia-icon'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface AiADecision {
    id: string
    consultationId: string
    clinicName: string
    doctorName: string
    patientAge: number
    patientGender: string
    mainSymptom: string
    topHypothesis: string
    confidence: number
    hadRedFlags: boolean
    requiresReview: boolean
    tokensUsed: number
    modelUsed: string
    createdAt: string
}

interface Props {
    limit?: number
}

export function AiADecisionHistory({ limit = 50 }: Props) {
    const [decisions, setDecisions] = useState<AiADecision[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadDecisions()
    }, [])

    const loadDecisions = async () => {
        try {
            const res = await fetch(`/api/super-admin/aia-decisions?limit=${limit}`)
            if (res.ok) {
                const data = await res.json()
                setDecisions(data.decisions || [])
            }
        } catch (error) {
            console.error('Error loading AiA decisions:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const getConfidenceBadge = (confidence: number) => {
        if (confidence >= 0.8) {
            return <Badge className="bg-green-500">Alta ({(confidence * 100).toFixed(0)}%)</Badge>
        }
        if (confidence >= 0.5) {
            return <Badge className="bg-yellow-500">Média ({(confidence * 100).toFixed(0)}%)</Badge>
        }
        return <Badge className="bg-red-500">Baixa ({(confidence * 100).toFixed(0)}%)</Badge>
    }

    if (isLoading) {
        return (
            <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AiAIcon size="sm" />
                        Histórico de Decisões AiA
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-16 w-full bg-gray-700" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AiAIcon size="sm" />
                    Histórico de Decisões AiA
                </CardTitle>
                <CardDescription className="text-gray-400">
                    Análises preditivas realizadas pela inteligência AiA
                </CardDescription>
            </CardHeader>
            <CardContent>
                {decisions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhuma análise AiA registrada</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="border-gray-700">
                                <TableHead className="text-gray-400">Data/Hora</TableHead>
                                <TableHead className="text-gray-400">Clínica</TableHead>
                                <TableHead className="text-gray-400">Paciente</TableHead>
                                <TableHead className="text-gray-400">Hipótese Principal</TableHead>
                                <TableHead className="text-gray-400">Confiança</TableHead>
                                <TableHead className="text-gray-400">Flags</TableHead>
                                <TableHead className="text-gray-400">Tokens</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {decisions.map((decision) => (
                                <TableRow key={decision.id} className="border-gray-700">
                                    <TableCell className="text-gray-300">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3 text-gray-500" />
                                            {format(new Date(decision.createdAt), 'dd/MM HH:mm', { locale: ptBR })}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Building2 className="h-3 w-3 text-gray-500" />
                                            <span className="text-sm">{decision.clinicName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-300">
                                        {decision.patientAge}a, {decision.patientGender}
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-[200px] truncate" title={decision.topHypothesis}>
                                            {decision.topHypothesis}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getConfidenceBadge(decision.confidence)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {decision.hadRedFlags && (
                                                <Badge variant="destructive" className="text-xs">
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    Red Flag
                                                </Badge>
                                            )}
                                            {decision.requiresReview && (
                                                <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500">
                                                    Revisão
                                                </Badge>
                                            )}
                                            {!decision.hadRedFlags && !decision.requiresReview && (
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {decision.tokensUsed.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}
