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

type PlanType = 'BASICO' | 'AVANCADO' | 'PROFESSIONAL' | 'ENTERPRISE' | 'NETWORK'

interface ClinicData {
    id: string
    name: string
    plan_type: PlanType
    subscription_due_date: string | null
    payment_status: string
    approval_status: string | null
    trial_ends_at: string | null
}

const PLAN_DETAILS: Record<PlanType, { name: string; price: number; features: string[] }> = {
    BASICO: {
        name: 'CliniGo Básico',
        price: 99,
        features: [
            '1 profissional',
            'Consultas ilimitadas',
            '200 pacientes',

            'Agenda anti-overbooking',
            'Prontuário eletrônico',
            'Check-in manual',
            'Financeiro básico',
            'Relatórios básicos',
            'E-mail transacional',
        ],
    },
    AVANCADO: {
        name: 'CliniGo Avançado',
        price: 249,
        features: [
            'Até 5 profissionais',
            'Consultas ilimitadas',
            'Pacientes ilimitados',

            'Tudo do Básico +',
            'Teleconsulta WebRTC',
            'Check-in QR Code',
            'DRE + Repasse Médico',
            'Fluxo de Caixa',
            'Templates customizados',
            'Relatórios avançados',
            'Importação de dados',
            'Lembretes automáticos',
        ],
    },
    PROFESSIONAL: {
        name: 'CliniGo Professional',
        price: 449,
        features: [
            'Até 30 profissionais',
            'Consultas ilimitadas',

            'Tudo do Avançado +',
            'TISS completo',
            'Check-in Facial',

            'Auditoria financeira',
            'Centro de custos',
            'Dashboards customizados',
            'API/Webhooks',
        ],
    },
    ENTERPRISE: {
        name: 'CliniGo Enterprise',
        price: 699,
        features: [
            'Profissionais ilimitados',
            'Consultas ilimitadas',

            'Tudo do Professional +',
            'Portal Super Admin',
            'Gestão centralizada de clínicas',
            'Analytics global',
            'Migração dedicada',
            'Consultoria de implantação',
        ],
    },
    NETWORK: {
        name: 'CliniGo Network (Legacy)',
        price: 999,
        features: ['Migrado para Enterprise'],
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

interface BoletoResponse {
    success: boolean
    payment_method: 'BOLETO'
    boleto: {
        linha_digitavel: string
        codigo_barras: string
        nosso_numero: string
    }
    plan: { name: string; price: number }
}

async function generatePaymentLink(planType: PlanType): Promise<BoletoResponse> {
    const res = await fetch('/api/billing/generate-payment', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_type: planType }),
    })
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao gerar boleto')
    }
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
            // Show boleto info in a toast and copy to clipboard
            if (data.boleto) {
                const downloadUrl = `/api/billing/boleto-pdf?nossoNumero=${data.boleto.nosso_numero}`

                // Open PDF in new tab immediately
                window.open(downloadUrl, '_blank')

                navigator.clipboard.writeText(data.boleto.linha_digitavel)
                toast.success(
                    <div className="space-y-3">
                        <p className="font-bold">✅ Boleto gerado!</p>
                        <p className="text-xs">Linha digitável copiada para a área de transferência.</p>
                        <div className="flex gap-2">
                            <a
                                href={downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 rounded text-xs font-medium inline-flex items-center gap-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                Baixar PDF
                            </a>
                        </div>
                        <p className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded break-all select-all">
                            {data.boleto.linha_digitavel}
                        </p>
                    </div>,
                    { duration: 15000 }
                )
            }
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Erro ao gerar boleto')
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

    const planDetails = PLAN_DETAILS[clinic.plan_type] || PLAN_DETAILS.BASICO
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
                    {/* Trial Info */}
                    {clinic.approval_status === 'trial' && clinic.trial_ends_at && (() => {
                        const trialDaysLeft = Math.max(0, Math.ceil((new Date(clinic.trial_ends_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                        const trialDateFormatted = new Date(clinic.trial_ends_at!).toLocaleDateString('pt-BR')
                        return (
                            <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-semibold text-amber-900 dark:text-amber-200">
                                                Período de teste grátis
                                            </p>
                                            <p className="text-sm text-amber-700 dark:text-amber-300">
                                                {trialDaysLeft > 0
                                                    ? `Seu teste expira em ${trialDaysLeft} dia${trialDaysLeft !== 1 ? 's' : ''} (${trialDateFormatted}). Escolha um plano para continuar.`
                                                    : 'Seu período de teste expirou. Escolha um plano para continuar usando o CliniGo.'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })()}
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

                    {/* Payment/Upgrade Section */}
                    <div className="pt-4 border-t space-y-4">
                        {/* BOTÃO PAGAR AGORA - Sempre visível para planos pagos */}
                        {planDetails.price > 0 && (
                            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-semibold text-green-900">Pagamento Mensal</h4>
                                        <p className="text-sm text-green-700">
                                            Valor: <span className="font-bold text-lg">R$ {planDetails.price},00</span>/mês
                                        </p>
                                        {clinic.subscription_due_date && (
                                            <p className="text-xs text-green-600 mt-1">
                                                Próximo vencimento: {new Date(clinic.subscription_due_date).toLocaleDateString('pt-BR')}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        onClick={handlePayment}
                                        disabled={generatePayment.isPending}
                                        size="lg"
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {generatePayment.isPending ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Gerando...
                                            </>
                                        ) : (
                                            <>
                                                <CreditCard className="w-4 h-4 mr-2" />
                                                Pagar Agora
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" />
                                    Será gerado um boleto Banco Inter para pagamento
                                </p>
                            </div>
                        )}

                        {/* Status messages */}
                        {clinic.payment_status === 'ACTIVE' && daysUntilExpiration !== null && daysUntilExpiration > 7 && (
                            <p className="text-sm text-green-600 flex items-center gap-2">
                                <Check className="w-4 h-4" />
                                Sua assinatura está em dia. Próximo vencimento em {daysUntilExpiration} dias.
                            </p>
                        )}

                        {/* Plano Básico: informação sobre upgrade */}
                        {clinic.plan_type === 'BASICO' && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-900">
                                    💡 Você está no plano <strong>Básico</strong>.
                                    <a href="/planos" className="text-blue-600 underline ml-1">
                                        Veja nossos planos pagos
                                    </a> para desbloquear mais recursos.
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
