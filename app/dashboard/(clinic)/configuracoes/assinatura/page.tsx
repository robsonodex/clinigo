'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
    FileText,
    Users,
    Copy,
    Download,
    ExternalLink,
    Share2,
    ClipboardPaste,
    CreditCard,
    Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PLANS, type PlanType, migrateLegacyPlan } from '@/lib/constants/plans'
import { cn } from '@/lib/utils'
import { evaluateBillingBanner, formatDateBr } from '@/lib/utils/billing-banner'
import { toast } from 'sonner'
import { SeatOverageDialog, type SeatQuote } from '@/components/billing/seat-overage-dialog'
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
    BASICO: Layers,
    AVANCADO: Activity,
    PROFESSIONAL: ShieldCheck,
    ENTERPRISE: Building2,
}

interface EmittedBoleto {
    nosso_numero: string
    linha_digitavel: string
    codigo_barras?: string
    pix_copia_e_cola?: string
    amount?: number
    due_date?: string
    public_url?: string | null
    payment_request_id?: string | null
}

function formatCpfCnpjInput(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 14)
    if (digits.length <= 11) {
        return digits
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    return digits
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
}

async function copyTextSafe(text: string): Promise<boolean> {
    if (!text) return false
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text)
            return true
        }
    } catch {
        // Fallback para WebViews mobile e navegadores sem permissão direta de clipboard
    }
    try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        textarea.style.top = '0'
        textarea.setAttribute('readonly', '')
        document.body.appendChild(textarea)
        textarea.select()
        textarea.setSelectionRange(0, 99999)
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        return ok
    } catch {
        return false
    }
}

