'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
    AlertCircle,
    CalendarClock,
    Check,
    Copy,
    Download,
    Edit3,
    FileText,
    Mail,
    MessageCircle,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    Users,
} from 'lucide-react'
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    COMMON_SPECIALTIES,
    FUNNEL_STATUSES,
    FUNNEL_STATUS_META,
    PDF_DOCUMENT_LABELS,
    addDaysIsoDate,
    buildWhatsappUrl,
    getFollowupUrgency,
    type FunnelStatus,
    type PdfDocumentType,
    type SalesProspect,
} from '@/lib/sales/prospect-types'
import { exportProspectsToExcel } from '@/lib/sales/prospect-templates'

interface ProspectCrmTabProps {
    prospects: SalesProspect[]
    selectedProspectId: string | null
    statusFilter: string
    onlyUrgentFollowups: boolean
    isLoading: boolean
    onStatusFilterChange: (status: string) => void
    onToggleUrgentFollowups: (value: boolean) => void
    onSelectProspect: (prospect: SalesProspect) => void
    onOpenPdfForProspect: (prospect: SalesProspect) => void
    onOpenScriptsForProspect: (prospect: SalesProspect) => void
    onRefresh: () => Promise<void>
}

interface ProspectFormState {
    id?: string
    clinic_name: string
    program_focus: string
    specialties: string[]
    custom_specialty: string
    contact_name: string
    email: string
    whatsapp: string
    city_state: string
    funnel_status: FunnelStatus
    estimated_professionals: number
    next_followup_at: string
    notes: string
}

const EMPTY_FORM: ProspectFormState = {
    clinic_name: '',
    program_focus: '',
    specialties: ['Fonoaudiologia', 'Terapia Ocupacional'],
    custom_specialty: '',
    contact_name: '',
    email: '',
    whatsapp: '',
    city_state: '',
    funnel_status: 'ABORDADO',
    estimated_professionals: 6,
    next_followup_at: addDaysIsoDate(3),
    notes: '',
}

function formatIsoDateBr(iso: string | null | undefined): string {
    if (!iso) return '—'
    const part = iso.slice(0, 10)
    const [y, m, d] = part.split('-')
    if (!y || !m || !d) return part
    return `${d}/${m}/${y}`
}

