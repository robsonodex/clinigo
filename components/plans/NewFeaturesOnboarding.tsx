/**
 * Component: New Features Onboarding Modal
 * Modal de boas-vindas a novas funcionalidades após upgrade
 */
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, ShieldCheck, BookOpen } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

interface NewFeaturesOnboardingProps {
    open: boolean
    onClose: () => void
    newPlan: string
}

// Funcionalidades alinhadas ao catálogo oficial vigente do CliniGo
const PLAN_FEATURES: Record<string, { name: string; features: string[] }> = {
    BASICO: {
        name: 'Básico',
        features: [
            '1 licença profissional ativa',
            'Agenda completa e confirmações',
            'Prontuário eletrônico estruturado',
            'Financeiro essencial e fluxo de caixa',
            'Check-in via QR Code na recepção',
            'Guia de Uso Integrado (Help) passo a passo',
        ],
    },
    AVANCADO: {
        name: 'Avançado',
        features: [
            'Até 5 licenças profissionais simultâneas',
            'WhatsApp integrado para lembretes e confirmações',
            'CRM FluxoMed e automações de retorno',
            'DRE consolidada, repasses automáticos e auditoria',
            'BI Clínico e indicadores terapêuticos',
            'Importação de base de pacientes em planilha',
        ],
    },
    PROFESSIONAL: {
        name: 'Professional',
        features: [
            'Até 30 licenças profissionais simultâneas',
            'Faturamento TISS completo, XML e gestão de glosas',
            'Check-in com Biometria Facial',
            'Totem de autoatendimento e Painel de TV',
            'Prescrição digital e metas financeiras',
            'Suporte prioritário para sua operação',
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
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-semibold">
                                Bem-vindo ao Plano {planInfo.name}
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Recursos liberados imediatamente na sua conta
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-4">
                    <ul className="space-y-3">
                        {currentFeatures.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3 p-2.5 rounded-lg border border-border bg-muted/30">
                                <div className="mt-0.5 w-5 h-5 rounded-md bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                                    <Check className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-sm text-foreground">{feature}</span>
                            </li>
                        ))}
                    </ul>

                    {totalSteps > 1 && (
                        <div className="flex gap-2 justify-center mt-5">
                            {Array.from({ length: totalSteps }).map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 rounded-full transition-all ${
                                        idx === currentStep
                                            ? 'w-8 bg-primary'
                                            : 'w-1.5 bg-muted-foreground/30'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button asChild variant="outline" className="w-full sm:w-auto gap-1.5">
                        <Link prefetch={false} href="/dashboard/help" onClick={onClose}>
                            <BookOpen className="w-4 h-4 text-primary" />
                            Ver Manual
                        </Link>
                    </Button>
                    <Button onClick={handleNext} className="w-full sm:flex-1">
                        {currentStep < totalSteps - 1 ? 'Próximo' : 'Começar a Usar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
