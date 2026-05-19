'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    History,
    Shield,
    ArrowLeft,
    RefreshCw,
    Search,
    Filter,
    Loader2,
    UserCog,
    Clock,
    AlertTriangle,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface ImpersonationSession {
    id: string
    admin_id: string
    admin_email: string
    target_clinic_id: string
    target_clinic_name: string | null
    reason: string
    started_at: string
    ended_at: string | null
    ip_address: string | null
    is_active: boolean
    clinics: { id: string; name: string } | null
}

export default function ImpersonacoesPage() {
    const router = useRouter()
    const [sessions, setSessions] = useState<ImpersonationSession[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    const loadSessions = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/super-admin/impersonation')
            if (!res.ok) {
                if (res.status === 403 || res.status === 404) {
                    router.push('/login')
                    return
                }
                throw new Error('Erro ao carregar sessões')
            }
            const result = await res.json()
            setSessions(result.data?.sessions || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro desconhecido')
        } finally {
            setIsLoading(false)
        }
    }, [router])

    useEffect(() => {
        loadSessions()
    }, [loadSessions])

    const filteredSessions = sessions.filter(s => {
        if (!searchTerm) return true
        const term = searchTerm.toLowerCase()
        return (
            s.clinics?.name?.toLowerCase().includes(term) ||
            s.admin_email?.toLowerCase().includes(term) ||
            s.reason?.toLowerCase().includes(term)
        )
    })

    const activeSessions = filteredSessions.filter(s => !s.ended_at)
    const completedSessions = filteredSessions.filter(s => s.ended_at)

    const calculateDuration = (start: string, end: string | null) => {
        const startDate = new Date(start)
        const endDate = end ? new Date(end) : new Date()
        const diffMs = endDate.getTime() - startDate.getTime()
        const diffMin = Math.floor(diffMs / 60000)
        if (diffMin < 60) return `${diffMin}min`
        const hours = Math.floor(diffMin / 60)
        const mins = diffMin % 60
        return `${hours}h ${mins}min`
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Skeleton className="h-12 w-80 bg-gray-200" />
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-24 bg-gray-200" />
                        ))}
                    </div>
                    <Skeleton className="h-96 bg-gray-200" />
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center space-y-4">
                        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
                        <p className="text-red-600 font-medium">{error}</p>
                        <Button onClick={loadSessions} variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <History className="h-7 w-7 text-blue-600" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Histórico de Impersonações</h1>
                            <p className="text-xs text-gray-500">Auditoria de acessos como clínica</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={loadSessions}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/system-master-hub')}>
                            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Resumo cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-white border-gray-200">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-gray-600">Total de Sessões</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold">{sessions.length}</span>
                                <History className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-gray-200">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-gray-600">Ativas Agora</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-orange-500">
                                    {sessions.filter(s => !s.ended_at).length}
                                </span>
                                <UserCog className="h-8 w-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-gray-200">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-gray-600">Clínicas Acessadas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold">
                                    {new Set(sessions.map(s => s.target_clinic_id)).size}
                                </span>
                                <Shield className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Busca */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar por clínica, admin ou motivo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Badge variant="outline" className="text-gray-600">
                        {filteredSessions.length} resultado{filteredSessions.length !== 1 ? 's' : ''}
                    </Badge>
                </div>

                {/* Empty state */}
                {filteredSessions.length === 0 && (
                    <Card className="bg-white border-gray-200">
                        <CardContent className="py-12 text-center">
                            <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">Nenhuma sessão de impersonation encontrada</p>
                            <p className="text-gray-400 text-sm mt-1">
                                {searchTerm ? 'Tente alterar o termo de busca' : 'As sessões aparecerão aqui quando um Super Admin acessar como clínica'}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Tabela */}
                {filteredSessions.length > 0 && (
                    <Card className="bg-white border-gray-200">
                        <CardHeader>
                            <CardTitle className="text-gray-900">Sessões</CardTitle>
                            <CardDescription className="text-gray-600">
                                Histórico completo de acessos em modo impersonation
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-gray-200">
                                        <TableHead className="text-gray-600">Status</TableHead>
                                        <TableHead className="text-gray-600">Super Admin</TableHead>
                                        <TableHead className="text-gray-600">Clínica</TableHead>
                                        <TableHead className="text-gray-600">Motivo</TableHead>
                                        <TableHead className="text-gray-600">Início</TableHead>
                                        <TableHead className="text-gray-600">Fim</TableHead>
                                        <TableHead className="text-gray-600">Duração</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSessions.map((session) => (
                                        <TableRow key={session.id} className="border-gray-200 hover:bg-gray-50">
                                            <TableCell>
                                                {!session.ended_at ? (
                                                    <Badge className="bg-orange-100 text-orange-700 border-orange-300 animate-pulse">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        Ativa agora
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-gray-500">
                                                        Encerrada
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {session.admin_email || '—'}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {session.clinics?.name || '—'}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600 max-w-[200px] truncate" title={session.reason}>
                                                {session.reason || '—'}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {format(new Date(session.started_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {session.ended_at
                                                    ? format(new Date(session.ended_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                                                    : '—'
                                                }
                                            </TableCell>
                                            <TableCell className="text-sm font-mono">
                                                {calculateDuration(session.started_at, session.ended_at)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    )
}
