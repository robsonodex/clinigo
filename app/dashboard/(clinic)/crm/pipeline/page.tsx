'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
    ArrowLeft, RefreshCw, Search, Users, Phone,
    Calendar, DollarSign, AlertCircle,
    CheckCircle2, Loader2, X, ExternalLink,
    Plus, MoreVertical, Copy, Archive, Settings2,
    TrendingUp, Layers, ArrowRight, Info, Trash2,
} from 'lucide-react'
import { useRole } from '@/lib/hooks/use-auth'

interface PipelineStage {
    id: string
    pipeline_id: string
    name: string
    position: number
    color: string
    is_won_stage: boolean
    is_lost_stage: boolean
    cards?: CardItem[]
    cards_count?: number
}

interface CardItem {
    id: string
    pipeline_id: string
    stage_id: string
    patient_id?: string | null
    title: string
    contact_name?: string | null
    contact_phone?: string | null
    contact_email?: string | null
    value?: number
    completed_count?: number
    total_appointments?: number
    last_appointment?: string | null
    doctor_name?: string | null
    notes?: string | null
    is_clinical_patient?: boolean
    is_persisted_card?: boolean
    legacy_stage?: string
}

interface Pipeline {
    id: string
    clinic_id: string
    name: string
    description?: string | null
    color: string
    is_default: boolean
    position: number
    stages: PipelineStage[]
    total_cards?: number
    analytics?: {
        total_cards: number
        stage_metrics: Array<{
            stage_id: string
            stage_name: string
            cards_count: number
            conversion_from_previous: number
        }>
        insight: string
    }
}

interface EditableStage {
    id?: string
    name: string
    color: string
    is_won_stage: boolean
    is_lost_stage: boolean
}

type ToastType = 'success' | 'error' | 'info'
interface Toast { id: number; msg: string; type: ToastType }

const FUNNEL_TEMPLATES = [
    {
        key: 'vendas',
        title: 'Funil de Vendas e Conversão',
        desc: 'Ideal para captação de novos pacientes particulares e procedimentos de alto valor.',
        color: '#0284c7',
        stages: [
            { name: 'Novo Contato', color: '#94a3b8', is_won_stage: false, is_lost_stage: false },
            { name: 'Qualificação', color: '#38bdf8', is_won_stage: false, is_lost_stage: false },
            { name: 'Avaliação / Proposta', color: '#818cf8', is_won_stage: false, is_lost_stage: false },
            { name: 'Em Negociação', color: '#fbbf24', is_won_stage: false, is_lost_stage: false },
            { name: 'Fechado (Ganho)', color: '#10b981', is_won_stage: true, is_lost_stage: false },
            { name: 'Perdido', color: '#ef4444', is_won_stage: false, is_lost_stage: true },
        ],
    },
    {
        key: 'recuperacao',
        title: 'Recuperação de Inativos',
        desc: 'Reativação de pacientes que não consultam há mais de 30 dias.',
        color: '#f59e0b',
        stages: [
            { name: 'Inativo 30+ Dias', color: '#94a3b8', is_won_stage: false, is_lost_stage: false },
            { name: 'Tentativa de Contato', color: '#38bdf8', is_won_stage: false, is_lost_stage: false },
            { name: 'Agendou Retorno', color: '#10b981', is_won_stage: true, is_lost_stage: false },
            { name: 'Sem Interesse', color: '#ef4444', is_won_stage: false, is_lost_stage: true },
        ],
    },
    {
        key: 'pos_atendimento',
        title: 'Pós-Atendimento e Fidelização',
        desc: 'Acompanhamento pós-consulta, envio de pesquisas e retenção contínua.',
        color: '#10b981',
        stages: [
            { name: 'Consulta Concluída', color: '#94a3b8', is_won_stage: false, is_lost_stage: false },
            { name: 'Pesquisa NPS', color: '#38bdf8', is_won_stage: false, is_lost_stage: false },
            { name: 'Retorno Previsto', color: '#fbbf24', is_won_stage: false, is_lost_stage: false },
            { name: 'Fidelizado', color: '#10b981', is_won_stage: true, is_lost_stage: false },
        ],
    },
    {
        key: 'padrao',
        title: 'Funil Clínico Tradicional',
        desc: 'Fluxo clássico de pacientes integrados com agendamentos e consultas.',
        color: '#6366f1',
        stages: [
            { name: 'Leads', color: '#94a3b8', is_won_stage: false, is_lost_stage: false },
            { name: 'Agendou', color: '#38bdf8', is_won_stage: false, is_lost_stage: false },
            { name: 'Compareceu', color: '#34d399', is_won_stage: false, is_lost_stage: false },
            { name: 'Retornou', color: '#818cf8', is_won_stage: false, is_lost_stage: false },
            { name: 'Recorrente', color: '#10b981', is_won_stage: true, is_lost_stage: false },
        ],
    },
]

const EMPTY_CARD_FORM = {
    title: '',
    stage_id: '',
    contact_phone: '',
    contact_email: '',
    value: '',
    notes: '',
}

