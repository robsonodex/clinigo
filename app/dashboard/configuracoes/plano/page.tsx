/**
 * Upgrade Plan Page
 * Shows available plans with correct prices from plans.ts
 * All buttons redirect to https://clinigo.app/cadastro
 */

'use client'

import { Suspense } from 'react'
import { usePlan } from '@/lib/hooks/use-plan'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, Sparkles, Zap, Crown, Check, Loader2 } from 'lucide-react'
import { DISPLAY_PLANS, type PlanType } from '@/lib/constants/plans'

const PLAN_ICONS: Record<string, any> = {
    BASICO: Star,
    AVANCADO: Sparkles,
    PROFESSIONAL: Zap,
    ENTERPRISE: Crown,
}

const PLAN_COLORS: Record<string, string> = {
    BASICO: 'from-gray-500 to-slate-500',
    AVANCADO: 'from-blue-500 to-cyan-500',
    PROFESSIONAL: 'from-emerald-500 to-teal-500',
    ENTERPRISE: 'from-amber-500 to-orange-500',
}

function PlanContent() {
    const { planType, isLoading } = usePlan()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="container max-w-7xl py-10">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold mb-4">Escolha seu Plano</h1>
                <p className="text-lg text-muted-foreground">
                    Potencialize sua clínica com as ferramentas certas
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {DISPLAY_PLANS.map((plan) => {
                    const Icon = PLAN_ICONS[plan.id] || Star
                    const gradientColor = PLAN_COLORS[plan.id] || 'from-gray-500 to-slate-500'
                    const isCurrentPlan = planType === plan.id

                    return (
                        <Card
                            key={plan.id}
                            className="relative"
                        >


                            <CardHeader className="text-center pb-8">
                                <div className={`mx-auto w-12 h-12 rounded-full bg-gradient-to-br ${gradientColor} p-3 mb-4`}>
                                    <Icon className="w-full h-full text-white" />
                                </div>
                                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                <CardDescription>
                                    {plan.tagline}
                                    {isCurrentPlan && (
                                        <Badge variant="outline" className="mt-2 ml-2">
                                            Plano Atual
                                        </Badge>
                                    )}
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                <div className="text-center mb-6">
                                    <div className="text-4xl font-bold">
                                        {plan.priceLabel}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {plan.billing}
                                    </div>
                                </div>

                                <ul className="space-y-3">
                                    {plan.features.filter(f => f.included).map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                            <span className="text-sm">{feature.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>

                            <CardFooter>
                                <Button
                                    className="w-full"
                                    variant={isCurrentPlan ? 'outline' : 'default'}
                                    asChild
                                >
                                    <a href="https://clinigo.app/cadastro">
                                        {isCurrentPlan ? 'Plano Atual' : 'Contratar Plano'}
                                    </a>
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}

export default function PlanPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <PlanContent />
        </Suspense>
    )
}
