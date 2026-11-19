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
import { ArrowRight, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { useUpgradeModal } from '@/lib/hooks/use-upgrade-modal'

interface PremiumFeatureGuardProps {
    children: ReactNode
    feature: 'crm' | 'tiss' | 'dre' | 'whatsapp_evolution' | 'importacao'
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
    const { isLoading, canAccess } = usePlan()
    const { openUpgradeModal } = useUpgradeModal()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    if (canAccess(feature)) {
        return <>{children}</>
    }

    const isTiss = feature === 'tiss'
    const targetPlanLabel = isTiss ? 'Professional' : 'Avançado'
    const targetPlanPrice = isTiss ? 'R$ 449/mês' : 'R$ 249/mês'

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            <Card className="relative overflow-hidden border border-border bg-card">
                <div className="p-8 sm:p-10 text-center space-y-6">
                    {/* Lock Icon */}
                    <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">
                            {icon || <Lock className="h-8 w-8" />}
                        </div>
                    </div>

                    {/* Badge */}
                    <div className="flex justify-center">
                        <Badge variant="success" className="px-3.5 py-1 text-xs font-semibold gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Recurso do Plano {targetPlanLabel}
                        </Badge>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            {featureName}
                        </h1>
                        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            {featureDescription}
                        </p>
                    </div>

                    {/* Current Plan Badge */}
                    <div className="flex justify-center">
                        <Badge variant="secondary" className="px-3.5 py-1 text-xs">
                            Seu Plano Atual: <span className="font-semibold ml-1">Básico (R$ 149/mês)</span>
                        </Badge>
                    </div>

                    {/* Benefits Grid */}
                    <div className="grid md:grid-cols-3 gap-3 max-w-3xl mx-auto text-left">
                        {benefits.map((benefit, index) => (
                            <div
                                key={index}
                                className="bg-muted/40 border border-border rounded-lg p-4 transition-colors hover:border-primary/40"
                            >
                                <div className="flex items-start gap-2.5">
                                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    <p className="text-xs sm:text-sm font-medium text-foreground flex-1">{benefit}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CTA Button */}
                    <div className="pt-2 space-y-3">
                        <Button
                            size="lg"
                            className="px-6 text-sm font-semibold"
                            onClick={() => openUpgradeModal(feature)}
                        >
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Fazer Upgrade para o Plano {targetPlanLabel}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>

                        <p className="text-xs text-muted-foreground">
                            A partir de <span className="font-mono font-semibold text-foreground">{targetPlanPrice}</span> · Sem fidelidade · Cancele quando quiser
                        </p>
                    </div>

                    {/* Feature List */}
                    <div className="pt-6 border-t border-border">
                        <p className="text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground mb-3">
                            Principais recursos do Plano {targetPlanLabel}
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {(isTiss
                                ? ['Até 30 Licenças', 'Faturamento TISS', 'Gestão de Glosas', 'Biometria Facial', 'Totem e Painel de TV', 'Prescrição Digital']
                                : ['Até 5 Licenças', 'WhatsApp Integrado', 'CRM FluxoMed', 'DRE e Auditoria', 'Repasse Automático', 'BI Clínico', 'Importação']
                            ).map((item) => (
                                <Badge key={item} variant="outline" className="bg-muted/40 text-xs">
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
