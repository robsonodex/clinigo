'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
    Copy,
    Check,
    TrendingUp,
    Users,
    DollarSign,
    Clock,
    ArrowLeft,
    ExternalLink,
    Loader2
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface DashboardData {
    dashboard: {
        partner_id: string
        full_name: string
        referral_code: string
        pix_key: string
        pix_key_type: string
        status: string
        commission_rate: number
        total_clinics: number
        active_clinics: number
        total_earned: number
        pending_commissions: number
        this_month_estimate: number
    }
    clinics: Array<{
        id: string
        clinic_id: string
        status: string
        created_at: string
        clinic: {
            id: string
            name: string
            plan_type: string
        }
    }>
    commission_history: Array<{
        id: string
        billing_month: string
        subscription_plan: string
        commission_amount: number
        status: string
        paid_at: string | null
        clinic: {
            name: string
        }
    }>
}

interface PageProps {
    params: Promise<{ id: string }>
}

export default function PartnerDashboardPage({ params }: PageProps) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData] = useState<DashboardData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        fetchDashboard()
    }, [id])

    const fetchDashboard = async () => {
        try {
            const response = await fetch(`/api/partners/${id}/dashboard`)

            if (!response.ok) {
                throw new Error('Parceiro não encontrado')
            }

            const result = await response.json()
            setData(result)
        } catch (error: any) {
            toast.error(error.message || 'Erro ao carregar dashboard')
        } finally {
            setIsLoading(false)
        }
    }

    const copyReferralCode = () => {
        if (data) {
            navigator.clipboard.writeText(data.dashboard.referral_code)
            setCopied(true)
            toast.success('Código copiado!')
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const copyShareLink = () => {
        if (data) {
            const url = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'}/cadastro?ref=${data.dashboard.referral_code}`
            navigator.clipboard.writeText(url)
            toast.success('Link copiado!')
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <p className="text-muted-foreground mb-4">Parceiro não encontrado</p>
                        <Button onClick={() => router.push('/')}>Voltar ao início</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const { dashboard, clinics, commission_history } = data
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'}/cadastro?ref=${dashboard.referral_code}`

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="border-b bg-white">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center">
                        <img src="/logo_black.svg" alt="CliniGo" className="h-8 w-auto" />
                    </Link>
                    <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-4 h-4 inline mr-1" />
                        Voltar
                    </Link>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {/* Welcome */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold">Dashboard do Parceiro</h1>
                    <p className="text-muted-foreground">Olá, {dashboard.full_name}!</p>
                </div>

                {/* Referral Code Card */}
                <Card className="mb-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <p className="text-emerald-100 text-sm mb-1">Seu Código de Parceiro</p>
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl font-bold font-mono">
                                        {dashboard.referral_code}
                                    </span>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={copyReferralCode}
                                    >
                                        {copied ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <Button
                                variant="secondary"
                                onClick={copyShareLink}
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Copiar Link de Indicação
                            </Button>
                        </div>

                        <p className="text-emerald-100 text-sm mt-4">
                            Compartilhe este código com clínicas para ganhar {dashboard.commission_rate}% de comissão mensal
                        </p>
                    </CardContent>
                </Card>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total de Clínicas
                            </CardTitle>
                            <Users className="w-4 h-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{dashboard.total_clinics}</div>
                            <p className="text-xs text-muted-foreground">
                                {dashboard.active_clinics} ativas
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Ganho
                            </CardTitle>
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">
                                R$ {dashboard.total_earned.toFixed(2)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Pendente
                            </CardTitle>
                            <Clock className="w-4 h-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600">
                                R$ {dashboard.pending_commissions.toFixed(2)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Pagamento dia 5
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Estimativa Mês
                            </CardTitle>
                            <DollarSign className="w-4 h-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                                R$ {dashboard.this_month_estimate.toFixed(2)}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Clinics List */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Suas Clínicas</CardTitle>
                            <CardDescription>
                                Clínicas cadastradas com seu código
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {clinics.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">
                                    Nenhuma clínica cadastrada ainda
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {clinics.map((clinic) => (
                                        <div
                                            key={clinic.id}
                                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                        >
                                            <div>
                                                <p className="font-medium">{clinic.clinic?.name || 'Clínica'}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Plano: {clinic.clinic?.plan_type}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <Badge
                                                    variant={clinic.status === 'ACTIVE' ? 'default' : 'secondary'}
                                                    className={clinic.status === 'ACTIVE' ? 'bg-emerald-500' : ''}
                                                >
                                                    {clinic.status === 'ACTIVE' ? 'Ativa' :
                                                        clinic.status === 'PENDING' ? 'Pendente' : clinic.status}
                                                </Badge>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {new Date(clinic.created_at).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Commission History */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Histórico de Comissões</CardTitle>
                            <CardDescription>
                                Últimas comissões recebidas
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {commission_history.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">
                                    Nenhuma comissão registrada
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {commission_history.slice(0, 10).map((comm) => (
                                        <div
                                            key={comm.id}
                                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                        >
                                            <div>
                                                <p className="font-medium">{comm.clinic?.name || 'Clínica'}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(comm.billing_month).toLocaleDateString('pt-BR', {
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-emerald-600">
                                                    R$ {comm.commission_amount.toFixed(2)}
                                                </p>
                                                <Badge
                                                    variant={comm.status === 'PAID' ? 'default' : 'secondary'}
                                                    className={comm.status === 'PAID' ? 'bg-emerald-500' : ''}
                                                >
                                                    {comm.status === 'PAID' ? 'Pago' : 'Pendente'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
