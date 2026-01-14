'use client'

/**
 * CLINIGO PREMIUM - TISS Pre-Audit Dashboard
 * Squad B: Visual dashboard for glosa risk analysis
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import {
    AlertTriangle,
    CheckCircle2,
    XCircle,
    TrendingDown,
    FileText,
    Upload,
    Download,
    Play
} from 'lucide-react'
import { analyzeGlosaRisk, autoFixGuide, type GlosaRisk } from '@/lib/services/tiss/glosa-predictor'

interface TISSGuide {
    id: string
    guide_number: string
    operator_name: string
    patient_name: string
    procedure_code: string
    value: number
    data: any
}

export function TISSPreAuditDashboard() {
    const [guides, setGuides] = useState<TISSGuide[]>([])
    const [analyzing, setAnalyzing] = useState(false)
    const [results, setResults] = useState<Map<string, GlosaRisk>>(new Map())
    const { toast } = useToast()

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        try {
            // Parse uploaded file (XML ou JSON)
            const text = await file.text()

            // TODO: Implement actual parser based on file type
            toast({
                title: 'Arquivo carregado',
                description: `${file.name} - processamento em desenvolvimento`,
            })
        } catch (error) {
            toast({
                title: 'Erro ao carregar arquivo',
                description: error instanceof Error ? error.message : 'Erro desconhecido',
                variant: 'destructive'
            })
        }
    }

    const handleBatchAnalyze = async () => {
        if (guides.length === 0) {
            toast({
                title: 'Nenhuma guia para analisar',
                description: 'Faça upload de um lote primeiro',
                variant: 'destructive'
            })
            return
        }

        setAnalyzing(true)
        const newResults = new Map<string, GlosaRisk>()

        try {
            // Analyze each guide
            for (const guide of guides) {
                const risk = await analyzeGlosaRisk(guide.data, guide.operator_name)
                newResults.set(guide.id, risk)
            }

            setResults(newResults)

            toast({
                title: '✅ Análise concluída',
                description: `${guides.length} guias analisadas`,
            })
        } catch (error) {
            toast({
                title: 'Erro na análise',
                description: error instanceof Error ? error.message : 'Erro desconhecido',
                variant: 'destructive'
            })
        } finally {
            setAnalyzing(false)
        }
    }

    const handleAutoFix = async (guideId: string) => {
        const guide = guides.find(g => g.id === guideId)
        if (!guide) return

        const { fixed, changes } = autoFixGuide(guide.data)

        if (changes.length > 0) {
            toast({
                title: '🔧 Correções aplicadas',
                description: `${changes.length} problemas corrigidos automaticamente`,
            })

            // Update guide with fixed data
            setGuides(prev => prev.map(g =>
                g.id === guideId ? { ...g, data: fixed } : g
            ))

            // Re-analyze
            const risk = await analyzeGlosaRisk(fixed, guide.operator_name)
            setResults(prev => new Map(prev).set(guideId, risk))
        } else {
            toast({
                title: 'Nenhuma correção automática disponível',
                variant: 'default'
            })
        }
    }

    // Calculate statistics
    const stats = {
        total: guides.length,
        high_risk: Array.from(results.values()).filter(r => r.risk_level === 'high' || r.risk_level === 'critical').length,
        can_auto_fix: Array.from(results.values()).filter(r => r.can_auto_fix).length,
        total_loss_estimate: Array.from(results.values()).reduce((sum, r) => sum + r.estimated_loss, 0)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="w-7 h-7" />
                        Pré-Auditoria TISS
                    </h1>
                    <p className="text-muted-foreground">
                        Análise inteligente de risco de glosas
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <label>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Lote
                            <input
                                type="file"
                                accept=".xml,.json"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </label>
                    </Button>

                    <Button
                        onClick={handleBatchAnalyze}
                        disabled={guides.length === 0 || analyzing}
                    >
                        {analyzing ? (
                            <>Analisando...</>
                        ) : (
                            <>
                                <Play className="w-4 h-4 mr-2" />
                                Analisar Lote
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-sm text-muted-foreground">Total de Guias</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-600">{stats.high_risk}</div>
                        <p className="text-sm text-muted-foreground">Alto Risco</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{stats.can_auto_fix}</div>
                        <p className="text-sm text-muted-foreground">Auto-corrigíveis</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-amber-600">
                            R$ {stats.total_loss_estimate.toFixed(2)}
                        </div>
                        <p className="text-sm text-muted-foreground">Perda Estimada</p>
                    </CardContent>
                </Card>
            </div>

            {/* Guides List */}
            <Card>
                <CardHeader>
                    <CardTitle>Guias Analisadas</CardTitle>
                    <CardDescription>
                        Resultados da análise de risco de glosas
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {guides.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Nenhuma guia carregada</p>
                            <p className="text-sm">Faça upload de um lote XML ou JSON</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {guides.map((guide) => {
                                const risk = results.get(guide.id)

                                return (
                                    <Card key={guide.id}>
                                        <CardContent className="pt-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h3 className="font-semibold">{guide.guide_number}</h3>
                                                        <Badge variant="outline">{guide.operator_name}</Badge>

                                                        {risk && (
                                                            <Badge
                                                                variant={
                                                                    risk.risk_level === 'critical' ? 'destructive' :
                                                                        risk.risk_level === 'high' ? 'destructive' :
                                                                            risk.risk_level === 'medium' ? 'default' : 'secondary'
                                                                }
                                                            >
                                                                {risk.risk_level === 'critical' && <XCircle className="w-3 h-3 mr-1" />}
                                                                {risk.risk_level === 'high' && <AlertTriangle className="w-3 h-3 mr-1" />}
                                                                {risk.risk_level === 'low' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                                                {risk.risk_level.toUpperCase()}
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <p className="text-sm text-muted-foreground">
                                                        {guide.patient_name} • Proc: {guide.procedure_code} • R$ {guide.value.toFixed(2)}
                                                    </p>

                                                    {risk && (
                                                        <>
                                                            <Progress
                                                                value={risk.probability * 100}
                                                                className="h-2 mt-2"
                                                            />
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                Probabilidade de glosa: {(risk.probability * 100).toFixed(0)}%
                                                                {risk.estimated_loss > 0 && (
                                                                    <> • Perda estimada: R$ {risk.estimated_loss.toFixed(2)}</>
                                                                )}
                                                            </p>

                                                            {risk.predicted_issues.length > 0 && (
                                                                <div className="mt-3 space-y-1">
                                                                    {risk.predicted_issues.map((issue, idx) => (
                                                                        <div key={idx} className="flex items-start gap-2 text-sm">
                                                                            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                                                                            <span>{issue.description}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>

                                                {risk?.can_auto_fix && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleAutoFix(guide.id)}
                                                    >
                                                        <TrendingDown className="w-4 h-4 mr-1" />
                                                        Auto-Fix
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
