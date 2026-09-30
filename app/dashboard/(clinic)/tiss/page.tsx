'use client'

import { useState, useEffect } from 'react'
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
    BarChart3,
    ArrowRightLeft,
    ShieldAlert,
    Copy,
    Printer,
    Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { NewGuideDialog } from './new-guide-dialog'
import { GuideValidationPanel } from '@/components/tiss/guide-validation-panel'
import { CancelGuideDialog } from '@/components/tiss/cancel-guide-dialog'
import { GuidePrintModal } from '@/components/tiss/guide-print-modal'
import { useFaturamentoPremium } from '@/lib/tiss/use-faturamento-premium'

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

// =============================================================================
// PÁGINA LEGADA (Renderizada exclusivamente quando faturamento_premium = false)
// =============================================================================

function LegacyTissPage() {
    const [search, setSearch] = useState('')
    const [tab, setTab] = useState('all')
    const [isLoading, setIsLoading] = useState(true)
    const [guias, setGuias] = useState<TissGuia[]>([])

    const fetchGuias = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/tiss/guides?limit=100')
            if (response.ok) {
                const data = await response.json()
                setGuias(data.guides || [])
            } else {
                setGuias([])
            }
        } catch (error) {
            console.error('Error fetching TISS guides:', error)
            setGuias([])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchGuias()
    }, [])

    const getStatusBadge = (status: TissGuia['status']) => {
        switch (status) {
            case 'pendente':
                return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>
            case 'enviada':
                return <Badge variant="outline" className="text-blue-700 border-blue-200"><Send className="w-3 h-3 mr-1" />Enviada</Badge>
            case 'aprovada':
                return <Badge variant="default" className="bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" />Aprovada</Badge>
            case 'negada':
                return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Negada</Badge>
            case 'paga':
                return <Badge variant="default" className="bg-emerald-700"><DollarSign className="w-3 h-3 mr-1" />Paga</Badge>
            default:
                return <Badge variant="secondary">{status}</Badge>
        }
    }

    const filteredGuias = guias.filter((g) =>
        g.paciente?.toLowerCase().includes(search.toLowerCase()) ||
        g.numero?.toLowerCase().includes(search.toLowerCase()) ||
        g.operadora?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
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
                    <Link href="/dashboard/tiss/reports/loss-analysis">
                        <Button variant="outline">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            BI de Perdas
                        </Button>
                    </Link>
                    <Link href="/dashboard/tiss/glosas">
                        <Button variant="outline" className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Glosas
                        </Button>
                    </Link>
                    <Link href="/dashboard/tiss/migration">
                        <Button variant="outline">
                            <ArrowRightLeft className="w-4 h-4 mr-2" />
                            Migração TISS
                        </Button>
                    </Link>
                    <Button variant="outline" onClick={() => setTab('import')}>
                        <Upload className="w-4 h-4 mr-2" />
                        Importar XML
                    </Button>
                    <NewGuideDialog onSuccess={fetchGuias} overridePremium={false} />
                </div>
            </div>

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

            <Tabs value={tab} onValueChange={setTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="all">Todas</TabsTrigger>
                    <TabsTrigger value="pendente">Pendentes</TabsTrigger>
                    <TabsTrigger value="enviada">Enviadas</TabsTrigger>
                    <TabsTrigger value="aprovada">Aprovadas</TabsTrigger>
                    <TabsTrigger value="import" className="gap-2">
                        <Upload className="w-4 h-4" />
                        Importar
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="import">
                    <Card>
                        <CardHeader>
                            <CardTitle>Importar Guias TISS</CardTitle>
                            <CardDescription>
                                Importe lotes de guias a partir de arquivos XML ou Excel/CSV
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 space-y-4">
                                <div className="p-4 bg-muted rounded-full">
                                    <Upload className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="font-medium">Arraste arquivos aqui ou clique para selecionar</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Suporta arquivos .xml, .xlsx, .csv
                                    </p>
                                </div>
                                <Input
                                    type="file"
                                    className="max-w-xs mt-4"
                                    accept=".xml,.xlsx,.csv"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return

                                        const formData = new FormData()
                                        formData.append('file', file)

                                        try {
                                            toast('Importando arquivo...')
                                            const res = await fetch('/api/tiss/import', {
                                                method: 'POST',
                                                body: formData
                                            })

                                            const data = await res.json()
                                            if (res.ok) {
                                                alert(`Sucesso! ${data.message}`)
                                                setTab('all')
                                            } else {
                                                const errText = typeof data.error === 'string' ? data.error : data.error?.message || data.message || 'Erro ao importar';
                                                alert(`Erro: ${errText}`)
                                            }
                                        } catch (err) {
                                            console.error(err)
                                            alert('Erro ao importar')
                                        }
                                    }}
                                />
                                <div className="text-xs text-muted-foreground mt-4 max-w-sm text-center">
                                    <p>Certifique-se que o arquivo segue o padrão TISS 4.0 ou o modelo de importação do CliniGo.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

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

