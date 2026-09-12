'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    Eye,
    Ban,
    AlertTriangle,
    Copy,
    Check,
    Send,
    Printer,
    Users,
    ShieldCheck,
    Lock,
    ExternalLink,
    Calendar,
    Globe,
    FileText
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
    signed_ip?: string
    signed_user_agent?: string
    signature_image_url?: string
    signer_hash?: string
    viewed_at?: string
}

interface AuditEvent {
    id: string
    event_type: string
    ip_address?: string
    user_agent?: string
    details: any
    created_at: string
}

interface ContractData {
    id: string
    document_number: string
    title: string
    category: string
    status: string
    rendered_content: string
    final_document_hash?: string
    expires_at?: string
    created_at: string
}

export default function DetalhesContratoPage() {
    const params = useParams()
    const router = useRouter()
    const contractId = params?.id as string

    const [contract, setContract] = useState<ContractData | null>(null)
    const [signers, setSigners] = useState<Signer[]>([])
    const [events, setEvents] = useState<AuditEvent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isUnauthorized, setIsUnauthorized] = useState(false)

    const [copiedToken, setCopiedToken] = useState<string | null>(null)
    const [isCancelling, setIsCancelling] = useState(false)
    const [showCancelDialog, setShowCancelDialog] = useState(false)

    const fetchContractDetails = useCallback(async () => {
        if (!contractId) return
        setIsLoading(true)
        try {
            const res = await fetch(`/api/contracts/${contractId}`)
            if (res.status === 403) {
                setIsUnauthorized(true)
                return
            }
            if (!res.ok) throw new Error('Falha ao carregar contrato')
            const json = await res.json()
            setContract(json.document)
            setSigners(json.signers || [])
            setEvents(json.events || [])
        } catch (err: any) {
            toast.error('Erro ao carregar detalhes do documento.')
        } finally {
            setIsLoading(false)
        }
    }, [contractId])

    useEffect(() => {
        fetchContractDetails()
    }, [fetchContractDetails])

    const handleCopyLink = (token: string) => {
        const url = `${window.location.origin}/assinar/${token}`
        navigator.clipboard.writeText(url)
        setCopiedToken(token)
        toast.success('Link copiado para a área de transferência.')
        setTimeout(() => setCopiedToken(null), 3000)
    }

    const handleResend = async (signerId: string, channel: 'EMAIL' | 'WHATSAPP') => {
        try {
            const res = await fetch(`/api/contracts/${contractId}/resend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signer_id: signerId, channel })
            })
            if (!res.ok) throw new Error('Falha ao reenviar notificação')
            toast.success(`Notificação reenviada via ${channel === 'WHATSAPP' ? 'WhatsApp' : 'E-mail'}.`)
            fetchContractDetails()
        } catch (err) {
            toast.error('Erro ao reenviar notificação.')
        }
    }

    const handleCancelContract = async () => {
        try {
            setIsCancelling(true)
            const res = await fetch(`/api/contracts/${contractId}`, {
                method: 'DELETE'
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Falha ao cancelar')
            }
            toast.success('Contrato cancelado com sucesso.')
            setShowCancelDialog(false)
            fetchContractDetails()
        } catch (err: any) {
            toast.error(err.message || 'Erro ao cancelar.')
        } finally {
            setIsCancelling(false)
        }
    }

    const formatDate = (iso?: string) => {
        if (!iso) return '-'
        try {
            return new Intl.DateTimeFormat('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'medium',
                timeZone: 'America/Sao_Paulo'
            }).format(new Date(iso))
        } catch {
            return iso
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
                    A visualização deste documento está restrita à clínica autorizada (World Sensory).
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

    if (isLoading) {
        return (
            <div className="flex-1 p-8 text-center text-slate-500">
                Carregando detalhes do contrato...
            </div>
        )
    }

    if (!contract) {
        return (
            <div className="flex-1 p-8 text-center text-slate-500">
                Documento não encontrado.
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-6xl mx-auto w-full">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/contratos">
                        <Button variant="outline" size="icon" className="h-9 w-9 border-slate-300">
                            <ArrowLeft className="w-4 h-4 text-slate-700" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {contract.document_number}
                            </span>
                            <Badge variant="outline" className="text-xs font-medium">
                                {contract.status.toUpperCase()}
                            </Badge>
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
                            {contract.title}
                        </h1>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/api/contracts/${contract.id}/pdf`} target="_blank">
                        <Button variant="outline" className="h-9 text-xs border-slate-300">
                            <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                            Imprimir / Folha Probatória
                        </Button>
                    </Link>

                    {contract.status !== 'assinado' && contract.status !== 'cancelado' && (
                        <Button
                            variant="outline"
                            onClick={() => setShowCancelDialog(true)}
                            className="h-9 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                            <Ban className="w-3.5 h-3.5 mr-1.5" />
                            Cancelar Contrato
                        </Button>
                    )}
                </div>
            </div>

            {/* Hash de Integridade Final se estiver assinado */}
            {contract.final_document_hash && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                        <div className="text-xs font-bold text-emerald-900">
                            Documento Totalmente Assinado com Integridade Jurídica Verificada
                        </div>
                        <div className="text-xs text-emerald-800 mt-0.5">
                            Hash Criptográfico Geral SHA-256 consolidado:
                        </div>
                        <div className="font-mono text-[11px] text-emerald-950 bg-emerald-100/70 p-1.5 rounded mt-1 break-all">
                            {contract.final_document_hash}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna Principal: Texto Integral do Contrato */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50 border-b pb-3">
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-500" />
                                Texto do Instrumento Contratual
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="p-4 bg-white border rounded whitespace-pre-wrap font-serif text-xs leading-relaxed text-slate-800 max-h-[550px] overflow-y-auto">
                                {contract.rendered_content}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Trilha de Auditoria Probatória */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50 border-b pb-3">
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-slate-500" />
                                    Trilha de Auditoria Probatória (MP 2.200-2/2001)
                                </span>
                                <span className="text-xs font-normal text-slate-500">
                                    {events.length} eventos registrados
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="space-y-3">
                                {events.map((ev) => (
                                    <div key={ev.id} className="p-2.5 border-l-2 border-emerald-600 bg-slate-50 rounded-r text-xs space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-800">{ev.event_type}</span>
                                            <span className="text-[11px] text-slate-500">{formatDate(ev.created_at)}</span>
                                        </div>
                                        <div className="text-[11px] text-slate-600">
                                            IP: <code className="font-mono">{ev.ip_address || '127.0.0.1'}</code>
                                            {ev.user_agent && (
                                                <span className="ml-2 text-slate-500">({ev.user_agent.slice(0, 45)}...)</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Coluna Lateral: Status por Signatário */}
                <div className="space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-500" />
                                Signatários ({signers.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {signers.map((s, idx) => (
                                <div key={s.id} className="p-3.5 border rounded-lg bg-white border-slate-200 space-y-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="text-xs font-bold text-slate-900">{s.name}</div>
                                            <div className="text-[11px] text-emerald-800 font-semibold uppercase">{s.role}</div>
                                        </div>
                                        {s.status === 'SIGNED' ? (
                                            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                                                Assinado
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-amber-700 border-amber-300 text-[10px]">
                                                {s.status === 'VIEWED' ? 'Visualizado' : 'Aguardando'}
                                            </Badge>
                                        )}
                                    </div>

                                    {s.document_tax_id && (
                                        <div className="text-xs text-slate-600">
                                            Documento: <span className="font-mono">{s.document_tax_id}</span>
                                        </div>
                                    )}

                                    {s.status === 'SIGNED' ? (
                                        <div className="space-y-1.5 pt-1 border-t text-[11px] text-slate-600">
                                            <div>Data/Hora: <strong>{formatDate(s.signed_at)}</strong></div>
                                            <div>IP: <code className="font-mono text-[10px]">{s.signed_ip}</code></div>
                                            {s.signature_image_url && (
                                                <div className="mt-1">
                                                    <div className="text-[10px] text-slate-500">Traço Manuscrito:</div>
                                                    <img src={s.signature_image_url} alt="Assinatura" className="max-h-12 border p-1 rounded bg-white mt-0.5" />
                                                </div>
                                            )}
                                            {s.signer_hash && (
                                                <div className="mt-1">
                                                    <div className="text-[10px] text-slate-500">Hash de Autoria:</div>
                                                    <div className="font-mono text-[9px] bg-slate-100 p-1 rounded break-all">
                                                        {s.signer_hash}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-2 pt-2 border-t">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleCopyLink(s.signing_token)}
                                                className="w-full h-8 text-xs border-slate-300"
                                            >
                                                {copiedToken === s.signing_token ? (
                                                    <>
                                                        <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                                        Link Copiado
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3.5 h-3.5 mr-1" />
                                                        Copiar Link de Assinatura
                                                    </>
                                                )}
                                            </Button>

                                            <div className="flex gap-1.5">
                                                {s.email && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleResend(s.id, 'EMAIL')}
                                                        className="flex-1 h-7 text-[11px] text-slate-700 hover:bg-slate-100"
                                                    >
                                                        <Send className="w-3 h-3 mr-1" />
                                                        E-mail
                                                    </Button>
                                                )}
                                                {s.phone && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleResend(s.id, 'WHATSAPP')}
                                                        className="flex-1 h-7 text-[11px] text-emerald-700 hover:bg-emerald-50"
                                                    >
                                                        <Send className="w-3 h-3 mr-1" />
                                                        WhatsApp
                                                    </Button>
                                                )}
                                                <Link href={`/assinar/${s.signing_token}`} target="_blank" className="flex-1">
                                                    <Button size="sm" variant="ghost" className="w-full h-7 text-[11px] text-slate-600">
                                                        <ExternalLink className="w-3 h-3 mr-1" />
                                                        Abrir
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modal de Confirmação de Cancelamento */}
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-rose-600" />
                            Confirmar Cancelamento de Contrato
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-slate-600">
                            Tem certeza que deseja cancelar o contrato <strong>{contract.document_number}</strong>?
                            <br /><br />
                            Todos os links de assinatura pendentes serão invalidados e o cancelamento ficará registrado na trilha probatória.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={isCancelling} className="h-9 text-xs">
                            Voltar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancelContract}
                            disabled={isCancelling}
                            className="h-9 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            {isCancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
