'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Copy, Check, DollarSign, Loader2, Calendar } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface CommissionDetail {
    id: string
    clinic_name: string
    subscription_plan: string
    subscription_amount: number
    commission_amount: number
    billing_month: string
}

interface PendingPayment {
    partner_id: string
    partner_name: string
    pix_key: string
    pix_key_type: string
    cpf: string
    cnpj: string | null
    total_amount: number
    commissions: CommissionDetail[]
}

export default function AdminPartnerPaymentsPage() {
    const [payments, setPayments] = useState<PendingPayment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [selectedMonth, setSelectedMonth] = useState<string>('')

    useEffect(() => {
        fetchPayments()
    }, [selectedMonth])

    const fetchPayments = async () => {
        setIsLoading(true)
        try {
            const url = selectedMonth
                ? `/api/admin/partner-payments?month=${selectedMonth}`
                : '/api/admin/partner-payments'

            const response = await fetch(url)

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    toast.error('Acesso negado')
                    return
                }
                throw new Error('Erro ao buscar pagamentos')
            }

            const result = await response.json()
            setPayments(result.payments || [])
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const copyPixKey = (pixKey: string) => {
        navigator.clipboard.writeText(pixKey)
        toast.success('Chave Pix copiada!')
    }

    const markAsPaid = async (payment: PendingPayment) => {
        setProcessingId(payment.partner_id)

        try {
            const commissionIds = payment.commissions.map(c => c.id)

            const response = await fetch(`/api/admin/partner-payments/${payment.partner_id}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commission_ids: commissionIds })
            })

            if (!response.ok) {
                const result = await response.json()
                throw new Error(result.error || 'Erro ao processar')
            }

            toast.success('Pagamento registrado com sucesso!')
            fetchPayments() // Reload
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setProcessingId(null)
        }
    }

    const totalPending = payments.reduce((sum, p) => sum + p.total_amount, 0)

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Pagamentos de Parceiros</h1>
                        <p className="text-muted-foreground">
                            Gerencie os pagamentos de comissões
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <Input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-40"
                            />
                        </div>

                        <Button variant="outline" onClick={fetchPayments}>
                            Atualizar
                        </Button>
                    </div>
                </div>

                {/* Summary */}
                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-100 p-3 rounded-lg">
                                    <DollarSign className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total a Pagar</p>
                                    <p className="text-2xl font-bold text-amber-600">
                                        R$ {totalPending.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <Badge variant="secondary">
                                {payments.length} parceiro(s)
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Payments List */}
                {payments.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Check className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
                            <p className="text-muted-foreground">
                                Nenhum pagamento pendente
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {payments.map((payment) => (
                            <Card key={payment.partner_id}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-lg">
                                                {payment.partner_name}
                                            </CardTitle>
                                            <CardDescription>
                                                CPF/CNPJ: {payment.cnpj || payment.cpf}
                                            </CardDescription>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-emerald-600">
                                                R$ {payment.total_amount.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {payment.commissions.length} comissão(ões)
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Pix Key */}
                                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Chave Pix ({payment.pix_key_type})
                                            </p>
                                            <p className="font-mono">{payment.pix_key}</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => copyPixKey(payment.pix_key)}
                                        >
                                            <Copy className="w-4 h-4 mr-2" />
                                            Copiar
                                        </Button>
                                    </div>

                                    {/* Commission Details */}
                                    <div>
                                        <p className="text-sm font-medium mb-2">Detalhes:</p>
                                        <div className="space-y-2">
                                            {payment.commissions.map((comm) => (
                                                <div
                                                    key={comm.id}
                                                    className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                                                >
                                                    <span>{comm.clinic_name}</span>
                                                    <span className="font-medium">
                                                        R$ {comm.commission_amount.toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <Button
                                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                                        onClick={() => markAsPaid(payment)}
                                        disabled={processingId === payment.partner_id}
                                    >
                                        {processingId === payment.partner_id ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Processando...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4 mr-2" />
                                                Marcar como Pago
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
