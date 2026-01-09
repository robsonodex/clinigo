/**
 * PremiumFeatureGuard Component
 * Wraps premium features and shows upgrade CTA for BASIC plans
 */

'use client'

import { ReactNode } from 'react'
import { usePlan } from '@/lib/hooks/use-plan'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Lock, Sparkles } from 'lucide-react'
import { useUpgradeModal } from '@/lib/hooks/use-upgrade-modal'

interface PremiumFeatureGuardProps {
    children: ReactNode
    feature: 'crm' | 'tiss' | 'marketplace' | 'ai_reasoning'
    featureName: string
    featureDescription: string
    benefits: string[]
    icon?: ReactNode
}

export function PremiumFeatureGuard({
    children,
    feature,
    featureName,
    featureDescription,
    benefits,
    icon,
}: PremiumFeatureGuardProps) {
    const { planType, isLoading, canAccess } = usePlan()
    const { openUpgradeModal } = useUpgradeModal()

    // Show loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    // If user can access, show the actual content
    if (canAccess(feature)) {
        return <>{children}</>
    }

    // Show premium empty state for BASIC plan
    return (
        <div className="container max-w-4xl mx-auto py-12 px-4">
            <Card className="relative overflow-hidden border-2 border-dashed">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />

                <div className="relative p-12 text-center space-y-8">
                    {/* Lock Icon */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                            <div className="relative bg-gradient-to-br from-primary to-purple-600 p-6 rounded-2xl">
                                {icon || <Lock className="h-12 w-12 text-white" />}
                            </div>
                        </div>
                    </div>

                    {/* Badge */}
                    <div className="flex justify-center">
                        <Badge
                            variant="outline"
                            className="px-4 py-2 text-sm font-semibold border-2 border-primary/50 bg-primary/10"
                        >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Recurso Exclusivo PRO
                        </Badge>
                    </div>

                    {/* Title */}
                    <div className="space-y-3">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                            {featureName}
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            {featureDescription}
                        </p>
                    </div>

                    {/* Current Plan Badge */}
                    <div className="flex justify-center">
                        <Badge variant="secondary" className="px-4 py-2">
                            Seu Plano: <span className="font-bold ml-1">Básico (R$ 97/mês)</span>
                        </Badge>
                    </div>

                    {/* Benefits Grid */}
                    <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                        {benefits.map((benefit, index) => (
                            <div
                                key={index}
                                className="bg-card border rounded-lg p-4 text-left space-y-2 hover:border-primary/50 transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="bg-primary/10 p-2 rounded-full mt-0.5">
                                        <ArrowRight className="h-4 w-4 text-primary" />
                                    </div>
                                    <p className="text-sm font-medium flex-1">{benefit}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CTA Button */}
                    <div className="pt-6 space-y-4">
                        <Button
                            size="lg"
                            className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg hover:shadow-xl transition-all"
                            onClick={() => openUpgradeModal(feature)}
                        >
                            <Sparkles className="mr-2 h-5 w-5" />
                            Fazer Upgrade para o Plano Profissional
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>

                        <p className="text-sm text-muted-foreground">
                            A partir de <span className="font-bold text-foreground">R$ 297/mês</span> •
                            Sem fidelidade • Cancele quando quiser
                        </p>
                    </div>

                    {/* Feature List */}
                    <div className="pt-8 border-t">
                        <p className="text-sm font-semibold mb-4">
                            O que você ganha no Plano Profissional:
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {['CRM Completo', 'TISS Integrado', 'Marketplace', 'IA Avançada', '15 Médicos', 'Consultas Ilimitadas', 'WhatsApp Automação', 'Suporte 24/7'].map((item) => (
                                <Badge key={item} variant="outline" className="bg-primary/5">
                                    {item}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}
