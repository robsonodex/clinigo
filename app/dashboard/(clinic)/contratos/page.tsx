'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    FileText,
    Plus,
    Search,
    Filter,
    RefreshCw,
    ExternalLink,
    Copy,
    Check,
    Send,
    Printer,
    Ban,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Eye,
    BookOpen,
    Users,
    ShieldCheck,
    FileSignature,
    Calendar,
    ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'

interface Signer {
    id: string
    role: string
    name: string
    email?: string
    phone?: string
    document_tax_id?: string
    signing_token: string
    status: 'PENDING' | 'VIEWED' | 'SIGNED' | 'REJECTED' | 'EXPIRED'
    signing_order: number
    signed_at?: string
    viewed_at?: string
}

interface ContractDocument {
    id: string
    clinic_id: string
    document_number: string
    title: string
    category: string
    status: 'rascunho' | 'aguardando_envio' | 'enviado' | 'visualizado' | 'assinado_parcial' | 'assinado' | 'recusado' | 'expirado' | 'cancelado'
    target_type: string
    expires_at?: string
    final_document_hash?: string
    created_at: string
    updated_at: string
    contract_signers?: Signer[]
}

const CATEGORY_NAMES: Record<string, string> = {
    prestacao_servicos_pj: 'Prestação de Serviços (PJ)',
    aditivo_contratual: 'Termo Aditivo',
    distrato_servicos: 'Distrato Contratual',
    nda_confidencialidade: 'Confidencialidade (NDA)',
    termo_imagem_profissional: 'Uso de Imagem (Profissional)',
    termo_imagem_menor: 'Uso de Imagem (Paciente Menor)',
    termo_geral: 'Termo Geral',
}

