'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Shield, Search, Download, RefreshCw, User, Calendar, Activity, AlertTriangle, Info, AlertCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useProfessionalLabel } from '@/lib/hooks/use-professional-label'

interface AuditLog {
    id: string
    user_name: string
    user_email: string
    action: string
    entity_type: string
    entity_id: string | null
    ip_address: string
    user_agent: string
    severity: string
    created_at: string
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    info: { label: 'Info', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Info },
    low: { label: 'Baixa', color: 'bg-green-100 text-green-800 border-green-200', icon: Info },
    warning: { label: 'Atenção', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle },
    error: { label: 'Erro', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle },
    critical: { label: 'Crítico', color: 'bg-red-200 text-red-900 border-red-300', icon: AlertCircle },
}

const ACTION_LABELS: Record<string, string> = {
    'VIEW': 'Visualizou',
    'CREATE': 'Criou',
    'UPDATE': 'Atualizou',
    'DELETE': 'Excluiu',
    'EXPORT': 'Exportou',
    'LOGIN': 'Logou',
    'LOGOUT': 'Deslogou',
    'PAYMENT_RECONCILED': 'Conciliou Pagamento',
    'CONSENT_ACCEPTED': 'Aceitou Consentimento',
    'CONSENT_REVOKED': 'Revogou Consentimento',
}

const ENTITY_LABELS: Record<string, string> = {
    'PRONTUARIO': 'Prontuário',
    'APPOINTMENT': 'Agendamento',
    'PATIENT': 'Paciente',
    'DOCTOR': 'Profissional',
    'CLINIC': 'Clínica',
    'FINANCIAL': 'Financeiro',
    'USER': 'Usuário',
    'TELECONSULTA': 'Teleconsulta',
    'RECORDING': 'Gravação',
    'SYSTEM': 'Sistema',
    'SCHEDULE': 'Horário',
}

export default function AuditoriaPage() {
    const profLabel = useProfessionalLabel()
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [filters, setFilters] = useState({
        action: 'all',
        severity: 'all',
        entity_type: 'all',
        date_from: '',
        date_to: '',
        search: '',
    })

    const fetchLogs = async () => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams()
            if (filters.action !== 'all') params.append('action', filters.action)
            if (filters.severity !== 'all') params.append('severity', filters.severity)
            if (filters.entity_type !== 'all') params.append('entity_type', filters.entity_type)
            if (filters.date_from) params.append('date_from', filters.date_from)
            if (filters.date_to) params.append('date_to', filters.date_to)
            params.append('limit', '100')

            const res = await fetch(`/api/audit-logs?${params}`)
            if (res.ok) {
                const data = await res.json()
                setLogs(data.data || [])
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [])

    const handleFilter = () => {
        fetchLogs()
    }

    const handleExportCSV = () => {
        const headers = ['Data/Hora', 'Usuário', 'Email', 'Ação', 'Entidade', 'IP', 'Severidade']
        const rows = logs.map(log => [
            format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
            log.user_name,
            log.user_email,
            ACTION_LABELS[log.action] || log.action,
            ENTITY_LABELS[log.entity_type] || log.entity_type,
            log.ip_address,
            SEVERITY_CONFIG[log.severity]?.label || log.severity,
        ])

        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `auditoria_${format(new Date(), 'yyyy-MM-dd')}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    const filteredLogs = filters.search
        ? logs.filter(log =>
            log.user_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
            log.user_email?.toLowerCase().includes(filters.search.toLowerCase()) ||
            log.action?.toLowerCase().includes(filters.search.toLowerCase())
        )
        : logs

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto px-1 sm:px-4 py-2">
            {/* Header Premium */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #64748B, #334155)' }}>
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Auditoria</h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Rastreie todas as ações dos usuários no sistema</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchLogs} className="rounded-xl">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar
                    </Button>
                    <Button variant="outline" onClick={handleExportCSV} disabled={logs.length === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar CSV
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div>
                            <Label className="text-xs">Buscar</Label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Nome ou email..."
                                    className="pl-8"
                                    value={filters.search}
                                    onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs">Ação</Label>
                            <Select value={filters.action} onValueChange={(v) => setFilters(f => ({ ...f, action: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    <SelectItem value="VIEW">Visualização</SelectItem>
                                    <SelectItem value="CREATE">Criação</SelectItem>
                                    <SelectItem value="UPDATE">Atualização</SelectItem>
                                    <SelectItem value="DELETE">Exclusão</SelectItem>
                                    <SelectItem value="LOGIN">Login</SelectItem>
                                    <SelectItem value="EXPORT">Exportação</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs">Severidade</Label>
                            <Select value={filters.severity} onValueChange={(v) => setFilters(f => ({ ...f, severity: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    <SelectItem value="info">Info</SelectItem>
                                    <SelectItem value="warning">Atenção</SelectItem>
                                    <SelectItem value="error">Erro</SelectItem>
                                    <SelectItem value="critical">Crítico</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs">Data Início</Label>
                            <Input
                                type="date"
                                value={filters.date_from}
                                onChange={(e) => setFilters(f => ({ ...f, date_from: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Data Fim</Label>
                            <Input
                                type="date"
                                value={filters.date_to}
                                onChange={(e) => setFilters(f => ({ ...f, date_to: e.target.value }))}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={handleFilter} className="w-full">
                                <Search className="h-4 w-4 mr-2" />
                                Filtrar
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-muted-foreground">Total</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">{filteredLogs.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-muted-foreground">Usuários</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">
                            {new Set(filteredLogs.map(l => l.user_name)).size}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm text-muted-foreground">Alertas</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">
                            {filteredLogs.filter(l => l.severity === 'warning').length}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-muted-foreground">Erros</span>
                        </div>
                        <p className="text-2xl font-bold mt-1">
                            {filteredLogs.filter(l => ['error', 'critical'].includes(l.severity)).length}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Logs Table */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Registros de Auditoria</CardTitle>
                    <CardDescription>
                        Histórico de ações realizadas no sistema — rastreável por usuário, ação e horário
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Nenhum registro de auditoria encontrado.</p>
                            <p className="text-sm mt-1">Os logs aparecerão conforme os usuários interagem com o sistema.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data/Hora</TableHead>
                                        <TableHead>Usuário</TableHead>
                                        <TableHead>Ação</TableHead>
                                        <TableHead>Entidade</TableHead>
                                        <TableHead>IP</TableHead>
                                        <TableHead>Severidade</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.map((log) => {
                                        const severityConfig = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info
                                        const SeverityIcon = severityConfig.icon
                                        return (
                                            <TableRow key={log.id}>
                                                <TableCell className="whitespace-nowrap text-sm">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium text-sm">{log.user_name}</p>
                                                        <p className="text-xs text-muted-foreground">{log.user_email}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                        {ACTION_LABELS[log.action] || log.action}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {ENTITY_LABELS[log.entity_type] || log.entity_type}
                                                </TableCell>
                                                <TableCell className="text-xs font-mono text-muted-foreground">
                                                    {log.ip_address}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={`text-xs ${severityConfig.color}`}>
                                                        <SeverityIcon className="h-3 w-3 mr-1" />
                                                        {severityConfig.label}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
