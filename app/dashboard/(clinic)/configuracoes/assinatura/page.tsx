'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Check,
    X,
    AlertTriangle,
    RefreshCw,
    ShieldCheck,
    Zap,
    Building2,
    Activity,
    Layers,
    FileText
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

const PLAN_ICONS: Record<string, any> = {
    'BASICO': Layers,
    'AVANCADO': Activity,
    'PROFESSIONAL': ShieldCheck,
    'ENTERPRISE': Building2,
}

const PLAN_COLORS: Record<string, string> = {
    'BASICO': 'bg-gray-100 text-gray-800 border-gray-300',
    'AVANCADO': 'bg-emerald-50 text-emerald-800 border-emerald-300',
    'PROFESSIONAL': 'bg-slate-50 text-slate-800 border-slate-300',
    'ENTERPRISE': 'bg-purple-50 text-purple-800 border-purple-300',
}

export default function AssinaturaPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [clinic, setClinic] = useState<any>(null)
    const [currentPlan, setCurrentPlan] = useState<PlanType>('PROFESSIONAL')
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

            // Verificar modo impersonation via cookies
            const cookies = typeof document !== 'undefined'
                ? document.cookie.split(';').reduce((acc, cookie) => {
                    const [key, value] = cookie.trim().split('=')
                    if (key) acc[key] = decodeURIComponent(value || '')
                    return acc
                }, {} as Record<string, string>)
                : {}

            const impersonationClinicId = cookies['impersonation_clinic_id']

            let targetClinicId = impersonationClinicId

            if (!targetClinicId) {
                // Obter clínica associada ao usuário autenticado
                const { data: userData } = await supabase
                    .from('users')
                    .select('clinic_id')
                    .eq('id', user.id)
                    .single()

                targetClinicId = userData?.clinic_id
            }

            if (!targetClinicId) {
                toast.error('Clínica não encontrada')
                return
            }

            // Obter dados da clínica alvo
            const { data: clinicData } = await supabase
                .from('clinics')
                .select('*')
                .eq('id', targetClinicId)
                .single()

            if (clinicData) {
                setClinic(clinicData)
                const rawPlanType = (clinicData as any).plan_type || 'PROFESSIONAL'
                setCurrentPlan(migrateLegacyPlan(rawPlanType))
            }
        } catch (error) {
            console.error('Error loading data:', error)
            toast.error('Erro ao carregar dados de assinatura')
        } finally {
            setLoading(false)
        }
    }

    async function handleGeneratePayment(plan: PlanType) {
        setGeneratingPayment(true)
        try {
            const res = await fetch('/api/billing/generate-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan_type: plan,
                    clinic_id: clinic?.id,
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao gerar boleto')

            if (data.boleto?.nosso_numero) {
                const pdfUrl = `/api/billing/boleto-pdf?nossoNumero=${data.boleto.nosso_numero}`
                window.open(pdfUrl, '_blank')
                toast.success('Boleto gerado com sucesso. Abrindo em nova aba.')
                loadData()
            } else if (data.boleto?.linha_digitavel) {
                navigator.clipboard.writeText(data.boleto.linha_digitavel)
                toast.success('Boleto gerado. Linha digitável copiada.')
                loadData()
            } else {
                toast.success('Solicitação de cobrança processada com sucesso.')
            }
        } catch (error: any) {
            toast.error(error.message || 'Erro ao processar cobrança')
        } finally {
            setGeneratingPayment(false)
        }
    }

    async function handleCancelSubscription() {
        setProcessingCancel(true)
        try {
            const supabase = createClient()

            const { error } = await supabase
                .from('clinics')
                .update({
                    subscription_status: 'cancelled',
                    cancelled_at: new Date().toISOString()
                })
                .eq('id', clinic.id)

            if (error) throw error

            toast.success('Assinatura cancelada. O acesso continua ativo até o fim do ciclo pago.')
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

    const isPaymentConfirmed = clinic?.payment_confirmed === true || clinic?.approval_status === 'active'

    return (
        <div className="container max-w-5xl py-8 space-y-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Assinatura e Plano</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Gerencie as configurações e emissão de cobranças da assinatura da sua clínica.
                    </p>
                </div>
                <Button 
                    variant="outline"
                    className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-medium px-4 min-h-[44px] shadow-xs self-start sm:self-center"
                    onClick={() => handleGeneratePayment(currentPlan)}
                    disabled={generatingPayment}
                >
                    {generatingPayment ? (
                        <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Gerando Boleto...
                        </>
                    ) : (
                        <>
                            <FileText className="w-4 h-4 mr-2 text-emerald-600" />
                            Gerar Boleto
                        </>
                    )}
                </Button>
            </div>

            <div className="space-y-6">
                {/* Cartão do Plano Atual */}
                <Card className={cn("border-2 shadow-sm", PLAN_COLORS[currentPlan])}>
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-3 rounded-xl",
                                    currentPlan === 'BASICO' ? 'bg-gray-200' :
                                        currentPlan === 'AVANCADO' ? 'bg-emerald-200' :
                                            currentPlan === 'PROFESSIONAL' ? 'bg-blue-200' :
                                                'bg-purple-200'
                                )}>
                                    <PlanIcon className="w-6 h-6 text-slate-800" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold">{planConfig?.name || 'CliniGo Professional'}</CardTitle>
                                    <CardDescription>Plano atual</CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="text-base px-4 py-1 font-semibold">
                                    R$ {planConfig?.price || 449}/mês
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Status de Confirmação de Assinatura */}
                        {isPaymentConfirmed ? (
                            <div className="p-4 bg-white/90 dark:bg-slate-900/90 border border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                                        <Check className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">Assinatura Ativa</p>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            Recebemos a confirmação de pagamento. O seu plano está ativo e o acesso contínuo está garantido.
                                        </p>
                                    </div>
                                </div>
                                <Button 
                                    variant="outline"
                                    className="shrink-0 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-medium min-h-[44px] px-4"
                                    onClick={() => handleGeneratePayment(currentPlan)}
                                    disabled={generatingPayment}
                                >
                                    {generatingPayment ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2 text-emerald-600" />}
                                    Emitir Boleto da Assinatura
                                </Button>
                            </div>
                        ) : (
                            <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-amber-900">Período de Teste ou Pagamento Pendente</p>
                                        <p className="text-sm text-amber-800 mt-1">
                                            Sua clínica aguarda a confirmação de pagamento. Gere seu boleto para garantir o acesso contínuo.
                                        </p>
                                    </div>
                                </div>
                                <Button 
                                    className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] px-4 font-medium"
                                    onClick={() => handleGeneratePayment(currentPlan)}
                                    disabled={generatingPayment}
                                >
                                    {generatingPayment ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                                    Gerar Boleto do Plano
                                </Button>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6 pt-2">
                            <div>
                                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recursos Incluídos</h4>
                                <ul className="space-y-2">
                                    {planConfig?.features?.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                            <span>{feature.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Limites Operacionais</h4>
                                <ul className="space-y-2 text-sm text-foreground">
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>{planConfig?.limits?.max_doctors === -1 ? 'Médicos e terapeutas ilimitados' : `Até ${planConfig?.limits?.max_doctors || 30} profissionais`}</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>{planConfig?.limits?.max_appointments_month === -1 ? 'Consultas e atendimentos ilimitados' : `Até ${planConfig?.limits?.max_appointments_month} atendimentos/mês`}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {clinic?.subscription_status === 'cancelled' && (
                            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
                                <div>
                                    <p className="font-medium text-yellow-800">Assinatura cancelada</p>
                                    <p className="text-sm text-yellow-700">
                                        Seu acesso permanece liberado até o encerramento do ciclo contratual.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Cancelar Assinatura (Controle Administrativo) */}
                {clinic?.subscription_status !== 'cancelled' && (
                    <Card className="border-border shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold text-foreground">Cancelamento de Assinatura</CardTitle>
                            <CardDescription>
                                Caso deseje suspender a renovação do serviço ao final do ciclo contratual.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950 min-h-[44px]">
                                        <X className="w-4 h-4 mr-2" />
                                        Cancelar Assinatura
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmação de Cancelamento</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Ao cancelar a assinatura:
                                            <ul className="list-disc ml-4 mt-2 space-y-1">
                                                <li>O acesso permanece liberado até o término do ciclo atual.</li>
                                                <li>Os dados e prontuários permanecem seguros conforme a LGPD.</li>
                                                <li>Você pode reativar a assinatura a qualquer momento.</li>
                                            </ul>
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="min-h-[44px]">Voltar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleCancelSubscription}
                                            disabled={processingCancel}
                                            className="bg-red-600 hover:bg-red-700 min-h-[44px]"
                                        >
                                            {processingCancel ? 'Processando...' : 'Confirmar Cancelamento'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
