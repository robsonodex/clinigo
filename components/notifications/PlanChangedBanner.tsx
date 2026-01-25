/**
 * Component: Plan Changed Banner
 * Banner de notificação de mudança de plano
 */
'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { X, CheckCircle, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'

interface PlanChangedBannerProps {
    newPlan: string
    onDismiss?: () => void
}

const PLAN_NAMES: Record<string, string> = {
    STARTER: 'Starter',
    BASICO: 'Básico',
    AVANCADO: 'Avançado',
    ENTERPRISE: 'Enterprise',
}

export function PlanChangedBanner({ newPlan, onDismiss }: PlanChangedBannerProps) {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        // Auto-dismiss após 10 segundos
        const timer = setTimeout(() => {
            setVisible(false)
            onDismiss?.()
        }, 10000)

        return () => clearTimeout(timer)
    }, [onDismiss])

    if (!visible) return null

    return (
        <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-900/10">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    Upgrade Realizado com Sucesso!
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                        setVisible(false)
                        onDismiss?.()
                    }}
                >
                    <X className="h-4 w-4" />
                </Button>
            </AlertTitle>
            <AlertDescription>
                Seu plano foi atualizado para <strong>{PLAN_NAMES[newPlan] || newPlan}</strong>.
                Todas as novas funcionalidades já estão disponíveis para uso imediato.
            </AlertDescription>
        </Alert>
    )
}
