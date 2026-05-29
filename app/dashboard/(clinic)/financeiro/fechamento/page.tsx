'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import {
    TrendingUp, TrendingDown, DollarSign, ArrowUpCircle, ArrowDownCircle,
    Calendar, Loader2, FileText, ChevronLeft, ChevronRight, Wallet,
    Users, CreditCard, AlertTriangle, Clock, CheckCircle, BarChart3,
    Download
} from 'lucide-react'
import { toast } from 'sonner'

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

interface ClosingData {
    period: { month: number; year: number; startDate: string; endDate: string }
    summary: {
        total_income: number
        total_expense: number
        net_result: number
        total_sessions: number
        ticket_medio: number
        total_pending: number
        pending_count: number
    }
    comparison: {
        prev_income: number
        prev_expense: number
        prev_result: number
        prev_sessions: number
        income_variation: number
        expense_variation: number
        result_variation: number
        session_variation: number
    }
    breakdown: {
        by_professional: { name: string; sessions: number; revenue: number }[]
        by_payment_method: { method: string; amount: number }[]
        by_income_category: { category: string; amount: number }[]
        by_expense_category: { category: string; amount: number }[]
    }
    pending_items: {
        id: string; description: string; amount: number; due_date: string;
        status: string; entry_type: string; category: { name: string } | null
    }[]
}