export function ProspectCrmTab({
    prospects,
    selectedProspectId,
    statusFilter,
    onlyUrgentFollowups,
    isLoading,
    onStatusFilterChange,
    onToggleUrgentFollowups,
    onSelectProspect,
    onOpenPdfForProspect,
    onOpenScriptsForProspect,
    onRefresh,
}: ProspectCrmTabProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [form, setForm] = useState<ProspectFormState>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<SalesProspect | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
    const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null)
    const [exporting, setExporting] = useState(false)

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase()
        return prospects.filter((p) => {
            if (statusFilter !== 'ALL' && p.funnel_status !== statusFilter) return false
            if (onlyUrgentFollowups) {
                const urgency = getFollowupUrgency(p)
                if (urgency !== 'overdue' && urgency !== 'today') return false
            }
            if (!q) return true
            return (
                p.clinic_name.toLowerCase().includes(q) ||
                p.program_focus.toLowerCase().includes(q) ||
                p.contact_name.toLowerCase().includes(q) ||
                p.email.toLowerCase().includes(q) ||
                p.city_state.toLowerCase().includes(q) ||
                (p.specialties || []).some((s) => s.toLowerCase().includes(q)) ||
                p.notes.toLowerCase().includes(q)
            )
        })
    }, [prospects, searchTerm, statusFilter, onlyUrgentFollowups])

    const openCreateModal = () => {
        setForm({ ...EMPTY_FORM, next_followup_at: addDaysIsoDate(3) })
        setModalOpen(true)
    }

    const openEditModal = (p: SalesProspect) => {
        setForm({
            id: p.id,
            clinic_name: p.clinic_name,
            program_focus: p.program_focus || '',
            specialties: p.specialties?.length ? [...p.specialties] : ['Fonoaudiologia', 'Terapia Ocupacional'],
            custom_specialty: '',
            contact_name: p.contact_name || '',
            email: p.email || '',
            whatsapp: p.whatsapp || '',
            city_state: p.city_state || '',
            funnel_status: p.funnel_status,
            estimated_professionals: p.estimated_professionals || 5,
            next_followup_at: p.next_followup_at ? p.next_followup_at.slice(0, 10) : '',
            notes: p.notes || '',
        })
        setModalOpen(true)
    }

    const openDuplicateModal = (p: SalesProspect) => {
        setForm({
            clinic_name: `${p.clinic_name} (Cópia)`,
            program_focus: p.program_focus || '',
            specialties: p.specialties?.length ? [...p.specialties] : ['Fonoaudiologia', 'Terapia Ocupacional'],
            custom_specialty: '',
            contact_name: p.contact_name || '',
            email: '',
            whatsapp: '',
            city_state: p.city_state || '',
            funnel_status: 'ABORDADO',
            estimated_professionals: p.estimated_professionals || 5,
            next_followup_at: addDaysIsoDate(3),
            notes: p.notes || '',
        })
        setModalOpen(true)
    }

    const toggleSpecialty = (spec: string) => {
        setForm((prev) => {
            const exists = prev.specialties.includes(spec)
            const next = exists ? prev.specialties.filter((s) => s !== spec) : [...prev.specialties, spec]
            return { ...prev, specialties: next }
        })
    }

    const addCustomSpecialty = () => {
        const val = form.custom_specialty.trim()
        if (!val) return
        if (!form.specialties.includes(val)) {
            setForm((prev) => ({
                ...prev,
                specialties: [...prev.specialties, val],
                custom_specialty: '',
            }))
        } else {
            setForm((prev) => ({ ...prev, custom_specialty: '' }))
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (form.clinic_name.trim().length < 2) {
            toast.error('Informe o nome da clínica.')
            return
        }

        setSaving(true)
        try {
            const url = form.id
                ? `/api/super-admin/prospeccao/prospects/${form.id}`
                : '/api/super-admin/prospeccao/prospects'
            const method = form.id ? 'PATCH' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clinic_name: form.clinic_name.trim(),
                    program_focus: form.program_focus.trim(),
                    specialties: form.specialties.length > 0 ? form.specialties : ['Fonoaudiologia', 'Terapia Ocupacional'],
                    contact_name: form.contact_name.trim(),
                    email: form.email.trim(),
                    whatsapp: form.whatsapp.trim(),
                    city_state: form.city_state.trim(),
                    funnel_status: form.funnel_status,
                    estimated_professionals: Number(form.estimated_professionals) || 5,
                    next_followup_at: form.next_followup_at || null,
                    notes: form.notes.trim(),
                }),
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Erro ao salvar clínica')

            toast.success(form.id ? 'Clínica atualizada no CRM.' : 'Nova clínica cadastrada no CRM.')
            setModalOpen(false)
            await onRefresh()
            if (result.data) {
                onSelectProspect(result.data as SalesProspect)
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Falha ao salvar clínica')
        } finally {
            setSaving(false)
        }
    }

    const handleQuickStatusChange = async (prospect: SalesProspect, nextStatus: FunnelStatus) => {
        setUpdatingStatusId(prospect.id)
        try {
            const payload: Record<string, unknown> = { funnel_status: nextStatus }
            if (nextStatus === 'MATERIAL_ENVIADO' && !prospect.next_followup_at) {
                payload.next_followup_at = addDaysIsoDate(3)
            }
            const res = await fetch(`/api/super-admin/prospeccao/prospects/${prospect.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || 'Falha ao atualizar status')
            }
            toast.success(`${prospect.clinic_name} movida para "${FUNNEL_STATUS_META[nextStatus].label}".`)
            await onRefresh()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao alterar status')
        } finally {
            setUpdatingStatusId(null)
        }
    }

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/super-admin/prospeccao/prospects/${deleteTarget.id}`, {
                method: 'DELETE',
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || 'Falha ao excluir clínica')
            }
            toast.success(`"${deleteTarget.clinic_name}" removida do CRM.`)
            setDeleteTarget(null)
            await onRefresh()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao excluir')
        } finally {
            setDeleting(false)
        }
    }

    const handleCopyEmail = async (prospect: SalesProspect) => {
        if (!prospect.email) return
        await navigator.clipboard.writeText(prospect.email)
        setCopiedEmailId(prospect.id)
        toast.success(`E-mail de ${prospect.clinic_name} copiado.`)
        setTimeout(() => setCopiedEmailId(null), 1800)
    }

    const handleExportExcel = async () => {
        setExporting(true)
        try {
            await exportProspectsToExcel(filtered)
            toast.success(`Planilha exportada (${filtered.length} registro(s)).`)
        } catch {
            toast.error('Falha ao exportar planilha Excel.')
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="space-y-4">
            {/* Barra de Filtros e Ações */}
            <div className="bg-white border border-[#E6E8E5] rounded-xl p-4 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-[#4B5B56] absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar clínica, programa, e-mail, especialidade ou nota..."
                            className="pl-9 min-h-[44px] bg-white border-[#D6DDD9] text-[#0F1F1B]"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant={onlyUrgentFollowups ? 'default' : 'outline'}
                            onClick={() => onToggleUrgentFollowups(!onlyUrgentFollowups)}
                            className={`min-h-[44px] text-xs font-medium ${
                                onlyUrgentFollowups
                                    ? 'bg-amber-700 hover:bg-amber-800 text-white'
                                    : 'border-[#D6DDD9] text-[#0F1F1B] hover:bg-[#F2F5F3]'
                            }`}
                        >
                            <CalendarClock className="w-4 h-4 mr-1.5" />
                            Follow-up Hoje / Atrasados
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleExportExcel}
                            disabled={exporting || filtered.length === 0}
                            className="min-h-[44px] text-xs border-[#D6DDD9] text-[#0F1F1B] hover:bg-[#F2F5F3]"
                        >
                            <Download className="w-4 h-4 mr-1.5" />
                            Exportar Excel
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={onRefresh}
                            disabled={isLoading}
                            className="min-h-[44px] text-xs border-[#D6DDD9] text-[#0F1F1B] hover:bg-[#F2F5F3]"
                        >
                            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>

                        <Button
                            type="button"
                            onClick={openCreateModal}
                            className="min-h-[44px] bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs font-semibold"
                        >
                            <Plus className="w-4 h-4 mr-1.5" />
                            Nova Clínica
                        </Button>
                    </div>
                </div>

                {/* Chips de Estágio do Funil */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#F0F2F0]">
                    <button
                        type="button"
                        onClick={() => onStatusFilterChange('ALL')}
                        className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            statusFilter === 'ALL'
                                ? 'bg-[#0F1F1B] text-white'
                                : 'bg-[#F2F5F3] text-[#4B5B56] hover:bg-[#E6ECE9]'
                        }`}
                    >
                        Todos ({prospects.length})
                    </button>
                    {FUNNEL_STATUSES.map((st) => {
                        const count = prospects.filter((p) => p.funnel_status === st).length
                        const meta = FUNNEL_STATUS_META[st]
                        const active = statusFilter === st
                        return (
                            <button
                                key={st}
                                type="button"
                                onClick={() => onStatusFilterChange(st)}
                                className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                                    active
                                        ? 'bg-[#155E4B] text-white'
                                        : 'bg-[#F2F5F3] text-[#4B5B56] hover:bg-[#E6ECE9]'
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${active ? 'bg-white' : meta.dotClass}`} />
                                {meta.label} ({count})
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Tabela Responsiva do CRM */}
            <div className="bg-white border border-[#E6E8E5] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="min-w-[960px]">
                        <TableHeader>
                            <TableRow className="bg-[#F6F8F7] border-b border-[#E6E8E5]">
                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#4B5B56]">
                                    Clínica / Programa
                                </TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#4B5B56]">
                                    Contato & Canal
                                </TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#4B5B56]">
                                    Estágio do Funil
                                </TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#4B5B56]">
                                    Follow-up
                                </TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#4B5B56]">
                                    Anotações / PDFs
                                </TableHead>
                                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-[#4B5B56]">
                                    Ações Rápidas
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-12 text-center text-sm text-[#4B5B56]">
                                        Nenhuma clínica encontrada com os filtros atuais. Clique em &ldquo;Nova Clínica&rdquo; para cadastrar sua próxima abordagem.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((prospect) => {
                                    const isSelected = prospect.id === selectedProspectId
                                    const urgency = getFollowupUrgency(prospect)
                                    const whatsappUrl = buildWhatsappUrl(prospect.whatsapp)

                                    return (
                                        <TableRow
                                            key={prospect.id}
                                            onClick={() => onSelectProspect(prospect)}
                                            className={`border-b border-[#EEF1EF] cursor-pointer transition-colors ${
                                                isSelected ? 'bg-[#E6F2EE]/55' : 'hover:bg-[#FAFBF9]'
                                            }`}
                                        >
                                            <TableCell className="align-top py-3.5">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        {isSelected && (
                                                            <span className="inline-block w-2 h-2 rounded-full bg-[#155E4B] shrink-0" />
                                                        )}
                                                        <span className="font-semibold text-sm text-[#0F1F1B]">
                                                            {prospect.clinic_name}
                                                        </span>
                                                        <span className="text-[11px] font-mono text-[#4B5B56] bg-[#F2F5F3] px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                                            <Users className="w-3 h-3" />
                                                            {prospect.estimated_professionals}
                                                        </span>
                                                    </div>
                                                    {prospect.program_focus && (
                                                        <p className="text-xs font-medium text-[#155E4B]">
                                                            {prospect.program_focus}
                                                        </p>
                                                    )}
                                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                                        {(prospect.specialties || []).slice(0, 3).map((spec) => (
                                                            <span
                                                                key={spec}
                                                                className="text-[11px] px-2 py-0.5 rounded bg-[#F2F5F3] text-[#4B5B56] border border-[#E6E8E5]"
                                                            >
                                                                {spec}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell className="align-top py-3.5" onClick={(e) => e.stopPropagation()}>
                                                <div className="space-y-1 text-xs">
                                                    <p className="font-medium text-[#0F1F1B]">
                                                        {prospect.contact_name || 'Responsável não informado'}
                                                    </p>
                                                    {prospect.email && (
                                                        <div className="flex items-center gap-1.5 text-[#4B5B56]">
                                                            <Mail className="w-3.5 h-3.5 shrink-0" />
                                                            <span className="truncate max-w-[190px]" title={prospect.email}>
                                                                {prospect.email}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopyEmail(prospect)}
                                                                className="p-1 rounded hover:bg-[#E6ECE9] text-[#155E4B] cursor-pointer"
                                                                title="Copiar e-mail"
                                                            >
                                                                {copiedEmailId === prospect.id ? (
                                                                    <Check className="w-3.5 h-3.5" />
                                                                ) : (
                                                                    <Copy className="w-3.5 h-3.5" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    )}
                                                    {prospect.whatsapp && (
                                                        <div className="flex items-center gap-1.5">
                                                            <MessageCircle className="w-3.5 h-3.5 text-[#155E4B] shrink-0" />
                                                            {whatsappUrl ? (
                                                                <a
                                                                    href={whatsappUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-[#155E4B] hover:underline font-medium"
                                                                >
                                                                    {prospect.whatsapp}
                                                                </a>
                                                            ) : (
                                                                <span className="text-[#4B5B56]">{prospect.whatsapp}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {prospect.city_state && (
                                                        <p className="text-[11px] text-[#4B5B56]">{prospect.city_state}</p>
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell className="align-top py-3.5" onClick={(e) => e.stopPropagation()}>
                                                <select
                                                    aria-label={`Estágio de ${prospect.clinic_name}`}
                                                    value={prospect.funnel_status}
                                                    disabled={updatingStatusId === prospect.id}
                                                    onChange={(e) =>
                                                        handleQuickStatusChange(prospect, e.target.value as FunnelStatus)
                                                    }
                                                    className={`min-h-[36px] text-xs font-semibold rounded-lg border px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#155E4B] ${
                                                        FUNNEL_STATUS_META[prospect.funnel_status].badgeClass
                                                    }`}
                                                >
                                                    {FUNNEL_STATUSES.map((st) => (
                                                        <option key={st} value={st} className="bg-white text-[#0F1F1B]">
                                                            {FUNNEL_STATUS_META[st].label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </TableCell>

                                            <TableCell className="align-top py-3.5">
                                                <div className="space-y-1">
                                                    <span className="text-xs font-mono text-[#0F1F1B] block">
                                                        {formatIsoDateBr(prospect.next_followup_at)}
                                                    </span>
                                                    {urgency === 'overdue' && (
                                                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                                                            <AlertCircle className="w-3 h-3 mr-1" />
                                                            Atrasado
                                                        </Badge>
                                                    )}
                                                    {urgency === 'today' && (
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
                                                            <CalendarClock className="w-3 h-3 mr-1" />
                                                            Hoje
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell className="align-top py-3.5 max-w-[260px]">
                                                <p className="text-xs text-[#4B5B56] line-clamp-2" title={prospect.notes}>
                                                    {prospect.notes || 'Sem anotações'}
                                                </p>
                                                {(prospect.pdf_sent_types || []).length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        {prospect.pdf_sent_types.map((t) => (
                                                            <span
                                                                key={t}
                                                                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#E6F2EE] text-[#114D3E]"
                                                            >
                                                                PDF: {PDF_DOCUMENT_LABELS[t as PdfDocumentType] || t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </TableCell>

                                            <TableCell className="align-top py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => onOpenPdfForProspect(prospect)}
                                                        className="min-h-[36px] px-2.5 bg-[#155E4B] hover:bg-[#0F493A] text-white text-xs"
                                                        title="Gerar PDF personalizado para esta clínica"
                                                    >
                                                        <FileText className="w-3.5 h-3.5 mr-1" />
                                                        PDF
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => onOpenScriptsForProspect(prospect)}
                                                        className="min-h-[36px] px-2.5 border-[#D6DDD9] text-[#0F1F1B] hover:bg-[#F2F5F3] text-xs"
                                                        title="Copiar e-mail ou WhatsApp personalizado"
                                                    >
                                                        <Mail className="w-3.5 h-3.5 mr-1" />
                                                        Script
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openEditModal(prospect)}
                                                        className="min-h-[36px] px-2 border-[#D6DDD9] text-[#0F1F1B] hover:bg-[#F2F5F3]"
                                                        title="Editar clínica"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openDuplicateModal(prospect)}
                                                        className="min-h-[36px] px-2 border-[#D6DDD9] text-[#0F1F1B] hover:bg-[#F2F5F3]"
                                                        title="Duplicar registro"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setDeleteTarget(prospect)}
                                                        className="min-h-[36px] px-2 border-rose-200 text-rose-700 hover:bg-rose-50"
                                                        title="Excluir clínica"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Modal Criar / Editar Clínica */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-[#0F1F1B]">
                            {form.id ? 'Editar Clínica Prospectada' : 'Cadastrar Clínica no CRM de Prospecção'}
                        </DialogTitle>
                        <DialogDescription className="text-[#4B5B56]">
                            Os dados informados aqui preenchem automaticamente os PDFs personalizados e os scripts de e-mail/WhatsApp.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="space-y-1.5">
                                <Label htmlFor="crm-clinic-name">Nome da Clínica *</Label>
                                <Input
                                    id="crm-clinic-name"
                                    required
                                    value={form.clinic_name}
                                    onChange={(e) => setForm((p) => ({ ...p, clinic_name: e.target.value }))}
                                    placeholder="Ex.: Clínica Você"
                                    className="min-h-[44px]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="crm-program-focus">Programa / Especialidade Foco</Label>
                                <Input
                                    id="crm-program-focus"
                                    value={form.program_focus}
                                    onChange={(e) => setForm((p) => ({ ...p, program_focus: e.target.value }))}
                                    placeholder="Ex.: Você TEA, Núcleo ABA, Reabilitação"
                                    className="min-h-[44px]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                            <div className="space-y-1.5">
                                <Label htmlFor="crm-contact">Nome do Responsável</Label>
                                <Input
                                    id="crm-contact"
                                    value={form.contact_name}
                                    onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))}
                                    placeholder="Ex.: Dra. Ana / Coordenação"
                                    className="min-h-[44px]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="crm-email">E-mail</Label>
                                <Input
                                    id="crm-email"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                                    placeholder="contato@clinica.com.br"
                                    className="min-h-[44px]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="crm-whatsapp">WhatsApp</Label>
                                <Input
                                    id="crm-whatsapp"
                                    value={form.whatsapp}
                                    onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
                                    placeholder="(21) 99999-9999"
                                    className="min-h-[44px]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                            <div className="space-y-1.5">
                                <Label htmlFor="crm-status">Estágio no Funil</Label>
                                <select
                                    id="crm-status"
                                    value={form.funnel_status}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, funnel_status: e.target.value as FunnelStatus }))
                                    }
                                    className="w-full min-h-[44px] rounded-md border border-input bg-white px-3 text-sm"
                                >
                                    {FUNNEL_STATUSES.map((st) => (
                                        <option key={st} value={st}>
                                            {FUNNEL_STATUS_META[st].label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="crm-profs">Profissionais (Est.)</Label>
                                <Input
                                    id="crm-profs"
                                    type="number"
                                    min={1}
                                    max={500}
                                    value={form.estimated_professionals}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            estimated_professionals: Math.max(1, Number(e.target.value) || 1),
                                        }))
                                    }
                                    className="min-h-[44px]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="crm-followup">Próximo Follow-up</Label>
                                <Input
                                    id="crm-followup"
                                    type="date"
                                    value={form.next_followup_at}
                                    onChange={(e) => setForm((p) => ({ ...p, next_followup_at: e.target.value }))}
                                    className="min-h-[44px]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="crm-city">Cidade / UF</Label>
                                <Input
                                    id="crm-city"
                                    value={form.city_state}
                                    onChange={(e) => setForm((p) => ({ ...p, city_state: e.target.value }))}
                                    placeholder="Rio de Janeiro / RJ"
                                    className="min-h-[44px]"
                                />
                            </div>
                        </div>

                        {/* Seleção de Especialidades */}
                        <div className="space-y-2">
                            <Label>Especialidades trabalhadas pela clínica</Label>
                            <div className="flex flex-wrap gap-1.5">
                                {COMMON_SPECIALTIES.map((spec) => {
                                    const active = form.specialties.includes(spec)
                                    return (
                                        <button
                                            key={spec}
                                            type="button"
                                            onClick={() => toggleSpecialty(spec)}
                                            className={`min-h-[34px] px-2.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                                                active
                                                    ? 'bg-[#155E4B] text-white border-[#155E4B]'
                                                    : 'bg-white text-[#4B5B56] border-[#D6DDD9] hover:bg-[#F2F5F3]'
                                            }`}
                                        >
                                            {spec}
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    value={form.custom_specialty}
                                    onChange={(e) => setForm((p) => ({ ...p, custom_specialty: e.target.value }))}
                                    placeholder="Adicionar outra especialidade..."
                                    className="min-h-[40px]"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            addCustomSpecialty()
                                        }
                                    }}
                                />
                                <Button type="button" variant="outline" onClick={addCustomSpecialty} className="min-h-[40px]">
                                    Adicionar
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="crm-notes">Anotações comerciais / Histórico da conversa</Label>
                            <Textarea
                                id="crm-notes"
                                rows={3}
                                value={form.notes}
                                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                                placeholder="Ex.: Respondeu pedindo o modelo de relatório para convênio..."
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
                                {saving ? 'Salvando...' : form.id ? 'Salvar Alterações' : 'Cadastrar Clínica'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog de Confirmação de Exclusão (Regra dos Botões Seção 12) */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-[#0F1F1B]">Confirmar Exclusão</DialogTitle>
                        <DialogDescription className="text-[#4B5B56]">
                            Tem certeza que deseja excluir <strong>{deleteTarget?.clinic_name}</strong> do CRM de
                            prospecção? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                            className="min-h-[44px]"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={deleting}
                            onClick={handleConfirmDelete}
                            className="min-h-[44px]"
                        >
                            {deleting ? 'Excluindo...' : 'Excluir Clínica'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

