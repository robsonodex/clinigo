'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
    Check,
    Copy,
    Download,
    Edit3,
    ExternalLink,
    Loader2,
    Mail,
    MessageCircle,
    Plus,
    Search,
    Trash2,
} from 'lucide-react'
import {
    generateCommercialProposalPdf,
    generateContinuityReportPdf,
    generateExecutivePresentationPdf,
} from '@/lib/sales/prospect-pdf-generator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
    SCRIPT_CHANNELS,
    SCRIPT_STAGES,
    SCRIPT_STAGE_LABELS,
    buildMailtoUrl,
    buildWhatsappUrl,
    type SalesProspect,
    type SalesScriptTemplate,
    type ScriptChannel,
    type ScriptStage,
} from '@/lib/sales/prospect-types'
import { interpolateSalesTemplate } from '@/lib/sales/prospect-templates'

interface ScriptsLibraryTabProps {
    scripts: SalesScriptTemplate[]
    activeProspect: SalesProspect | null
    onRefresh: () => Promise<void>
}

interface ScriptFormState {
    id?: string
    title: string
    stage: ScriptStage
    channel: ScriptChannel
    subject_template: string
    body_template: string
}

const EMPTY_SCRIPT: ScriptFormState = {
    title: '',
    stage: 'PRIMEIRO_CONTATO',
    channel: 'EMAIL',
    subject_template: 'Relatório de continuidade ({{programa}}) — {{clinica}}',
    body_template: '',
}

const AVAILABLE_VARIABLES = [
    '{{clinica}}',
    '{{programa}}',
    '{{especialidades}}',
    '{{responsavel}}',
    '{{profissionais}}',
    '{{plano_recomendado}}',
]