export default function FechamentoFinanceiroPage() {
    const now = new Date()
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [year, setYear] = useState(now.getFullYear())
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<ClosingData | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/financial/closing?month=${month}&year=${year}`)
            if (res.ok) {
                const json = await res.json()
                if (json.success) setData(json.data)
            } else {
                toast.error('Erro ao carregar dados de fechamento')
            }
        } catch {
            toast.error('Erro de conexão')
        } finally {
            setLoading(false)
        }
    }, [month, year])

    useEffect(() => { fetchData() }, [fetchData])

    const prevMonth = () => {
        if (month === 1) { setMonth(12); setYear(y => y - 1) }
        else setMonth(m => m - 1)
    }

    const nextMonth = () => {
        const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()
        if (isCurrentMonth) return
        if (month === 12) { setMonth(1); setYear(y => y + 1) }
        else setMonth(m => m + 1)
    }

    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

    const fmt = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

    const fmtPct = (value: number) => {
        const sign = value > 0 ? '+' : ''
        return `${sign}${value.toFixed(1)}%`
    }

    const getVariationColor = (value: number, inverse = false) => {
        if (value === 0) return 'text-muted-foreground'
        if (inverse) return value > 0 ? 'text-red-600' : 'text-green-600'
        return value > 0 ? 'text-green-600' : 'text-red-600'
    }

    const getVariationIcon = (value: number) => {
        if (value > 0) return <TrendingUp className="h-3 w-3" />
        if (value < 0) return <TrendingDown className="h-3 w-3" />
        return null
    }

    // Generate year options
    const yearOptions = []
    for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
        yearOptions.push(y)
    }

    return (
        <div className="container mx-auto py-8 px-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-3 text-slate-900 dark:text-white">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                            <FileText className="h-6 w-6" />
                        </div>
                        Fechamento Mensal
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Resumo consolidado de receitas, despesas e sessões
                    </p>
                </div>

                {/* Month Navigator */}
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={prevMonth}
                        className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all hover:bg-slate-50"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-2">
                        <Select value={String(month)} onValueChange={v => setMonth(parseInt(v))}>
                            <SelectTrigger className="w-36 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all">
                                <Calendar className="h-4 w-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTH_NAMES.map((name, i) => (
                                    <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
                            <SelectTrigger className="w-24 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {yearOptions.map(y => (
                                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={nextMonth} 
                        disabled={isCurrentMonth}
                        className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all hover:bg-slate-50"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Period Badge */}
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm px-3 py-1.5 rounded-lg border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold bg-white dark:bg-slate-900 shadow-sm">
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    {MONTH_NAMES[month - 1]} {year}
                </Badge>
                {isCurrentMonth && (
                    <Badge className="bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg font-semibold border-0">Mês em andamento</Badge>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
            ) : data ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {/* Receitas */}
                        <Card className="border-l-4 border-l-green-500 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Receitas</CardTitle>
                                <ArrowUpCircle className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold text-green-600">{fmt(data.summary.total_income)}</div>
                                <div className={`flex items-center gap-1 text-xs mt-1 ${getVariationColor(data.comparison.income_variation)}`}>
                                    {getVariationIcon(data.comparison.income_variation)}
                                    {fmtPct(data.comparison.income_variation)} vs mês anterior
                                </div>
                            </CardContent>
                        </Card>

                        {/* Despesas */}
                        <Card className="border-l-4 border-l-red-500 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                                <ArrowDownCircle className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold text-red-600">{fmt(data.summary.total_expense)}</div>
                                <div className={`flex items-center gap-1 text-xs mt-1 ${getVariationColor(data.comparison.expense_variation, true)}`}>
                                    {getVariationIcon(data.comparison.expense_variation)}
                                    {fmtPct(data.comparison.expense_variation)} vs mês anterior
                                </div>
                            </CardContent>
                        </Card>

                        {/* Resultado */}
                        <Card className="border-l-4 border-l-blue-500 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Resultado Líquido</CardTitle>
                                {data.summary.net_result >= 0
                                    ? <TrendingUp className="h-4 w-4 text-green-500" />
                                    : <TrendingDown className="h-4 w-4 text-red-500" />
                                }
                            </CardHeader>
                            <CardContent>
                                <div className={`text-xl font-bold ${data.summary.net_result >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {fmt(data.summary.net_result)}
                                </div>
                                <div className={`flex items-center gap-1 text-xs mt-1 ${getVariationColor(data.comparison.result_variation)}`}>
                                    {getVariationIcon(data.comparison.result_variation)}
                                    {fmtPct(data.comparison.result_variation)} vs mês anterior
                                </div>
                            </CardContent>
                        </Card>

                        {/* Sessões */}
                        <Card className="border-l-4 border-l-purple-500 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Sessões</CardTitle>
                                <Users className="h-4 w-4 text-purple-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold text-purple-600">{data.summary.total_sessions}</div>
                                <div className={`flex items-center gap-1 text-xs mt-1 ${getVariationColor(data.comparison.session_variation)}`}>
                                    {getVariationIcon(data.comparison.session_variation)}
                                    {fmtPct(data.comparison.session_variation)} vs mês anterior
                                </div>
                            </CardContent>
                        </Card>

                        {/* Ticket Médio */}
                        <Card className="border-l-4 border-l-amber-500 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                                <DollarSign className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold text-amber-600">{fmt(data.summary.ticket_medio)}</div>
                                <p className="text-xs text-muted-foreground mt-1 font-semibold">Por sessão realizada</p>
                            </CardContent>
                        </Card>

                        {/* Pendências */}
                        <Card className="border-l-4 border-l-orange-500 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pendências</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold text-orange-600">{fmt(data.summary.total_pending)}</div>
                                <p className="text-xs text-muted-foreground mt-1 font-semibold">{data.summary.pending_count} lançamentos</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Breakdown Tables */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* By Professional */}
                        <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-card">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Users className="h-5 w-5 text-blue-600" />
                                    Receita por Profissional
                                </CardTitle>
                                <CardDescription>Produtividade individual no mês</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {data.breakdown.by_professional.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado para este mês</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Profissional</TableHead>
                                                <TableHead className="text-center">Sessões</TableHead>
                                                <TableHead className="text-right">Receita</TableHead>
                                                <TableHead className="text-right">% Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.breakdown.by_professional.map((item, i) => (
                                                <TableRow key={i} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="secondary" className="rounded-lg">{item.sessions}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-green-600">{fmt(item.revenue)}</TableCell>
                                                    <TableCell className="text-right text-muted-foreground font-semibold">
                                                        {data.summary.total_income > 0
                                                            ? `${((item.revenue / data.summary.total_income) * 100).toFixed(1)}%`
                                                            : '—'
                                                        }
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 font-bold">
                                                <TableCell className="text-slate-900 dark:text-white">Total</TableCell>
                                                <TableCell className="text-center">
                                                    {data.breakdown.by_professional.reduce((a, b) => a + b.sessions, 0)}
                                                </TableCell>
                                                <TableCell className="text-right text-green-700 dark:text-green-400 font-extrabold">
                                                    {fmt(data.breakdown.by_professional.reduce((a, b) => a + b.revenue, 0))}
                                                </TableCell>
                                                <TableCell className="text-right">100%</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>

                        {/* By Payment Method */}
                        <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-card">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-purple-600" />
                                    Receita por Forma de Pagamento
                                </CardTitle>
                                <CardDescription>Distribuição dos recebimentos</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {data.breakdown.by_payment_method.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado para este mês</p>
                                ) : (
                                    <div className="space-y-3">
                                        {data.breakdown.by_payment_method.map((item, i) => {
                                            const pct = data.summary.total_income > 0
                                                ? (item.amount / data.summary.total_income) * 100 : 0;
                                            return (
                                                <div key={i} className="space-y-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.method}</span>
                                                        <span className="text-green-600 font-bold">{fmt(item.amount)}</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-500"
                                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-xs text-muted-foreground text-right font-semibold">{pct.toFixed(1)}%</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Income Categories */}
                        <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-card">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ArrowUpCircle className="h-5 w-5 text-green-600" />
                                    Receitas por Categoria
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {data.breakdown.by_income_category.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado para este mês</p>
                                ) : (
                                    <div className="space-y-3">
                                        {data.breakdown.by_income_category.map((item, i) => {
                                            const pct = data.summary.total_income > 0
                                                ? (item.amount / data.summary.total_income) * 100 : 0;
                                            return (
                                                <div key={i} className="space-y-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.category}</span>
                                                        <span className="text-green-600 font-bold">{fmt(item.amount)}</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Expense Categories */}
                        <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-card">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ArrowDownCircle className="h-5 w-5 text-red-600" />
                                    Despesas por Categoria
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {data.breakdown.by_expense_category.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado para este mês</p>
                                ) : (
                                    <div className="space-y-3">
                                        {data.breakdown.by_expense_category.map((item, i) => {
                                            const pct = data.summary.total_expense > 0
                                                ? (item.amount / data.summary.total_expense) * 100 : 0;
                                            return (
                                                <div key={i} className="space-y-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.category}</span>
                                                        <span className="text-red-600 font-bold">{fmt(item.amount)}</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-red-500 to-rose-400 rounded-full transition-all duration-500"
                                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Pending Items */}
                    {data.pending_items.length > 0 && (
                        <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-card">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                                    Lançamentos Pendentes / Vencidos
                                </CardTitle>
                                <CardDescription>{data.summary.pending_count} itens pendentes no mês</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Vencimento</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.pending_items.map((item) => (
                                            <TableRow key={item.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                                <TableCell className="font-semibold text-slate-900 dark:text-slate-100">{item.description}</TableCell>
                                                <TableCell>
                                                    <Badge variant={item.entry_type === 'INCOME' ? 'default' : 'destructive'} className={item.entry_type === 'INCOME' ? 'bg-green-100 text-green-700 rounded-lg' : 'rounded-lg'}>
                                                        {item.entry_type === 'INCOME' ? 'Receita' : 'Despesa'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {new Date(item.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                </TableCell>
                                                <TableCell>
                                                    {item.status === 'OVERDUE' ? (
                                                        <Badge variant="destructive" className="rounded-lg"><AlertTriangle className="h-3 w-3 mr-1" />Vencido</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="rounded-lg"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">
                                                    {fmt(Number(item.amount))}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* Empty State */}
                    {data.summary.total_income === 0 && data.summary.total_expense === 0 && data.summary.total_sessions === 0 && (
                        <Card className="border-dashed border-2 rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20">
                            <CardContent className="flex flex-col items-center justify-center py-16">
                                <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                                <h3 className="text-lg font-semibold text-muted-foreground">Nenhum dado encontrado</h3>
                                <p className="text-sm text-muted-foreground mt-1 font-semibold">
                                    Não há lançamentos financeiros ou sessões registradas para {MONTH_NAMES[month - 1]} de {year}.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </>
            ) : null}
        </div>
    )
}
