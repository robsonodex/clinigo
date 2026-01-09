'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    TrendingUp, TrendingDown, DollarSign, CreditCard, Calendar,
    Plus, Filter, Loader2, ArrowUpCircle, ArrowDownCircle,
    AlertTriangle, CheckCircle, Clock, RefreshCcw
} from 'lucide-react'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface FinancialSummary {
    total_income: number
    total_expense: number
    net_result: number
    pending_income: number
    pending_expense: number
    overdue_income: number
    overdue_expense: number
}

interface FinancialEntry {
    id: string
    entry_type: 'INCOME' | 'EXPENSE'
    description: string
    amount: number
    amount_paid: number
    discount: number
    due_date: string
    paid_date: string | null
    status: string
    category: { id: string; name: string; color: string } | null
    patient: { full_name: string } | null
    doctor: { users: { full_name: string } } | null
}

export default function FinancialPage() {
    const [loading, setLoading] = useState(true)
    const [summary, setSummary] = useState<FinancialSummary | null>(null)
    const [entries, setEntries] = useState<FinancialEntry[]>([])
    const [dateRange, setDateRange] = useState('month')
    const [filterType, setFilterType] = useState<string>('all')
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [showNewDialog, setShowNewDialog] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form state
    const [form, setForm] = useState({
        entry_type: 'INCOME' as 'INCOME' | 'EXPENSE',
        description: '',
        amount: '',
        discount: '0',
        due_date: new Date().toISOString().split('T')[0],
        notes: '',
        category_id: ''
    })

    const getDateRange = () => {
        const now = new Date()
        let startDate: Date

        switch (dateRange) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                break
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                break
            case 'quarter':
                startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
                break
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1)
                break
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        }

        return {
            start_date: startDate.toISOString().split('T')[0],
            end_date: now.toISOString().split('T')[0],
        }
    }

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const { start_date, end_date } = getDateRange()

            // Fetch summary
            const summaryRes = await fetch(`/api/financial/summary?type=summary&start_date=${start_date}&end_date=${end_date}`)
            if (summaryRes.ok) {
                const data = await summaryRes.json()
                setSummary(data.summary)
            }

            // Fetch entries
            const entriesParams = new URLSearchParams({
                start_date,
                end_date,
                limit: '50'
            })
            if (filterType !== 'all') entriesParams.set('type', filterType)
            if (filterStatus !== 'all') entriesParams.set('status', filterStatus)

            const entriesRes = await fetch(`/api/financial/entries?${entriesParams}`)
            if (entriesRes.ok) {
                const data = await entriesRes.json()
                setEntries(data.entries || [])
            }
        } catch (error) {
            console.error('Error fetching financial data:', error)
        } finally {
            setLoading(false)
        }
    }, [dateRange, filterType, filterStatus])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleSubmit = async () => {
        if (!form.description || !form.amount || !form.due_date) {
            toast.error('Preencha os campos obrigatórios')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/financial/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    amount: parseFloat(form.amount),
                    discount: parseFloat(form.discount) || 0
                })
            })

            if (!res.ok) {
                const data = await res.json()
                toast.error(data.error || 'Erro ao salvar')
                return
            }

            toast.success('Lançamento criado com sucesso!')
            setShowNewDialog(false)
            resetForm()
            fetchData()
        } catch (error) {
            toast.error('Erro ao salvar lançamento')
        } finally {
            setSaving(false)
        }
    }

    const resetForm = () => {
        setForm({
            entry_type: 'INCOME',
            description: '',
            amount: '',
            discount: '0',
            due_date: new Date().toISOString().split('T')[0],
            notes: '',
            category_id: ''
        })
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PAID':
                return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Pago</Badge>
            case 'PENDING':
                return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>
            case 'OVERDUE':
                return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Vencido</Badge>
            case 'PARTIALLY_PAID':
                return <Badge className="bg-yellow-500">Parcial</Badge>
            case 'CANCELLED':
                return <Badge variant="outline">Cancelado</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <div className="container mx-auto py-8 px-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Financeiro</h1>
                    <p className="text-muted-foreground">
                        Contas a pagar, receber e fluxo de caixa
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="week">Última Semana</SelectItem>
                            <SelectItem value="month">Este Mês</SelectItem>
                            <SelectItem value="quarter">Este Trimestre</SelectItem>
                            <SelectItem value="year">Este Ano</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" size="icon" onClick={fetchData}>
                        <RefreshCcw className="h-4 w-4" />
                    </Button>

                    <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Lançamento
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Novo Lançamento</DialogTitle>
                                <DialogDescription>
                                    Adicione uma receita ou despesa
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                {/* Type Toggle */}
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={form.entry_type === 'INCOME' ? 'default' : 'outline'}
                                        className={form.entry_type === 'INCOME' ? 'bg-green-600 hover:bg-green-700' : ''}
                                        onClick={() => setForm(f => ({ ...f, entry_type: 'INCOME' }))}
                                    >
                                        <ArrowUpCircle className="h-4 w-4 mr-2" />
                                        Receita
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={form.entry_type === 'EXPENSE' ? 'default' : 'outline'}
                                        className={form.entry_type === 'EXPENSE' ? 'bg-red-600 hover:bg-red-700' : ''}
                                        onClick={() => setForm(f => ({ ...f, entry_type: 'EXPENSE' }))}
                                    >
                                        <ArrowDownCircle className="h-4 w-4 mr-2" />
                                        Despesa
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <Label>Descrição *</Label>
                                    <Input
                                        value={form.description}
                                        onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                                        placeholder="Ex: Consulta Dr. Silva"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Valor *</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={form.amount}
                                            onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                                            placeholder="0,00"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Desconto</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={form.discount}
                                            onChange={(e) => setForm(f => ({ ...f, discount: e.target.value }))}
                                            placeholder="0,00"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Data de Vencimento *</Label>
                                    <Input
                                        type="date"
                                        value={form.due_date}
                                        onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Observações</Label>
                                    <Textarea
                                        value={form.notes}
                                        onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                                        placeholder="Observações adicionais..."
                                        rows={2}
                                    />
                                </div>

                                <Button onClick={handleSubmit} disabled={saving} className="w-full">
                                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Salvar Lançamento
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="border-l-4 border-l-green-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Receitas</CardTitle>
                                <ArrowUpCircle className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    {formatCurrency(summary?.total_income || 0)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Pendente: {formatCurrency(summary?.pending_income || 0)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-red-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                                <ArrowDownCircle className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">
                                    {formatCurrency(summary?.total_expense || 0)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Pendente: {formatCurrency(summary?.pending_expense || 0)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-blue-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Resultado</CardTitle>
                                {(summary?.net_result || 0) >= 0 ? (
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                ) : (
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${(summary?.net_result || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(summary?.net_result || 0)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Receita - Despesa
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-yellow-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Em Atraso</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-yellow-600">
                                    {formatCurrency((summary?.overdue_income || 0) + (summary?.overdue_expense || 0))}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    A receber: {formatCurrency(summary?.overdue_income || 0)}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Entries List */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Lançamentos</CardTitle>
                                    <CardDescription>
                                        {entries.length} lançamentos no período
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Select value={filterType} onValueChange={setFilterType}>
                                        <SelectTrigger className="w-32">
                                            <Filter className="h-4 w-4 mr-2" />
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            <SelectItem value="INCOME">Receitas</SelectItem>
                                            <SelectItem value="EXPENSE">Despesas</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            <SelectItem value="PENDING">Pendente</SelectItem>
                                            <SelectItem value="PAID">Pago</SelectItem>
                                            <SelectItem value="OVERDUE">Vencido</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {entries.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    Nenhum lançamento encontrado
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {entries.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-full ${entry.entry_type === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {entry.entry_type === 'INCOME' ? (
                                                        <ArrowUpCircle className="h-5 w-5" />
                                                    ) : (
                                                        <ArrowDownCircle className="h-5 w-5" />
                                                    )}
                                                </div>

                                                <div>
                                                    <p className="font-medium">{entry.description}</p>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />
                                                        <span>
                                                            Vence: {format(new Date(entry.due_date), 'dd/MM/yyyy')}
                                                        </span>
                                                        {entry.category && (
                                                            <Badge
                                                                variant="outline"
                                                                style={{ borderColor: entry.category.color, color: entry.category.color }}
                                                            >
                                                                {entry.category.name}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className={`font-bold ${entry.entry_type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {entry.entry_type === 'EXPENSE' && '-'}
                                                        {formatCurrency(entry.amount)}
                                                    </p>
                                                    {entry.discount > 0 && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Desconto: {formatCurrency(entry.discount)}
                                                        </p>
                                                    )}
                                                </div>
                                                {getStatusBadge(entry.status)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}