export function ScriptsLibraryTab({
    scripts,
    activeProspect,
    onRefresh,
}: ScriptsLibraryTabProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [stageFilter, setStageFilter] = useState<string>('ALL')
    const [copiedKey, setCopiedKey] = useState<string | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [form, setForm] = useState<ScriptFormState>(EMPTY_SCRIPT)
    const [saving, setSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<SalesScriptTemplate | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [downloadingScriptId, setDownloadingScriptId] = useState<string | null>(null)

    const handleDownloadAttachmentsForScript = async (script: SalesScriptTemplate) => {
        setDownloadingScriptId(script.id)
        try {
            const pdfInput = {
                clinicName: templateCtx.clinicName,
                programFocus: templateCtx.programFocus,
                specialties: templateCtx.specialties,
                contactName: templateCtx.contactName,
                estimatedProfessionals: templateCtx.estimatedProfessionals,
            }
            if (script.stage === 'OBJECOES') {
                const file = await generateCommercialProposalPdf(pdfInput)
                toast.success(`Anexo baixado: ${file}`)
            } else {
                const file1 = await generateContinuityReportPdf(pdfInput)
                toast.success(`Anexo 1/2 baixado: ${file1}`)
                await new Promise((r) => setTimeout(r, 450))
                const file2 = await generateExecutivePresentationPdf(pdfInput)
                toast.success(`Anexo 2/2 baixado: ${file2}`)
            }
        } catch {
            toast.error('Falha ao gerar anexos PDF para este e-mail.')
        } finally {
            setDownloadingScriptId(null)
        }
    }

    const templateCtx = useMemo(
        () => ({
            clinicName: activeProspect?.clinic_name || 'Clínica Você',
            programFocus: activeProspect?.program_focus || 'Você TEA',
            specialties: activeProspect?.specialties || ['Fonoaudiologia', 'Terapia Ocupacional'],
            contactName: activeProspect?.contact_name || 'equipe',
            estimatedProfessionals: activeProspect?.estimated_professionals || 8,
        }),
        [activeProspect]
    )

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase()
        return scripts.filter((s) => {
            if (stageFilter !== 'ALL' && s.stage !== stageFilter) return false
            if (!q) return true
            return (
                s.title.toLowerCase().includes(q) ||
                s.subject_template.toLowerCase().includes(q) ||
                s.body_template.toLowerCase().includes(q)
            )
        })
    }, [scripts, searchTerm, stageFilter])

    const handleCopy = async (text: string, key: string, label: string) => {
        await navigator.clipboard.writeText(text)
        setCopiedKey(key)
        toast.success(`${label} copiado para a área de transferência.`)
        setTimeout(() => setCopiedKey(null), 1800)
    }

    const openCreate = () => {
        setForm(EMPTY_SCRIPT)
        setModalOpen(true)
    }

    const openEdit = (script: SalesScriptTemplate) => {
        setForm({
            id: script.id,
            title: script.title,
            stage: script.stage,
            channel: script.channel,
            subject_template: script.subject_template || '',
            body_template: script.body_template,
        })
        setModalOpen(true)
    }

    const openDuplicate = (script: SalesScriptTemplate) => {
        setForm({
            title: `${script.title} (Cópia)`,
            stage: script.stage,
            channel: script.channel,
            subject_template: script.subject_template || '',
            body_template: script.body_template,
        })
        setModalOpen(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (form.title.trim().length < 2 || form.body_template.trim().length < 10) {
            toast.error('Preencha o título e o corpo da mensagem (mínimo 10 caracteres).')
            return
        }
        setSaving(true)
        try {
            const url = form.id
                ? `/api/super-admin/prospeccao/scripts/${form.id}`
                : '/api/super-admin/prospeccao/scripts'
            const method = form.id ? 'PATCH' : 'POST'
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: form.title.trim(),
                    stage: form.stage,
                    channel: form.channel,
                    subject_template: form.subject_template.trim(),
                    body_template: form.body_template.trim(),
                }),
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Erro ao salvar script')
            toast.success(form.id ? 'Script atualizado.' : 'Novo script salvo na biblioteca.')
            setModalOpen(false)
            await onRefresh()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Falha ao salvar script')
        } finally {
            setSaving(false)
        }
    }

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/super-admin/prospeccao/scripts/${deleteTarget.id}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Falha ao excluir script')
            toast.success(`Script "${deleteTarget.title}" excluído.`)
            setDeleteTarget(null)
            await onRefresh()
        } catch {
            toast.error('Erro ao excluir script.')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-4">
            {/* Barra de Filtros */}
            <div className="bg-white border border-[#E6E8E5] rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-[#4B5B56] absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar script por título, assunto ou trecho..."
                            className="pl-9 min-h-[44px]"
                        />
                    </div>
                    <Button
                        type="button"
                        onClick={openCreate}
                        className="min-h-[44px] bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold"
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Novo Script
                    </Button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#F0F2F0]">
                    <button
                        type="button"
                        onClick={() => setStageFilter('ALL')}
                        className={`min-h-[34px] px-3 rounded-lg text-xs font-medium cursor-pointer ${
                            stageFilter === 'ALL'
                                ? 'bg-[#0F1F1B] text-white'
                                : 'bg-[#F2F5F3] text-[#4B5B56] hover:bg-[#E6ECE9]'
                        }`}
                    >
                        Todos ({scripts.length})
                    </button>
                    {SCRIPT_STAGES.map((stage) => (
                        <button
                            key={stage}
                            type="button"
                            onClick={() => setStageFilter(stage)}
                            className={`min-h-[34px] px-3 rounded-lg text-xs font-medium cursor-pointer ${
                                stageFilter === stage
                                    ? 'bg-[#155E4B] text-white'
                                    : 'bg-[#F2F5F3] text-[#4B5B56] hover:bg-[#E6ECE9]'
                            }`}
                        >
                            {SCRIPT_STAGE_LABELS[stage]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cards de Scripts Interpolados em Tempo Real */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filtered.map((script) => {
                    const renderedSubject = interpolateSalesTemplate(script.subject_template || '', templateCtx)
                    const renderedBody = interpolateSalesTemplate(script.body_template, templateCtx)
                    const mailtoHref =
                        script.channel === 'EMAIL' && activeProspect?.email
                            ? buildMailtoUrl(activeProspect.email, renderedSubject, renderedBody)
                            : null
                    const waHref = activeProspect?.whatsapp
                        ? buildWhatsappUrl(activeProspect.whatsapp, renderedBody)
                        : null

                    return (
                        <div
                            key={script.id}
                            className="bg-white border border-[#E6E8E5] rounded-xl p-5 flex flex-col justify-between space-y-4"
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] font-mono uppercase bg-[#E6F2EE] text-[#114D3E] border-[#CBE3DA]"
                                            >
                                                {SCRIPT_STAGE_LABELS[script.stage]}
                                            </Badge>
                                            <Badge variant="outline" className="text-[10px] font-mono text-[#4B5B56]">
                                                {script.channel === 'WHATSAPP' ? 'WhatsApp' : 'E-mail'}
                                            </Badge>
                                        </div>
                                        <h3 className="text-sm font-semibold text-[#0F1F1B]">{script.title}</h3>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => openEdit(script)}
                                            className="h-8 w-8 p-0 text-[#4B5B56] hover:text-[#0F1F1B]"
                                            title="Editar script"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => openDuplicate(script)}
                                            className="h-8 w-8 p-0 text-[#4B5B56] hover:text-[#0F1F1B]"
                                            title="Duplicar script"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setDeleteTarget(script)}
                                            className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                                            title="Excluir script"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                {script.channel === 'EMAIL' && renderedSubject && (
                                    <div className="rounded-lg bg-[#F6F8F7] border border-[#E6E8E5] px-3 py-2 flex items-center justify-between gap-2">
                                        <p className="text-xs text-[#0F1F1B] truncate">
                                            <span className="font-semibold text-[#4B5B56]">Assunto:</span>{' '}
                                            {renderedSubject}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleCopy(renderedSubject, `subj-${script.id}`, 'Assunto')
                                            }
                                            className="text-[11px] font-medium text-[#155E4B] hover:underline shrink-0 inline-flex items-center gap-1 cursor-pointer"
                                        >
                                            {copiedKey === `subj-${script.id}` ? (
                                                <Check className="w-3.5 h-3.5" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                            Copiar
                                        </button>
                                    </div>
                                )}

                                <pre className="whitespace-pre-wrap font-sans text-xs text-[#243530] bg-[#FAFBF9] border border-[#EEF1EF] rounded-lg p-3.5 max-h-64 overflow-y-auto leading-relaxed">
                                    {renderedBody}
                                </pre>
                            </div>

                            {/* Ações de 1 Clique */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F0F2F0]">
                                <Button
                                    type="button"
                                    onClick={() => handleCopy(renderedBody, `body-${script.id}`, 'Mensagem')}
                                    className="min-h-[40px] flex-1 bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold"
                                >
                                    {copiedKey === `body-${script.id}` ? (
                                        <Check className="w-4 h-4 mr-1.5" />
                                    ) : (
                                        <Copy className="w-4 h-4 mr-1.5" />
                                    )}
                                    Copiar Mensagem (1 clique)
                                </Button>

                                {(script.stage === 'ENVIO_MATERIAL' ||
                                    script.stage === 'FOLLOWUP_7D' ||
                                    script.stage === 'OBJECOES') && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={downloadingScriptId === script.id}
                                        onClick={() => handleDownloadAttachmentsForScript(script)}
                                        className="min-h-[40px] text-xs border-[#155E4B] text-[#114D3E] hover:bg-[#E6F2EE] font-semibold"
                                    >
                                        {downloadingScriptId === script.id ? (
                                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        ) : (
                                            <Download className="w-3.5 h-3.5 mr-1.5" />
                                        )}
                                        {script.stage === 'OBJECOES'
                                            ? 'Baixar Proposta (PDF)'
                                            : 'Baixar 2 Anexos PDF'}
                                    </Button>
                                )}

                                {mailtoHref && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        asChild
                                        className="min-h-[40px] text-xs border-[#D6DDD9] text-[#0F1F1B]"
                                    >
                                        <a href={mailtoHref}>
                                            <Mail className="w-3.5 h-3.5 mr-1.5" />
                                            Abrir E-mail
                                            <ExternalLink className="w-3 h-3 ml-1" />
                                        </a>
                                    </Button>
                                )}

                                {waHref && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        asChild
                                        className="min-h-[40px] text-xs border-[#BBDCD0] text-[#155E4B] hover:bg-[#E6F2EE]"
                                    >
                                        <a href={waHref} target="_blank" rel="noopener noreferrer">
                                            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                                            WhatsApp
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Modal Criar / Editar Script */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-[#0F1F1B]">
                            {form.id ? 'Editar Template de Script' : 'Novo Template de Script'}
                        </DialogTitle>
                        <DialogDescription className="text-[#4B5B56]">
                            Use as variáveis abaixo para preenchimento automático com a clínica selecionada.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="flex flex-wrap gap-1.5">
                            {AVAILABLE_VARIABLES.map((v) => (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() =>
                                        setForm((prev) => ({
                                            ...prev,
                                            body_template: `${prev.body_template}${prev.body_template ? ' ' : ''}${v}`,
                                        }))
                                    }
                                    className="px-2 py-1 rounded bg-[#F2F5F3] border border-[#D6DDD9] text-[11px] font-mono text-[#155E4B] hover:bg-[#E6F2EE] cursor-pointer"
                                    title="Inserir variável no corpo"
                                >
                                    {v}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="script-title">Título do Script *</Label>
                            <Input
                                id="script-title"
                                required
                                value={form.title}
                                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                                placeholder="Ex.: Follow-up após envio de proposta"
                                className="min-h-[44px]"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="space-y-1.5">
                                <Label htmlFor="script-stage">Estágio</Label>
                                <select
                                    id="script-stage"
                                    value={form.stage}
                                    onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value as ScriptStage }))}
                                    className="w-full min-h-[44px] rounded-md border border-input bg-white px-3 text-sm"
                                >
                                    {SCRIPT_STAGES.map((st) => (
                                        <option key={st} value={st}>
                                            {SCRIPT_STAGE_LABELS[st]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="script-channel">Canal</Label>
                                <select
                                    id="script-channel"
                                    value={form.channel}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, channel: e.target.value as ScriptChannel }))
                                    }
                                    className="w-full min-h-[44px] rounded-md border border-input bg-white px-3 text-sm"
                                >
                                    {SCRIPT_CHANNELS.map((ch) => (
                                        <option key={ch} value={ch}>
                                            {ch === 'EMAIL' ? 'E-mail' : 'WhatsApp'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {form.channel === 'EMAIL' && (
                            <div className="space-y-1.5">
                                <Label htmlFor="script-subject">Assunto do E-mail</Label>
                                <Input
                                    id="script-subject"
                                    value={form.subject_template}
                                    onChange={(e) => setForm((p) => ({ ...p, subject_template: e.target.value }))}
                                    placeholder="Ex.: Exemplo prático — {{clinica}} ({{programa}})"
                                    className="min-h-[44px]"
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="script-body">Corpo da Mensagem *</Label>
                            <Textarea
                                id="script-body"
                                required
                                rows={8}
                                value={form.body_template}
                                onChange={(e) => setForm((p) => ({ ...p, body_template: e.target.value }))}
                                placeholder="Escreva o modelo usando {{clinica}}, {{programa}}, {{especialidades}} e {{responsavel}}..."
                            />
                        </div>

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setModalOpen(false)}
                                className="min-h-[44px]"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={saving}
                                className="min-h-[44px] bg-[#155E4B] hover:bg-[#0F493A] text-white"
                            >
                                {saving ? 'Salvando...' : 'Salvar Script'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog de Exclusão */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-[#0F1F1B]">Confirmar Exclusão</DialogTitle>
                        <DialogDescription className="text-[#4B5B56]">
                            Tem certeza que deseja excluir o script <strong>{deleteTarget?.title}</strong>? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} className="min-h-[44px]">
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={deleting}
                            onClick={handleConfirmDelete}
                            className="min-h-[44px]"
                        >
                            {deleting ? 'Excluindo...' : 'Excluir Script'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

