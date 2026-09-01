'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BillingTable } from '@/components/admin/billing-table'
import { Skeleton } from '@/components/ui/skeleton'
import { DollarSign, Users, TrendingUp } from 'lucide-react'
import { api } from '@/lib/api-client'
import { PLANS } from '@/lib/constants/plans'
import type { PlanType } from '@/lib/constants/plans'

interface Clinic {
    id: string
    name: string
    slug: string
    plan_type: PlanType
    is_active: boolean
    created_at: string
}

export default function CobrancaPage() {
    const { data: response, isLoading } = useQuery({
        queryKey: ['admin-billing-kpis'],
        queryFn: () =>
            api.getFull<Clinic[]>('/clinics', {
                page: '1',
                pageSize: '1000',
                is_active: 'all',
            }),
    })

    const clinics = response?.data || []
    const isDemoClinic = (c: any) => c.is_demo === true || c.id === 'de000000-0000-0000-0000-000000000001' || (c.name && c.name.toLowerCase().includes('demo'))
    const activeClinics = clinics.filter(c => c.is_active && !isDemoClinic(c))
    const totalClinics = clinics.filter(c => !isDemoClinic(c)).length

    // Calculate MRR from active clinics (excluding demo)
    const mrr = activeClinics.reduce((sum, c) => {
        const planPrice = c.custom_price !== null && c.custom_price !== undefined ? Number(c.custom_price) : (PLANS[c.plan_type]?.price || 0)
        return sum + planPrice
    }, 0)

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Painel de Cobrança</h1>
                    <p className="text-muted-foreground mt-1">
                        Gestão financeira e visão geral das clínicas.
                    </p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            MRR Total
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-[140px]" />
                        ) : (
                            <div className="text-2xl font-bold text-slate-900">{formatCurrency(mrr)}</div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            Receita recorrente mensal estimada
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Clínicas Ativas
                        </CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-[60px]" />
                        ) : (
                            <div className="text-2xl font-bold text-slate-900">{activeClinics.length}</div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            de {totalClinics} {totalClinics === 1 ? 'clínica cadastrada' : 'clínicas cadastradas'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Ticket Médio
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-[100px]" />
                        ) : (
                            <div className="text-2xl font-bold text-slate-900">
                                {activeClinics.length > 0
                                    ? formatCurrency(mrr / activeClinics.length)
                                    : 'R$ 0,00'}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            Valor médio por clínica ativa
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Table Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">Clínicas Cadastradas</h2>
                </div>

                <BillingTable />
            </div>
        </div>
    )
}