// =============================================================================
// PÁGINA PREMIUM (Renderizada exclusivamente quando faturamento_premium = true)
// =============================================================================

function PremiumTissPage() {
    const [search, setSearch] = useState('')
    const [tab, setTab] = useState('all')
    const [isLoading, setIsLoading] = useState(true)
    const [guias, setGuias] = useState<TissGuia[]>([])

    // Estados para modais de ações G3, G4, G6
    const [validationGuide, setValidationGuide] = useState<TissGuia | null>(null)
    const [cancelGuide, setCancelGuide] = useState<TissGuia | null>(null)
    const [printGuide, setPrintGuide] = useState<TissGuia | null>(null)
    const [isDuplicatingId, setIsDuplicatingId] = useState<string | null>(null)

    const fetchGuias = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/tiss/guides?limit=100')
            if (response.ok) {
                const data = await response.json()
                setGuias(data.guides || [])
            } else {
                setGuias([])
            }
        } catch (error) {
            console.error('Error fetching TISS guides:', error)
            setGuias([])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchGuias()
    }, [])

    const handleDuplicate = async (guiaId: string) => {
        setIsDuplicatingId(guiaId)
        try {
            const res = await fetch(`/api/tiss/guides/${guiaId}/duplicate`, {
                method: 'POST',
            })
            const data = await res.json()
            if (!res.ok) {
                const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || data.message || 'Erro ao duplicar guia';
                throw new Error(errorMsg);
            }

            toast.success(data.message || 'Guia duplicada com sucesso!')
            fetchGuias()
        } catch (err: any) {
            toast.error(err.message || 'Falha ao duplicar guia')
        } finally {
            setIsDuplicatingId(null)
        }
    }

    const getStatusBadge = (status: TissGuia['status']) => {
        switch (status) {
            case 'pendente':
                return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>
            case 'enviada':
                return <Badge variant="outline" className="border-blue-300 text-blue-800"><Send className="w-3 h-3 mr-1" />Enviada</Badge>
            case 'aprovada':
                return <Badge variant="default" className="bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" />Aprovada</Badge>
            case 'negada':
                return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Negada</Badge>
            case 'paga':
                return <Badge variant="default" className="bg-emerald-700"><DollarSign className="w-3 h-3 mr-1" />Paga</Badge>
            default:
                return <Badge variant="secondary">{status}</Badge>
        }
    }

    const filteredGuias = guias.filter((g) =>
        g.paciente?.toLowerCase().includes(search.toLowerCase()) ||
        g.numero?.toLowerCase().includes(search.toLowerCase()) ||
        g.operadora?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Receipt className="w-7 h-7" />
                        Faturamento TISS
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-mono text-xs">
                            PREMIUM
                        </Badge>
                    </h1>
                    <p className="text-muted-foreground text-xs">
                        Gestão integral de faturamento conforme padrão ANS com prevenção ativa de glosas
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/tiss/batches">
                        <Button variant="outline" size="sm">
                            <FileText className="w-4 h-4 mr-1.5" />
                            Lotes
                        </Button>
                    </Link>
                    <Link href="/dashboard/tiss/reports/loss-analysis">
                        <Button variant="outline" size="sm">
                            <BarChart3 className="w-4 h-4 mr-1.5" />
                            BI de Perdas
                        </Button>
                    </Link>
                    <Link href="/dashboard/tiss/glosas">
                        <Button variant="outline" size="sm" className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100">
                            <AlertCircle className="w-4 h-4 mr-1.5" />
                            Glosas
                        </Button>
                    </Link>
                    <Link href="/dashboard/tiss/migration">
                        <Button variant="outline" size="sm">
                            <ArrowRightLeft className="w-4 h-4 mr-1.5" />
                            Migração
                        </Button>
                    </Link>
                    <NewGuideDialog onSuccess={fetchGuias} overridePremium={true} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{guias.length}</div>
                        <p className="text-xs text-muted-foreground">Total de guias</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-amber-600">
                            {guias.filter((g) => g.status === 'pendente').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Pendentes</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-600">
                            {guias.filter((g) => g.status === 'enviada').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Enviadas em lote</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-emerald-600">
                            {guias.filter((g) => g.status === 'aprovada' || g.status === 'paga').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Aprovadas/Pagas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-emerald-700">
                            R$ {guias.filter((g) => g.status === 'paga').reduce((acc, g) => acc + g.valor, 0).toLocaleString('pt-BR')}
                        </div>
                        <p className="text-xs text-muted-foreground">Valor recebido</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por paciente, número ou operadora..."
                                className="pl-9 text-xs"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm">
                            <Calendar className="w-4 h-4 mr-1.5" />
                            Período
                        </Button>
                        <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-1.5" />
                            Exportar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Tabs value={tab} onValueChange={setTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="all">Todas</TabsTrigger>
                    <TabsTrigger value="pendente">Pendentes</TabsTrigger>
                    <TabsTrigger value="enviada">Enviadas</TabsTrigger>
                    <TabsTrigger value="aprovada">Aprovadas</TabsTrigger>
                </TabsList>

                <TabsContent value={tab} className="space-y-3">
                    {filteredGuias
                        .filter((g) => tab === 'all' || g.status === tab)
                        .map((guia) => (
                            <Card key={guia.id} className="hover:shadow-sm transition-shadow border">
                                <CardContent className="pt-4 pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-primary/10 rounded-lg">
                                                <FileText className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-sm">{guia.numero}</h3>
                                                    <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                                                        {guia.tipo}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs font-medium text-foreground">{guia.paciente}</p>
                                                <p className="text-xs text-muted-foreground">{guia.procedimento}</p>
                                                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
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
                                                <p className="font-semibold text-sm font-mono">
                                                    R$ {guia.valor.toLocaleString('pt-BR')}
                                                </p>
                                                {getStatusBadge(guia.status)}
                                            </div>

                                            {/* Ações completas B2 */}
                                            <div className="flex items-center gap-1.5">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setValidationGuide(guia)}
                                                    className="h-8 text-xs gap-1"
                                                >
                                                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                                    Validar
                                                </Button>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDuplicate(guia.id)}
                                                    disabled={isDuplicatingId === guia.id}
                                                    className="h-8 text-xs gap-1"
                                                >
                                                    <Copy className="w-3.5 h-3.5 text-blue-600" />
                                                    Duplicar
                                                </Button>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setPrintGuide(guia)}
                                                    className="h-8 text-xs gap-1"
                                                >
                                                    <Printer className="w-3.5 h-3.5 text-zinc-600" />
                                                    Imprimir
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setCancelGuide(guia)}
                                                    className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                    {filteredGuias.filter((g) => tab === 'all' || g.status === tab).length === 0 && (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Receipt className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                                <p className="font-medium text-xs">Nenhuma guia encontrada</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Utilize "Nova Guia" para cadastrar uma guia TISS.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* Painel de Validação G3 */}
            {validationGuide && (
                <GuideValidationPanel
                    open={Boolean(validationGuide)}
                    onOpenChange={(open) => !open && setValidationGuide(null)}
                    guide={validationGuide as any}
                    onValidationComplete={fetchGuias}
                />
            )}

            {/* Diálogo de Cancelamento / Exclusão G4 */}
            {cancelGuide && (
                <CancelGuideDialog
                    open={Boolean(cancelGuide)}
                    onOpenChange={(open) => !open && setCancelGuide(null)}
                    guide={cancelGuide as any}
                    onCancelled={() => {
                        setCancelGuide(null)
                        fetchGuias()
                    }}
                />
            )}

            {/* Modal de Impressão G6 */}
            {printGuide && (
                <GuidePrintModal
                    open={Boolean(printGuide)}
                    onOpenChange={(open) => !open && setPrintGuide(null)}
                    guide={{
                        id: printGuide.id,
                        guide_number: printGuide.numero,
                        guide_type: printGuide.tipo,
                        status: printGuide.status.toUpperCase(),
                        patient_name: printGuide.paciente,
                        procedure_name: printGuide.procedimento,
                        operator_name: printGuide.operadora,
                        total_value: printGuide.valor,
                    } as any}
                />
            )}
        </div>
    )
}

// =============================================================================
// EXPORTAÇÃO CONDICIONAL POR FEATURE FLAG (Parte 1.1)
// =============================================================================

export default function TissPage() {
    const { isPremium } = useFaturamentoPremium()

    if (!isPremium) {
        return <LegacyTissPage />
    }

    return <PremiumTissPage />
}
