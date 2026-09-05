'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
    CheckCircle2,
    Clock,
    Share2,
    Copy,
    MessageCircle,
    Eye,
    Printer,
    ShieldCheck,
    Check,
    ExternalLink,
    AlertCircle,
    RefreshCw,
    Trash2,
    PenTool,
    Shield,
} from 'lucide-react'
import { toast } from 'sonner'

interface DoctorSignaturesTabProps {
    doctorId: string
    doctorName?: string
    doctor?: any
}

interface SignatureItem {
    id: string
    title: string
    category: string
    document_content: string
    signer_name: string
    signer_cpf?: string
    signer_phone?: string
    signer_email?: string
    professional_council?: string
    professional_specialty?: string
    status: 'PENDING' | 'SIGNED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED'
    signing_token: string
    signature_data_url?: string
    signed_at?: string
    signed_ip?: string
    signed_user_agent?: string
    security_hash?: string
    created_at: string
}

export function DoctorSignaturesTab({ doctorId, doctorName, doctor }: DoctorSignaturesTabProps) {
    const queryClient = useQueryClient()

    const [isEmitModalOpen, setIsEmitModalOpen] = useState(false)
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
    const [documentTitle, setDocumentTitle] = useState('')
    const [documentCategory, setDocumentCategory] = useState('contrato_equipe')
    const [signerName, setSignerName] = useState(doctorName || doctor?.user?.full_name || '')
    const [signerCpf, setSignerCpf] = useState(doctor?.user?.cpf || '')
    const [signerPhone, setSignerPhone] = useState(doctor?.user?.phone || '')
    const [signerEmail, setSignerEmail] = useState(doctor?.user?.email || '')
    const [customContent, setCustomContent] = useState('')

    // Modal de Sucesso após emitir
    const [emittedResult, setEmittedResult] = useState<any | null>(null)
    const [viewingDoc, setViewingDoc] = useState<SignatureItem | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [copiedToken, setCopiedToken] = useState(false)

    // 1. Fetch Signatures do Profissional
    const { data: sigData, isLoading: isSigLoading, refetch } = useQuery<{ signatures: SignatureItem[] }>({
        queryKey: ['professional-signatures', doctorId],
        queryFn: async () => {
            const res = await fetch(`/api/professional-signatures?doctor_id=${doctorId}`)
            if (!res.ok) throw new Error('Falha ao carregar contratos do profissional')
            return res.json()
        },
        enabled: Boolean(doctorId),
    })

    const signatures = sigData?.signatures || []

    // 2. Fetch Templates da Clínica
    const { data: tmplData } = useQuery<{ templates: any[] }>({
        queryKey: ['clinic-document-templates'],
        queryFn: async () => {
            const res = await fetch('/api/document-templates')
            if (!res.ok) return { templates: [] }
            return res.json()
        },
    })

    // Filtra templates pertinentes para equipe (contrato_equipe, termo_imagem_profissional, termo_sigilo_equipe, aditivo_contratual)
    const allTemplates = tmplData?.templates || []
    const teamTemplates = allTemplates.filter((t) =>
        ['contrato_equipe', 'termo_imagem_profissional', 'termo_sigilo_equipe', 'aditivo_contratual'].includes(t.category)
    )
    const templatesToUse = teamTemplates.length > 0 ? teamTemplates : allTemplates

    const openEmitModal = () => {
        const defaultTmpl = templatesToUse[0]
        setSelectedTemplateId(defaultTmpl?.id || '')
        setDocumentTitle(defaultTmpl?.title || 'Contrato de Prestação de Serviços')
        setDocumentCategory(defaultTmpl?.category || 'contrato_equipe')
        setSignerName(doctorName || doctor?.user?.full_name || '')
        setSignerCpf(doctor?.user?.cpf || '')
        setSignerPhone(doctor?.user?.phone || '')
        setSignerEmail(doctor?.user?.email || '')
        setCustomContent('')
        setIsEmitModalOpen(true)
    }

    const handleTemplateChange = (templateId: string) => {
        setSelectedTemplateId(templateId)
        const tmpl = allTemplates.find((t) => t.id === templateId)
        if (tmpl) {
            setDocumentTitle(tmpl.title)
            setDocumentCategory(tmpl.category)
        }
    }

    // 3. Emitir Contrato / Termo
    const emitMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                doctor_id: doctorId,
                template_id: selectedTemplateId || null,
                title: documentTitle,
                category: documentCategory,
                signer_name: signerName.trim() || doctorName,
                signer_cpf: signerCpf.trim(),
                signer_phone: signerPhone.trim(),
                signer_email: signerEmail.trim(),
                raw_content: customContent.trim() || undefined,
            }

            const res = await fetch('/api/professional-signatures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao emitir contrato')
            }

            return res.json()
        },
        onSuccess: (data) => {
            toast.success('Contrato emitido com sucesso! O link para assinatura foi gerado.')
            setIsEmitModalOpen(false)
            setEmittedResult(data)
            queryClient.invalidateQueries({ queryKey: ['professional-signatures', doctorId] })
        },
        onError: (err: any) => {
            toast.error(err.message || 'Falha ao emitir contrato')
        },
    })

    // 4. Excluir / Cancelar termo pendente
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/professional-signatures?id=${id}`, {
                method: 'DELETE',
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao cancelar documento')
            }
            return res.json()
        },
        onSuccess: () => {
            toast.success('Documento cancelado com sucesso')
            setDeletingId(null)
            queryClient.invalidateQueries({ queryKey: ['professional-signatures', doctorId] })
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao cancelar')
            setDeletingId(null)
        },
    })

    const getFullSigningUrl = (token: string) => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/assinar/${token}`
        }
        return `https://clinigo.app/assinar/${token}`
    }

    const copyLink = (token: string) => {
        const url = getFullSigningUrl(token)
        navigator.clipboard.writeText(url)
        setCopiedToken(true)
        setTimeout(() => setCopiedToken(false), 2000)
        toast.success('Link seguro copiado para a área de transferência!')
    }

    const sendWhatsApp = (sig: SignatureItem) => {
        const url = getFullSigningUrl(sig.signing_token)
        const phone = sig.signer_phone?.replace(/\D/g, '') || doctor?.user?.phone?.replace(/\D/g, '')
        const profName = sig.signer_name || doctorName || 'Profissional'
        const text = encodeURIComponent(
            `Olá, ${profName}! Bem-vindo(a) à nossa equipe! 🩺\n\n` +
            `Segue o link seguro para leitura e assinatura eletrônica do seu documento:\n` +
            `📄 *${sig.title}*\n\n` +
            `👉 Toque no link abaixo para revisar e assinar com o dedo na tela do seu celular:\n${url}\n\n` +
            `Ambiente criptografado e seguro com validade jurídica (MP 2.200-2/2001 e Lei 14.063/2020).`
        )

        if (phone && phone.length >= 10) {
            window.open(`https://wa.me/55${phone}?text=${text}`, '_blank')
        } else {
            window.open(`https://wa.me/?text=${text}`, '_blank')
        }
    }

    const openDirectSigning = (token: string) => {
        const url = getFullSigningUrl(token)
        window.open(url, '_blank')
    }

    return (
        <div className="space-y-4">
            {/* Header da Aba */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-2xs">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-foreground">
                            Contratos & Termos do Profissional
                        </h2>
                        <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300/60">
                            Equipe & Corpo Clínico
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Emita contratos de prestação de serviços (PJ/Autônomo), termos de cessão de imagem e sigilo LGPD com assinatura digital pelo celular ou tablet.
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        className="h-10 min-h-[44px] sm:h-9 text-xs gap-1.5 px-3"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Atualizar</span>
                    </Button>

                    <Button
                        onClick={openEmitModal}
                        className="h-10 min-h-[44px] sm:h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs flex-1 sm:flex-initial"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Emitir Novo Contrato / Termo</span>
                    </Button>
                </div>
            </div>

            {/* Banner de Validade Jurídica */}
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-start gap-3 text-xs">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                    <strong className="text-emerald-900 dark:text-emerald-300 block text-xs font-semibold">
                        Validade Jurídica Assegurada (MP 2.200-2/2001 e Lei 14.063/2020)
                    </strong>
                    <span className="text-emerald-800/90 dark:text-emerald-400 text-[11px] leading-relaxed">
                        Ao encaminhar qualquer um destes contratos ao profissional via link seguro ou abri-lo no tablet da recepção na entrada, o CliniGO colhe a assinatura touch com o dedo na tela, carimbo de data/hora, endereço IP e Hash SHA-256 criptográfico com força probatória plena.
                    </span>
                </div>
            </div>

            {/* Listagem de Documentos */}
            {isSigLoading ? (
                <Card className="border-border">
                    <CardContent className="p-8 text-center text-xs text-muted-foreground">
                        Carregando contratos e termos do profissional...
                    </CardContent>
                </Card>
            ) : signatures.length === 0 ? (
                <Card className="border-border/80 border-dashed">
                    <CardContent className="p-8 sm:p-10 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-foreground">
                                Nenhum contrato ou termo emitido ainda
                            </h4>
                            <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                Clique no botão <strong>&quot;Emitir Novo Contrato / Termo&quot;</strong> acima para gerar o Contrato de Prestação de Serviços, Termo de Imagem ou Termo de Sigilo para este profissional.
                            </p>
                        </div>
                        <Button
                            onClick={openEmitModal}
                            size="sm"
                            className="h-10 min-h-[44px] text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Emitir Primeiro Contrato
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {signatures.map((sig) => {
                        const isSigned = sig.status === 'SIGNED'
                        const isPending = sig.status === 'PENDING'

                        return (
                            <Card
                                key={sig.id}
                                className={`border transition-all ${
                                    isSigned
                                        ? 'border-emerald-200/80 dark:border-emerald-900/40 bg-card'
                                        : 'border-amber-200/80 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10'
                                }`}
                            >
                                <CardContent className="p-4 sm:p-5">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold text-sm text-foreground">
                                                    {sig.title}
                                                </h3>

                                                {isSigned ? (
                                                    <Badge className="bg-emerald-600 text-white text-[10px] font-semibold gap-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Assinado Eletronicamente
                                                    </Badge>
                                                ) : isPending ? (
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 text-[10px] font-medium gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Aguardando Assinatura
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {sig.status}
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-x-4 gap-y-1 text-xs text-muted-foreground flex-wrap">
                                                <span>
                                                    Profissional: <strong className="text-foreground">{sig.signer_name}</strong>
                                                </span>
                                                {sig.signer_cpf && sig.signer_cpf !== 'Não informado' && (
                                                    <span>CPF: <strong className="text-foreground">{sig.signer_cpf}</strong></span>
                                                )}
                                                {sig.professional_specialty && (
                                                    <span>Esp: <strong className="text-foreground">{sig.professional_specialty}</strong></span>
                                                )}
                                                <span>Emitido em: {new Date(sig.created_at).toLocaleDateString('pt-BR')}</span>
                                            </div>

                                            {isSigned && sig.signed_at && (
                                                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium pt-1 flex items-center gap-1.5">
                                                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                                    <span>
                                                        Assinado em {new Date(sig.signed_at).toLocaleString('pt-BR')} • IP: {sig.signed_ip || 'Registrado'} • Hash SHA-256 verificado
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Ações do Card */}
                                        <div className="flex items-center gap-2 flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-border/60">
                                            {isSigned ? (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setViewingDoc(sig)}
                                                        className="h-9 min-h-[44px] sm:min-h-0 text-xs gap-1.5 font-medium"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 text-primary" />
                                                        <span>Ver Certificado</span>
                                                    </Button>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setViewingDoc(sig)
                                                            setTimeout(() => window.print(), 300)
                                                        }}
                                                        className="h-9 min-h-[44px] sm:min-h-0 text-xs gap-1.5 font-medium"
                                                    >
                                                        <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <span className="hidden sm:inline">Imprimir PDF</span>
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    {/* Opção Onboarding: Assinar Agora na tela da recepção/tablet */}
                                                    <Button
                                                        size="sm"
                                                        onClick={() => openDirectSigning(sig.signing_token)}
                                                        className="h-9 min-h-[44px] sm:min-h-0 text-xs gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium"
                                                        title="Abrir formulário de assinatura com o dedo neste dispositivo"
                                                    >
                                                        <PenTool className="w-3.5 h-3.5 text-emerald-400" />
                                                        <span>Assinar no Dispositivo</span>
                                                    </Button>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => copyLink(sig.signing_token)}
                                                        className="h-9 min-h-[44px] sm:min-h-0 text-xs gap-1.5"
                                                    >
                                                        {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                        <span>Copiar Link</span>
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        onClick={() => sendWhatsApp(sig)}
                                                        className="h-9 min-h-[44px] sm:min-h-0 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                        <span>WhatsApp</span>
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeletingId(sig.id)}
                                                        className="h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 text-muted-foreground hover:text-destructive"
                                                        title="Cancelar documento"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Modal de Emissão de Contrato / Termo */}
            <Dialog open={isEmitModalOpen} onOpenChange={setIsEmitModalOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                            <Shield className="w-4 h-4 text-emerald-600" />
                            Emitir Contrato / Termo para o Profissional
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Selecione o modelo contratual ou termo de admissão. O CliniGO preencherá as tags com dados cadastrais e financeiros automaticamente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 text-xs">
                        {/* Seletor de Modelo */}
                        <div className="space-y-1.5">
                            <Label htmlFor="template_select" className="text-xs font-semibold">Modelo de Documento *</Label>
                            <Select
                                value={selectedTemplateId}
                                onValueChange={handleTemplateChange}
                            >
                                <SelectTrigger id="template_select" className="h-10 min-h-[44px] text-xs">
                                    <SelectValue placeholder="Selecione um modelo da clínica" />
                                </SelectTrigger>
                                <SelectContent>
                                    {templatesToUse.map((t) => (
                                        <SelectItem key={t.id} value={t.id} className="text-xs">
                                            {t.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Título do Documento */}
                        <div className="space-y-1.5">
                            <Label htmlFor="doc_title" className="text-xs font-semibold">Título do Documento *</Label>
                            <Input
                                id="doc_title"
                                value={documentTitle}
                                onChange={(e) => setDocumentTitle(e.target.value)}
                                placeholder="Ex: Contrato de Prestação de Serviços (PJ/Autônomo)"
                                className="h-10 min-h-[44px] text-xs"
                            />
                        </div>

                        {/* Dados do Profissional / Signatário */}
                        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-3">
                            <p className="font-semibold text-foreground text-xs uppercase tracking-wider">
                                Dados Cadastrais do Signatário
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="signer_name" className="text-[11px]">Nome Completo *</Label>
                                    <Input
                                        id="signer_name"
                                        value={signerName}
                                        onChange={(e) => setSignerName(e.target.value)}
                                        className="h-9 min-h-[44px] text-xs"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="signer_cpf" className="text-[11px]">CPF do Profissional</Label>
                                    <Input
                                        id="signer_cpf"
                                        value={signerCpf}
                                        onChange={(e) => setSignerCpf(e.target.value)}
                                        placeholder="000.000.000-00"
                                        className="h-9 min-h-[44px] text-xs font-mono"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="signer_phone" className="text-[11px]">Telefone / WhatsApp</Label>
                                    <Input
                                        id="signer_phone"
                                        value={signerPhone}
                                        onChange={(e) => setSignerPhone(e.target.value)}
                                        placeholder="(00) 00000-0000"
                                        className="h-9 min-h-[44px] text-xs"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="signer_email" className="text-[11px]">E-mail Profissional</Label>
                                    <Input
                                        id="signer_email"
                                        type="email"
                                        value={signerEmail}
                                        onChange={(e) => setSignerEmail(e.target.value)}
                                        placeholder="terapeuta@email.com"
                                        className="h-9 min-h-[44px] text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Conteúdo Customizado (Opcional) */}
                        <div className="space-y-1.5">
                            <Label htmlFor="custom_content" className="text-xs font-semibold">
                                Cláusulas Específicas / Conteúdo Adicional (Opcional)
                            </Label>
                            <Textarea
                                id="custom_content"
                                value={customContent}
                                onChange={(e) => setCustomContent(e.target.value)}
                                placeholder="Deixe em branco para usar o texto padrão do modelo com todas as cláusulas e repasses automáticos..."
                                rows={3}
                                className="text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
                        <Button
                            variant="outline"
                            onClick={() => setIsEmitModalOpen(false)}
                            className="h-10 min-h-[44px] text-xs"
                        >
                            Cancelar
                        </Button>

                        <Button
                            onClick={() => emitMutation.mutate()}
                            disabled={emitMutation.isPending || !documentTitle.trim()}
                            className="h-10 min-h-[44px] text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                        >
                            <ShieldCheck className="w-4 h-4" />
                            {emitMutation.isPending ? 'Gerando Documento...' : 'Gerar e Emitir Contrato'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Sucesso após Emissão: Compartilhar Link */}
            <Dialog open={!!emittedResult} onOpenChange={(open) => !open && setEmittedResult(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <DialogTitle className="text-base font-bold text-center">
                            Link Contratual Gerado com Sucesso!
                        </DialogTitle>
                        <DialogDescription className="text-xs text-center">
                            O documento está pronto para assinatura digital pelo celular ou presencialmente no tablet da clínica.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 text-xs">
                        <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-1.5">
                            <Label className="text-[11px] font-bold text-muted-foreground">Link Seguro de Assinatura:</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    readOnly
                                    value={emittedResult ? getFullSigningUrl(emittedResult.signature.signing_token) : ''}
                                    className="h-9 text-xs font-mono bg-background"
                                />
                                <Button
                                    size="sm"
                                    onClick={() => emittedResult && copyLink(emittedResult.signature.signing_token)}
                                    className="h-9 px-2.5 shrink-0 text-xs min-h-[44px]"
                                >
                                    <Copy className="w-3.5 h-3.5 mr-1" />
                                    Copiar
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {/* Assinar agora na recepção */}
                            <Button
                                onClick={() => {
                                    if (emittedResult) {
                                        openDirectSigning(emittedResult.signature.signing_token)
                                    }
                                }}
                                className="w-full h-11 min-h-[44px] text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white shadow-xs gap-2"
                            >
                                <PenTool className="w-4 h-4 text-emerald-400" />
                                Assinar Agora neste Dispositivo (Tablet/Recepção)
                            </Button>

                            <Button
                                onClick={() => emittedResult && sendWhatsApp(emittedResult.signature)}
                                className="w-full h-11 min-h-[44px] text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-2"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Enviar Link pelo WhatsApp do Profissional
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => setEmittedResult(null)}
                                className="w-full h-9 min-h-[44px] text-xs"
                            >
                                Concluir
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de Confirmação de Exclusão */}
            <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                            Cancelar Documento
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Tem certeza de que deseja cancelar este termo de assinatura pendente? Esta ação não poderá ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingId(null)}
                            className="h-9 min-h-[44px]"
                        >
                            Voltar
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deletingId && deleteMutation.mutate(deletingId)}
                            disabled={deleteMutation.isPending}
                            className="h-9 min-h-[44px]"
                        >
                            {deleteMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Visualização do Documento Assinado */}
            <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="pb-3 border-b border-border">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <DialogTitle className="text-base font-bold text-foreground">
                                    {viewingDoc?.title}
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    Contrato formal assinado eletronicamente com validade jurídica assegurada.
                                </DialogDescription>
                            </div>
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold gap-1 shrink-0">
                                <CheckCircle2 className="w-3 h-3" />
                                Assinado
                            </Badge>
                        </div>
                    </DialogHeader>

                    <div className="space-y-5 py-3 text-xs">
                        {/* Texto do Documento */}
                        <div className="p-4 rounded-xl border border-border bg-muted/10 max-h-[300px] overflow-y-auto font-sans leading-relaxed whitespace-pre-wrap select-text text-foreground/90">
                            {viewingDoc?.document_content}
                        </div>

                        {/* Certificado e Rubrica */}
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/80 space-y-3">
                            <h4 className="font-bold text-foreground uppercase tracking-wider text-xs flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                Registro de Autenticidade e Auditoria
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                    <p className="text-muted-foreground text-[11px]">Signatário / Profissional</p>
                                    <p className="font-semibold text-foreground">{viewingDoc?.signer_name}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-[11px]">CPF Registrado</p>
                                    <p className="font-semibold text-foreground">{viewingDoc?.signer_cpf || 'Não informado'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-[11px]">Data e Hora da Assinatura</p>
                                    <p className="font-semibold text-foreground">
                                        {viewingDoc?.signed_at ? new Date(viewingDoc.signed_at).toLocaleString('pt-BR') : '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-[11px]">Endereço IP Registrado</p>
                                    <p className="font-semibold text-foreground">{viewingDoc?.signed_ip || '-'}</p>
                                </div>
                            </div>

                            {viewingDoc?.security_hash && (
                                <div className="pt-2 border-t border-border/60">
                                    <p className="text-muted-foreground text-[11px]">Hash Criptográfico SHA-256 (Prova de Integridade)</p>
                                    <code className="text-[10px] font-mono break-all block mt-0.5 text-foreground bg-background p-1.5 rounded border border-border">
                                        {viewingDoc.security_hash}
                                    </code>
                                </div>
                            )}

                            {viewingDoc?.signature_data_url && (
                                <div className="pt-2 border-t border-border/60">
                                    <p className="text-muted-foreground text-[11px] mb-1">Rubrica Capturada</p>
                                    <div className="p-2 bg-background rounded-md border border-border inline-block">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={viewingDoc.signature_data_url}
                                            alt="Rubrica Digital"
                                            className="max-h-16 object-contain"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => window.print()}
                            className="h-10 min-h-[44px] sm:h-9 text-xs gap-1.5 font-semibold"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            Imprimir / Salvar PDF
                        </Button>
                        <Button
                            variant="default"
                            onClick={() => setViewingDoc(null)}
                            className="h-10 min-h-[44px] sm:h-9 text-xs"
                        >
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
