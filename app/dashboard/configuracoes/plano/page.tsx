/**
 * Upgrade Plan Page
 * Allows users to view and upgrade their subscription plan
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePlan } from '@/lib/hooks/use-plan'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Star, Sparkles, Zap, Crown, Building2, Check, Loader2 } from 'lucide-react'
import { PLANS, type PlanType } from '@/lib/constants/plans'

// 5-Tier Plan Details (RJ Market 2026)
const PLAN_DETAILS: Record<PlanType, {
    name: string
    price: { monthly: number; yearly: number }
    icon: any
    color: string
    badge?: string
    features: string[]
}> = {
    BASICO: {
        name: 'Básico',
        price: { monthly: 149, yearly: 1490 },
        icon: Star,
        color: 'from-gray-500 to-slate-500',
        features: [
            '2 médicos',
            '100 consultas/mês',
            'Check-in QR Code',
            'Teleconsulta',
            'Financeiro básico',
            'Suporte por email',
        ],
    },
    AVANCADO: {
        name: 'Avançado',
        price: { monthly: 299, yearly: 2990 },
        icon: Sparkles,
        color: 'from-blue-500 to-cyan-500',
        badge: 'Recomendado',
        features: [
            '5 médicos',
            '500 consultas/mês',
            'Check-in QR Code',
            'Teleconsulta WebRTC',
            'WhatsApp automação',
            'Financeiro completo',
            'Suporte prioritário',
        ],
    },
    PROFESSIONAL: {
        name: 'Professional',
        price: { monthly: 549, yearly: 5490 },
        icon: Zap,
        color: 'from-purple-500 to-pink-500',
        features: [
            '30 médicos',
            'Consultas ilimitadas',
            'Tudo do Avançado +',
            'Prontuário multi-unidade',
            'Faturamento TISS',
            'SMTP próprio',
            'API dedicada',
            'Suporte 24/7',
        ],
    },
    ENTERPRISE: {
        name: 'Enterprise',
        price: { monthly: 799, yearly: 7990 },
        icon: Crown,
        color: 'from-amber-500 to-orange-500',
        badge: 'Empresas',
        features: [
            'Médicos ilimitados',
            'Multi-unidades',
            'White-label',
            'API dedicada',
            'Gerente dedicado',
            'SLA garantido 99.5%',
            'Migração dedicada',
            'Treinamento presencial',
        ],
    },
    NETWORK: {
        name: 'Network (Legacy)',
        price: { monthly: 997, yearly: 9970 },
        icon: Building2,
        color: 'from-emerald-500 to-teal-500',
        features: [
            'Médicos ilimitados',
            'Unidades ilimitadas',
            'White-label total',
            'Dashboard consolidado',
            '1TB storage',
            'SLA garantido',
        ],
    },
}

function PlanContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { planType, isLoading: isPlanLoading } = usePlan()
    const [isYearly, setIsYearly] = useState(false)
    const [isUpgrading, setIsUpgrading] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

    const suggestedPlan = searchParams.get('upgrade') as 'BASIC' | 'PRO' | 'ENTERPRISE' | null

    useEffect(() => {
        if (suggestedPlan) {
            setSelectedPlan(suggestedPlan)
        }
    }, [suggestedPlan])

    const handleUpgrade = async (plan: 'BASIC' | 'PRO' | 'ENTERPRISE') => {
        if (plan === planType) return // Already on this plan

        setIsUpgrading(true)
        setSelectedPlan(plan)

        try {
            const response = await fetch('/api/billing/create-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan,
                    billing_cycle: isYearly ? 'YEARLY' : 'MONTHLY',
                }),
            })

            if (!response.ok) {
                throw new Error('Erro ao criar assinatura')
            }

            const data = await response.json()

            // Redirect to Mercado Pago checkout
            if (data.init_point) {
                window.location.href = data.init_point
            }
        } catch (error) {
            console.error('Erro ao fazer upgrade:', error)
            alert('Erro ao processar upgrade. Tente novamente.')
            setIsUpgrading(false)
        }
    }

    if (isPlanLoading) {
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
                <p className="text-lg text-muted-foreground mb-6">
                    Potencialize sua clínica com as ferramentas certas
                </p>

                {/* Billing Cycle Toggle */}
                <div className="flex items-center justify-center gap-4">
                    <Label htmlFor="billing-cycle" className={!isYearly ? 'font-semibold' : ''}>
                        Mensal
                    </Label>
                    <Switch
                        id="billing-cycle"
                        checked={isYearly}
                        onCheckedChange={setIsYearly}
                    />
                    <Label htmlFor="billing-cycle" className={isYearly ? 'font-semibold' : ''}>
                        Anual
                        <Badge variant="secondary" className="ml-2">2 meses grátis</Badge>
                    </Label>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {Object.entries(PLAN_DETAILS).map(([key, plan]) => {
                    const Icon = plan.icon
                    const isCurrentPlan = planType === key
                    const price = isYearly ? plan.price.yearly : plan.price.monthly
                    const pricePerMonth = isYearly ? Math.round(plan.price.yearly / 12) : plan.price.monthly

                    return (
                        <Card
                            key={key}
                            className={`relative ${selectedPlan === key || suggestedPlan === key
                                ? 'ring-2 ring-primary shadow-lg'
                                : ''
                                }`}
                        >
                            {plan.badge && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <Badge className="px-4 py-1 bg-gradient-to-r from-primary to-purple-600">
                                        {plan.badge}
                                    </Badge>
                                </div>
                            )}

                            <CardHeader className="text-center pb-8">
                                <div className={`mx-auto w-12 h-12 rounded-full bg-gradient-to-br ${plan.color} p-3 mb-4`}>
                                    <Icon className="w-full h-full text-white" />
                                </div>
                                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                <CardDescription>
                                    {isCurrentPlan && (
                                        <Badge variant="outline" className="mt-2">
                                            Plano Atual
                                        </Badge>
                                    )}
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                <div className="text-center mb-6">
                                    <div className="text-4xl font-bold">
                                        R$ {pricePerMonth}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        por mês
                                        {isYearly && ` (${price} anual)`}
                                    </div>
                                </div>

                                <ul className="space-y-3">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                            <span className="text-sm">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>

                            <CardFooter>
                                <Button
                                    className="w-full"
                                    variant={isCurrentPlan ? 'outline' : 'default'}
                                    disabled={isCurrentPlan || isUpgrading}
                                    onClick={() => handleUpgrade(key as any)}
                                >
                                    {isUpgrading && selectedPlan === key && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    {isCurrentPlan
                                        ? 'Plano Atual'
                                        : PLAN_DETAILS[planType as PlanType]?.price.monthly > PLAN_DETAILS[key as PlanType]?.price.monthly
                                            ? 'Downgrade'
                                            : 'Fazer Upgrade'}
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>

            <div className="mt-16 text-center text-sm text-muted-foreground">
                <p>Todos os planos incluem suporte 24/7 e atualizações gratuitas</p>
                <p>Sem fidelidade • Cancele quando quiser • Pagamento 100% seguro via Mercado Pago</p>
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

