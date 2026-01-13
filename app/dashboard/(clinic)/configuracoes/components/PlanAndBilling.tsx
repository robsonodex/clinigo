'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
    CreditCard,
    Check,
    Zap,
    ShieldCheck,
    Loader2,
    AlertCircle,
    Clock,
    ExternalLink,
} from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

type PlanType = 'STARTER' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE' | 'NETWORK'

interface ClinicData {
    id: string
    name: string
    plan_type: PlanType
    subscription_due_date: string | null
    payment_status: string
}

const PLAN_DETAILS: Record<PlanType, { name: string; price: number; features: string[] }> = {
    STARTER: {
        name: 'Starter',
        price: 0,
        features: ['Até 2 médicos', 'Agendamentos básicos'],
    },
    BASIC: {
        name: 'Básico',
        price: 147,
        features: ['Até 5 médicos', 'Teleconsultas', 'Agenda online'],
    },
    PROFESSIONAL: {
        name: 'Profissional',
        price: 297,
        features: ['Até 10 médicos', 'Prontuário eletrônico', 'WhatsApp', 'Relatórios'],
    },
    ENTERPRISE: {
        name: 'Enterprise',
        price: 597,
        features: ['Médicos ilimitados', 'Todas funcionalidades', 'Suporte prioritário'],
    },
    NETWORK: {
        name: 'Network',
        price: 997,
        features: ['Multi-clínica', 'Dashboard consolidado', 'API completa'],
    },
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchClinicPlan(): Promise<ClinicData> {
    const res = await fetch('/api/billing/clinic-info', { credentials: 'include' })
    if (!res.ok) throw new Error('Erro ao carregar dados')
    return res.json()
}

async function generatePaymentLink(planType: PlanType): Promise<{ payment_url: string }> {
    const res = await fetch('/api/billing/generate-payment', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_type: planType }),
    })
    if (!res.ok) throw new Error('Erro ao gerar link de pagamento')
    return res.json()
}

// =============================================================================
// Component
// =============================================================================

export function PlanAndBilling() {
    const { data: clinic, isLoading } = useQuery({
        queryKey: ['clinic-plan'],
        queryFn: fetchClinicPlan,
    })

    const generatePayment = useMutation({
        mutationFn: generatePaymentLink,
        onSuccess: (data) => {
            window.open(data.payment_url, '_blank')
            toast.success('Link de pagamento gerado! Abrindo Mercado Pago...')
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Erro ao gerar pagamento')
        },
    })

    if (isLoading) {
        return <Skeleton className="h-64 w-full" />
    }

    if (!clinic) {
        return (
            <Card>
                <CardContent className="p-6">
                    <p className="text-muted-foreground">Erro ao carregar dados do plano</p>
                </CardContent>
            </Card>
        )
    }

    const planDetails = PLAN_DETAILS[clinic.plan_type]
    const daysUntilExpiration = clinic.subscription_due_date
        ? Math.ceil((new Date(clinic.subscription_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null

    const handlePayment = () => {
        generatePayment.mutate(clinic.plan_type)
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Plano Atual</CardTitle>
                            <CardDescription>Gerencie sua assinatura e recursos disponíveis</CardDescription>
                        </div>
                        <CreditCard className="w-8 h-8 text-primary/50" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Current Plan Info */}
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-start space-x-4">
                        <Zap className="w-6 h-6 text-primary mt-1" />
                        <div className="flex-1">
                            <h3 className="font-bold text-lg">{planDetails.name}</h3>
                            <p className="text-sm text-muted-foreground">
                                {clinic.subscription_due_date
                                    ? `Vence em: ${new Date(clinic.subscription_due_date).toLocaleDateString('pt-BR')}`
                                    : 'Sem data de vencimento'}
                            </p>
                        </div>
                        <Badge variant={clinic.payment_status === 'ACTIVE' ? 'default' : 'destructive'} className="uppercase">
                            {clinic.payment_status === 'ACTIVE' ? 'Ativo' : clinic.payment_status}
                        </Badge>
                    </div>

                    {/* Expiration Warning */}
                    {daysUntilExpiration !== null && daysUntilExpiration <= 7 && daysUntilExpiration > 0 && (
                        <Card className="border-amber-500/50 bg-amber-50">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-amber-900">Assinatura prestes a vencer!</p>
                                        <p className="text-sm text-amber-700">
                                            Sua assinatura vence em {daysUntilExpiration} dias. Renove agora para não perder acesso.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Features */}
                    <div className="grid md:grid-cols-2 gap-4">
                        {planDetails.features.map((feature, i) => (
                            <div key={i} className="flex items-center space-x-3 p-3 rounded-md border bg-card">
                                <ShieldCheck className="w-5 h-5 text-green-500" />
                                <span className="text-sm">{feature}</span>
                            </div>
                        ))}
                    </div>

                    {/* Payment Button */}
                    <div className="pt-4 border-t">
                        {clinic.plan_type !== 'STARTER' && planDetails.price > 0 && (
                            <Button onClick={handlePayment} disabled={generatePayment.isPending} className="w-full md:w-auto">
                                {generatePayment.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Gerando pagamento...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="w-4 h-4 mr-2" />
                                        Pagar Assinatura (R$ {planDetails.price})
                                    </>
                                )}
                            </Button>
                        )}

                        {clinic.plan_type === 'STARTER' && (
                            <p className="text-sm text-muted-foreground">
                                Você está no plano gratuito. Entre em contato para fazer upgrade.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
