'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, Filter, TrendingUp, DollarSign, CreditCard, Loader2, CheckCircle, Clock, AlertTriangle, RefreshCcw } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

interface FinancialEntry {
    id: string
    entry_type: 'INCOME' | 'EXPENSE'
    description: string
    amount: number
    amount_paid: number
    discount: number
    due_date: string
    paid_date: string | null
    payment_method: string | null
    status: string
    category: { id: string; name: string; color: string } | null
    patient_id: string | null
    doctor_id: string | null
}

export default function PaymentsPage() {
    const [loading, setLoading] = useState(true)
    const [entries, setEntries] = useState<FinancialEntry[]>([])
    const [total, setTotal] = useState(0)
    const [dateRange, setDateRange] = useState('month')
    const [filterStatus, setFilterStatus] = useState('all')

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
            case 'all':
                startDate = new Date(2020, 0, 1)
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

            const params = new URLSearchParams({
                start_date,
                end_date,
                type: 'INCOME',
                limit: '1000'
            })
            if (filterStatus !== 'all') params.set('status', filterStatus)

            const res = await fetch(`/api/financial/entries?${params}`)
            if (res.ok) {
                const data = await res.json()
                setEntries(data.entries || [])
                setTotal(data.total || 0)
            } else {
                toast.error('Erro ao carregar pagamentos')
            }
        } catch (error) {
            console.error('Error fetching payments:', error)
            toast.error('Erro ao carregar pagamentos')
        } finally {
            setLoading(false)
        }
    }, [dateRange, filterStatus])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    const totalRevenue = entries.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
    const paidEntries = entries.filter(e => e.status === 'PAID')
    const totalPaid = paidEntries.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
    const averageTicket = entries.length ? totalRevenue / entries.length : 0

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

    const handleExportCSV = () => {
        if (entries.length === 0) {
            toast.error('Nenhum dado para exportar')
            return
        }

        const headers = ['Data', 'Descrição', 'Método', 'Status', 'Valor']
        const rows = entries.map(entry => [
            entry.due_date ? format(new Date(entry.due_date), 'dd/MM/yyyy') : '',
            entry.description,
            entry.payment_method || 'N/A',
            entry.status,
            String(entry.amount)
        ])

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n')

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `pagamentos-${new Date().toISOString().split('T')[0]}.csv`
        link.click()
        URL.revokeObjectURL(url)
        toast.success('Exportação CSV realizada com sucesso!')
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto px-1 sm:px-4 py-2">
            {/* Header Premium */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #0EA5E9, #2563EB)' }}>
                        <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Pagamentos</h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Gestão financeira e histórico de transações</p>
                    </div>
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
                            <SelectItem value="all">Todos</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-32">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="PAID">Pago</SelectItem>
                            <SelectItem value="PENDING">Pendente</SelectItem>
                            <SelectItem value="OVERDUE">Vencido</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" size="icon" onClick={fetchData}>
                        <RefreshCcw className="h-4 w-4" />
                    </Button>

                    <Button variant="outline" onClick={handleExportCSV}>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">
                            {formatCurrency(totalPaid)} recebido
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(averageTicket)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Transações</CardTitle>
                        <CreditCard className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                        <p className="text-xs text-muted-foreground">
                            {paidEntries.length} pagos
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Transações</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        {entries.length} lançamentos encontrados
                    </p>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead>Método</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entries.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell>
                                            {entry.due_date
                                                ? format(new Date(entry.due_date), 'dd/MM/yyyy')
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {entry.description}
                                        </TableCell>
                                        <TableCell>
                                            {entry.payment_method || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(entry.status)}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-green-600">
                                            {formatCurrency(Number(entry.amount) || 0)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!loading && entries.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">
                                            Nenhum pagamento encontrado no período selecionado
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
