/**
 * Component: Plan Changed Banner
 * Banner de notificação de mudança de plano
 */
'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { X, CheckCircle2, ShieldCheck } from 'lucide-react'
import { useState, useEffect } from 'react'

interface PlanChangedBannerProps {
    newPlan: string
    onDismiss?: () => void
}

const PLAN_NAMES: Record<string, string> = {
    BASICO: 'Básico',
    AVANCADO: 'Avançado',
    PROFESSIONAL: 'Professional',
}

export function PlanChangedBanner({ newPlan, onDismiss }: PlanChangedBannerProps) {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false)
            onDismiss?.()
        }, 10000)

        return () => clearTimeout(timer)
    }, [onDismiss])

    if (!visible) return null

    return (
        <Alert className="mb-6 border-primary/30 bg-accent/50 text-foreground rounded-xl">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <AlertTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    Plano Atualizado com Sucesso
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                        setVisible(false)
                        onDismiss?.()
                    }}
                >
                    <X className="h-4 w-4" />
                </Button>
            </AlertTitle>
            <AlertDescription className="text-muted-foreground">
                Seu plano foi atualizado para <strong className="text-foreground">{PLAN_NAMES[newPlan] || newPlan}</strong>.
                Todas as novas funcionalidades já estão disponíveis para uso imediato.
            </AlertDescription>
        </Alert>
    )
}
