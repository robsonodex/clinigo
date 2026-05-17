'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    Bot, ArrowLeft, RefreshCw, AlertTriangle, TrendingUp, TrendingDown,
    Users, MessageCircle, CheckCircle2, XCircle, Clock, Search, Loader2, Phone,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

interface Metrics {
    totalSessions: number; sessionsCompleted: number; sessionsDropped: number
    sessionsTransferred: number; totalLeads: number; leadsConverted: number
    leadsNew: number; conversionRate: number; dropRate: number
}

interface Lead {
    id: string; name: string; phone: string; email: string | null
    source: string; status: string; created_at: string; notes: string | null
}

export default function ChatbotPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [metrics, setMetrics] = useState<Metrics | null>(null)
    const [leads, setLeads] = useState<Lead[]>([])
    const [stepBreakdown, setStepBreakdown] = useState<Record<string, number>>({})
    const [searchTerm, setSearchTerm] = useState('')
    const [days, setDays] = useState(30)

    const loadData = useCallback(async () => {
        setIsLoading(true); setError(null)
        try {
            const res = await fetch(`/api/super-admin/chatbot?days=${days}`)
            if (!res.ok) throw new Error('Erro ao carregar dados')
            const result = await res.json()
            setMetrics(result.data?.metrics || null)
            setLeads(result.data?.recentLeads || [])
            setStepBreakdown(result.data?.stepBreakdown || {})
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro')
        } finally { setIsLoading(false) }
    }, [days])

    useEffect(() => { loadData() }, [loadData])

    const filteredLeads = leads.filter(l => {
        if (!searchTerm) return true
        const t = searchTerm.toLowerCase()
        return l.name?.toLowerCase().includes(t) || l.phone?.includes(t) || l.email?.toLowerCase().includes(t)
    })

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'converted': return <Badge className="bg-green-100 text-green-700">Convertido</Badge>
            case 'contacted': return <Badge className="bg-blue-100 text-blue-700">Contatado</Badge>
            case 'lost': return <Badge className="bg-red-100 text-red-700">Perdido</Badge>
            default: return <Badge className="bg-yellow-100 text-yellow-700">Novo</Badge>
        }
    }

    if (isLoading) return (
        <div className="min-h-screen bg-gray-50 p-6"><div className="max-w-7xl mx-auto space-y-6">
            <Skeleton className="h-12 w-80 bg-gray-200" />
            <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 bg-gray-200" />)}</div>
            <Skeleton className="h-96 bg-gray-200" />
        </div></div>
    )

    if (error) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Card className="max-w-md"><CardContent className="pt-6 text-center space-y-4">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" /><p className="text-red-600">{error}</p>
                <Button onClick={loadData} variant="outline"><RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente</Button>
            </CardContent></Card>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Bot className="h-7 w-7 text-purple-600" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Painel Chatbot — Clin</h1>
                            <p className="text-xs text-gray-500">Funil de conversão e gestão de leads</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={days}
                            onChange={e => setDays(Number(e.target.value))}
                            className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
                        >
                            <option value={7}>7 dias</option>
                            <option value={30}>30 dias</option>
                            <option value={90}>90 dias</option>
                        </select>
                        <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="h-4 w-4 mr-2" /> Atualizar</Button>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/system-master-hub')}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Métricas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white"><CardHeader className="pb-2"><CardDescription>Sessões</CardDescription></CardHeader>
                        <CardContent><div className="flex items-center justify-between">
                            <span className="text-3xl font-bold">{metrics?.totalSessions || 0}</span>
                            <MessageCircle className="h-8 w-8 text-purple-500" />
                        </div></CardContent></Card>
                    <Card className="bg-white"><CardHeader className="pb-2"><CardDescription>Leads Captados</CardDescription></CardHeader>
                        <CardContent><div className="flex items-center justify-between">
                            <span className="text-3xl font-bold text-blue-500">{metrics?.totalLeads || 0}</span>
                            <Users className="h-8 w-8 text-blue-500" />
                        </div></CardContent></Card>
                    <Card className="bg-white"><CardHeader className="pb-2"><CardDescription>Taxa de Conversão</CardDescription></CardHeader>
                        <CardContent><div className="flex items-center justify-between">
                            <span className="text-3xl font-bold text-green-500">{metrics?.conversionRate || 0}%</span>
                            <TrendingUp className="h-8 w-8 text-green-500" />
                        </div></CardContent></Card>
                    <Card className="bg-white"><CardHeader className="pb-2"><CardDescription>Taxa de Abandono</CardDescription></CardHeader>
                        <CardContent><div className="flex items-center justify-between">
                            <span className="text-3xl font-bold text-red-500">{metrics?.dropRate || 0}%</span>
                            <TrendingDown className="h-8 w-8 text-red-500" />
                        </div></CardContent></Card>
                </div>

                {/* Funil visual */}
                <Card>
                    <CardHeader><CardTitle>Funil do Bot</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                            {Object.entries(stepBreakdown).sort(([,a], [,b]) => b - a).map(([step, count]) => (
                                <div key={step} className="flex flex-col items-center min-w-[100px] p-3 bg-gray-50 rounded-lg border">
                                    <span className="text-2xl font-bold text-gray-900">{count}</span>
                                    <span className="text-xs text-gray-500 text-center mt-1">{step}</span>
                                </div>
                            ))}
                            {Object.keys(stepBreakdown).length === 0 && (
                                <p className="text-sm text-gray-400 py-4">Nenhum dado de steps disponível ainda</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Tabs defaultValue="leads">
                    <TabsList className="bg-white border"><TabsTrigger value="leads">Leads</TabsTrigger><TabsTrigger value="stats">Estatísticas</TabsTrigger></TabsList>

                    <TabsContent value="leads" className="space-y-4">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input placeholder="Buscar lead..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                        </div>

                        {filteredLeads.length === 0 ? (
                            <Card><CardContent className="py-12 text-center">
                                <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Nenhum lead encontrado</p>
                            </CardContent></Card>
                        ) : (
                            <Card><CardContent className="p-0"><Table>
                                <TableHeader><TableRow>
                                    <TableHead>Nome</TableHead><TableHead>Telefone</TableHead>
                                    <TableHead>Email</TableHead><TableHead>Origem</TableHead>
                                    <TableHead>Status</TableHead><TableHead>Data</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {filteredLeads.map(lead => (
                                        <TableRow key={lead.id} className="hover:bg-gray-50">
                                            <TableCell className="font-medium">{lead.name || '—'}</TableCell>
                                            <TableCell><div className="flex items-center gap-1"><Phone className="h-3 w-3 text-gray-400" />{lead.phone || '—'}</div></TableCell>
                                            <TableCell className="text-sm text-gray-500">{lead.email || '—'}</TableCell>
                                            <TableCell><Badge variant="outline">{lead.source || 'whatsapp'}</Badge></TableCell>
                                            <TableCell>{getStatusBadge(lead.status)}</TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table></CardContent></Card>
                        )}
                    </TabsContent>

                    <TabsContent value="stats">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <Card><CardContent className="pt-6 text-center">
                                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                                <p className="text-2xl font-bold">{metrics?.sessionsCompleted || 0}</p>
                                <p className="text-sm text-gray-500">Completadas</p>
                            </CardContent></Card>
                            <Card><CardContent className="pt-6 text-center">
                                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                                <p className="text-2xl font-bold">{metrics?.sessionsDropped || 0}</p>
                                <p className="text-sm text-gray-500">Abandonadas</p>
                            </CardContent></Card>
                            <Card><CardContent className="pt-6 text-center">
                                <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                                <p className="text-2xl font-bold">{metrics?.sessionsTransferred || 0}</p>
                                <p className="text-sm text-gray-500">Transferidas</p>
                            </CardContent></Card>
                            <Card><CardContent className="pt-6 text-center">
                                <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                                <p className="text-2xl font-bold">{metrics?.leadsNew || 0}</p>
                                <p className="text-sm text-gray-500">Leads Novos</p>
                            </CardContent></Card>
                            <Card><CardContent className="pt-6 text-center">
                                <TrendingUp className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                                <p className="text-2xl font-bold">{metrics?.leadsConverted || 0}</p>
                                <p className="text-sm text-gray-500">Leads Convertidos</p>
                            </CardContent></Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
