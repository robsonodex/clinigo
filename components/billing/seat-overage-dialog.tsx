'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, TrendingDown, AlertCircle, Loader2 } from 'lucide-react'

export interface SeatQuote {
    quote_id: string
    plan: string
    included_seats: number | null
    active_seats: number
    seats_after: number
    extra_seats_after: number
    unit_price_cents: number
    monthly_before_cents: number
    monthly_after_cents: number
    delta_cents: number
    cheaper_plan?: {
        plan: string
        plan_name: string
        monthly_cents: number
        savings_cents: number
    } | null
    expires_at: number
}

interface SeatOverageDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    quote: SeatQuote | null
    onConfirm: (quoteId: string) => Promise<void> | void
    isSubmitting?: boolean
    errorMessage?: string | null
}

function formatBRL(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(cents / 100)
}

function formatPlanName(plan: string): string {
    const map: Record<string, string> = {
        BASICO: 'Básico',
        AVANCADO: 'Avançado',
        PROFESSIONAL: 'Professional',
        ENTERPRISE: 'Enterprise',
    }
    return map[plan.toUpperCase()] || plan
}

export function SeatOverageDialog({
    open,
    onOpenChange,
    quote,
    onConfirm,
    isSubmitting = false,
    errorMessage = null,
}: SeatOverageDialogProps) {
    const router = useRouter()
    const [submittingLocal, setSubmittingLocal] = useState(false)

    if (!quote) return null

    const loading = isSubmitting || submittingLocal

    const handleConfirm = async () => {
        try {
            setSubmittingLocal(true)
            await onConfirm(quote.quote_id)
        } finally {
            setSubmittingLocal(false)
        }
    }

    const planLabel = formatPlanName(quote.plan)

    return (
        <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
            <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white border border-slate-200 shadow-xl rounded-lg">
                <DialogHeader className="p-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                            <Users className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-lg font-bold text-slate-900">
                            Licença adicional necessária
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-sm text-slate-600 pt-1">
                        Seu plano CliniGo {planLabel} inclui {quote.included_seats} licenças de usuário e todas estão em uso. Ao adicionar este usuário, será incluída 1 licença adicional de {formatBRL(quote.unit_price_cents)} por mês.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {errorMessage && (
                        <Alert variant="destructive" className="border-rose-200 bg-rose-50 text-rose-900 text-xs">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    )}

                    {/* Resumo Financeiro em Linhas */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Mensalidade atual</span>
                            <span className="font-medium text-slate-800">{formatBRL(quote.monthly_before_cents)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Licença adicional (1 assento)</span>
                            <span className="font-medium text-blue-700">+ {formatBRL(quote.delta_cents)}/mês</span>
                        </div>
                        <div className="h-px bg-slate-200 my-1" />
                        <div className="flex justify-between items-center text-sm font-semibold">
                            <span className="text-slate-900">Nova mensalidade</span>
                            <span className="text-base text-slate-900">{formatBRL(quote.monthly_after_cents)}/mês</span>
                        </div>
                    </div>

                    {/* Assessor de Plano Mais Econômico (Princípio P4) */}
                    {quote.cheaper_plan && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                                    <TrendingDown className="h-4 w-4 text-emerald-700" />
                                    <span>Alternativa mais econômica</span>
                                </div>
                                <span className="text-xs font-bold text-emerald-800">
                                    Economia de {formatBRL(quote.cheaper_plan.savings_cents)}/mês
                                </span>
                            </div>
                            <p className="text-xs text-slate-600">
                                O plano <strong>CliniGo {quote.cheaper_plan.plan_name}</strong> contempla sua quantidade de usuários por <strong>{formatBRL(quote.cheaper_plan.monthly_cents)}/mês</strong>, sendo mais vantajoso que o adicional de assentos no plano atual.
                            </p>
                            <div className="pt-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push('/dashboard/configuracoes/assinatura')}
                                    className="h-8 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                                >
                                    Ver planos disponíveis
                                </Button>
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-slate-500">
                        A nova mensalidade entrará em vigor a partir do próximo ciclo de faturamento. Caso remova ou desative usuários futuramente, a cobrança adicional será reduzida automaticamente.
                    </p>
                </div>

                <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={() => onOpenChange(false)}
                        className="min-h-[44px] px-4 font-medium text-slate-700 border-slate-300 hover:bg-slate-100"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        disabled={loading}
                        onClick={handleConfirm}
                        className="min-h-[44px] px-5 font-semibold bg-slate-900 hover:bg-slate-800 text-white"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            'Adicionar usuário e aceitar cobrança'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
