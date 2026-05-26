'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, AlertCircle, RefreshCw, Mail, Loader2, CreditCard, ExternalLink, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// =============================================================================
// Types
// =============================================================================

interface ClinicData {
    id: string
    name: string
    plan_type: string
    subscription_due_date: string | null
    payment_status: string
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

const PLAN_PRICES: Record<string, { name: string; price: number }> = {
    BASICO: { name: 'CliniGo Básico', price: 149 },
    AVANCADO: { name: 'CliniGo Avançado', price: 299 },
    PROFESSIONAL: { name: 'CliniGo Professional', price: 549 },
    ENTERPRISE: { name: 'CliniGo Enterprise', price: 799 },
    NETWORK: { name: 'CliniGo Network', price: 999 },
    BASIC: { name: 'CliniGo Básico', price: 147 },
    STARTER: { name: 'Starter', price: 0 },
}

export default function PagamentoPendentePage() {
    const [clinic, setClinic] = useState<ClinicData | null>(null)
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)

    useEffect(() => {
        fetchClinicInfo()
    }, [])

    async function fetchClinicInfo() {
        try {
            const res = await fetch('/api/billing/clinic-info', { credentials: 'include' })
            if (res.ok) {
                const data = await res.json()
                setClinic(data)
            }
        } catch (err) {
            console.error('Error fetching clinic info:', err)
        } finally {
            setLoading(false)
        }
    }

    async function handlePayNow() {
        if (!clinic) return

        setGenerating(true)
        try {
            const res = await fetch('/api/billing/generate-payment', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_type: clinic.plan_type }),
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                throw new Error(errorData.error || 'Erro ao gerar boleto')
            }

            const data: BoletoResponse = await res.json()

            if (data.boleto) {
                const downloadUrl = `/api/billing/boleto-pdf?nossoNumero=${data.boleto.nosso_numero}`

                // Open PDF in new tab
                window.open(downloadUrl, '_blank')

                // Copy linha digitavel
                navigator.clipboard.writeText(data.boleto.linha_digitavel)

                toast.success(
                    <div className="space-y-3">
                        <p className="font-bold">✅ Boleto gerado com sucesso!</p>
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
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao gerar boleto')
        } finally {
            setGenerating(false)
        }
    }

    const handleRefresh = () => {
        window.location.reload()
    }

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
            window.location.href = '/clinica'
        } catch (err) {
            console.error('Error logging out:', err)
            toast.error('Erro ao sair da conta')
        }
    }

    const planInfo = clinic ? (PLAN_PRICES[clinic.plan_type] || PLAN_PRICES.BASICO) : null

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card className="max-w-2xl w-full shadow-xl">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Clock className="w-10 h-10 text-yellow-600" />
                    </div>
                    <CardTitle className="text-3xl">Pagamento Pendente</CardTitle>
                    <CardDescription className="text-lg mt-2">
                        Sua conta está aguardando confirmação de pagamento
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Status do Pagamento */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-yellow-900">Aguardando Confirmação</h3>
                                <p className="text-sm text-yellow-700 mt-1">
                                    Seu pagamento está sendo processado. Você receberá um e-mail assim que for confirmado.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* PAGAR AGORA - Principal ação */}
                    {loading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : planInfo && planInfo.price > 0 ? (
                        <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <h4 className="font-semibold text-green-900 text-lg">{planInfo.name}</h4>
                                    <p className="text-sm text-green-700">
                                        Valor: <span className="font-bold text-xl">R$ {planInfo.price},00</span>/mês
                                    </p>
                                </div>
                                <Button
                                    onClick={handlePayNow}
                                    disabled={generating}
                                    size="lg"
                                    className="bg-green-600 hover:bg-green-700 text-white text-base px-8"
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Gerando Boleto...
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
                    ) : null}

                    {/* Informações por Método - Apenas Boleto e PIX */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800">Tempo de liberação por método:</h4>

                        <div className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-5 h-5 text-blue-600" />
                                <h4 className="font-semibold">Boleto Bancário</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Confirmação em <strong className="text-blue-600">1 a 3 dias úteis</strong> após o pagamento.
                            </p>
                        </div>

                        <div className="border rounded-lg p-4 hover:border-purple-300 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9.5 4h5l3.5 3.5v9l-3.5 3.5h-5L6 16.5v-9L9.5 4zm2.5 4.5a3 3 0 100 6 3 3 0 000-6z" />
                                </svg>
                                <h4 className="font-semibold">PIX</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Confirmação em <strong className="text-purple-600">5 a 15 segundos</strong> após o pagamento.
                            </p>
                        </div>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-3 pt-4 border-t">
                        <Button
                            onClick={handleRefresh}
                            className="w-full"
                            size="lg"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Verificar Status do Pagamento
                        </Button>

                        <Button variant="outline" asChild size="lg">
                            <a href="mailto:contato@clinigo.app" className="flex items-center justify-center gap-2">
                                <Mail className="w-4 h-4" />
                                Entrar em Contato
                            </a>
                        </Button>

                        <Button variant="ghost" onClick={handleLogout} className="w-full text-muted-foreground hover:text-destructive mt-1" size="lg">
                            <LogOut className="w-4 h-4 mr-2" />
                            Sair da Conta (Fazer Logout)
                        </Button>
                    </div>

                    {/* Rodapé Informativo */}
                    <p className="text-xs text-center text-muted-foreground pt-4 border-t">
                        Após a confirmação do pagamento, você receberá um e-mail e terá acesso completo ao CliniGo.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
