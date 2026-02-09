/**
 * Component: New Features Onboarding Modal
 * Modal de boas-vindas a novas features após upgrade
 * 
 * ATUALIZADO: 2026-02-09 - Apenas funcionalidades REAIS
 */
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, Sparkles } from 'lucide-react'
import { useState } from 'react'

interface NewFeaturesOnboardingProps {
    open: boolean
    onClose: () => void
    newPlan: string
}

// Funcionalidades REAIS por plano
const PLAN_FEATURES: Record<string, { name: string; features: string[] }> = {
    BASICO: {
        name: 'Básico',
        features: [
            'Até 2 médicos simultâneos',
            'Check-in QR Code',
            'Teleconsulta WebRTC',
            'Prontuário eletrônico',
            'Financeiro básico',
        ],
    },
    AVANCADO: {
        name: 'Avançado',
        features: [
            'Até 5 médicos simultâneos',
            'Check-in Facial',
            'WhatsApp Evolution',
            'CRM completo',
            'DRE e Auditoria',
            'Importação de dados',
        ],
    },
    PROFESSIONAL: {
        name: 'Professional',
        features: [
            'Até 30 médicos simultâneos',
            'TISS - Faturamento de convênios',
            'Até 3 unidades',
            'Repasse médico automático',
            'Suporte prioritário',
        ],
    },
    ENTERPRISE: {
        name: 'Enterprise',
        features: [
            'Médicos e unidades ilimitados',
            'Migração dedicada',
            'Gerente de conta dedicado',
            'Suporte 24/7',
            'SLA garantido 99.5%',
        ],
    },
}

export function NewFeaturesOnboarding({ open, onClose, newPlan }: NewFeaturesOnboardingProps) {
    const [currentStep, setCurrentStep] = useState(0)

    const planInfo = PLAN_FEATURES[newPlan]

    if (!planInfo) return null

    const features = planInfo.features
    const totalSteps = Math.ceil(features.length / 3)

    const handleNext = () => {
        if (currentStep < totalSteps - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            onClose()
        }
    }

    const currentFeatures = features.slice(
        currentStep * 3,
        (currentStep + 1) * 3
    )

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-500" />
                        Bem-vindo ao Plano {planInfo.name}!
                    </DialogTitle>
                </DialogHeader>

                <div className="py-6">
                    <p className="text-sm text-muted-foreground mb-6">
                        Agora você tem acesso a estas funcionalidades:
                    </p>

                    <ul className="space-y-4">
                        {currentFeatures.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                                <div className="mt-0.5 p-1 bg-green-100 rounded-full">
                                    <Check className="w-4 h-4 text-green-600" />
                                </div>
                                <span className="text-sm">{feature}</span>
                            </li>
                        ))}
                    </ul>

                    {totalSteps > 1 && (
                        <div className="flex gap-2 justify-center mt-6">
                            {Array.from({ length: totalSteps }).map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 rounded-full transition-all ${idx === currentStep
                                        ? 'w-8 bg-primary'
                                        : 'w-1.5 bg-muted'
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={handleNext} className="w-full">
                        {currentStep < totalSteps - 1 ? 'Próximo' : 'Começar a Usar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
