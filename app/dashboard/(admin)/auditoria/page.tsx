'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Shield,
    Search,
    Download,
    Filter,
    Calendar,
    User,
    FileText,
    CreditCard,
    Settings,
    AlertTriangle,
    Eye,
    LogIn,
    LogOut,
    Edit,
    Trash2,
    Plus,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface AuditLog {
    id: string
    user_name: string
    user_email: string
    action: string
    entity_type: string
    entity_id?: string
    ip_address: string
    user_agent: string
    created_at: string
    severity: 'low' | 'medium' | 'high' | 'critical'
}

export default function AuditoriaPage() {
    const [search, setSearch] = useState('')
    const [actionFilter, setActionFilter] = useState('all')

    // Mock audit logs
    const auditLogs: AuditLog[] = [
        {
            id: '1',
            user_name: 'Admin Master',
            user_email: 'admin@clinigo.com',
            action: 'LOGIN',
            entity_type: 'auth',
            ip_address: '189.40.xx.xx',
            user_agent: 'Chrome 120',
            created_at: '2024-01-03T15:30:00',
            severity: 'low',
        },
        {
            id: '2',
            user_name: 'Dr. João Santos',
            user_email: 'joao@clinica.com',
            action: 'VIEW_MEDICAL_RECORD',
            entity_type: 'medical_record',
            entity_id: 'rec_123',
            ip_address: '201.55.xx.xx',
            user_agent: 'Chrome 120',
            created_at: '2024-01-03T14:45:00',
            severity: 'medium',
        },
        {
            id: '3',
            user_name: 'Admin Clínica',
            user_email: 'admin@clinica.com',
            action: 'UPDATE_CLINIC_SETTINGS',
            entity_type: 'clinic',
            entity_id: 'cli_456',
            ip_address: '177.88.xx.xx',
            user_agent: 'Firefox 121',
            created_at: '2024-01-03T14:20:00',
            severity: 'high',
        },
        {
            id: '4',
            user_name: 'Super Admin',
            user_email: 'super@clinigo.com',
            action: 'DELETE_PATIENT_DATA',
            entity_type: 'patient',
            entity_id: 'pat_789',
            ip_address: '189.40.xx.xx',
            user_agent: 'Chrome 120',
            created_at: '2024-01-03T12:00:00',
            severity: 'critical',
        },
        {
            id: '5',
            user_name: 'Dr. Ana Costa',
            user_email: 'ana@clinica.com',
            action: 'CREATE_APPOINTMENT',
            entity_type: 'appointment',
            entity_id: 'apt_001',
            ip_address: '200.12.xx.xx',
            user_agent: 'Safari 17',
            created_at: '2024-01-03T10:30:00',
            severity: 'low',
        },
    ]

    const getActionIcon = (action: string) => {
        if (action.includes('LOGIN')) return <LogIn className="w-4 h-4" />
        if (action.includes('LOGOUT')) return <LogOut className="w-4 h-4" />
        if (action.includes('VIEW')) return <Eye className="w-4 h-4" />
        if (action.includes('CREATE')) return <Plus className="w-4 h-4" />
        if (action.includes('UPDATE')) return <Edit className="w-4 h-4" />
        if (action.includes('DELETE')) return <Trash2 className="w-4 h-4" />
        return <FileText className="w-4 h-4" />
    }

    const getSeverityBadge = (severity: AuditLog['severity']) => {
        switch (severity) {
            case 'low':
                return <Badge variant="secondary">Info</Badge>
            case 'medium':
                return <Badge variant="info">Médio</Badge>
            case 'high':
                return <Badge variant="warning">Alto</Badge>
            case 'critical':
                return <Badge variant="destructive">Crítico</Badge>
        }
    }

    const formatAction = (action: string) => {
        const actionLabels: Record<string, string> = {
            LOGIN: 'Login no sistema',
            LOGOUT: 'Logout do sistema',
            VIEW_MEDICAL_RECORD: 'Visualizou prontuário',
            UPDATE_CLINIC_SETTINGS: 'Alterou configurações',
            DELETE_PATIENT_DATA: 'Excluiu dados (LGPD)',
            CREATE_APPOINTMENT: 'Criou agendamento',
        }
        return actionLabels[action] || action
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="w-7 h-7" />
                        Auditoria
                    </h1>
                    <p className="text-muted-foreground">
                        Log de atividades e conformidade HIPAA/LGPD
                    </p>
                </div>
                <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Relatório
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{auditLogs.length}</div>
                        <p className="text-sm text-muted-foreground">Eventos hoje</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-600">
                            {auditLogs.filter((l) => l.severity === 'critical').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Ações críticas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                            {auditLogs.filter((l) => l.action.includes('LOGIN')).length}
                        </div>
                        <p className="text-sm text-muted-foreground">Logins</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                            {new Set(auditLogs.map((l) => l.user_email)).size}
                        </div>
                        <p className="text-sm text-muted-foreground">Usuários ativos</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4 flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por usuário, ação..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Tipo de ação" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as ações</SelectItem>
                                <SelectItem value="login">Login/Logout</SelectItem>
                                <SelectItem value="view">Visualização</SelectItem>
                                <SelectItem value="create">Criação</SelectItem>
                                <SelectItem value="update">Alteração</SelectItem>
                                <SelectItem value="delete">Exclusão</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline">
                            <Calendar className="w-4 h-4 mr-2" />
                            Período
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Audit Table */}
            <Card>
                <CardContent className="pt-6">
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
                            {auditLogs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="whitespace-nowrap">
                                        {new Date(log.created_at).toLocaleString('pt-BR')}
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{log.user_name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {log.user_email}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {getActionIcon(log.action)}
                                            {formatAction(log.action)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {log.entity_type}
                                        </Badge>
                                        {log.entity_id && (
                                            <span className="text-xs text-muted-foreground ml-1">
                                                {log.entity_id}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {log.ip_address}
                                    </TableCell>
                                    <TableCell>
                                        {getSeverityBadge(log.severity)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Compliance Notice */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-blue-900">Conformidade HIPAA/LGPD</h4>
                            <p className="text-sm text-blue-800 mt-1">
                                Todos os acessos a dados sensíveis são registrados automaticamente.
                                Os logs são mantidos por 5 anos conforme exigência regulatória.
                                Acessos a prontuários são classificados como severidade "Médio" ou superior.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
