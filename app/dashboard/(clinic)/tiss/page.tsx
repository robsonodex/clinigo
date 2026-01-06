'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Receipt,
    Search,
    Plus,
    Download,
    Upload,
    FileText,
    CheckCircle2,
    Clock,
    AlertCircle,
    Building2,
    Calendar,
    DollarSign,
    Send,
} from 'lucide-react'

interface TissGuia {
    id: string
    numero: string
    tipo: 'consulta' | 'sadt' | 'internacao'
    paciente: string
    procedimento: string
    operadora: string
    valor: number
    status: 'pendente' | 'enviada' | 'aprovada' | 'negada' | 'paga'
    data_criacao: string
}

export default function TissPage() {
    const [search, setSearch] = useState('')
    const [tab, setTab] = useState('all')

    // Mock TISS guides data
    const guias: TissGuia[] = [
        {
            id: '1',
            numero: 'TISS-2024-0001',
            tipo: 'consulta',
            paciente: 'Maria Silva',
            procedimento: 'Teleconsulta - Clínica Geral',
            operadora: 'Unimed',
            valor: 180,
            status: 'aprovada',
            data_criacao: '2024-01-03',
        },
        {
            id: '2',
            numero: 'TISS-2024-0002',
            tipo: 'consulta',
            paciente: 'João Souza',
            procedimento: 'Teleconsulta - Cardiologia',
            operadora: 'Bradesco Saúde',
            valor: 250,
            status: 'pendente',
            data_criacao: '2024-01-03',
        },
        {
            id: '3',
            numero: 'TISS-2024-0003',
            tipo: 'sadt',
            paciente: 'Ana Costa',
            procedimento: 'Eletrocardiograma',
            operadora: 'Amil',
            valor: 120,
            status: 'enviada',
            data_criacao: '2024-01-02',
        },
        {
            id: '4',
            numero: 'TISS-2024-0004',
            tipo: 'consulta',
            paciente: 'Carlos Lima',
            procedimento: 'Teleconsulta - Dermatologia',
            operadora: 'SulAmérica',
            valor: 200,
            status: 'paga',
            data_criacao: '2024-01-01',
        },
    ]

    const getStatusBadge = (status: TissGuia['status']) => {
        switch (status) {
            case 'pendente':
                return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>
            case 'enviada':
                return <Badge variant="info"><Send className="w-3 h-3 mr-1" />Enviada</Badge>
            case 'aprovada':
                return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" />Aprovada</Badge>
            case 'negada':
                return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Negada</Badge>
            case 'paga':
                return <Badge variant="success"><DollarSign className="w-3 h-3 mr-1" />Paga</Badge>
        }
    }

    const filteredGuias = guias.filter((g) =>
        g.paciente.toLowerCase().includes(search.toLowerCase()) ||
        g.numero.toLowerCase().includes(search.toLowerCase()) ||
        g.operadora.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Receipt className="w-7 h-7" />
                        Faturamento TISS
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            PRO
                        </Badge>
                    </h1>
                    <p className="text-muted-foreground">
                        Gerenciamento de guias TISS para convênios
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Upload className="w-4 h-4 mr-2" />
                        Importar XML
                    </Button>
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Guia
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{guias.length}</div>
                        <p className="text-sm text-muted-foreground">Total de guias</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-amber-600">
                            {guias.filter((g) => g.status === 'pendente').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Pendentes</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-600">
                            {guias.filter((g) => g.status === 'enviada').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Enviadas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">
                            {guias.filter((g) => g.status === 'aprovada' || g.status === 'paga').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Aprovadas/Pagas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">
                            R$ {guias.filter((g) => g.status === 'paga').reduce((acc, g) => acc + g.valor, 0).toLocaleString('pt-BR')}
                        </div>
                        <p className="text-sm text-muted-foreground">Valor recebido</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por paciente, número ou operadora..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button variant="outline">
                            <Calendar className="w-4 h-4 mr-2" />
                            Período
                        </Button>
                        <Button variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Exportar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={tab} onValueChange={setTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="all">Todas</TabsTrigger>
                    <TabsTrigger value="pendente">Pendentes</TabsTrigger>
                    <TabsTrigger value="enviada">Enviadas</TabsTrigger>
                    <TabsTrigger value="aprovada">Aprovadas</TabsTrigger>
                </TabsList>

                <TabsContent value={tab} className="space-y-4">
                    {filteredGuias
                        .filter((g) => tab === 'all' || g.status === tab)
                        .map((guia) => (
                            <Card key={guia.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-primary/10 rounded-lg">
                                                <FileText className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold">{guia.numero}</h3>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {guia.tipo.toUpperCase()}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm">{guia.paciente}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {guia.procedimento}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                    <Building2 className="w-3 h-3" />
                                                    {guia.operadora}
                                                    <span>•</span>
                                                    <Calendar className="w-3 h-3" />
                                                    {guia.data_criacao}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="font-semibold text-lg">
                                                    R$ {guia.valor.toLocaleString('pt-BR')}
                                                </p>
                                                {getStatusBadge(guia.status)}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm">
                                                    Ver
                                                </Button>
                                                {guia.status === 'pendente' && (
                                                    <Button size="sm">
                                                        <Send className="w-4 h-4 mr-1" />
                                                        Enviar
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                    {filteredGuias.filter((g) => tab === 'all' || g.status === tab).length === 0 && (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Receipt className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <p className="font-medium">Nenhuma guia encontrada</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Clique em "Nova Guia" para criar
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* Info */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <Receipt className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-blue-900">Padrão TISS 4.0</h4>
                            <p className="text-sm text-blue-800 mt-1">
                                Este módulo segue as especificações TISS (Troca de Informações em Saúde
                                Suplementar) da ANS. As guias são geradas em formato XML compatível
                                com todas as operadoras de saúde.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