export default function AssinaturaPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [clinic, setClinic] = useState<any>(null)
    const [currentPlan, setCurrentPlan] = useState<PlanType>('PROFESSIONAL')
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
    const [processingCancel, setProcessingCancel] = useState(false)
    const [generatingPayment, setGeneratingPayment] = useState(false)

    const [activeBoleto, setActiveBoleto] = useState<EmittedBoleto | null>(null)
    const [boletoModalOpen, setBoletoModalOpen] = useState(false)
    const [copiedBarcode, setCopiedBarcode] = useState(false)

    const [cnpjDialogOpen, setCnpjDialogOpen] = useState(false)
    const [cnpjInput, setCnpjInput] = useState('')
    const [cnpjErrorMsg, setCnpjErrorMsg] = useState<string | null>(null)
    const [pendingPlanForBoleto, setPendingPlanForBoleto] = useState<PlanType | null>(null)

    const [seatUsage, setSeatUsage] = useState<any>(null)
    const [regularizationQuote, setRegularizationQuote] = useState<SeatQuote | null>(null)
    const [regularizationDialogOpen, setRegularizationDialogOpen] = useState(false)
    const [loadingRegularization, setLoadingRegularization] = useState(false)
    const [regularizationError, setRegularizationError] = useState<string | null>(null)

    const loadData = useCallback(async (manual = false) => {
        if (manual) setRefreshing(true)
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            const cookies = typeof document !== 'undefined'
                ? document.cookie.split(';').reduce((acc, cookie) => {
                    const [key, value] = cookie.trim().split('=')
                    if (key) acc[key] = decodeURIComponent(value || '')
                    return acc
                }, {} as Record<string, string>)
                : {}

            const impersonationClinicId = cookies['impersonation_clinic_id']

            const { data: userData } = await (supabase
                .from('users') as any)
                .select('clinic_id, role')
                .eq('id', user.id)
                .single()

            if (userData?.role !== 'CLINIC_ADMIN' && userData?.role !== 'SUPER_ADMIN') {
                toast.error('Acesso restrito: Apenas o Administrador da Clínica pode acessar a área de assinatura.')
                router.replace('/dashboard')
                return
            }

            const targetClinicId = impersonationClinicId || userData?.clinic_id

            if (!targetClinicId) {
                toast.error('Clínica não encontrada')
                router.replace('/dashboard')
                return
            }

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

            const [seatRes, pendingBoletoRes] = await Promise.allSettled([
                fetch('/api/billing/seat-usage'),
                fetch('/api/billing/generate-payment'),
            ])

            if (seatRes.status === 'fulfilled' && seatRes.value.ok) {
                const seatJson = await seatRes.value.json()
                if (seatJson.success && seatJson.data) {
                    setSeatUsage(seatJson.data)
                }
            }

            if (pendingBoletoRes.status === 'fulfilled' && pendingBoletoRes.value.ok) {
                const pendingJson = await pendingBoletoRes.value.json()
                if (pendingJson.pending_boleto?.nosso_numero) {
                    setActiveBoleto((prev) => prev || {
                        nosso_numero: pendingJson.pending_boleto.nosso_numero,
                        linha_digitavel: pendingJson.pending_boleto.linha_digitavel || '',
                        amount: pendingJson.pending_boleto.amount,
                        public_url: pendingJson.pending_boleto.public_url,
                        payment_request_id: pendingJson.pending_boleto.payment_request_id,
                    })
                }
            }

            if (manual) toast.success('Dados de assinatura atualizados.')
        } catch (error) {
            console.error('Error loading data:', error)
            toast.error('Erro ao carregar dados de assinatura.')
        } finally {
            setLoading(false)
            if (manual) setRefreshing(false)
        }
    }, [router])

    useEffect(() => {
        loadData()
    }, [loadData])

    async function handleRequestRegularization() {
        setLoadingRegularization(true)
        try {
            const res = await fetch('/api/billing/seat-usage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_regularization_quote' }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao obter cotação de regularização')
            setRegularizationQuote(data.data?.quote)
            setRegularizationError(null)
            setRegularizationDialogOpen(true)
        } catch (err: any) {
            toast.error(err.message || 'Erro ao iniciar regularização')
        } finally {
            setLoadingRegularization(false)
        }
    }

    async function handleConfirmRegularization(confirmedQuote: SeatQuote) {
        const res = await fetch('/api/billing/seat-usage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': `reg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            },
            body: JSON.stringify({
                action: 'accept_regularization',
                quote_id: confirmedQuote.quote_id,
            }),
        })
        const data = await res.json()
        if (!res.ok) {
            if (res.status === 409 && data.code === 'QUOTE_STALE') {
                setRegularizationQuote(data.quote)
                throw new Error('A cotação foi atualizada. Por favor, confirme novamente.')
            }
            throw new Error(data.error || 'Erro ao confirmar regularização')
        }
        toast.success('Licenças regularizadas com sucesso.')
        setRegularizationDialogOpen(false)
        loadData()
    }

    async function handleGeneratePayment(plan: PlanType, customCpfCnpj?: string) {
        setGeneratingPayment(true)
        try {
            const res = await fetch('/api/billing/generate-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan_type: plan,
                    clinic_id: clinic?.id,
                    ...(customCpfCnpj ? { cpf_cnpj: customCpfCnpj, save_cnpj: true } : {}),
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                if (data.code === 'INVALID_CPF_CNPJ') {
                    setPendingPlanForBoleto(plan)
                    setCnpjErrorMsg(data.error || 'Informe um CPF ou CNPJ válido para emissão do boleto.')
                    const currentRaw = String(data.current_cnpj || clinic?.cnpj || '').replace(/\D/g, '')
                    setCnpjInput(currentRaw === '00000000000001' ? '' : formatCpfCnpjInput(currentRaw))
                    setCnpjDialogOpen(true)
                    return
                }
                throw new Error(data.error || data.details || 'Erro ao gerar boleto')
            }

            setCnpjDialogOpen(false)
            setCnpjErrorMsg(null)

            const emitted: EmittedBoleto = {
                nosso_numero: data.boleto?.nosso_numero || '',
                linha_digitavel: data.boleto?.linha_digitavel || '',
                codigo_barras: data.boleto?.codigo_barras || '',
                pix_copia_e_cola: data.boleto?.pix_copia_e_cola || '',
                amount: data.amount,
                due_date: data.due_date,
                public_url: data.public_url || null,
                payment_request_id: data.payment_request_id || null,
            }

            setActiveBoleto(emitted)
            setBoletoModalOpen(true)
            toast.success('Boleto emitido com sucesso. Escolha abaixo para abrir o PDF ou copiar o código de barras.')
            loadData()
        } catch (error: any) {
            toast.error(error.message || 'Erro ao processar cobrança.')
        } finally {
            setGeneratingPayment(false)
        }
    }

    async function handleConfirmCnpjAndGenerate() {
        const clean = cnpjInput.replace(/\D/g, '')
        if (clean.length !== 11 && clean.length !== 14) {
            setCnpjErrorMsg('Digite um CPF (11 dígitos) ou CNPJ (14 dígitos) completo.')
            return
        }
        await handleGeneratePayment(pendingPlanForBoleto || currentPlan, clean)
    }

    async function handlePasteCnpj() {
        try {
            const text = await navigator.clipboard.readText()
            if (text) {
                setCnpjInput(formatCpfCnpjInput(text))
                setCnpjErrorMsg(null)
            }
        } catch {
            toast.error('Não foi possível acessar a área de transferência automaticamente.')
        }
    }

    async function handleCopyLinhaDigitavel(linha: string) {
        const ok = await copyTextSafe(linha)
        if (ok) {
            setCopiedBarcode(true)
            toast.success('Linha digitável copiada para a área de transferência.')
            setTimeout(() => setCopiedBarcode(false), 3000)
        } else {
            toast.error('Não foi possível copiar automaticamente. Selecione o código acima.')
        }
    }

    async function handleShareBoleto(boleto: EmittedBoleto) {
        const shareUrl = boleto.public_url || `${window.location.origin}/api/billing/boleto-pdf?nossoNumero=${boleto.nosso_numero}`
        const shareText = boleto.linha_digitavel
            ? `Boleto de Assinatura CliniGo (${clinic?.name || 'Clínica'})\nLinha Digitável: ${boleto.linha_digitavel}`
            : `Boleto de Assinatura CliniGo (${clinic?.name || 'Clínica'})`

        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: 'Boleto de Assinatura CliniGo',
                    text: shareText,
                    url: boleto.public_url || undefined,
                })
                return
            } catch {
                // Usuário cancelou o menu nativo
            }
        }

        const ok = await copyTextSafe(boleto.public_url || boleto.linha_digitavel || shareUrl)
        if (ok) {
            toast.success('Dados do boleto copiados para compartilhamento.')
        }
    }

    async function handleCancelSubscription() {
        if (!clinic?.id) return
        setProcessingCancel(true)
        try {
            const supabase = createClient()

            const { error } = await (supabase
                .from('clinics') as any)
                .update({
                    subscription_status: 'cancelled',
                    cancelled_at: new Date().toISOString(),
                })
                .eq('id', clinic.id)

            if (error) throw error

            toast.success('Assinatura cancelada. O acesso continua ativo até o fim do ciclo pago.')
            setCancelDialogOpen(false)
            loadData()
        } catch (error: any) {
            toast.error(error?.message || 'Erro ao cancelar assinatura.')
        } finally {
            setProcessingCancel(false)
        }
    }

    const planConfig = PLANS[currentPlan]
    const PlanIcon = PLAN_ICONS[currentPlan] || Zap

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando dados da assinatura...</p>
            </div>
        )
    }

    const billingBannerEval = evaluateBillingBanner({
        isDemo: clinic?.is_demo,
        approvalStatus: clinic?.approval_status,
        trialEndsAt: clinic?.trial_ends_at,
        paymentConfirmed: clinic?.payment_confirmed,
        subscriptionDueDate: clinic?.subscription_due_date,
        addons: clinic?.addons,
    })
    const isPaymentConfirmed =
        clinic?.payment_confirmed !== false &&
        clinic?.approval_status === 'active' &&
        !billingBannerEval.shouldShow
    const isTrialStatus = clinic?.approval_status === 'trial'
    const rawDueDate = billingBannerEval.dueDateClean
    const formattedDueDate = formatDateBr(rawDueDate)
    const isDueToday = billingBannerEval.stage === 'due_today'
    const isUpcoming = billingBannerEval.stage === 'upcoming'
    const isWarningTone = isTrialStatus || isDueToday || isUpcoming

    const isExceededWithoutConsent = seatUsage && seatUsage.extra_seats > 0 && (!seatUsage.recent_events || seatUsage.recent_events.length === 0)
    const totalMonthlyPrice = seatUsage?.total_monthly_cents ? seatUsage.total_monthly_cents / 100 : (planConfig?.price || 449)
    const baseMonthlyPrice = seatUsage?.base_monthly_cents ? seatUsage.base_monthly_cents / 100 : (planConfig?.price || 449)
    const extraMonthlyPrice = seatUsage?.extra_monthly_cents ? seatUsage.extra_monthly_cents / 100 : 0

    return (
        <div className="max-w-5xl mx-auto py-6 sm:py-8 px-4 space-y-6">
            {/* Cabeçalho editorial padrão CliniGo */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Assinatura e Plano</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            Gerencie o plano contratado, licenças de usuários e emissão de boletos da clínica
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-[44px] px-3 flex-1 sm:flex-none"
                        onClick={() => loadData(true)}
                        disabled={refreshing || generatingPayment}
                        title="Atualizar dados da assinatura"
                    >
                        <RefreshCw className={cn('w-4 h-4 mr-1.5', refreshing && 'animate-spin')} />
                        Atualizar
                    </Button>
                    <Button
                        type="button"
                        className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 min-h-[44px]"
                        onClick={() => handleGeneratePayment(currentPlan)}
                        disabled={generatingPayment}
                    >
                        {generatingPayment ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Gerando Boleto...
                            </>
                        ) : (
                            <>
                                <FileText className="w-4 h-4 mr-2" />
                                Gerar Boleto
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="space-y-6">
                {/* Card de Boleto Emitido / Disponível para Pagamento */}
                {activeBoleto?.nosso_numero && (
                    <Card className="border-primary/30 bg-accent/35 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base sm:text-lg font-semibold text-foreground">
                                            Boleto Disponível para Pagamento
                                        </CardTitle>
                                        <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                                            Abra o PDF ou copie a linha digitável para pagar no aplicativo do seu banco.
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge variant="outline" className="self-start sm:self-center border-primary/40 text-primary bg-card font-semibold tabular-nums">
                                    R$ {(activeBoleto.amount || totalMonthlyPrice).toFixed(2)}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {activeBoleto.linha_digitavel && (
                                <div className="p-3 bg-card border border-border rounded-lg space-y-1.5">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                                        Linha Digitável (Código de Barras)
                                    </span>
                                    <code className="text-xs sm:text-sm font-mono text-foreground break-all block leading-relaxed select-all">
                                        {activeBoleto.linha_digitavel}
                                    </code>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <Button
                                    asChild
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] font-medium"
                                >
                                    <a
                                        href={`/api/billing/boleto-pdf?nossoNumero=${encodeURIComponent(activeBoleto.nosso_numero)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink className="w-4 h-4 mr-2 shrink-0" />
                                        Abrir Boleto (PDF)
                                    </a>
                                </Button>

                                {activeBoleto.linha_digitavel ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full bg-card min-h-[44px] font-medium"
                                        onClick={() => handleCopyLinhaDigitavel(activeBoleto.linha_digitavel)}
                                    >
                                        {copiedBarcode ? (
                                            <>
                                                <Check className="w-4 h-4 mr-2 text-primary shrink-0" />
                                                Código Copiado
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                                                Copiar Código de Barras
                                            </>
                                        )}
                                    </Button>
                                ) : (
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="w-full bg-card min-h-[44px] font-medium"
                                    >
                                        <a
                                            href={`/api/billing/boleto-pdf?nossoNumero=${encodeURIComponent(activeBoleto.nosso_numero)}&download=1`}
                                            download={`boleto-clinigo-${activeBoleto.nosso_numero}.pdf`}
                                        >
                                            <Download className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                                            Baixar Arquivo PDF
                                        </a>
                                    </Button>
                                )}

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full bg-card min-h-[44px] font-medium"
                                    onClick={() => handleShareBoleto(activeBoleto)}
                                >
                                    <Share2 className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                                    Compartilhar Boleto
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Banner de Regularização de Licenças */}
                {isExceededWithoutConsent && (
                    <div className="p-5 bg-amber-50 border border-amber-200 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-start gap-3">
                            <Users className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-amber-950">Regularização de Licenças de Usuário</p>
                                <p className="text-sm text-amber-900 mt-1">
                                    Sua clínica possui {seatUsage.extra_seats} usuário(s) ativos além das {seatUsage.included_seats} licenças inclusas no plano {planConfig?.name}. Conforme os termos contratuais, você pode formalizar as licenças adicionais ({seatUsage.extra_seats} × R$ {(seatUsage.unit_price_cents / 100).toFixed(2)} = R$ {extraMonthlyPrice.toFixed(2)}/mês) ou migrar para um plano superior. Sem aceite formal, nenhuma cobrança é gerada.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                            <Button
                                type="button"
                                className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] px-5 font-medium"
                                onClick={handleRequestRegularization}
                                disabled={loadingRegularization}
                            >
                                {loadingRegularization ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    'Regularizar Licenças'
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Cartão do Plano Atual */}
                <Card className="border-border shadow-sm bg-card">
                    <CardHeader className="pb-4 border-b border-border/60">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                                    <PlanIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                                        {planConfig?.name || 'CliniGo Professional'}
                                    </CardTitle>
                                    <CardDescription>Plano ativo da clínica</CardDescription>
                                </div>
                            </div>
                            <Badge variant="outline" className="self-start sm:self-center text-base px-4 py-1.5 font-semibold border-primary/30 text-primary bg-primary/5 tabular-nums">
                                R$ {totalMonthlyPrice.toFixed(2)}/mês
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-5">
                        {/* Demonstrativo Financeiro */}
                        <div className="p-4 bg-muted/40 border border-border rounded-lg space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                Demonstrativo da Mensalidade
                            </p>
                            <div className="flex justify-between text-sm text-foreground">
                                <span>Plano {planConfig?.name}</span>
                                <span className="tabular-nums">R$ {baseMonthlyPrice.toFixed(2)}/mês</span>
                            </div>
                            {seatUsage && seatUsage.extra_seats > 0 && (
                                <div className="flex justify-between text-sm text-foreground">
                                    <span>Licenças adicionais ({seatUsage.extra_seats} × R$ {(seatUsage.unit_price_cents / 100).toFixed(2)})</span>
                                    <span className="text-primary font-medium tabular-nums">+ R$ {extraMonthlyPrice.toFixed(2)}/mês</span>
                                </div>
                            )}
                            <div className="h-px bg-border my-1" />
                            <div className="flex justify-between text-base font-bold text-foreground">
                                <span>Total Mensal</span>
                                <span className="tabular-nums">R$ {totalMonthlyPrice.toFixed(2)}/mês</span>
                            </div>
                        </div>

                        {/* Status de Confirmação de Assinatura */}
                        {isPaymentConfirmed ? (
                            <div className="p-4 bg-accent/35 border border-primary/20 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0 mt-0.5">
                                        <Check className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">Assinatura Ativa</p>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            Recebemos a confirmação de pagamento. O seu plano está ativo com acesso contínuo garantido.
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full sm:w-auto shrink-0 border-primary/40 text-primary hover:bg-primary/5 font-medium min-h-[44px] px-4"
                                    onClick={() => handleGeneratePayment(currentPlan)}
                                    disabled={generatingPayment}
                                >
                                    {generatingPayment ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                                    Emitir Boleto da Assinatura
                                </Button>
                            </div>
                        ) : (
                            <div
                                className={cn(
                                    'p-5 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border',
                                    !isWarningTone
                                        ? 'bg-destructive/5 border-destructive/25'
                                        : 'bg-amber-50 border-amber-200'
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <AlertTriangle
                                        className={cn(
                                            'w-5 h-5 shrink-0 mt-0.5',
                                            !isWarningTone ? 'text-destructive' : 'text-amber-700'
                                        )}
                                    />
                                    <div>
                                        <p
                                            className={cn(
                                                'font-semibold',
                                                !isWarningTone ? 'text-destructive' : 'text-amber-950'
                                            )}
                                        >
                                            {isTrialStatus
                                                ? 'Período de Avaliação Gratuita'
                                                : isDueToday
                                                    ? `Fatura com Vencimento Hoje${formattedDueDate ? ` (${formattedDueDate})` : ''}`
                                                    : isUpcoming
                                                        ? `Aviso de Faturamento${formattedDueDate ? ` — Vencimento em ${formattedDueDate}` : ''}`
                                                        : formattedDueDate
                                                            ? `Aviso de Suspensão — Fatura Vencida em ${formattedDueDate}`
                                                            : 'Aviso de Suspensão — Fatura Vencida'}
                                        </p>
                                        <p
                                            className={cn(
                                                'text-sm mt-1',
                                                !isWarningTone ? 'text-destructive/90' : 'text-amber-900'
                                            )}
                                        >
                                            {isTrialStatus
                                                ? 'Sua clínica está em período de avaliação. Emita o boleto do seu plano para ativar a assinatura definitiva.'
                                                : isDueToday
                                                    ? 'A mensalidade da sua assinatura vence hoje. Emita ou acesse seu boleto abaixo para manter o acesso contínuo.'
                                                    : isUpcoming
                                                        ? `A mensalidade da sua assinatura vence em ${formattedDueDate}. Emita ou acesse seu boleto abaixo para manter o acesso contínuo.`
                                                        : 'A mensalidade da clínica encontra-se vencida. Emita o boleto abaixo para evitar a suspensão automática dos serviços.'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    className="w-full md:w-auto shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] px-4 font-medium"
                                    onClick={() => handleGeneratePayment(currentPlan)}
                                    disabled={generatingPayment}
                                >
                                    {generatingPayment ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                                    Gerar Boleto do Plano
                                </Button>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6 pt-2">
                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                    Recursos Incluídos
                                </h4>
                                <ul className="space-y-2">
                                    {planConfig?.features?.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                                            <Check className="w-4 h-4 text-primary shrink-0" />
                                            <span>{feature.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                    Limites Operacionais
                                </h4>
                                <ul className="space-y-2 text-sm text-foreground">
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-primary shrink-0" />
                                        <span>
                                            {planConfig?.limits?.max_doctors === -1
                                                ? 'Terapeutas e profissionais ilimitados'
                                                : `Até ${planConfig?.limits?.max_doctors || 30} profissionais`}
                                        </span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-primary shrink-0" />
                                        <span>
                                            {planConfig?.limits?.max_appointments_month === -1
                                                ? 'Sessões e atendimentos ilimitados'
                                                : `Até ${planConfig?.limits?.max_appointments_month} atendimentos/mês`}
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {clinic?.subscription_status === 'cancelled' && (
                            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                                <div>
                                    <p className="font-medium text-amber-950">Assinatura cancelada</p>
                                    <p className="text-sm text-amber-900">
                                        Seu acesso permanece liberado até o encerramento do ciclo contratual vigente.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Cancelar Assinatura */}
                {clinic?.subscription_status !== 'cancelled' && (
                    <Card className="border-border shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold text-foreground">
                                Cancelamento de Assinatura
                            </CardTitle>
                            <CardDescription>
                                Caso deseje suspender a renovação do serviço ao final do ciclo contratual.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="text-destructive border-destructive/30 hover:bg-destructive/10 min-h-[44px]"
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Cancelar Assinatura
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="max-w-md w-[95vw]">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmação de Cancelamento</AlertDialogTitle>
                                        <AlertDialogDescription asChild>
                                            <div className="space-y-2 text-sm text-muted-foreground">
                                                <p>Ao cancelar a assinatura da clínica:</p>
                                                <ul className="list-disc ml-4 space-y-1">
                                                    <li>O acesso permanece liberado até o término do ciclo atual.</li>
                                                    <li>Os dados e prontuários permanecem protegidos conforme a LGPD.</li>
                                                    <li>Você pode reativar a assinatura a qualquer momento.</li>
                                                </ul>
                                            </div>
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="gap-2">
                                        <AlertDialogCancel className="min-h-[44px]">Voltar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={(e) => {
                                                e.preventDefault()
                                                handleCancelSubscription()
                                            }}
                                            disabled={processingCancel}
                                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground min-h-[44px]"
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

            {/* Modal de Boleto Emitido */}
            <Dialog open={boletoModalOpen} onOpenChange={setBoletoModalOpen}>
                <DialogContent className="sm:max-w-lg max-w-[95vw] rounded-xl p-5 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                            <FileText className="w-5 h-5 text-primary shrink-0" />
                            Boleto Bancário Emitido
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            Utilize os botões abaixo para abrir o boleto em PDF ou copiar a linha digitável para o seu aplicativo bancário.
                        </DialogDescription>
                    </DialogHeader>

                    {activeBoleto && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center justify-between p-3.5 rounded-lg bg-muted/40 border border-border">
                                <div>
                                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
                                        Valor da Cobrança
                                    </span>
                                    <span className="text-xl font-bold text-primary tabular-nums">
                                        R$ {(activeBoleto.amount || totalMonthlyPrice).toFixed(2)}
                                    </span>
                                </div>
                                {activeBoleto.due_date && (
                                    <div className="text-right">
                                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
                                            Vencimento
                                        </span>
                                        <span className="text-sm font-semibold text-foreground tabular-nums">
                                            {activeBoleto.due_date.split('-').reverse().join('/')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {activeBoleto.linha_digitavel && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Linha Digitável (Código de Barras)
                                    </Label>
                                    <div className="p-3 bg-muted/40 border border-border rounded-lg">
                                        <code className="text-xs sm:text-sm font-mono text-foreground break-all block leading-relaxed select-all">
                                            {activeBoleto.linha_digitavel}
                                        </code>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-primary/40 text-primary hover:bg-primary/5 min-h-[44px] font-medium"
                                        onClick={() => handleCopyLinhaDigitavel(activeBoleto.linha_digitavel)}
                                    >
                                        {copiedBarcode ? (
                                            <>
                                                <Check className="w-4 h-4 mr-2 text-primary" />
                                                Linha Digitável Copiada
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4 mr-2" />
                                                Copiar Linha Digitável
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                                <Button
                                    asChild
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] font-medium"
                                >
                                    <a
                                        href={`/api/billing/boleto-pdf?nossoNumero=${encodeURIComponent(activeBoleto.nosso_numero)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Visualizar Boleto (PDF)
                                    </a>
                                </Button>

                                <Button
                                    asChild
                                    variant="outline"
                                    className="w-full min-h-[44px] font-medium"
                                >
                                    <a
                                        href={`/api/billing/boleto-pdf?nossoNumero=${encodeURIComponent(activeBoleto.nosso_numero)}&download=1`}
                                        download={`boleto-clinigo-${activeBoleto.nosso_numero}.pdf`}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Baixar PDF
                                    </a>
                                </Button>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
                        {activeBoleto && (
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full sm:w-auto min-h-[44px] text-muted-foreground"
                                onClick={() => handleShareBoleto(activeBoleto)}
                            >
                                <Share2 className="w-4 h-4 mr-2" />
                                Compartilhar
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full sm:w-auto min-h-[44px]"
                            onClick={() => setBoletoModalOpen(false)}
                        >
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal para Informar CPF/CNPJ Válido */}
            <Dialog open={cnpjDialogOpen} onOpenChange={setCnpjDialogOpen}>
                <DialogContent className="sm:max-w-md max-w-[95vw] rounded-xl p-5 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                            <Building2 className="w-5 h-5 text-primary shrink-0" />
                            CPF ou CNPJ para Emissão do Boleto
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            {cnpjErrorMsg || 'O Banco Inter exige um CPF ou CNPJ com dígitos verificadores válidos (padrão FEBRABAN) para registrar o boleto.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="billing-cpf-cnpj" className="text-sm font-medium">
                                CPF ou CNPJ do Pagador
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    id="billing-cpf-cnpj"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="00.000.000/0000-00 ou 000.000.000-00"
                                    value={cnpjInput}
                                    onChange={(e) => {
                                        setCnpjInput(formatCpfCnpjInput(e.target.value))
                                        setCnpjErrorMsg(null)
                                    }}
                                    className="min-h-[44px] font-mono text-base"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-[44px] px-3 shrink-0"
                                    onClick={handlePasteCnpj}
                                    title="Colar CPF/CNPJ da área de transferência"
                                >
                                    <ClipboardPaste className="w-4 h-4 mr-1.5" />
                                    Colar
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                O documento informado será utilizado para registro do boleto e atualizado no cadastro da clínica.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full sm:w-auto min-h-[44px]"
                            onClick={() => setCnpjDialogOpen(false)}
                            disabled={generatingPayment}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] font-medium"
                            onClick={handleConfirmCnpjAndGenerate}
                            disabled={generatingPayment}
                        >
                            {generatingPayment ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Emitindo Boleto...
                                </>
                            ) : (
                                <>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Confirmar e Emitir Boleto
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Regularização de Licenças de Assento */}
            <SeatOverageDialog
                open={regularizationDialogOpen}
                onOpenChange={setRegularizationDialogOpen}
                quote={regularizationQuote}
                onConfirm={handleConfirmRegularization}
                errorMessage={regularizationError}
            />
        </div>
    )
}
