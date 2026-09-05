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
} from 'lucide-react'
import { toast } from 'sonner'

interface PatientSignaturesTabProps {
    patient: {
        id: string
        full_name: string
        cpf?: string
        phone?: string
        email?: string
        date_of_birth?: string
        insurance_holder_name?: string
        insurance_holder_cpf?: string
    }
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
    status: 'PENDING' | 'SIGNED' | 'REJECTED' | 'EXPIRED'
    signing_token: string
    signature_data_url?: string
    signed_at?: string
    signed_ip?: string
    signed_user_agent?: string
    security_hash?: string
    created_at: string
}

export function PatientSignaturesTab({ patient }: PatientSignaturesTabProps) {
    const queryClient = useQueryClient()

    const [isEmitModalOpen, setIsEmitModalOpen] = useState(false)
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
    const [documentTitle, setDocumentTitle] = useState('')
    const [signerName, setSignerName] = useState(patient.insurance_holder_name || '')
    const [signerCpf, setSignerCpf] = useState(patient.insurance_holder_cpf || '')
    const [signerPhone, setSignerPhone] = useState(patient.phone || '')
    const [customContent, setCustomContent] = useState('')

    // Modal de Sucesso após emitir
    const [emittedResult, setEmittedResult] = useState<any | null>(null)
    const [viewingDoc, setViewingDoc] = useState<SignatureItem | null>(null)
    const [copiedToken, setCopiedToken] = useState(false)

    // 1. Fetch Signatures do Paciente
    const { data: sigData, isLoading: isSigLoading } = useQuery<{ signatures: SignatureItem[] }>({
        queryKey: ['patient-signatures', patient.id],
        queryFn: async () => {
            const res = await fetch(`/api/patient-signatures?patient_id=${patient.id}`)
            if (!res.ok) throw new Error('Falha ao carregar termos')
            return res.json()
        },
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

    const templates = tmplData?.templates || []

    const openEmitModal = () => {
        setSelectedTemplateId(templates[0]?.id || '')
        setDocumentTitle(templates[0]?.title || 'Termo de Aceite')
        setSignerName(patient.insurance_holder_name || '')
        setSignerCpf(patient.insurance_holder_cpf || '')
        setSignerPhone(patient.phone || '')
        setCustomContent('')
        setIsEmitModalOpen(true)
    }

    const handleTemplateChange = (templateId: string) => {
        setSelectedTemplateId(templateId)
        const tmpl = templates.find((t) => t.id === templateId)
        if (tmpl) {
            setDocumentTitle(tmpl.title)
        }
    }

    // 3. Emitir Termo
    const emitMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                patient_id: patient.id,
                template_id: selectedTemplateId || null,
                title: documentTitle,
                signer_name: signerName.trim() || patient.full_name,
                signer_cpf: signerCpf.trim(),
                signer_phone: signerPhone.trim(),
                raw_content: customContent.trim() || undefined,
            }

            const res = await fetch('/api/patient-signatures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao emitir termo')
            }

            return res.json()
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['patient-signatures', patient.id] })
            toast.success('Termo gerado com sucesso!')
            setIsEmitModalOpen(false)
            setEmittedResult(data)
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao emitir termo')
        },
    })

    const getFullSigningUrl = (token: string) => {
        if (typeof window === 'undefined') return `/assinar/${token}`
        return `${window.location.origin}/assinar/${token}`
    }

    const copyLink = (token: string) => {
        const url = getFullSigningUrl(token)
        navigator.clipboard.writeText(url)
        setCopiedToken(true)
        setTimeout(() => setCopiedToken(false), 2000)
        toast.success('Link de assinatura copiado para a área de transferência!')
    }

    const sendWhatsApp = (item: SignatureItem) => {
        const phone = (item.signer_phone || patient.phone || '').replace(/\D/g, '')
        const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`
        const signingUrl = getFullSigningUrl(item.signing_token)
        const firstName = item.signer_name.split(' ')[0] || 'Responsável'

        const message = `Olá ${firstName}! A clínica encaminhou o documento "${item.title}" referente ao(à) paciente ${patient.full_name} para sua leitura e assinatura digital.\n\nVocê pode assinar pelo próprio celular através deste link seguro:\n${signingUrl}\n\nÉ rápido e tem plena validade jurídica.`

        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    return (
        <div className="space-y-6">
            {/* Header da Aba */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-border/80 bg-card shadow-xs">
                <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        Contratos & Termos de Aceite dos Pais
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Envie documentos para assinatura digital dos responsáveis via link seguro com validade jurídica (Lei 14.063/2020).
                    </p>
                </div>

                <Button
                    onClick={openEmitModal}
                    className="h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5 shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    <span>+ Emitir Novo Termo / Contrato</span>
                </Button>
            </div>

            {/* Lista de Termos Emitidos */}
            <div className="space-y-3">
                {isSigLoading ? (
                    <div className="space-y-2">
                        <div className="h-16 bg-muted rounded-xl animate-pulse" />
                        <div className="h-16 bg-muted rounded-xl animate-pulse" />
                    </div>
                ) : signatures.length === 0 ? (
                    <Card className="border-dashed border-border/80 p-8 text-center space-y-4 bg-muted/10">
                        <ShieldCheck className="w-12 h-12 mx-auto text-emerald-600/70" />
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-foreground">
                                Nenhum contrato ou termo emitido para este paciente ainda.
                            </p>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                Selecione um modelo da clínica (ex: Normas Internas, Uso de Imagem, Contrato Terapêutico) e gere o link para os pais assinarem digitalmente pelo celular.
                            </p>
                        </div>
                        <Button
                            onClick={openEmitModal}
                            className="h-10 px-5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-2 mx-auto"
                        >
                            <Plus className="w-4 h-4" />
                            <span>+ Emitir Novo Termo / Contrato</span>
                        </Button>
                    </Card>
                ) : (
                    signatures.map((sig) => {
                        const isSigned = sig.status === 'SIGNED'

                        return (
                            <Card
                                key={sig.id}
                                className={`border transition-all ${
                                    isSigned
                                        ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                                        : 'border-border/80 bg-card hover:border-border'
                                }`}
                            >
                                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-bold text-xs sm:text-sm text-foreground">
                                                {sig.title}
                                            </h4>
                                            {isSigned ? (
                                                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold gap-1">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Assinado Digitalmente
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 text-[10px] font-medium gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Aguardando Assinatura
                                                </Badge>
                                            )}
                                        </div>

                                        <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <span>Responsável: <strong className="text-foreground">{sig.signer_name}</strong></span>
                                            {sig.signer_cpf && <span>• CPF: {sig.signer_cpf}</span>}
                                            {isSigned ? (
                                                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                                    • Assinado em: {new Date(sig.signed_at!).toLocaleString('pt-BR')} (IP: {sig.signed_ip})
                                                </span>
                                            ) : (
                                                <span>• Emitido em: {new Date(sig.created_at).toLocaleDateString('pt-BR')}</span>
                                            )}
                                        </p>
                                    </div>

                                    {/* Ações */}
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        {isSigned ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setViewingDoc(sig)}
                                                className="h-8 gap-1.5 text-xs font-semibold border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Ver Documento</span>
                                            </Button>
                                        ) : (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => copyLink(sig.signing_token)}
                                                    className="h-8 gap-1.5 text-xs font-medium"
                                                    title="Copiar link para enviar aos pais"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                    <span>Copiar Link</span>
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    onClick={() => sendWhatsApp(sig)}
                                                    className="h-8 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                                    title="Enviar link de assinatura pelo WhatsApp"
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                    <span>WhatsApp</span>
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    asChild
                                                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                                    title="Visualizar tela de assinatura"
                                                >
                                                    <a href={`/assinar/${sig.signing_token}`} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>

            {/* Modal de Emissão de Novo Documento */}
            <Dialog open={isEmitModalOpen} onOpenChange={setIsEmitModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-emerald-600" />
                            Emitir Novo Termo / Contrato para Assinatura dos Pais
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Selecione um modelo cadastrado da clínica. O CliniGO irá preencher os dados do paciente automaticamente e gerar o link de assinatura.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3 text-xs">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Modelo de Documento da Clínica *</Label>
                            {templates.length === 0 ? (
                                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
                                    Nenhum modelo cadastrado. Acesse Configurações → Modelos de Documentos para criar.
                                </p>
                            ) : (
                                <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Selecione um modelo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templates.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="emit_title" className="text-xs font-semibold">Título do Documento Emitido</Label>
                            <Input
                                id="emit_title"
                                value={documentTitle}
                                onChange={(e) => setDocumentTitle(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>

                        {/* Dados do Responsável Legal */}
                        <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">
                                Dados do Responsável Legal (Signatário)
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2 space-y-1">
                                    <Label htmlFor="sig_name" className="text-[11px] font-medium">Nome do Responsável *</Label>
                                    <Input
                                        id="sig_name"
                                        placeholder="Nome do pai / mãe / tutor"
                                        value={signerName}
                                        onChange={(e) => setSignerName(e.target.value)}
                                        className="h-8 text-xs"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="sig_cpf" className="text-[11px] font-medium">CPF do Responsável</Label>
                                    <Input
                                        id="sig_cpf"
                                        placeholder="000.000.000-00"
                                        value={signerCpf}
                                        onChange={(e) => setSignerCpf(e.target.value)}
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="sig_phone" className="text-[11px] font-medium">Telefone / WhatsApp para Envio</Label>
                                <Input
                                    id="sig_phone"
                                    placeholder="(00) 00000-0000"
                                    value={signerPhone}
                                    onChange={(e) => setSignerPhone(e.target.value)}
                                    className="h-8 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            As tags como <code>{'{{nome_paciente}}'}</code>, <code>{'{{cpf_responsavel}}'}</code> e <code>{'{{data_atual}}'}</code> serão convertidas automaticamente nos valores reais no momento da emissão.
                        </p>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsEmitModalOpen(false)}
                            className="h-9 text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => emitMutation.mutate()}
                            disabled={emitMutation.isPending || !documentTitle.trim()}
                            className="h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {emitMutation.isPending ? 'Gerando Link...' : 'Gerar Documento e Link'}
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
                            Link de Assinatura Gerado!
                        </DialogTitle>
                        <DialogDescription className="text-xs text-center">
                            Encaminhe o link para o responsável legal assinar digitalmente pelo celular.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 text-xs">
                        <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-1.5">
                            <Label className="text-[11px] font-bold text-muted-foreground">Link Seguro de Assinatura:</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    readOnly
                                    value={emittedResult ? getFullSigningUrl(emittedResult.signature.signing_token) : ''}
                                    className="h-8 text-xs font-mono bg-background"
                                />
                                <Button
                                    size="sm"
                                    onClick={() => emittedResult && copyLink(emittedResult.signature.signing_token)}
                                    className="h-8 px-2.5 shrink-0 text-xs"
                                >
                                    <Copy className="w-3.5 h-3.5 mr-1" />
                                    Copiar
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Button
                                onClick={() => emittedResult && sendWhatsApp(emittedResult.signature)}
                                className="w-full h-10 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-2"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Enviar Link pelo WhatsApp Agora
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => setEmittedResult(null)}
                                className="w-full h-9 text-xs"
                            >
                                Concluir
                            </Button>
                        </div>
                    </div>
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
                                    Documento formal assinado eletronicamente com validade jurídica.
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
                                    <p className="text-muted-foreground text-[11px]">Signatário / Responsável</p>
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
                            className="h-9 text-xs gap-1.5 font-semibold"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            Imprimir / Salvar PDF
                        </Button>
                        <Button
                            variant="default"
                            onClick={() => setViewingDoc(null)}
                            className="h-9 text-xs"
                        >
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
