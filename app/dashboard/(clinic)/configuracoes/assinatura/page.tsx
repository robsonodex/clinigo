'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    CreditCard,
    Calendar,
    Check,
    X,
    AlertTriangle,
    ArrowRight,

    RefreshCw,
    Crown,
    Zap,
    Building2,
    Rocket
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PLANS, type PlanType, migrateLegacyPlan } from '@/lib/constants/plans'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface PaymentHistory {
    id: string
    created_at: string
    amount: number
    status: string
    payment_method: string
    payment_id: string
}

const PLAN_ICONS: Record<string, any> = {
    'BASICO': Zap,
    'AVANCADO': Rocket,
    'PROFESSIONAL': Crown,
    'ENTERPRISE': Building2,
}

const PLAN_COLORS: Record<string, string> = {
    'BASICO': 'bg-gray-100 text-gray-800 border-gray-300',
    'AVANCADO': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'PROFESSIONAL': 'bg-blue-100 text-blue-800 border-blue-300',
    'ENTERPRISE': 'bg-purple-100 text-purple-800 border-purple-300',
}

export default function AssinaturaPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [clinic, setClinic] = useState<any>(null)
    const [currentPlan, setCurrentPlan] = useState<PlanType>('BASICO')
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
    const [processingCancel, setProcessingCancel] = useState(false)
    const [generatingPayment, setGeneratingPayment] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            // Get user's clinic
            const { data: userData } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', user.id)
                .single()

            if (!userData?.clinic_id) {
                toast.error('Clínica não encontrada')
                return
            }

            // Get clinic data
            const { data: clinicData } = await supabase
                .from('clinics')
                .select('*')
                .eq('id', userData.clinic_id)
                .single()

            if (clinicData) {
                setClinic(clinicData)
                // Use migrateLegacyPlan to correctly map BASIC -> BASICO (not AVANCADO)
                const rawPlanType = (clinicData as any).plan_type || 'BASICO'
                console.log('[Assinatura] Raw plan_type from DB:', rawPlanType, '-> Migrated to:', migrateLegacyPlan(rawPlanType))
                setCurrentPlan(migrateLegacyPlan(rawPlanType))
            }

            // Load real payment history from payment_logs table
            const { data: payments } = await supabase
                .from('payment_logs')
                .select('id, created_at, amount, status, payment_method, payment_id')
                .eq('clinic_id', userData.clinic_id)
                .order('created_at', { ascending: false })
                .limit(20)

            if (payments && payments.length > 0) {
                setPaymentHistory(payments.map(p => ({
                    id: p.id,
                    created_at: p.created_at,
                    amount: Number(p.amount),
                    status: p.status,
                    payment_method: p.payment_method || '-',
                    payment_id: p.payment_id || '-',
                })))
            }

        } catch (error) {
            console.error('Error loading data:', error)
            toast.error('Erro ao carregar dados')
        } finally {
            setLoading(false)
        }
    }

    async function handleUpgrade(newPlan: PlanType) {
        try {
            // Redirect to payment page with plan
            router.push(`/cadastro?plan=${newPlan}&upgrade=true`)
        } catch (error) {
            toast.error('Erro ao processar upgrade')
        }
    }

    async function handleGeneratePayment(plan: PlanType) {
        setGeneratingPayment(true)
        try {
            const res = await fetch('/api/billing/generate-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_type: plan })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao gerar boleto')

            if (data.boleto?.nosso_numero) {
                // Abre o PDF do boleto em nova aba
                const pdfUrl = `/api/billing/boleto-pdf?nossoNumero=${data.boleto.nosso_numero}`
                window.open(pdfUrl, '_blank')
                toast.success('Boleto gerado com sucesso!')
                // Reload data to potentially update the payment requests history if implemented
                loadData()
            } else {
                toast.error('Boleto gerado, mas número não retornado.')
            }
        } catch (error: any) {
            toast.error(error.message || 'Erro ao processar pagamento')
        } finally {
            setGeneratingPayment(false)
        }
    }

    async function handleCancelSubscription() {
        setProcessingCancel(true)
        try {
            const supabase = createClient()

            // Update clinic to mark as cancelled
            const { error } = await supabase
                .from('clinics')
                .update({
                    subscription_status: 'cancelled',
                    cancelled_at: new Date().toISOString()
                })
                .eq('id', clinic.id)

            if (error) throw error

            toast.success('Assinatura cancelada. Acesso continua até o fim do período pago.')
            setCancelDialogOpen(false)
            loadData()
        } catch (error) {
            toast.error('Erro ao cancelar assinatura')
        } finally {
            setProcessingCancel(false)
        }
    }

    const planConfig = PLANS[currentPlan]
    const PlanIcon = PLAN_ICONS[currentPlan] || Zap

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="container max-w-6xl py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Assinatura e Plano</h1>
                <p className="text-muted-foreground">
                    Gerencie sua assinatura, visualize histórico de pagamentos e faça upgrade do seu plano.
                </p>
            </div>

            <Tabs defaultValue="plano" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 max-w-md">
                    <TabsTrigger value="plano">Meu Plano</TabsTrigger>
                    <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
                    <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
                </TabsList>

                {/* TAB: Meu Plano */}
                <TabsContent value="plano" className="space-y-6">
                    {/* Current Plan Card */}
                    <Card className={cn("border-2", PLAN_COLORS[currentPlan])}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-3 rounded-xl",
                                        currentPlan === 'BASICO' ? 'bg-gray-200' :
                                            currentPlan === 'AVANCADO' ? 'bg-emerald-200' :
                                                currentPlan === 'PROFESSIONAL' ? 'bg-blue-200' :
                                                    'bg-purple-200'
                                    )}>
                                        <PlanIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">{planConfig?.name || 'Plano Básico'}</CardTitle>
                                        <CardDescription>Plano atual</CardDescription>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="text-lg px-4 py-1">
                                    R$ {planConfig?.price || 149}/mês
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold mb-3">Recursos Incluídos:</h4>
                                    <ul className="space-y-2">
                                        {planConfig?.features?.slice(0, 6).map((feature, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm">
                                                <Check className="w-4 h-4 text-green-600" />
                                                {feature.name}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-3">Limites:</h4>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex items-center gap-2">
                                            <Check className="w-4 h-4 text-green-600" />
                                            {planConfig?.limits?.max_doctors === -1 ? 'Médicos ilimitados' : `Até ${planConfig?.limits?.max_doctors || 3} médicos`}
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check className="w-4 h-4 text-green-600" />
                                            {planConfig?.limits?.max_appointments_month === -1 ? 'Consultas ilimitadas' : `Até ${planConfig?.limits?.max_appointments_month} consultas/mês`}
                                        </li>

                                    </ul>
                                </div>
                            </div>

                            {clinic?.approval_status === 'trial' || !clinic?.payment_confirmed ? (
                                <div className="mt-6 p-5 bg-amber-50 border border-amber-200 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-semibold text-amber-900">Período de Teste ou Pagamento Pendente</p>
                                            <p className="text-sm text-amber-800 mt-1">
                                                {clinic?.approval_status === 'trial' 
                                                    ? 'Sua clínica está em período de teste gratuito. Gere seu boleto agora para garantir o acesso contínuo e ativar seu plano oficialmente.'
                                                    : 'Sua clínica aguarda a confirmação de pagamento. Gere seu boleto agora para garantir o acesso contínuo e ativar seu plano oficialmente.'}
                                            </p>
                                        </div>
                                    </div>
                                    <Button 
                                        className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
                                        onClick={() => handleGeneratePayment(currentPlan)}
                                        disabled={generatingPayment}
                                    >
                                        {generatingPayment ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                                        PAGAR MEU PLANO
                                    </Button>
                                </div>
                            ) : (
                                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                                    <Check className="w-5 h-5 text-green-600 shrink-0" />
                                    <div>
                                        <p className="font-medium text-green-900">Assinatura Ativa</p>
                                        <p className="text-sm text-green-800">
                                            Recebemos o seu pagamento e o seu plano está ativo! Seu acesso está garantido.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {clinic?.subscription_status === 'cancelled' && (
                                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                    <div>
                                        <p className="font-medium text-yellow-800">Assinatura cancelada</p>
                                        <p className="text-sm text-yellow-700">
                                            Seu acesso continua até o fim do período pago.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Upgrade Options */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Fazer Upgrade</h3>
                        <div className="grid md:grid-cols-3 gap-4">
                            {(['AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'] as PlanType[])
                                .filter(plan => {
                                    const planOrder = { BASICO: 1, AVANCADO: 2, PROFESSIONAL: 3, ENTERPRISE: 4, NETWORK: 5 }
                                    return planOrder[plan] > planOrder[currentPlan]
                                })
                                .map(plan => {
                                    const config = PLANS[plan]
                                    const Icon = PLAN_ICONS[plan]
                                    return (
                                        <Card key={plan} className="hover:shadow-lg transition-shadow">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center gap-2">
                                                    <Icon className="w-5 h-5" />
                                                    <CardTitle className="text-lg">{config?.name}</CardTitle>
                                                </div>
                                                <CardDescription>
                                                    R$ {config?.price}/mês
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <ul className="text-sm space-y-1 mb-4">
                                                    {config?.features?.slice(0, 3).map((f, i) => (
                                                        <li key={i} className="flex items-center gap-2">
                                                            <Check className="w-3 h-3 text-green-600" />
                                                            {f.name}
                                                        </li>
                                                    ))}
                                                </ul>
                                                <Button
                                                    className="w-full"
                                                    onClick={() => handleUpgrade(plan)}
                                                >
                                                    Fazer Upgrade <ArrowRight className="w-4 h-4 ml-2" />
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                        </div>
                    </div>

                    {/* Cancel Subscription */}
                    {clinic?.subscription_status !== 'cancelled' && (
                        <Card className="border-red-200">
                            <CardHeader>
                                <CardTitle className="text-red-600">Cancelar Assinatura</CardTitle>
                                <CardDescription>
                                    Ao cancelar, você perderá acesso aos recursos após o fim do período pago.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive">
                                            <X className="w-4 h-4 mr-2" />
                                            Cancelar Assinatura
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Ao cancelar sua assinatura:
                                                <ul className="list-disc ml-4 mt-2 space-y-1">
                                                    <li>Seu acesso continua até o fim do período pago</li>
                                                    <li>Seus dados serão mantidos por 30 dias</li>
                                                    <li>Você pode reativar a qualquer momento</li>
                                                </ul>
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Voltar</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleCancelSubscription}
                                                disabled={processingCancel}
                                                className="bg-red-600 hover:bg-red-700"
                                            >
                                                {processingCancel ? 'Cancelando...' : 'Confirmar Cancelamento'}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* TAB: Pagamentos */}
                <TabsContent value="pagamentos" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Pagamentos</CardTitle>
                            <CardDescription>
                                Visualize todos os pagamentos realizados
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {paymentHistory.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                        <p className="font-medium">Nenhum pagamento registrado</p>
                                        <p className="text-sm">O histórico aparecerá aqui quando houver pagamentos confirmados.</p>
                                    </div>
                                ) : (
                                    paymentHistory.map((payment) => (
                                        <div
                                            key={payment.id}
                                            className="flex items-center justify-between p-4 border rounded-lg"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "p-2 rounded-full",
                                                    payment.status === 'APPROVED' ? 'bg-green-100' :
                                                        payment.status === 'PENDING' ? 'bg-yellow-100' : 'bg-red-100'
                                                )}>
                                                    {payment.status === 'APPROVED' ? (
                                                        <Check className="w-4 h-4 text-green-600" />
                                                    ) : payment.status === 'PENDING' ? (
                                                        <RefreshCw className="w-4 h-4 text-yellow-600" />
                                                    ) : (
                                                        <X className="w-4 h-4 text-red-600" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium">
                                                        {new Date(payment.created_at).toLocaleDateString('pt-BR', {
                                                            day: '2-digit',
                                                            month: 'long',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {payment.status === 'APPROVED' ? 'Pago' :
                                                            payment.status === 'PENDING' ? 'Pendente' :
                                                                payment.status === 'REJECTED' ? 'Rejeitado' :
                                                                    payment.status === 'CANCELLED' ? 'Cancelado' : payment.status}
                                                        {payment.payment_method ? ` • ${payment.payment_method}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-semibold">
                                                    R$ {payment.amount.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Faturamento */}
                <TabsContent value="faturamento" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados de Faturamento</CardTitle>
                            <CardDescription>
                                Informações para emissão de nota fiscal
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Razão Social</label>
                                    <p className="text-muted-foreground">{typeof clinic?.name === 'string' ? clinic.name : '-'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">CNPJ</label>
                                    <p className="text-muted-foreground">{typeof clinic?.cnpj === 'string' ? clinic.cnpj : '-'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Email de Faturamento</label>
                                    <p className="text-muted-foreground">{typeof clinic?.email === 'string' ? clinic.email : '-'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Endereço</label>
                                    <p className="text-muted-foreground">{typeof clinic?.address === 'string' ? clinic.address : (typeof clinic?.address === 'object' && clinic?.address ? JSON.stringify(clinic.address) : '-')}</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <h4 className="font-medium mb-3">Forma de Pagamento</h4>
                                <div className="flex items-center gap-3 p-4 border rounded-lg">
                                    <CreditCard className="w-8 h-8 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">
                                            {clinic?.payment_method === 'BOLETO' ? 'Boleto Bancário' :
                                                clinic?.payment_method === 'PIX' ? 'PIX' :
                                                    clinic?.payment_method === 'CREDIT_CARD' ? 'Cartão de Crédito' :
                                                        'Nenhuma forma de pagamento registrada'}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {clinic?.payment_confirmed ? 'Pagamento confirmado' : 'Pagamento pendente'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {clinic?.payment_confirmed_at && (
                                <div className="pt-4 border-t">
                                    <h4 className="font-medium mb-3">Último Pagamento Confirmado</h4>
                                    <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                                        <Calendar className="w-6 h-6" />
                                        <div>
                                            <p className="font-medium">
                                                {new Date(clinic.payment_confirmed_at).toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {planConfig?.name} - R$ {planConfig?.price || 0}/mês
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
