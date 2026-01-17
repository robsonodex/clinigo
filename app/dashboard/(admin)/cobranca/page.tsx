'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BillingTable } from '@/components/admin/billing-table'
import { DollarSign, AlertTriangle, TrendingUp, Users } from 'lucide-react'

export default function CobrancaPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Painel de Cobrança</h1>
                    <p className="text-muted-foreground mt-1">
                        Gestão financeira e recuperação de receita.
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
                        <div className="text-2xl font-bold text-slate-900">R$ 45.900,00</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            +2.5% em relação ao mês anterior
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-red-100 bg-red-50/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-600">
                            Total em Atraso
                        </CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">R$ 848,00</div>
                        <p className="text-xs text-red-600/80 mt-1 font-medium">
                            2 clínicas inadimplentes precisando de atenção
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Renovações Hoje
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">12</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Previsão de entrada: R$ 3.450,00
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Table Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">Faturas Recentes & Pendências</h2>
                </div>

                <BillingTable />
            </div>
        </div>
    )
}
