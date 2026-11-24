'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
    HeartHandshake,
    Send,
    Copy,
    ExternalLink,
    RefreshCw,
    Trash2,
    Ban,
    RotateCcw,
    Plus,
    X,
    CheckCircle2,
    ShieldCheck,
    School,
    Home,
    Eye,
    Cpu,
    Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { buildFamilyHighlightsFromSessions } from '@/lib/session-plans/learning-curve'
import { decodeFamilyFeedback } from '@/lib/family-portal/feedback-codec'

interface FamilyPortalManagerProps {
    patientId: string
    patientName: string
    patientPhone?: string | null
    especialidade?: string
    specialtyLabel?: string
    sessoes?: any[]
    triggerClassName?: string
}

interface ShareRecord {
    id: string
    token: string
    share_type: 'family' | 'school_doctor'
    recipient_name: string | null
    recipient_phone: string | null
    title: string
    home_activity_title: string | null
    home_activity_completed: boolean
    home_activity_completed_at: string | null
    home_activity_feedback: string | null
    parent_consent_confirmed: boolean
    expires_at: string
    revoked_at: string | null
    view_count: number
    whatsapp_sent_at: string | null
    created_at: string
}

const EMPTY_SESSIONS: any[] = []

export function FamilyPortalManager({
    patientId,
    patientName,
    patientPhone,
    especialidade,
    specialtyLabel = 'Terapia',
    sessoes = EMPTY_SESSIONS,
    triggerClassName,
}: FamilyPortalManagerProps) {
    const [open, setOpen] = useState(false)
    const [mode, setMode] = useState<'family' | 'school_doctor'>('family')
    const [shares, setShares] = useState<ShareRecord[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form state
    const [title, setTitle] = useState('')
    const [recipientName, setRecipientName] = useState('')
    const [recipientPhone, setRecipientPhone] = useState(patientPhone || '')
    const [introMessage, setIntroMessage] = useState('')
    const [highlights, setHighlights] = useState<string[]>([''])
    const [progressSnapshot, setProgressSnapshot] = useState<
        Array<{ label: string; pct: number; status: string }>
    >([])
    const [homeActivityTitle, setHomeActivityTitle] = useState('')
    const [homeActivityInstructions, setHomeActivityInstructions] = useState('')
    const [parentConsentConfirmed, setParentConsentConfirmed] = useState(false)
    const [sendWhatsapp, setSendWhatsapp] = useState(true)
    const [lastFallbackUrl, setLastFallbackUrl] = useState<string | null>(null)
    const [lastShareUrl, setLastShareUrl] = useState<string | null>(null)
    const [isGeneratingAi, setIsGeneratingAi] = useState(false)

    const handleGenerateAiBulletin = async () => {
        try {
            setIsGeneratingAi(true)
            const res = await fetch('/api/ai/family-bulletin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientId,
                    mode,
                    specialtyLabel,
                }),
            })
            const json = await res.json()
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Não foi possível redigir o boletim com IA.')
            }
            const d = json.data
            if (d.title) setTitle(d.title)
            if (d.introMessage) setIntroMessage(d.introMessage)
            if (Array.isArray(d.highlights) && d.highlights.length > 0) {
                setHighlights(d.highlights)
            }
            if (mode === 'family') {
                if (d.homeActivityTitle) setHomeActivityTitle(d.homeActivityTitle)
                if (d.homeActivityInstructions) setHomeActivityInstructions(d.homeActivityInstructions)
            }
            toast.success(
                'Boletim redigido pelo CliniGo IA (com Escudo LGPD). Revise os textos antes de enviar.'
            )
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao gerar boletim com IA')
        } finally {
            setIsGeneratingAi(false)
        }
    }

    const loadShares = useCallback(async () => {
        try {
            setIsLoading(true)
            const res = await fetch(`/api/family-portal?patientId=${encodeURIComponent(patientId)}`)
            if (!res.ok) return
            const data = await res.json()
            setShares(Array.isArray(data.shares) ? data.shares : [])
            if (data.patient?.phone) {
                setRecipientPhone((prev) => prev || data.patient.phone)
            }
        } catch {
            // silencioso na carga inicial
        } finally {
            setIsLoading(false)
        }
    }, [patientId])

    const prefillFromSessions = useCallback(
        (targetMode: 'family' | 'school_doctor') => {
            const generated = buildFamilyHighlightsFromSessions(sessoes, specialtyLabel)
            setHighlights(generated.highlights.length > 0 ? generated.highlights : [''])
            setProgressSnapshot(generated.progressSnapshot)
            if (targetMode === 'school_doctor') {
                setTitle(`Relatório de Evolução (${specialtyLabel}) — Escola / Neuropediatra`)
                setIntroMessage(
                    'Resumo clínico temporário (válido por 7 dias) para alinhamento entre clínica, escola e equipe médica, compartilhado mediante autorização dos responsáveis.'
                )
            } else {
                setTitle(`Boletim da Semana — ${specialtyLabel}`)
                setIntroMessage(
                    'Preparamos um resumo carinhoso dos avanços desta semana e uma prática simples de 5 minutos para reforçar em casa.'
                )
                setHomeActivityTitle(generated.homeActivityTitle)
                setHomeActivityInstructions(generated.homeActivityInstructions)
            }
        },
        [sessoes, specialtyLabel]
    )

    useEffect(() => {
        if (!open) return
        loadShares()
    }, [open, loadShares])

    useEffect(() => {
        if (!open) return
        setTitle((prev) => {
            if (prev) return prev
            const generated = buildFamilyHighlightsFromSessions(sessoes, specialtyLabel)
            setHighlights(generated.highlights.length > 0 ? generated.highlights : [''])
            setProgressSnapshot(generated.progressSnapshot)
            setIntroMessage(
                'Preparamos um resumo carinhoso dos avanços desta semana e uma prática simples de 5 minutos para reforçar em casa.'
            )
            setHomeActivityTitle(generated.homeActivityTitle)
            setHomeActivityInstructions(generated.homeActivityInstructions)
            return `Boletim da Semana — ${specialtyLabel}`
        })
    }, [open, sessoes, specialtyLabel])

    const handleSwitchMode = (nextMode: 'family' | 'school_doctor') => {
        setMode(nextMode)
        setLastFallbackUrl(null)
        setLastShareUrl(null)
        prefillFromSessions(nextMode)
    }

    const handleCreateShare = async () => {
        const cleanHighlights = highlights.map((h) => h.trim()).filter(Boolean)
        if (cleanHighlights.length === 0) {
            toast.error('Adicione pelo menos 1 conquista ou observação.')
            return
        }
        if (mode === 'school_doctor' && !parentConsentConfirmed) {
            toast.error('Confirme que os responsáveis autorizaram o compartilhamento (LGPD).')
            return
        }

        try {
            setIsSubmitting(true)
            setLastFallbackUrl(null)
            setLastShareUrl(null)

            const res = await fetch('/api/family-portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientId,
                    especialidade,
                    shareType: mode,
                    title,
                    recipientName,
                    recipientPhone,
                    introMessage,
                    summaryHighlights: cleanHighlights,
                    progressSnapshot,
                    homeActivityTitle: mode === 'family' ? homeActivityTitle : null,
                    homeActivityInstructions: mode === 'family' ? homeActivityInstructions : null,
                    parentConsentConfirmed,
                    sendWhatsapp: sendWhatsapp && Boolean(recipientPhone.trim()),
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao gerar link seguro')
            }

            setLastShareUrl(data.shareUrl)
            if (data.whatsappResult?.success) {
                toast.success('Boletim gerado e enviado diretamente pelo WhatsApp!')
            } else if (data.whatsappResult?.fallback_url) {
                setLastFallbackUrl(data.whatsappResult.fallback_url)
                toast.success('Link seguro gerado! Clique em "Abrir no WhatsApp" ou copie o link.')
            } else {
                toast.success('Link seguro gerado com sucesso!')
            }

            await loadShares()
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao enviar boletim')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRevokeToggle = async (share: ShareRecord) => {
        try {
            const action = share.revoked_at ? 'restore' : 'revoke'
            const res = await fetch('/api/family-portal', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: share.id, patientId, action }),
            })
            if (!res.ok) throw new Error('Falha ao atualizar status')
            toast.success(action === 'revoke' ? 'Link revogado imediatamente.' : 'Link restaurado.')
            await loadShares()
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao atualizar link')
        }
    }

    const handleDeleteShare = async (id: string) => {
        try {
            const res = await fetch(
                `/api/family-portal?id=${encodeURIComponent(id)}&patientId=${encodeURIComponent(patientId)}`,
                { method: 'DELETE' }
            )
            if (!res.ok) throw new Error('Falha ao excluir')
            toast.success('Registro excluído.')
            await loadShares()
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao excluir')
        }
    }

    const copyLink = (token: string) => {
        const url = `${window.location.origin}/familia/${token}`
        navigator.clipboard.writeText(url)
        toast.success('Link copiado para a área de transferência.')
    }

    const completedCount = shares.filter((s) => s.home_activity_completed).length

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className={
                        triggerClassName ||
                        'h-9 gap-1.5 text-xs font-medium border-[#155E4B]/40 text-[#114D3E] hover:bg-[#E6F2EE]'
                    }
                >
                    <HeartHandshake className="w-3.5 h-3.5 text-[#155E4B]" />
                    <span>CliniGo Família</span>
                    {completedCount > 0 && (
                        <Badge className="ml-0.5 h-4 px-1.5 text-[10px] bg-[#155E4B] text-white">
                            {completedCount}
                        </Badge>
                    )}
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold flex items-center gap-2 text-[#0F1F1B]">
                        <HeartHandshake className="w-5 h-5 text-[#155E4B]" />
                        CliniGo Família · {patientName}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Envie boletins semanais com conquistas reais e Atividade de Casa (botão &ldquo;Fizemos em casa!&rdquo;) ou gere link temporário de 7 dias para Escola e Neuropediatra (LGPD).
                    </DialogDescription>
                </DialogHeader>

                {/* Seletor de tipo de compartilhamento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                        type="button"
                        onClick={() => handleSwitchMode('family')}
                        className={`min-h-[46px] px-3.5 py-2 rounded-lg border text-left transition-colors cursor-pointer flex items-center gap-2.5 ${mode === 'family'
                            ? 'bg-[#E6F2EE] border-[#155E4B] text-[#114D3E]'
                            : 'bg-white border-border text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Home className="w-4 h-4 shrink-0" />
                        <div>
                            <div className="text-xs font-semibold">Boletim da Família (30 dias)</div>
                            <div className="text-[11px] opacity-80">Conquistas + Atividade de Casa 5 min</div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSwitchMode('school_doctor')}
                        className={`min-h-[46px] px-3.5 py-2 rounded-lg border text-left transition-colors cursor-pointer flex items-center gap-2.5 ${mode === 'school_doctor'
                            ? 'bg-[#E6F2EE] border-[#155E4B] text-[#114D3E]'
                            : 'bg-white border-border text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <School className="w-4 h-4 shrink-0" />
                        <div>
                            <div className="text-xs font-semibold">Escola / Neuropediatra (7 dias)</div>
                            <div className="text-[11px] opacity-80">Link temporário somente leitura + LGPD</div>
                        </div>
                    </button>
                </div>

                {/* Formulário de montagem */}
                <div className="space-y-4 rounded-xl border border-border bg-[#FAFAF8] p-4 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-[#0F1F1B]">
                            Montar novo compartilhamento (100% marca da sua clínica)
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isGeneratingAi}
                                onClick={handleGenerateAiBulletin}
                                className="h-8 text-[11px] gap-1.5 border-[#155E4B]/40 bg-[#E6F2EE] text-[#114D3E] hover:bg-[#D5EAE2] font-semibold"
                            >
                                {isGeneratingAi ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Cpu className="w-3.5 h-3.5" />
                                )}
                                <span>
                                    {isGeneratingAi
                                        ? 'Redigindo com IA...'
                                        : mode === 'school_doctor'
                                          ? 'Redigir Síntese (IA)'
                                          : 'Gerar Boletim Acolhedor (IA)'}
                                </span>
                            </Button>
                            {sessoes.length > 0 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => prefillFromSessions(mode)}
                                    className="h-8 text-[11px] text-[#155E4B] hover:bg-[#E6F2EE]"
                                >
                                    Puxar conquistas das sessões
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="fp-title" className="text-[11px]">Título exibido</Label>
                            <Input
                                id="fp-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="h-9 text-xs bg-white"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label htmlFor="fp-recipient" className="text-[11px]">Destinatário</Label>
                                <Input
                                    id="fp-recipient"
                                    placeholder={mode === 'school_doctor' ? 'Ex: Dra. Ana / Escola' : 'Ex: Mãe / Responsável'}
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    className="h-9 text-xs bg-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="fp-phone" className="text-[11px]">WhatsApp</Label>
                                <Input
                                    id="fp-phone"
                                    placeholder="(11) 99999-9999"
                                    value={recipientPhone}
                                    onChange={(e) => setRecipientPhone(e.target.value)}
                                    className="h-9 text-xs bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-[11px]">
                                Conquistas da semana em linguagem humana (2 a 3 itens recomendados)
                            </Label>
                            {highlights.length < 5 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setHighlights([...highlights, ''])}
                                    className="h-7 text-[11px] gap-1"
                                >
                                    <Plus className="w-3 h-3" />
                                    Adicionar item
                                </Button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {highlights.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <Input
                                        value={item}
                                        placeholder={`Conquista ${idx + 1} (sem dados sensíveis ou jargões)...`}
                                        onChange={(e) => {
                                            const copy = [...highlights]
                                            copy[idx] = e.target.value
                                            setHighlights(copy)
                                        }}
                                        className="h-9 text-xs bg-white"
                                    />
                                    {highlights.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                setHighlights(highlights.filter((_, i) => i !== idx))
                                            }
                                            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                                            title="Remover item"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {mode === 'family' && (
                        <div className="grid grid-cols-1 gap-2.5 pt-2 border-t border-border/60">
                            <div className="space-y-1">
                                <Label htmlFor="fp-home-title" className="text-[11px]">
                                    Atividade de Casa (5 min) — Título
                                </Label>
                                <Input
                                    id="fp-home-title"
                                    value={homeActivityTitle}
                                    onChange={(e) => setHomeActivityTitle(e.target.value)}
                                    placeholder="Ex: Brincadeira de escolha com duas opções"
                                    className="h-9 text-xs bg-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="fp-home-desc" className="text-[11px]">
                                    Instruções práticas para a família
                                </Label>
                                <Textarea
                                    id="fp-home-desc"
                                    rows={2}
                                    value={homeActivityInstructions}
                                    onChange={(e) => setHomeActivityInstructions(e.target.value)}
                                    placeholder="Descreva em passos simples como praticar por 5 minutos em casa..."
                                    className="text-xs bg-white"
                                />
                            </div>
                        </div>
                    )}

                    {mode === 'school_doctor' && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 flex items-start gap-2.5">
                            <Checkbox
                                id="fp-consent"
                                checked={parentConsentConfirmed}
                                onCheckedChange={(v) => setParentConsentConfirmed(v === true)}
                                className="mt-0.5"
                            />
                            <Label htmlFor="fp-consent" className="text-[11px] leading-relaxed text-amber-950 cursor-pointer">
                                <strong>Confirmação LGPD obrigatória:</strong> declaro que os responsáveis legais autorizaram o envio deste resumo temporário (validade automática de 7 dias) para a escola ou médico acompanhante.
                            </Label>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/60">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="fp-send-wa"
                                checked={sendWhatsapp}
                                onCheckedChange={(v) => setSendWhatsapp(v === true)}
                            />
                            <Label htmlFor="fp-send-wa" className="text-xs cursor-pointer">
                                Enviar automaticamente pelo WhatsApp da clínica (ou gerar link wa.me)
                            </Label>
                        </div>

                        <Button
                            type="button"
                            onClick={handleCreateShare}
                            disabled={isSubmitting}
                            className="min-h-[42px] px-4 bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold gap-1.5"
                        >
                            <Send className="w-3.5 h-3.5" />
                            {isSubmitting
                                ? 'Gerando...'
                                : mode === 'school_doctor'
                                    ? 'Gerar Link 7 dias'
                                    : 'Gerar e Enviar Boletim'}
                        </Button>
                    </div>

                    {lastShareUrl && (
                        <div className="rounded-lg border border-[#C4E1D7] bg-[#E6F2EE]/70 p-3.5 space-y-2.5 overflow-hidden">
                            <p className="text-[11px] font-semibold text-[#114D3E]">
                                Link seguro pronto para uso:
                            </p>
                            <div className="rounded-md border border-[#C4E1D7] bg-white/90 px-2.5 py-2 font-mono text-[11px] text-[#0F1F1B] break-all select-all">
                                {lastShareUrl}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        navigator.clipboard.writeText(lastShareUrl)
                                        toast.success('Link copiado.')
                                    }}
                                    className="h-9 px-3 text-xs bg-white gap-1.5"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    Copiar link
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    asChild
                                    className="h-9 px-3 text-xs bg-white gap-1.5"
                                >
                                    <a href={lastShareUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Abrir boletim
                                    </a>
                                </Button>
                                {lastFallbackUrl && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        asChild
                                        className="h-9 px-3 text-xs bg-[#155E4B] hover:bg-[#0F493A] text-white gap-1.5"
                                    >
                                        <a href={lastFallbackUrl} target="_blank" rel="noopener noreferrer">
                                            <Send className="w-3.5 h-3.5" />
                                            Abrir no WhatsApp
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Histórico de envios e retorno "Fizemos em casa!" */}
                <div className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Histórico de Links e Retorno da Família ({shares.length})
                        </h4>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={loadShares}
                            disabled={isLoading}
                            className="h-8 text-xs gap-1"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                    </div>

                    {shares.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                            Nenhum boletim ou link enviado ainda para este paciente.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {shares.map((share) => {
                                const expired = new Date(share.expires_at).getTime() < Date.now()
                                const revoked = Boolean(share.revoked_at)
                                return (
                                    <div
                                        key={share.id}
                                        className="rounded-lg border border-border bg-white p-3.5 space-y-2 text-xs"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] bg-[#FAFAF8]"
                                                    >
                                                        {share.share_type === 'school_doctor'
                                                            ? 'Escola / Médico (7d)'
                                                            : 'Família'}
                                                    </Badge>
                                                    {revoked ? (
                                                        <Badge variant="destructive" className="text-[10px]">
                                                            Revogado
                                                        </Badge>
                                                    ) : expired ? (
                                                        <Badge variant="secondary" className="text-[10px]">
                                                            Expirado
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-[#E6F2EE] text-[#114D3E] hover:bg-[#E6F2EE] text-[10px]">
                                                            Ativo
                                                        </Badge>
                                                    )}
                                                    {share.home_activity_completed && (
                                                        <Badge className="bg-[#155E4B] text-white text-[10px] gap-1">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Fizemos em casa!
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="font-semibold text-[#0F1F1B] mt-1">
                                                    {share.title}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                                                    <span>
                                                        Criado em {new Date(share.created_at).toLocaleDateString('pt-BR')}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <Eye className="w-3 h-3" />
                                                        {share.view_count} acesso(s)
                                                    </span>
                                                    {share.parent_consent_confirmed && (
                                                        <span className="inline-flex items-center gap-1 text-[#114D3E]">
                                                            <ShieldCheck className="w-3 h-3" />
                                                            Autorizado LGPD
                                                        </span>
                                                    )}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => copyLink(share.token)}
                                                    className="h-8 px-2.5 text-[11px] gap-1"
                                                    title="Copiar link"
                                                >
                                                    <Copy className="w-3 h-3" />
                                                    Copiar
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                    className="h-8 px-2.5 text-[11px] gap-1"
                                                    title="Abrir prévia"
                                                >
                                                    <a
                                                        href={`/familia/${share.token}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        Abrir
                                                    </a>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleRevokeToggle(share)}
                                                    className="h-8 px-2.5 text-[11px] gap-1"
                                                >
                                                    {revoked ? (
                                                        <>
                                                            <RotateCcw className="w-3 h-3" />
                                                            Restaurar
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Ban className="w-3 h-3" />
                                                            Revogar
                                                        </>
                                                    )}
                                                </Button>

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            title="Excluir registro"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>
                                                                Excluir este compartilhamento?
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Tem certeza que deseja excluir &ldquo;{share.title}&rdquo;? O link deixará de funcionar imediatamente e esta ação não pode ser desfeita.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteShare(share.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Excluir permanentemente
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>

                                        {share.home_activity_feedback && (() => {
                                            const dec = decodeFamilyFeedback(share.home_activity_feedback)
                                            return (
                                                <div className="rounded-md border border-[#C4E1D7] bg-[#E6F2EE]/50 px-3 py-2 text-[11px] text-[#114D3E] space-y-1">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {dec.confidenceScore !== null && (
                                                            <Badge
                                                                variant="outline"
                                                                className={
                                                                    dec.confidenceScore <= 2
                                                                        ? 'bg-rose-50 text-rose-800 border-rose-200 text-[10px]'
                                                                        : 'bg-white text-[#114D3E] border-[#C4E1D7] text-[10px]'
                                                                }
                                                            >
                                                                Confiança: {dec.confidenceScore}/5
                                                            </Badge>
                                                        )}
                                                        {dec.weeklyContextTags.map((tag) => (
                                                            <Badge
                                                                key={tag}
                                                                variant="outline"
                                                                className="bg-white text-[10px]"
                                                            >
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                    {dec.note && (
                                                        <p>
                                                            <strong>Retorno da família:</strong> {dec.note}
                                                        </p>
                                                    )}
                                                    {dec.schoolReturn && (
                                                        <p>
                                                            <strong>
                                                                Retorno da Escola
                                                                {dec.schoolReturn.respondentName
                                                                    ? ` (${dec.schoolReturn.respondentName})`
                                                                    : ''}
                                                                :
                                                            </strong>{' '}
                                                            Participação {dec.schoolReturn.participation} · Regulação{' '}
                                                            {dec.schoolReturn.regulation}
                                                            {dec.schoolReturn.observation
                                                                ? ` — ${dec.schoolReturn.observation}`
                                                                : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            )
                                        })()}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