export default function ContratosPage() {
    const [documents, setDocuments] = useState<ContractDocument[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isUnauthorized, setIsUnauthorized] = useState(false)
    const [activeTab, setActiveTab] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')

    // Modal de cancelamento
    const [docToCancel, setDocToCancel] = useState<ContractDocument | null>(null)
    const [isCancelling, setIsCancelling] = useState(false)

    // Modal de reenvio / compartilhamento de link
    const [shareDoc, setShareDoc] = useState<ContractDocument | null>(null)
    const [copiedToken, setCopiedToken] = useState<string | null>(null)

    const fetchDocuments = useCallback(async () => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams()
            if (activeTab !== 'all') params.set('status', activeTab)
            if (categoryFilter !== 'all') params.set('category', categoryFilter)
            if (searchQuery.trim()) params.set('search', searchQuery.trim())

            const res = await fetch(`/api/contracts?${params.toString()}`)
            if (res.status === 403) {
                setIsUnauthorized(true)
                return
            }
            if (!res.ok) throw new Error('Falha ao buscar contratos')
            const json = await res.json()
            setDocuments(json.documents || [])
        } catch (err: any) {
            console.error(err)
            toast.error('Não foi possível carregar os contratos.')
        } finally {
            setIsLoading(false)
        }
    }, [activeTab, categoryFilter, searchQuery])

    useEffect(() => {
        fetchDocuments()
    }, [fetchDocuments])

    const handleCopyLink = (token: string) => {
        const fullUrl = `${window.location.origin}/assinar/${token}`
        navigator.clipboard.writeText(fullUrl)
        setCopiedToken(token)
        toast.success('Link de assinatura copiado para a área de transferência.')
        setTimeout(() => setCopiedToken(null), 3000)
    }

    const handleConfirmCancel = async () => {
        if (!docToCancel) return
        try {
            setIsCancelling(true)
            const res = await fetch(`/api/contracts/${docToCancel.id}`, {
                method: 'DELETE',
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Falha ao cancelar')
            }
            toast.success('Contrato cancelado com sucesso.')
            setDocToCancel(null)
            fetchDocuments()
        } catch (err: any) {
            toast.error(err.message || 'Erro ao cancelar contrato.')
        } finally {
            setIsCancelling(false)
        }
    }

    const handleResend = async (contractId: string, signerId: string, channel: 'EMAIL' | 'WHATSAPP') => {
        try {
            const res = await fetch(`/api/contracts/${contractId}/resend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signer_id: signerId, channel })
            })
            if (!res.ok) throw new Error('Falha ao reenviar notificação')
            toast.success(`Notificação reenviada via ${channel === 'WHATSAPP' ? 'WhatsApp' : 'E-mail'}.`)
        } catch (err: any) {
            toast.error('Erro ao reenviar notificação.')
        }
    }

    // Métricas
    const totalDocs = documents.length
    const signedDocs = documents.filter(d => d.status === 'assinado').length
    const pendingDocs = documents.filter(d => ['enviado', 'visualizado', 'assinado_parcial'].includes(d.status)).length
    const completionRate = totalDocs > 0 ? Math.round((signedDocs / totalDocs) * 100) : 0

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'assinado':
                return (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Assinado
                    </Badge>
                )
            case 'assinado_parcial':
                return (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 font-medium">
                        <Clock className="w-3.5 h-3.5 mr-1 text-blue-600" />
                        Assinatura Parcial
                    </Badge>
                )
            case 'enviado':
            case 'aguardando_envio':
                return (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-medium">
                        <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                        Aguardando Assinatura
                    </Badge>
                )
            case 'visualizado':
                return (
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 font-medium">
                        <Eye className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                        Visualizado
                    </Badge>
                )
            case 'cancelado':
                return (
                    <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300 font-medium">
                        <Ban className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        Cancelado
                    </Badge>
                )
            case 'recusado':
                return (
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                        Recusado
                    </Badge>
                )
            default:
                return (
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300 font-medium">
                        {status}
                    </Badge>
                )
        }
    }

    if (isUnauthorized) {
        return (
            <div className="flex-1 p-6 md:p-12 max-w-xl mx-auto w-full text-center space-y-4">
                <div className="inline-flex p-4 rounded-full bg-amber-50 text-amber-700">
                    <ShieldCheck className="w-8 h-8" />
                </div>
                <h1 className="text-xl font-bold text-slate-800">Acesso Restrito</h1>
                <p className="text-sm text-slate-600">
                    O módulo de Contratos e Assinatura Eletrônica está restrito à clínica autorizada (World Sensory).
                </p>
                <div className="pt-2">
                    <Link href="/dashboard">
                        <Button variant="outline" className="border-slate-300">
                            Voltar ao Painel
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
            {/* Cabeçalho Principal */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                        Contratos & Assinaturas Eletrônicas
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                        Biblioteca jurídica institucional, emissão com dados dinâmicos e trilha probatória de validade legal.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link href="/dashboard/contratos/modelos">
                        <Button variant="outline" className="h-10 border-slate-300">
                            <BookOpen className="w-4 h-4 mr-2 text-slate-600" />
                            Biblioteca de Modelos
                        </Button>
                    </Link>
                    <Link href="/dashboard/contratos/novo">
                        <Button className="h-10 bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Emitir Novo Contrato
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Painel de Métricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Total Emitidos
                        </CardDescription>
                        <CardTitle className="text-2xl font-bold text-slate-900">{totalDocs}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500">Documentos gerados no sistema</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                            Aguardando Assinatura
                        </CardDescription>
                        <CardTitle className="text-2xl font-bold text-amber-700">{pendingDocs}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500">Pendentes de uma ou mais partes</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                            Totalmente Concluídos
                        </CardDescription>
                        <CardTitle className="text-2xl font-bold text-emerald-700">{signedDocs}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500">Com integridade probatória final</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Taxa de Conclusão
                        </CardDescription>
                        <CardTitle className="text-2xl font-bold text-slate-900">{completionRate}%</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500">Eficácia de fechamento</p>
                    </CardContent>
                </Card>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar por título, número (ex: CTR-2026/001) ou signatário..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 border-slate-300 text-sm"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full md:w-[220px] h-9 border-slate-300 text-xs">
                            <SelectValue placeholder="Categoria do Contrato" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Categorias</SelectItem>
                            <SelectItem value="prestacao_servicos_pj">Prestação de Serviços (PJ)</SelectItem>
                            <SelectItem value="aditivo_contratual">Termo Aditivo</SelectItem>
                            <SelectItem value="distrato_servicos">Distrato Contratual</SelectItem>
                            <SelectItem value="nda_confidencialidade">Confidencialidade (NDA)</SelectItem>
                            <SelectItem value="termo_imagem_profissional">Uso de Imagem (Profissional)</SelectItem>
                            <SelectItem value="termo_imagem_menor">Uso de Imagem (Paciente Menor)</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchDocuments}
                        title="Atualizar lista"
                        className="h-9 w-9 text-slate-600 hover:text-slate-900"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Abas e Listagem */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto p-1 bg-slate-100 border border-slate-200 rounded-md">
                    <TabsTrigger value="all" className="text-xs py-2">Todos ({totalDocs})</TabsTrigger>
                    <TabsTrigger value="enviado" className="text-xs py-2">Aguardando</TabsTrigger>
                    <TabsTrigger value="assinado_parcial" className="text-xs py-2">Assinatura Parcial</TabsTrigger>
                    <TabsTrigger value="assinado" className="text-xs py-2">Assinados ({signedDocs})</TabsTrigger>
                    <TabsTrigger value="cancelado" className="text-xs py-2">Cancelados</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    {isLoading ? (
                        <div className="p-12 text-center text-slate-500 bg-white border rounded-lg">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                            <p className="text-sm font-medium">Carregando contratos...</p>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 bg-white border border-dashed rounded-lg">
                            <FileSignature className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                            <h3 className="text-base font-semibold text-slate-800">Nenhum contrato encontrado</h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                                Nenhum documento atende aos filtros selecionados. Crie um novo documento a partir da biblioteca de modelos.
                            </p>
                            <Link href="/dashboard/contratos/novo" className="inline-block mt-4">
                                <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs">
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    Emitir Primeiro Contrato
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {documents.map((doc) => {
                                const signers = doc.contract_signers || []
                                const totalSigners = signers.length
                                const signedCount = signers.filter(s => s.status === 'SIGNED').length

                                return (
                                    <Card key={doc.id} className="hover:border-slate-300 transition-all border-slate-200 shadow-sm">
                                        <CardContent className="p-4 md:p-5">
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                {/* Informações Principais */}
                                                <div className="space-y-1.5 flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                            {doc.document_number}
                                                        </span>
                                                        {renderStatusBadge(doc.status)}
                                                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                                            {CATEGORY_NAMES[doc.category] || doc.category}
                                                        </span>
                                                    </div>

                                                    <h3 className="text-base font-bold text-slate-900 truncate">
                                                        {doc.title}
                                                    </h3>

                                                    {/* Signatários */}
                                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                                                        <span className="font-medium text-slate-700 flex items-center">
                                                            <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                                            Signatários ({signedCount}/{totalSigners}):
                                                        </span>
                                                        {signers.map(s => (
                                                            <span
                                                                key={s.id}
                                                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${
                                                                    s.status === 'SIGNED'
                                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                        : 'bg-slate-50 text-slate-700 border-slate-200'
                                                                }`}
                                                            >
                                                                {s.status === 'SIGNED' ? (
                                                                    <Check className="w-3 h-3 mr-1 text-emerald-600" />
                                                                ) : (
                                                                    <Clock className="w-3 h-3 mr-1 text-amber-500" />
                                                                )}
                                                                {s.name} ({s.role})
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Ações */}
                                                <div className="flex flex-wrap items-center gap-2 self-start lg:self-center border-t lg:border-t-0 pt-3 lg:pt-0">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setShareDoc(doc)}
                                                        className="h-9 text-xs border-slate-300"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                                                        Links de Assinatura
                                                    </Button>

                                                    <Link href={`/api/contracts/${doc.id}/pdf`} target="_blank">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-9 text-xs border-slate-300"
                                                            title="Imprimir contrato com trilha de auditoria"
                                                        >
                                                            <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                                                            Imprimir / PDF
                                                        </Button>
                                                    </Link>

                                                    <Link href={`/dashboard/contratos/${doc.id}`}>
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className="h-9 text-xs bg-slate-800 hover:bg-slate-900 text-white"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                                                            Detalhes & Trilha
                                                        </Button>
                                                    </Link>

                                                    {doc.status !== 'assinado' && doc.status !== 'cancelado' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setDocToCancel(doc)}
                                                            className="h-9 text-xs text-rose-600 hover:bg-rose-50"
                                                            title="Cancelar contrato"
                                                        >
                                                            <Ban className="w-3.5 h-3.5 mr-1" />
                                                            Cancelar
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Modal de Links de Assinatura por Signatário */}
            <Dialog open={!!shareDoc} onOpenChange={(open) => !open && setShareDoc(null)}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900">Links de Assinatura Eletrônica</DialogTitle>
                        <DialogDescription>
                            Envie ou copie o link exclusivo para cada signatário realizar a assinatura no celular ou computador sem necessidade de login.
                        </DialogDescription>
                    </DialogHeader>

                    {shareDoc && (
                        <div className="space-y-4 py-3">
                            <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                                <div className="text-xs font-bold text-slate-800">{shareDoc.title}</div>
                                <div className="text-xs text-slate-500 font-mono">{shareDoc.document_number}</div>
                            </div>

                            <div className="space-y-3">
                                {(shareDoc.contract_signers || []).map((signer) => (
                                    <div
                                        key={signer.id}
                                        className="p-3 border rounded-md border-slate-200 flex flex-col gap-2 bg-white"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-xs font-bold text-slate-900">{signer.name}</span>
                                                <span className="text-xs text-slate-500 ml-2">({signer.role})</span>
                                            </div>
                                            {signer.status === 'SIGNED' ? (
                                                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold border-emerald-300">
                                                    Assinado em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(signer.signed_at!))}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-amber-700 border-amber-300 text-[10px]">
                                                    Pendente
                                                </Badge>
                                            )}
                                        </div>

                                        {signer.status !== 'SIGNED' ? (
                                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs flex-1"
                                                    onClick={() => handleCopyLink(signer.signing_token)}
                                                >
                                                    {copiedToken === signer.signing_token ? (
                                                        <>
                                                            <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                                                            Link Copiado
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-3.5 h-3.5 mr-1.5" />
                                                            Copiar Link
                                                        </>
                                                    )}
                                                </Button>

                                                {signer.email && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 text-xs text-slate-700 hover:bg-slate-100"
                                                        onClick={() => handleResend(shareDoc.id, signer.id, 'EMAIL')}
                                                    >
                                                        <Send className="w-3 h-3 mr-1" />
                                                        E-mail
                                                    </Button>
                                                )}

                                                {signer.phone && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 text-xs text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() => handleResend(shareDoc.id, signer.id, 'WHATSAPP')}
                                                    >
                                                        <Send className="w-3 h-3 mr-1" />
                                                        WhatsApp
                                                    </Button>
                                                )}

                                                <Link href={`/assinar/${signer.signing_token}`} target="_blank">
                                                    <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-600">
                                                        <ArrowRight className="w-3 h-3 mr-1" />
                                                        Abrir
                                                    </Button>
                                                </Link>
                                            </div>
                                        ) : (
                                            <div className="text-[11px] text-slate-500">
                                                Assinatura registrada com sucesso no protocolo com carimbo de tempo probatório.
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShareDoc(null)} className="h-9 text-xs">
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Confirmação de Cancelamento */}
            <Dialog open={!!docToCancel} onOpenChange={(open) => !open && setDocToCancel(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-rose-600" />
                            Confirmar Cancelamento de Contrato
                        </DialogTitle>
                        <DialogDescription className="text-slate-600 pt-2">
                            Tem certeza que deseja cancelar o contrato <strong>{docToCancel?.document_number}</strong> ({docToCancel?.title})?
                            <br /><br />
                            Esta ação invalidará os links de assinatura pendentes e registrará um evento inalterável na trilha probatória de auditoria.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDocToCancel(null)}
                            disabled={isCancelling}
                            className="h-9 text-xs"
                        >
                            Voltar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmCancel}
                            disabled={isCancelling}
                            className="h-9 text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium"
                        >
                            {isCancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