export default function PipelinePage() {
    const router = useRouter()
    const { isClinicAdmin, isSuperAdmin, loading: roleLoading } = useRole()

    // Estados dos Funis
    const [pipelinesList, setPipelinesList] = useState<Pipeline[]>([])
    const [activePipelineId, setActivePipelineId] = useState<string>('')
    const [currentPipeline, setCurrentPipeline] = useState<Pipeline | null>(null)
    const [loadingPipelines, setLoadingPipelines] = useState<boolean>(true)
    const [loadingBoard, setLoadingBoard] = useState<boolean>(false)

    // Estados de Busca e Toast
    const [search, setSearch] = useState<string>('')
    const [toasts, setToasts] = useState<Toast[]>([])

    // Estados de Drag-and-Drop
    const [draggingCardId, setDraggingCardId] = useState<string | null>(null)
    const [draggingFromStageId, setDraggingFromStageId] = useState<string | null>(null)
    const [dropTargetStageId, setDropTargetStageId] = useState<string | null>(null)
    const [processingCardId, setProcessingCardId] = useState<string | null>(null)
    const toastId = useRef(0)

    // Modal de Criação de Funil
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [createStep, setCreateStep] = useState<1 | 2 | 3>(1)
    const [newFunnelName, setNewFunnelName] = useState('')
    const [newFunnelDesc, setNewFunnelDesc] = useState('')
    const [newFunnelColor, setNewFunnelColor] = useState('#0284c7')
    const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('vendas')
    const [customStages, setCustomStages] = useState<EditableStage[]>([])
    const [savingFunnel, setSavingFunnel] = useState(false)

    // Modal de Edição de Funil
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editFunnelName, setEditFunnelName] = useState('')
    const [editFunnelDesc, setEditFunnelDesc] = useState('')
    const [editStages, setEditStages] = useState<EditableStage[]>([])

    // Modal de Novo Card / Lead
    const [isNewCardModalOpen, setIsNewCardModalOpen] = useState(false)
    const [cardForm, setCardForm] = useState(EMPTY_CARD_FORM)
    const [savingCard, setSavingCard] = useState(false)

    // Modal de Arquivamento
    const [pipelineToArchive, setPipelineToArchive] = useState<Pipeline | null>(null)
    const [archiving, setArchiving] = useState(false)

    const toast = useCallback((msg: string, type: ToastType = 'info') => {
        const id = ++toastId.current
        setToasts(t => [...t, { id, msg, type }])
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
    }, [])

    const loadPipelines = useCallback(async () => {
        if (!isClinicAdmin && !isSuperAdmin) return
        setLoadingPipelines(true)
        try {
            const res = await fetch('/api/crm/pipelines')
            if (res.status === 403) {
                toast('Acesso restrito ao administrador', 'error')
                return
            }
            const data = await res.json()
            if (data.pipelines && Array.isArray(data.pipelines)) {
                setPipelinesList(data.pipelines)
                setActivePipelineId(prev => {
                    if (prev && data.pipelines.some((p: Pipeline) => p.id === prev)) return prev
                    return data.active_pipeline_id || data.pipelines[0]?.id || ''
                })
            }
        } catch {
            toast('Erro ao carregar lista de funis', 'error')
        } finally {
            setLoadingPipelines(false)
        }
    }, [isClinicAdmin, isSuperAdmin, toast])

    const loadActivePipelineDetail = useCallback(async (pipeId: string) => {
        if (!pipeId) return
        setLoadingBoard(true)
        try {
            const res = await fetch(`/api/crm/pipelines/${pipeId}`)
            if (res.status === 403) {
                toast('Acesso restrito ao administrador', 'error')
                return
            }
            const data = await res.json()
            if (data.pipeline) {
                setCurrentPipeline(data.pipeline)
                setPipelinesList(prev => prev.map(p => p.id === data.pipeline.id ? { ...p, total_cards: data.pipeline.total_cards } : p))
            }
        } catch {
            toast('Erro ao carregar board do funil', 'error')
        } finally {
            setLoadingBoard(false)
        }
    }, [toast])

    useEffect(() => {
        if (!roleLoading) {
            if (isClinicAdmin || isSuperAdmin) {
                loadPipelines()
            } else {
                router.replace('/dashboard?error=unauthorized_role')
            }
        }
    }, [roleLoading, isClinicAdmin, isSuperAdmin, loadPipelines, router])

    useEffect(() => {
        if (activePipelineId) {
            loadActivePipelineDetail(activePipelineId)
        }
    }, [activePipelineId, loadActivePipelineDetail])

    // ── Novo Funil ───────────────────────────────────────────────────────────
    function handleOpenCreateModal(templateKey = 'vendas') {
        const tpl = FUNNEL_TEMPLATES.find(t => t.key === templateKey) || FUNNEL_TEMPLATES[0]
        setSelectedTemplateKey(tpl.key)
        setNewFunnelName(tpl.title)
        setNewFunnelDesc(tpl.desc)
        setNewFunnelColor(tpl.color)
        setCustomStages(tpl.stages.map(s => ({ ...s })))
        setCreateStep(1)
        setIsCreateModalOpen(true)
    }

    function handleApplyTemplate(templateKey: string) {
        const tpl = FUNNEL_TEMPLATES.find(t => t.key === templateKey)
        if (!tpl) return
        setSelectedTemplateKey(tpl.key)
        setNewFunnelName(tpl.title)
        setNewFunnelDesc(tpl.desc)
        setNewFunnelColor(tpl.color)
        setCustomStages(tpl.stages.map(s => ({ ...s })))
    }

    async function handleCreatePipeline() {
        if (!newFunnelName.trim()) {
            toast('Informe o nome do funil', 'error')
            return
        }
        if (customStages.length < 2) {
            toast('O funil deve possuir ao menos 2 etapas', 'error')
            return
        }

        setSavingFunnel(true)
        try {
            const res = await fetch('/api/crm/pipelines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newFunnelName.trim(),
                    description: newFunnelDesc.trim() || null,
                    color: newFunnelColor,
                    stages: customStages,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast(data.error || 'Erro ao criar funil', 'error')
                return
            }

            toast('Novo funil criado com sucesso', 'success')
            setIsCreateModalOpen(false)
            await loadPipelines()
            if (data.pipeline?.id) {
                setActivePipelineId(data.pipeline.id)
            }
        } catch {
            toast('Erro ao processar criação de funil', 'error')
        } finally {
            setSavingFunnel(false)
        }
    }

    // ── Editar Funil ─────────────────────────────────────────────────────────
    function handleOpenEditModal() {
        if (!currentPipeline) return
        setEditFunnelName(currentPipeline.name)
        setEditFunnelDesc(currentPipeline.description || '')
        setEditStages(
            (currentPipeline.stages || []).map(st => ({
                id: st.id,
                name: st.name,
                color: st.color || '#64748b',
                is_won_stage: st.is_won_stage,
                is_lost_stage: st.is_lost_stage,
            }))
        )
        setIsEditModalOpen(true)
    }

    async function handleSaveEditPipeline() {
        if (!currentPipeline) return
        if (!editFunnelName.trim()) {
            toast('Informe o nome do funil', 'error')
            return
        }
        if (editStages.length < 2) {
            toast('O funil deve possuir ao menos 2 etapas', 'error')
            return
        }

        setSavingFunnel(true)
        try {
            const res = await fetch(`/api/crm/pipelines/${currentPipeline.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editFunnelName.trim(),
                    description: editFunnelDesc.trim() || null,
                    stages: editStages.map((s, idx) => ({ ...s, position: idx })),
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast(data.error || 'Erro ao atualizar funil', 'error')
                return
            }
            toast('Funil atualizado com sucesso', 'success')
            setIsEditModalOpen(false)
            await loadPipelines()
            await loadActivePipelineDetail(currentPipeline.id)
        } catch {
            toast('Erro ao atualizar funil', 'error')
        } finally {
            setSavingFunnel(false)
        }
    }

    // ── Novo Card / Excluir Card ─────────────────────────────────────────────
    function handleOpenNewCardModal(defaultStageId?: string) {
        if (!currentPipeline || !currentPipeline.stages?.length) return
        setCardForm({
            ...EMPTY_CARD_FORM,
            stage_id: defaultStageId || currentPipeline.stages[0].id,
        })
        setIsNewCardModalOpen(true)
    }

    async function handleCreateCard() {
        if (!currentPipeline) return
        if (!cardForm.title.trim() || !cardForm.stage_id) {
            toast('Informe o nome do lead e a etapa inicial', 'error')
            return
        }

        setSavingCard(true)
        try {
            const res = await fetch('/api/crm/pipeline-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pipeline_id: currentPipeline.id,
                    stage_id: cardForm.stage_id,
                    title: cardForm.title.trim(),
                    contact_name: cardForm.title.trim(),
                    contact_phone: cardForm.contact_phone.trim() || null,
                    contact_email: cardForm.contact_email.trim() || null,
                    value: cardForm.value ? Number(cardForm.value) : 0,
                    notes: cardForm.notes.trim() || null,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast(data.error || 'Erro ao criar cartão', 'error')
                return
            }

            toast('Cartão adicionado ao funil', 'success')
            setIsNewCardModalOpen(false)
            setCardForm(EMPTY_CARD_FORM)
            await loadActivePipelineDetail(currentPipeline.id)
        } catch {
            toast('Erro ao criar cartão', 'error')
        } finally {
            setSavingCard(false)
        }
    }

    async function handleDeleteCard(card: CardItem) {
        if (!currentPipeline) return
        if (!confirm(`Tem certeza que deseja excluir o cartão "${card.title || card.contact_name}"? Esta ação não pode ser desfeita.`)) {
            return
        }
        try {
            const res = await fetch(`/api/crm/pipeline-cards?id=${card.id}`, { method: 'DELETE' })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast(data.error || 'Erro ao excluir cartão', 'error')
                return
            }
            toast('Cartão excluído com sucesso', 'success')
            await loadActivePipelineDetail(currentPipeline.id)
        } catch {
            toast('Erro ao excluir cartão', 'error')
        }
    }

    // ── Duplicar / Arquivar Funil ────────────────────────────────────────────
    async function handleDuplicatePipeline(pipeId: string) {
        try {
            toast('Duplicando funil...', 'info')
            const res = await fetch(`/api/crm/pipelines/${pipeId}/duplicate`, {
                method: 'POST',
            })
            const data = await res.json()
            if (!res.ok) {
                toast(data.error || 'Erro ao duplicar funil', 'error')
                return
            }
            toast('Funil duplicado com sucesso', 'success')
            await loadPipelines()
            if (data.pipeline?.id) {
                setActivePipelineId(data.pipeline.id)
            }
        } catch {
            toast('Erro ao duplicar funil', 'error')
        }
    }

    async function handleConfirmArchive() {
        if (!pipelineToArchive) return
        setArchiving(true)
        try {
            const res = await fetch(`/api/crm/pipelines/${pipelineToArchive.id}`, {
                method: 'DELETE',
            })
            const data = await res.json()
            if (!res.ok) {
                toast(data.error || 'Erro ao arquivar funil', 'error')
                setPipelineToArchive(null)
                return
            }
            toast(data.message || 'Funil arquivado com sucesso', 'success')
            setPipelineToArchive(null)
            const remaining = pipelinesList.filter(p => p.id !== pipelineToArchive.id)
            setPipelinesList(remaining)
            if (remaining.length > 0) {
                setActivePipelineId(remaining[0].id)
            }
        } catch {
            toast('Erro ao arquivar funil', 'error')
        } finally {
            setArchiving(false)
        }
    }

    // ── Drag and Drop Handlers ───────────────────────────────────────────────
    function onDragStart(e: React.DragEvent, card: CardItem, stageId: string) {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('card_id', card.id)
        e.dataTransfer.setData('from_stage_id', stageId)
        e.dataTransfer.setData('card_title', card.title || card.contact_name || '')
        setDraggingCardId(card.id)
        setDraggingFromStageId(stageId)
    }

    function onDragEnd() {
        setDraggingCardId(null)
        setDraggingFromStageId(null)
        setDropTargetStageId(null)
    }

    function onDragOver(e: React.DragEvent, toStageId: string) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDropTargetStageId(toStageId)
    }

    function onDragLeave() {
        setDropTargetStageId(null)
    }

    async function onDrop(e: React.DragEvent, toStage: PipelineStage) {
        e.preventDefault()
        setDropTargetStageId(null)

        const cardId = e.dataTransfer.getData('card_id')
        const fromStageId = e.dataTransfer.getData('from_stage_id')
        const cardTitle = e.dataTransfer.getData('card_title')

        if (!cardId || fromStageId === toStage.id || !currentPipeline) return

        const previousPipeline = JSON.parse(JSON.stringify(currentPipeline))

        setCurrentPipeline(prev => {
            if (!prev) return prev
            const cardToMove = prev.stages.find(s => s.id === fromStageId)?.cards?.find(c => c.id === cardId)
            if (!cardToMove) return prev

            const nextStages = prev.stages.map(st => {
                if (st.id === fromStageId) {
                    return {
                        ...st,
                        cards: (st.cards || []).filter(c => c.id !== cardId),
                        cards_count: Math.max(0, (st.cards_count || 1) - 1),
                    }
                }
                if (st.id === toStage.id) {
                    const updated = { ...cardToMove, stage_id: toStage.id }
                    return {
                        ...st,
                        cards: [...(st.cards || []), updated],
                        cards_count: (st.cards_count || 0) + 1,
                    }
                }
                return st
            })
            return { ...prev, stages: nextStages }
        })

        setProcessingCardId(cardId)

        try {
            const res = await fetch(`/api/crm/pipeline-cards/${cardId}/move`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stage_id: toStage.id,
                    target_pipeline_id: currentPipeline.id,
                    target_stage_name: toStage.name,
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                setCurrentPipeline(previousPipeline)
                toast(data.error || 'Não foi possível mover o cartão', 'error')
                return
            }

            // Sincronizar ID persistido se o card clínico acabou de ser materializado em crm_pipeline_cards
            if (data.card?.id && data.card.id !== cardId) {
                setCurrentPipeline(prev => {
                    if (!prev) return prev
                    return {
                        ...prev,
                        stages: prev.stages.map(st => ({
                            ...st,
                            cards: (st.cards || []).map(c =>
                                c.id === cardId ? { ...c, id: data.card.id, is_persisted_card: true } : c
                            ),
                        })),
                    }
                })
            }

            toast(`Cartão "${cardTitle}" movido para ${toStage.name}`, 'success')
        } catch {
            setCurrentPipeline(previousPipeline)
            toast('Erro de conexão ao mover cartão', 'error')
        } finally {
            setProcessingCardId(null)
            setDraggingCardId(null)
            setDraggingFromStageId(null)
        }
    }

    function filterCards(cards: CardItem[] = []) {
        if (!search.trim()) return cards
        const q = search.toLowerCase()
        return cards.filter(c =>
            (c.title && c.title.toLowerCase().includes(q)) ||
            (c.contact_name && c.contact_name.toLowerCase().includes(q)) ||
            (c.contact_phone && c.contact_phone.includes(q)) ||
            (c.doctor_name && c.doctor_name.toLowerCase().includes(q))
        )
    }

    const initials = (name: string) => (name || 'P').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

    if (loadingPipelines || roleLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
                <p className="text-xs text-slate-500 font-medium">Carregando funis do CRM...</p>
            </div>
        )
    }

    if (!isClinicAdmin && !isSuperAdmin) {
        return null
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Toasts */}
            <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`flex items-start gap-2.5 p-3.5 rounded-lg shadow-md text-xs font-medium text-white transition-all ${
                            t.type === 'success' ? 'bg-slate-900 border border-slate-700' :
                            t.type === 'error' ? 'bg-rose-900 border border-rose-700' :
                            'bg-slate-800 border border-slate-700'
                        }`}
                    >
                        {t.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />}
                        {t.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />}
                        {t.type === 'info' && <Info className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />}
                        <span className="flex-1 leading-relaxed">{t.msg}</span>
                        <button
                            type="button"
                            onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}
                            className="text-slate-400 hover:text-white rounded-md"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard/crm"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors px-2.5 py-1.5 -ml-1.5 rounded-md hover:bg-slate-100"
                        >
                            <ArrowLeft className="w-4 h-4" /> CRM
                        </Link>
                        <div className="h-4 w-px bg-slate-200" />
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold text-slate-900">
                                    {currentPipeline?.name || 'Pipeline de CRM'}
                                </h1>
                                {currentPipeline?.is_default && (
                                    <Badge variant="secondary" className="text-[10px] uppercase font-semibold tracking-wider bg-slate-100 text-slate-600">
                                        Padrão
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {currentPipeline?.description || 'Gestão de leads e jornada do paciente'}
                            </p>
                        </div>
                    </div>

                    {/* Ações do Topo */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Filtrar cartões..."
                                className="pl-9 w-44 lg:w-56 h-9 text-xs border-slate-200 bg-slate-50 focus:bg-white"
                            />
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => currentPipeline && loadActivePipelineDetail(currentPipeline.id)}
                            className="h-9 rounded-md gap-1.5 text-xs text-slate-700 border-slate-200"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loadingBoard ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>

                        {currentPipeline && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenNewCardModal()}
                                className="h-9 rounded-md gap-1.5 text-xs text-slate-800 border-slate-300 hover:bg-slate-100"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Novo Card
                            </Button>
                        )}

                        <Button
                            onClick={() => handleOpenCreateModal()}
                            size="sm"
                            className="h-9 rounded-md gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Novo Funil
                        </Button>

                        {currentPipeline && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-md border-slate-200 text-slate-600">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem
                                        onClick={handleOpenEditModal}
                                        className="text-xs gap-2 cursor-pointer"
                                    >
                                        <Settings2 className="w-3.5 h-3.5" />
                                        Editar Funil e Etapas
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => handleDuplicatePipeline(currentPipeline.id)}
                                        className="text-xs gap-2 cursor-pointer"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        Duplicar Funil
                                    </DropdownMenuItem>
                                    {!currentPipeline.is_default && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => setPipelineToArchive(currentPipeline)}
                                                className="text-xs gap-2 text-rose-600 focus:text-rose-700 cursor-pointer"
                                            >
                                                <Archive className="w-3.5 h-3.5" />
                                                Arquivar Funil
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {/* Barra de Abas de Funis */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 overflow-x-auto pb-1 scrollbar-thin">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" /> Funis:
                    </span>
                    {pipelinesList.map(pipe => {
                        const isActive = pipe.id === activePipelineId
                        return (
                            <button
                                key={pipe.id}
                                type="button"
                                onClick={() => setActivePipelineId(pipe.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 border ${
                                    isActive
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: pipe.color || '#0284c7' }}
                                />
                                <span>{pipe.name}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                    isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {pipe.total_cards ?? 0}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </header>

            {/* Painel Executivo / Analytics */}
            {currentPipeline?.analytics && (
                <div className="bg-white border-b border-slate-200 px-6 py-3">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-1.5 text-slate-600">
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                                <span className="font-semibold text-slate-900">Métricas do Funil:</span>
                                <span>{currentPipeline.analytics.total_cards} cartões em {currentPipeline.stages?.length || 0} etapas</span>
                            </div>
                            <div className="h-3 w-px bg-slate-200 hidden sm:block" />
                            <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
                                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{currentPipeline.analytics.insight}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Board Kanban */}
            <main className="flex-1 overflow-x-auto px-6 py-5">
                {loadingBoard ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                    </div>
                ) : (
                    <div className="flex gap-4 min-w-max items-start h-[calc(100vh-250px)]">
                        {currentPipeline?.stages?.map(stage => {
                            const cards = filterCards(stage.cards || [])
                            const isDropTarget = dropTargetStageId === stage.id
                            const isDraggingFromThis = draggingFromStageId === stage.id

                            return (
                                <div
                                    key={stage.id}
                                    onDragOver={e => onDragOver(e, stage.id)}
                                    onDragLeave={onDragLeave}
                                    onDrop={e => onDrop(e, stage)}
                                    className={`flex flex-col w-72 rounded-xl border transition-all duration-150 bg-white max-h-full ${
                                        isDropTarget
                                            ? 'border-slate-800 ring-2 ring-slate-800/10 shadow-md'
                                            : isDraggingFromThis
                                            ? 'border-dashed border-slate-300 opacity-60'
                                            : 'border-slate-200 shadow-sm'
                                    }`}
                                >
                                    {/* Cabeçalho da Etapa */}
                                    <div className="p-3.5 border-b border-slate-100 shrink-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: stage.color || '#64748b' }}
                                                />
                                                <span className="font-semibold text-xs text-slate-900 truncate">
                                                    {stage.name}
                                                </span>
                                                {stage.is_won_stage && (
                                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] px-1 py-0">
                                                        Ganho
                                                    </Badge>
                                                )}
                                                {stage.is_lost_stage && (
                                                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] px-1 py-0">
                                                        Perdido
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    {cards.length}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenNewCardModal(stage.id)}
                                                    className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md"
                                                    title={`Adicionar cartão em ${stage.name}`}
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Drop Zone */}
                                    {isDropTarget && (
                                        <div className="mx-3 mt-3 border-2 border-dashed border-slate-400 bg-slate-50 rounded-lg p-2.5 text-center shrink-0">
                                            <p className="text-[11px] font-medium text-slate-700 flex items-center justify-center gap-1">
                                                <ArrowRight className="w-3 h-3 text-slate-500" />
                                                Soltar para mover para {stage.name}
                                            </p>
                                        </div>
                                    )}

                                    {/* Lista de Cartões */}
                                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[120px]">
                                        {cards.length === 0 && !isDropTarget && (
                                            <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                                                <Users className="w-6 h-6 mb-1 text-slate-300" />
                                                <p className="text-[11px] text-slate-400">Nenhum cartão nesta etapa</p>
                                            </div>
                                        )}

                                        {cards.map(card => {
                                            const isProcessing = processingCardId === card.id
                                            const isDragging = draggingCardId === card.id

                                            return (
                                                <div
                                                    key={card.id}
                                                    draggable
                                                    onDragStart={e => onDragStart(e, card, stage.id)}
                                                    onDragEnd={onDragEnd}
                                                    className={`group relative bg-white rounded-lg border border-slate-200 p-3 select-none transition-all duration-150 shadow-sm hover:border-slate-300 hover:shadow ${
                                                        isDragging ? 'opacity-30 scale-95' : 'cursor-grab active:cursor-grabbing'
                                                    } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                                                    style={{ borderLeft: `3px solid ${stage.color || '#64748b'}` }}
                                                >
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div
                                                                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                                                                style={{ backgroundColor: stage.color || '#64748b' }}
                                                            >
                                                                {initials(card.title || card.contact_name || '')}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-slate-900 truncate">
                                                                    {card.title || card.contact_name}
                                                                </p>
                                                                {card.doctor_name && (
                                                                    <p className="text-[10px] text-slate-500 truncate">
                                                                        {card.doctor_name}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {isProcessing ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600 shrink-0" />
                                                        ) : (card.is_persisted_card && !card.is_clinical_patient) ? (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleDeleteCard(card)
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 rounded-md transition-opacity"
                                                                title="Excluir cartão"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        ) : null}
                                                    </div>

                                                    <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-2">
                                                        {typeof card.completed_count === 'number' && (
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3 text-slate-400" />
                                                                {card.completed_count} consulta{card.completed_count !== 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                        {typeof card.value === 'number' && card.value > 0 && (
                                                            <span className="flex items-center gap-1 font-medium text-slate-700">
                                                                <DollarSign className="w-3 h-3 text-slate-400" />
                                                                {card.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {card.notes && (
                                                        <p className="text-[10px] text-slate-500 mt-1.5 line-clamp-2">{card.notes}</p>
                                                    )}

                                                    <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-slate-100 text-[10px]">
                                                        {card.contact_phone ? (
                                                            <a
                                                                href={`https://wa.me/55${card.contact_phone.replace(/\D/g, '')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={e => e.stopPropagation()}
                                                                className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-medium py-1 px-1.5 rounded-md hover:bg-slate-50"
                                                            >
                                                                <Phone className="w-3 h-3 text-emerald-600" /> WhatsApp
                                                            </a>
                                                        ) : (
                                                            <span />
                                                        )}

                                                        {card.patient_id ? (
                                                            <Link
                                                                href={`/dashboard/pacientes/${card.patient_id}`}
                                                                onClick={e => e.stopPropagation()}
                                                                className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium py-1 px-1.5 rounded-md hover:bg-slate-50"
                                                            >
                                                                <ExternalLink className="w-3 h-3 text-slate-400" /> Ficha
                                                            </Link>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* Modal: Novo Card / Lead */}
            <Dialog open={isNewCardModalOpen} onOpenChange={setIsNewCardModalOpen}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
                    <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
                        <DialogTitle className="text-base font-bold text-slate-900">Novo Cartão no Funil</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Adicione um lead ou oportunidade ao funil &quot;{currentPipeline?.name}&quot;
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Nome do Lead / Título *</Label>
                            <Input
                                value={cardForm.title}
                                onChange={e => setCardForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="Ex: Maria Oliveira - Avaliação Inicial"
                                className="h-9 text-xs"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Etapa Inicial *</Label>
                                <Select
                                    value={cardForm.stage_id}
                                    onValueChange={v => setCardForm(f => ({ ...f, stage_id: v }))}
                                >
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>
                                        {(currentPipeline?.stages || []).map(st => (
                                            <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Valor Estimado (R$)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={cardForm.value}
                                    onChange={e => setCardForm(f => ({ ...f, value: e.target.value }))}
                                    placeholder="0,00"
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">WhatsApp / Telefone</Label>
                                <Input
                                    value={cardForm.contact_phone}
                                    onChange={e => setCardForm(f => ({ ...f, contact_phone: e.target.value }))}
                                    placeholder="(11) 99999-9999"
                                    className="h-9 text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">Email</Label>
                                <Input
                                    type="email"
                                    value={cardForm.contact_email}
                                    onChange={e => setCardForm(f => ({ ...f, contact_email: e.target.value }))}
                                    placeholder="contato@exemplo.com"
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Observações</Label>
                            <Textarea
                                value={cardForm.notes}
                                onChange={e => setCardForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder="Interesse, origem do contato ou próximos passos..."
                                rows={2}
                                className="text-xs"
                            />
                        </div>
                    </div>
                    <DialogFooter className="px-5 py-3 border-t bg-slate-50/70 shrink-0 flex flex-row justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={savingCard}
                            onClick={() => setIsNewCardModalOpen(false)}
                            className="h-9 rounded-md text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={savingCard}
                            onClick={handleCreateCard}
                            className="h-9 rounded-md text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
                        >
                            {savingCard && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Adicionar Cartão
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Criar Novo Funil */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-xl max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
                    <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
                        <DialogTitle className="text-base font-bold text-slate-900">
                            {createStep === 1 && 'Novo Funil de CRM: Informações Básicas'}
                            {createStep === 2 && 'Configurar Etapas do Funil'}
                            {createStep === 3 && 'Revisão e Confirmação'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Passo {createStep} de 3 • Personalize o fluxo de atendimento da sua clínica
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                        {createStep === 1 && (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Nome do Funil *</label>
                                    <Input
                                        value={newFunnelName}
                                        onChange={e => setNewFunnelName(e.target.value)}
                                        placeholder="Ex: Funil de Vendas de Procedimentos"
                                        className="text-xs h-9"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 mb-1 block">Descrição Operacional</label>
                                    <Textarea
                                        value={newFunnelDesc}
                                        onChange={e => setNewFunnelDesc(e.target.value)}
                                        placeholder="Descreva o propósito deste funil para a equipe"
                                        className="text-xs min-h-[56px]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 mb-2 block">Modelos Prontos (Templates)</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {FUNNEL_TEMPLATES.map(tpl => {
                                            const isSelected = selectedTemplateKey === tpl.key
                                            return (
                                                <button
                                                    key={tpl.key}
                                                    type="button"
                                                    onClick={() => handleApplyTemplate(tpl.key)}
                                                    className={`p-3 rounded-md border text-left transition-all ${
                                                        isSelected
                                                            ? 'border-slate-900 bg-slate-50/80 ring-1 ring-slate-900'
                                                            : 'border-slate-200 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-bold text-slate-900">{tpl.title}</span>
                                                        <span
                                                            className="w-2.5 h-2.5 rounded-full"
                                                            style={{ backgroundColor: tpl.color }}
                                                        />
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{tpl.desc}</p>
                                                    <div className="mt-1.5 text-[10px] text-slate-400">{tpl.stages.length} etapas inclusas</div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {createStep === 2 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-700">Etapas ({customStages.length})</span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCustomStages(prev => [
                                            ...prev,
                                            { name: `Nova Etapa ${prev.length + 1}`, color: '#64748b', is_won_stage: false, is_lost_stage: false },
                                        ])}
                                        className="h-8 rounded-md text-xs gap-1 border-slate-200"
                                    >
                                        <Plus className="w-3 h-3" /> Adicionar Etapa
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {customStages.map((st, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                        >
                                            <span className="text-slate-400 font-bold w-4 text-center">{idx + 1}</span>
                                            <Input
                                                value={st.name}
                                                onChange={e => {
                                                    const updated = [...customStages]
                                                    updated[idx].name = e.target.value
                                                    setCustomStages(updated)
                                                }}
                                                className="h-8 text-xs bg-white"
                                            />
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={st.is_won_stage}
                                                        onChange={e => {
                                                            const updated = [...customStages]
                                                            updated[idx].is_won_stage = e.target.checked
                                                            if (e.target.checked) updated[idx].is_lost_stage = false
                                                            setCustomStages(updated)
                                                        }}
                                                        className="rounded text-slate-900"
                                                    />
                                                    Ganho
                                                </label>
                                                <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={st.is_lost_stage}
                                                        onChange={e => {
                                                            const updated = [...customStages]
                                                            updated[idx].is_lost_stage = e.target.checked
                                                            if (e.target.checked) updated[idx].is_won_stage = false
                                                            setCustomStages(updated)
                                                        }}
                                                        className="rounded text-slate-900"
                                                    />
                                                    Perdido
                                                </label>
                                            </div>
                                            {customStages.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCustomStages(prev => prev.filter((_, i) => i !== idx))}
                                                    className="text-slate-400 hover:text-rose-600 p-1 rounded-md"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {createStep === 3 && (
                            <div className="space-y-4">
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                                    <div className="font-bold text-slate-900">{newFunnelName}</div>
                                    {newFunnelDesc && <div className="text-slate-500">{newFunnelDesc}</div>}
                                </div>

                                <div>
                                    <span className="text-xs font-semibold text-slate-700 block mb-2">Pré-Visualização do Fluxo:</span>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {customStages.map((st, i) => (
                                            <div
                                                key={i}
                                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-center shrink-0 min-w-[120px]"
                                            >
                                                <div className="text-[10px] font-bold text-slate-400 mb-0.5">Etapa {i + 1}</div>
                                                <div className="text-xs font-semibold text-slate-800">{st.name}</div>
                                                {st.is_won_stage && (
                                                    <span className="inline-block mt-1 text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                                                        Meta (Ganho)
                                                    </span>
                                                )}
                                                {st.is_lost_stage && (
                                                    <span className="inline-block mt-1 text-[9px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-bold">
                                                        Descarte
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 shrink-0 flex flex-row items-center justify-between sm:justify-between">
                        {createStep > 1 ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setCreateStep(s => (s - 1) as 1 | 2 | 3)}
                                className="h-9 rounded-md text-xs border-slate-200"
                            >
                                Voltar
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="h-9 rounded-md text-xs border-slate-200"
                            >
                                Cancelar
                            </Button>
                        )}

                        {createStep < 3 ? (
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                    if (createStep === 1 && !newFunnelName.trim()) {
                                        toast('Informe o nome do funil', 'error')
                                        return
                                    }
                                    setCreateStep(s => (s + 1) as 1 | 2 | 3)
                                }}
                                className="h-9 rounded-md text-xs bg-slate-900 hover:bg-slate-800 text-white"
                            >
                                Avançar
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                disabled={savingFunnel}
                                onClick={handleCreatePipeline}
                                className="h-9 rounded-md text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
                            >
                                {savingFunnel && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {savingFunnel ? 'Criando...' : 'Confirmar e Criar Funil'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Editar Funil e Etapas */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-xl max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
                    <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
                        <DialogTitle className="text-base font-bold text-slate-900">Editar Funil e Etapas</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Atualize o nome, descrição e etapas de &quot;{currentPipeline?.name}&quot;
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Nome do Funil *</Label>
                            <Input
                                value={editFunnelName}
                                onChange={e => setEditFunnelName(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Descrição</Label>
                            <Input
                                value={editFunnelDesc}
                                onChange={e => setEditFunnelDesc(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>
                        <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-700">Etapas ({editStages.length})</span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditStages(prev => [
                                        ...prev,
                                        { name: `Nova Etapa ${prev.length + 1}`, color: '#64748b', is_won_stage: false, is_lost_stage: false },
                                    ])}
                                    className="h-8 rounded-md text-xs gap-1"
                                >
                                    <Plus className="w-3 h-3" /> Adicionar Etapa
                                </Button>
                            </div>
                            {editStages.map((st, idx) => (
                                <div key={st.id || idx} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                                    <span className="text-slate-400 font-bold w-4 text-center">{idx + 1}</span>
                                    <Input
                                        value={st.name}
                                        onChange={e => {
                                            const updated = [...editStages]
                                            updated[idx].name = e.target.value
                                            setEditStages(updated)
                                        }}
                                        className="h-8 text-xs bg-white"
                                    />
                                    <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={st.is_won_stage}
                                            onChange={e => {
                                                const updated = [...editStages]
                                                updated[idx].is_won_stage = e.target.checked
                                                if (e.target.checked) updated[idx].is_lost_stage = false
                                                setEditStages(updated)
                                            }}
                                        />
                                        Ganho
                                    </label>
                                    <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={st.is_lost_stage}
                                            onChange={e => {
                                                const updated = [...editStages]
                                                updated[idx].is_lost_stage = e.target.checked
                                                if (e.target.checked) updated[idx].is_won_stage = false
                                                setEditStages(updated)
                                            }}
                                        />
                                        Perdido
                                    </label>
                                    {editStages.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => setEditStages(prev => prev.filter((_, i) => i !== idx))}
                                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md"
                                            title="Remover etapa vazia"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 shrink-0 flex flex-row justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={savingFunnel}
                            onClick={() => setIsEditModalOpen(false)}
                            className="h-9 rounded-md text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={savingFunnel}
                            onClick={handleSaveEditPipeline}
                            className="h-9 rounded-md text-xs bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
                        >
                            {savingFunnel && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Confirmação de Arquivamento */}
            <Dialog open={!!pipelineToArchive} onOpenChange={open => !open && setPipelineToArchive(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900">Arquivar Funil</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Deseja arquivar o funil &quot;{pipelineToArchive?.name}&quot;? Ele deixará de aparecer no painel ativo, mas seus dados históricos serão preservados.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="pt-3 gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={archiving}
                            onClick={() => setPipelineToArchive(null)}
                            className="h-9 rounded-md text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            disabled={archiving}
                            onClick={handleConfirmArchive}
                            className="h-9 rounded-md text-xs bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            {archiving ? 'Arquivando...' : 'Confirmar Arquivamento'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
