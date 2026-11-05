'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PLANS, type PlanType, migrateLegacyPlan } from '@/lib/constants/plans'
import { cn } from '@/lib/utils'
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
    'BASICO': Layers,
    'AVANCADO': Activity,
    'PROFESSIONAL': ShieldCheck,
    'ENTERPRISE': Building2,
}

const PLAN_COLORS: Record<string, string> = {
    'BASICO': 'bg-gray-100 text-gray-800 border-gray-300',
    'AVANCADO': 'bg-emerald-50 text-emerald-800 border-emerald-300',
    'PROFESSIONAL': 'bg-slate-50 text-slate-800 border-slate-300',
    'ENTERPRISE': 'bg-teal-50 text-teal-900 border-teal-300',
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
    const [clinic, setClinic] = useState<any>(null)
    const [currentPlan, setCurrentPlan] = useState<PlanType>('PROFESSIONAL')
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
    const [processingCancel, setProcessingCancel] = useState(false)
    const [generatingPayment, setGeneratingPayment] = useState(false)

    // Estado do Boleto emitido / pendente (compatível com Mobile e Desktop)
    const [activeBoleto, setActiveBoleto] = useState<EmittedBoleto | null>(null)
    const [boletoModalOpen, setBoletoModalOpen] = useState(false)
    const [copiedBarcode, setCopiedBarcode] = useState(false)

    // Modal de correção de CPF/CNPJ quando o cadastrado é ausente ou inválido (ex: 00000000000001)
    const [cnpjDialogOpen, setCnpjDialogOpen] = useState(false)
    const [cnpjInput, setCnpjInput] = useState('')
    const [cnpjErrorMsg, setCnpjErrorMsg] = useState<string | null>(null)
    const [pendingPlanForBoleto, setPendingPlanForBoleto] = useState<PlanType | null>(null)

    // Licenciamento por Assento e Regularização (P7)
    const [seatUsage, setSeatUsage] = useState<any>(null)
    const [regularizationQuote, setRegularizationQuote] = useState<SeatQuote | null>(null)
    const [regularizationDialogOpen, setRegularizationDialogOpen] = useState(false)
    const [loadingRegularization, setLoadingRegularization] = useState(false)
    const [regularizationError, setRegularizationError] = useState<string | null>(null)

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

            // Obter clínica e role do usuário autenticado
            const { data: userData } = await supabase
                .from('users')
                .select('clinic_id, role')
                .eq('id', user.id)
                .single()

            // Trava de Segurança Estrita: Apenas Administrador da Clínica (ou Super Admin em suporte) pode acessar
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

            // Carregar uso de licenças por assento e eventual boleto pendente em paralelo
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
        } catch (error) {
            console.error('Error loading data:', error)
            toast.error('Erro ao carregar dados de assinatura')
        } finally {
            setLoading(false)
        }
    }

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

    async function handleConfirmRegularization(quoteId: string) {
        const res = await fetch('/api/billing/seat-usage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': `reg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            },
            body: JSON.stringify({
                action: 'accept_regularization',
                quote_id: quoteId,
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
                })
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
            toast.error(error.message || 'Erro ao processar cobrança')
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
                // Usuário cancelou o menu nativo ou navegador bloqueou
            }
        }

        const ok = await copyTextSafe(boleto.public_url || boleto.linha_digitavel || shareUrl)
        if (ok) {
            toast.success('Dados do boleto copiados para compartilhamento.')
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

    const isPaymentConfirmed = clinic?.payment_confirmed !== false && clinic?.approval_status === 'active'
    const isExceededWithoutConsent = seatUsage && seatUsage.extra_seats > 0 && (!seatUsage.recent_events || seatUsage.recent_events.length === 0)
    const totalMonthlyPrice = seatUsage?.total_monthly_cents ? seatUsage.total_monthly_cents / 100 : (planConfig?.price || 449)
    const baseMonthlyPrice = seatUsage?.base_monthly_cents ? seatUsage.base_monthly_cents / 100 : (planConfig?.price || 449)
    const extraMonthlyPrice = seatUsage?.extra_monthly_cents ? seatUsage.extra_monthly_cents / 100 : 0

    return (
        <div className="container max-w-5xl py-6 sm:py-8 px-4 sm:px-6 space-y-6 sm:space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Assinatura e Plano</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Gerencie as configurações e emissão de cobranças da assinatura da sua clínica.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-[44px] px-3 text-muted-foreground hover:text-foreground"
                        onClick={() => loadData()}
                        disabled={loading || generatingPayment}
                        title="Atualizar dados da assinatura"
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-1.5", loading && "animate-spin")} />
                        Atualizar
                    </Button>
                    <Button 
                        variant="outline"
                        className="w-full sm:w-auto border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-medium px-4 min-h-[44px] shadow-xs"
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
            </div>

            <div className="space-y-6">
                {/* Card de Boleto Emitido / Disponível para Pagamento (Acesso Rápido Mobile & Desktop) */}
                {activeBoleto?.nosso_numero && (
                    <Card className="border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs">
                        <CardHeader className="pb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
                                            Boleto Disponível para Pagamento
                                        </CardTitle>
                                        <CardDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                            Visualize o PDF na tela do celular ou copie a linha digitável para pagar no aplicativo do seu banco.
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge variant="outline" className="self-start sm:self-center border-emerald-600 text-emerald-800 bg-white font-semibold">
                                    R$ {(activeBoleto.amount || totalMonthlyPrice).toFixed(2)}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {activeBoleto.linha_digitavel && (
                                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                                        Linha Digitável (Código de Barras)
                                    </span>
                                    <code className="text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200 break-all block leading-relaxed select-all">
                                        {activeBoleto.linha_digitavel}
                                    </code>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <Button
                                    asChild
                                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white min-h-[44px] font-medium"
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
                                        className="w-full border-slate-300 bg-white hover:bg-slate-50 text-slate-800 min-h-[44px] font-medium"
                                        onClick={() => handleCopyLinhaDigitavel(activeBoleto.linha_digitavel)}
                                    >
                                        {copiedBarcode ? (
                                            <>
                                                <Check className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
                                                Código Copiado
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4 mr-2 text-slate-600 shrink-0" />
                                                Copiar Código de Barras
                                            </>
                                        )}
                                    </Button>
                                ) : (
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="w-full border-slate-300 bg-white hover:bg-slate-50 text-slate-800 min-h-[44px] font-medium"
                                    >
                                        <a
                                            href={`/api/billing/boleto-pdf?nossoNumero=${encodeURIComponent(activeBoleto.nosso_numero)}&download=1`}
                                            download={`boleto-clinigo-${activeBoleto.nosso_numero}.pdf`}
                                        >
                                            <Download className="w-4 h-4 mr-2 text-slate-600 shrink-0" />
                                            Baixar Arquivo PDF
                                        </a>
                                    </Button>
                                )}

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-slate-300 bg-white hover:bg-slate-50 text-slate-800 min-h-[44px] font-medium"
                                    onClick={() => handleShareBoleto(activeBoleto)}
                                >
                                    <Share2 className="w-4 h-4 mr-2 text-slate-600 shrink-0" />
                                    Compartilhar Boleto
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Banner de Regularização de Licenças (P7) */}
                {isExceededWithoutConsent && (
                    <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-start gap-3">
                            <Users className="w-6 h-6 text-blue-700 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-blue-900">Regularização de Licenças de Usuário</p>
                                <p className="text-sm text-blue-800 mt-1">
                                    Sua clínica possui {seatUsage.extra_seats} usuário(s) ativos além das {seatUsage.included_seats} licenças inclusas no plano {planConfig?.name}. Conforme os termos contratuais, você pode formalizar as licenças adicionais ({seatUsage.extra_seats} x R$ {(seatUsage.unit_price_cents / 100).toFixed(2)} = R$ {extraMonthlyPrice.toFixed(2)}/mês) ou optar por migrar para um plano superior mais econômico. Sem aceite formal, nenhuma cobrança é gerada.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                            <Button
                                className="w-full md:w-auto bg-blue-700 hover:bg-blue-800 text-white min-h-[44px] px-5 font-medium"
                                onClick={handleRequestRegularization}
                                disabled={loadingRegularization}
                            >
                                {loadingRegularization ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    'Regularizar e Aceitar Cobrança'
                                )}
                            </Button>
                        </div>
                    </div>
                )}

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
                                                'bg-teal-200'
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
                                    R$ {totalMonthlyPrice.toFixed(2)}/mês
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Demonstrativo Financeiro em Linhas */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                Demonstrativo da Mensalidade
                            </p>
                            <div className="flex justify-between text-sm text-slate-700">
                                <span>Plano {planConfig?.name}</span>
                                <span>R$ {baseMonthlyPrice.toFixed(2)}/mês</span>
                            </div>
                            {seatUsage && seatUsage.extra_seats > 0 && (
                                <div className="flex justify-between text-sm text-slate-700">
                                    <span>Licenças adicionais ({seatUsage.extra_seats} x R$ {(seatUsage.unit_price_cents / 100).toFixed(2)})</span>
                                    <span className="text-blue-700 font-medium">+ R$ {extraMonthlyPrice.toFixed(2)}/mês</span>
                                </div>
                            )}
                            <div className="h-px bg-slate-200 my-1" />
                            <div className="flex justify-between text-base font-bold text-slate-900">
                                <span>Total Mensal</span>
                                <span>R$ {totalMonthlyPrice.toFixed(2)}/mês</span>
                            </div>
                        </div>
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
                                    className="w-full sm:w-auto shrink-0 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-medium min-h-[44px] px-4"
                                    onClick={() => handleGeneratePayment(currentPlan)}
                                    disabled={generatingPayment}
                                >
                                    {generatingPayment ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2 text-emerald-600" />}
                                    Emitir Boleto da Assinatura
                                </Button>
                            </div>
                        ) : (
                            <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
                                    className="w-full md:w-auto shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] px-4 font-medium"
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

            {/* Modal de Boleto Emitido (100% compatível com Celular / iOS Safari / Android Chrome sem bloqueio de Pop-up) */}
            <Dialog open={boletoModalOpen} onOpenChange={setBoletoModalOpen}>
                <DialogContent className="sm:max-w-lg max-w-[95vw] rounded-xl p-5 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                            <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                            Boleto Bancário Emitido
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
                            Utilize os botões abaixo para abrir o boleto em PDF no celular ou copiar o código de barras para pagamento no seu aplicativo bancário.
                        </DialogDescription>
                    </DialogHeader>

                    {activeBoleto && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <div>
                                    <span className="text-xs font-medium uppercase tracking-wider text-slate-500 block">
                                        Valor da Cobrança
                                    </span>
                                    <span className="text-xl font-bold text-emerald-700">
                                        R$ {(activeBoleto.amount || totalMonthlyPrice).toFixed(2)}
                                    </span>
                                </div>
                                {activeBoleto.due_date && (
                                    <div className="text-right">
                                        <span className="text-xs font-medium uppercase tracking-wider text-slate-500 block">
                                            Vencimento
                                        </span>
                                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                            {activeBoleto.due_date.split('-').reverse().join('/')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {activeBoleto.linha_digitavel && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                                        Linha Digitável (Código de Barras)
                                    </Label>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                                        <code className="text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200 break-all block leading-relaxed select-all">
                                            {activeBoleto.linha_digitavel}
                                        </code>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50 min-h-[44px] font-medium"
                                        onClick={() => handleCopyLinhaDigitavel(activeBoleto.linha_digitavel)}
                                    >
                                        {copiedBarcode ? (
                                            <>
                                                <Check className="w-4 h-4 mr-2 text-emerald-600" />
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
                                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white min-h-[44px] font-semibold"
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
                                className="w-full sm:w-auto min-h-[44px] text-slate-600"
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

            {/* Modal para Informar CPF/CNPJ Válido (quando a clínica possui CNPJ de demonstração 00000000000001 ou ausente) */}
            <Dialog open={cnpjDialogOpen} onOpenChange={setCnpjDialogOpen}>
                <DialogContent className="sm:max-w-md max-w-[95vw] rounded-xl p-5 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                            <Building2 className="w-5 h-5 text-emerald-700 shrink-0" />
                            CPF ou CNPJ para Emissão do Boleto
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
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
                                O documento informado será utilizado para o registro do boleto no Banco Inter e atualizado no cadastro da clínica.
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
                            className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white min-h-[44px] font-medium"
                            onClick={handleConfirmCnpjAndGenerate}
                            disabled={generatingPayment}
                        >
                            {generatingPayment ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
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
