'use client'

/**
 * AiA Triage Result Card Component
 * CliniGo - Sistema de Triagem Médica
 * 
 * Display triage results with urgency level, specialty, and actions
 */

import { AlertTriangle, Clock, Stethoscope, Phone, Calendar, ChevronRight, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import type { TriageResult, TriageLevel } from '@/lib/aia/triage-types'
import { TRIAGE_LEVEL_CONFIG } from '@/lib/aia/triage-types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface TriageResultCardProps {
    result: TriageResult
    sessionId?: string
    compact?: boolean
    className?: string
    onSchedule?: () => void
}

const LEVEL_STYLES: Record<TriageLevel, { bg: string; border: string; text: string }> = {
    VERMELHO: {
        bg: 'bg-red-50 dark:bg-red-950/30',
        border: 'border-red-300 dark:border-red-800',
        text: 'text-red-700 dark:text-red-400',
    },
    LARANJA: {
        bg: 'bg-orange-50 dark:bg-orange-950/30',
        border: 'border-orange-300 dark:border-orange-800',
        text: 'text-orange-700 dark:text-orange-400',
    },
    AMARELO: {
        bg: 'bg-yellow-50 dark:bg-yellow-950/30',
        border: 'border-yellow-300 dark:border-yellow-800',
        text: 'text-yellow-700 dark:text-yellow-400',
    },
    VERDE: {
        bg: 'bg-green-50 dark:bg-green-950/30',
        border: 'border-green-300 dark:border-green-800',
        text: 'text-green-700 dark:text-green-400',
    },
}

export function TriageResultCard({ result, sessionId, compact, className, onSchedule }: TriageResultCardProps) {
    const router = useRouter()
    const level = result.triage.level
    const levelConfig = TRIAGE_LEVEL_CONFIG[level]
    const styles = LEVEL_STYLES[level]

    // Build scheduling URL with triage parameters
    const scheduleUrl = `/paciente/agendar?${new URLSearchParams({
        especialidade: result.medical_data.especialidade || '',
        urgencia: level,
        prazo: result.next_steps.tempo_maximo || '',
        ...(sessionId && { triage_session: sessionId }),
    }).toString()}`

    const handleSchedule = () => {
        if (onSchedule) {
            onSchedule()
        } else {
            router.push(scheduleUrl)
        }
    }

    if (compact) {
        return (
            <div className={cn('rounded-lg p-4 border', styles.bg, styles.border, className)}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{levelConfig.emoji}</span>
                        <div>
                            <p className={cn('font-semibold', styles.text)}>
                                {result.triage.level_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {result.medical_data.especialidade}
                            </p>
                        </div>
                    </div>
                    {result.next_steps.agendar_consulta && (
                        <Button size="sm" onClick={handleSchedule}>
                            Agendar
                        </Button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <Card className={cn('overflow-hidden', className)}>
            {/* Level Header */}
            <div className={cn('p-4 border-b', styles.bg, styles.border)}>
                <div className="flex items-center gap-3">
                    <span className="text-4xl">{levelConfig.emoji}</span>
                    <div>
                        <h3 className={cn('text-xl font-bold', styles.text)}>
                            {result.triage.level_name.toUpperCase()}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {result.triage.level_description}
                        </p>
                    </div>
                </div>
            </div>

            <CardContent className="p-4 space-y-4">
                {/* Emergency Action */}
                {level === 'VERMELHO' && result.triage.emergency_number && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="flex items-center justify-between">
                            <span className="font-semibold">
                                Ligue {result.triage.emergency_number} IMEDIATAMENTE
                            </span>
                            <Button
                                variant="destructive"
                                size="sm"
                                asChild
                            >
                                <a href={`tel:${result.triage.emergency_number}`}>
                                    <Phone className="w-4 h-4 mr-2" />
                                    Ligar {result.triage.emergency_number}
                                </a>
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Immediate Action */}
                <div className="bg-muted rounded-lg p-3">
                    <p className="font-medium">{result.triage.immediate_action}</p>
                </div>

                {/* Specialty & Timeframe */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Especialidade</p>
                            <p className="font-medium">{result.medical_data.especialidade}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Prazo</p>
                            <p className="font-medium">{result.next_steps.tempo_maximo}</p>
                        </div>
                    </div>
                </div>

                {/* Possible Conditions */}
                {result.medical_data.possiveis_condicoes && result.medical_data.possiveis_condicoes.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold mb-2">Possíveis condições a investigar:</h4>
                        <div className="flex flex-wrap gap-2">
                            {result.medical_data.possiveis_condicoes.map((condition, i) => (
                                <Badge key={i} variant="secondary">
                                    {condition.condition}
                                    {condition.probability && (
                                        <span className="ml-1 opacity-60">({condition.probability})</span>
                                    )}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Suggested Tests */}
                {result.medical_data.exames_sugeridos && result.medical_data.exames_sugeridos.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold mb-2">Exames sugeridos:</h4>
                        <ul className="text-sm space-y-1">
                            {result.medical_data.exames_sugeridos.map((exam, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                    {exam}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Plan Restriction Banner */}
                {result.plan_restriction.is_blocked && result.plan_restriction.upgrade_banner_text && (
                    <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700">
                        <Lock className="h-4 w-4 text-amber-600" />
                        <AlertDescription>
                            <p className="text-sm mb-2">{result.plan_restriction.upgrade_banner_text}</p>
                            {result.plan_restriction.cta_link && (
                                <Button size="sm" variant="outline" asChild>
                                    <Link href={result.plan_restriction.cta_link}>
                                        Fazer Upgrade
                                    </Link>
                                </Button>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Immediate Care Instructions */}
                {result.recommendations.immediate_care.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold mb-2">Cuidados imediatos:</h4>
                        <ul className="text-sm space-y-1">
                            {result.recommendations.immediate_care.map((care, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-green-500">✓</span>
                                    {care}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* What to Avoid */}
                {result.recommendations.avoid.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold mb-2">O que evitar:</h4>
                        <ul className="text-sm space-y-1">
                            {result.recommendations.avoid.map((item, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <span className="text-red-500">✗</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Disclaimers */}
                <div className="text-xs text-muted-foreground border-t pt-3 mt-3 space-y-1">
                    {result.disclaimers.map((disclaimer, i) => (
                        <p key={i}>⚠️ {disclaimer}</p>
                    ))}
                </div>
            </CardContent>

            {/* Schedule CTA */}
            {result.next_steps.agendar_consulta && level !== 'VERMELHO' && (
                <CardFooter className="border-t bg-muted/50 p-4">
                    <Button className="w-full" onClick={handleSchedule}>
                        <Calendar className="w-4 h-4 mr-2" />
                        Agendar {result.next_steps.especialidade}
                    </Button>
                </CardFooter>
            )}
        </Card>
    )
}
