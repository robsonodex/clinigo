/**
 * Component: New Features Onboarding Modal
 * Modal de boas-vindas a novas features após upgrade
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

const PLAN_FEATURES: Record<string, { name: string; features: string[] }> = {
    BASICO: {
        name: 'Básico',
        features: [
            'Até 3 médicos simultâneos',
            'WhatsApp Automático - envie lembretes',
            'Marketplace - divulgue sua clínica',
            'Relatórios financeiros básicos',
        ],
    },
    AVANCADO: {
        name: 'Avançado',
        features: [
            'Até 10 médicos simultâneos',
            'TISS Completo - fature convênios',
            'Multi-unidade - gerencie 3 unidades',
            'CRM Avançado - automatize marketing',
            'Teleconsulta - atenda online',
            'Relatórios avançados',
        ],
    },
    ENTERPRISE: {
        name: 'Enterprise',
        features: [
            'Médicos e unidades ilimitados',
            'API Access - integre sistemas',
            'SSO - login único corporativo',
            'White Label - personalize completamente',
            'Integrações customizadas',
            'Suporte prioritário 24/7',
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
