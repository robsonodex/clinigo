'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    ArrowLeft, RefreshCw, Search, Users, Phone, Mail,
    Calendar, DollarSign, GripVertical, AlertCircle,
    CheckCircle2, Loader2, X, ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface Patient {
    id: string
    full_name: string
    phone: string | null
    email: string | null
    completed_count: number
    total_appointments: number
    last_appointment: string | null
    stage: string
    doctor_name: string | null
    ltv: number
}

interface Pipeline {
    lead: Patient[]
    agendou: Patient[]
    compareceu: Patient[]
    retornou: Patient[]
    recorrente: Patient[]
}

const STAGES = [
    { key: 'lead',       label: 'Leads',       color: '#6b7280', bg: 'bg-gray-50',   border: 'border-gray-200', dot: 'bg-gray-400',   desc: 'Sem agendamento' },
    { key: 'agendou',    label: 'Agendou',      color: '#3b82f6', bg: 'bg-blue-50',   border: 'border-blue-200', dot: 'bg-blue-500',   desc: 'Aguardando consulta' },
    { key: 'compareceu', label: 'Compareceu',   color: '#f59e0b', bg: 'bg-amber-50',  border: 'border-amber-200',dot: 'bg-amber-500',  desc: '1ª consulta feita' },
    { key: 'retornou',   label: 'Retornou',     color: '#10b981', bg: 'bg-emerald-50',border: 'border-emerald-200',dot:'bg-emerald-500',desc: '2-4 consultas' },
    { key: 'recorrente', label: 'Recorrente',   color: '#8b5cf6', bg: 'bg-violet-50', border: 'border-violet-200',dot:'bg-violet-500', desc: '5+ consultas' },
]

type ToastType = 'success' | 'error' | 'info'
interface Toast { id: number; msg: string; type: ToastType }

function initPipeline(): Pipeline {
    return { lead: [], agendou: [], compareceu: [], retornou: [], recorrente: [] }
}

export default function PipelinePage() {
    const router = useRouter()
    const [pipeline, setPipeline] = useState<Pipeline>(initPipeline())
    const [totals, setTotals] = useState<Record<string, number>>({})
    const [totalPatients, setTotalPatients] = useState(0)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [toasts, setToasts] = useState<Toast[]>([])
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [draggingFrom, setDraggingFrom] = useState<string | null>(null)
    const [dropTarget, setDropTarget] = useState<string | null>(null)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const toastId = useRef(0)

    const toast = useCallback((msg: string, type: ToastType = 'info') => {
        const id = ++toastId.current
        setToasts(t => [...t, { id, msg, type }])
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
    }, [])

    async function loadPipeline() {
        setLoading(true)
        try {
            const res = await fetch('/api/crm/pipeline')
            const data = await res.json()
            if (data.pipeline) {
                setPipeline(data.pipeline)
                setTotals(data.totals || {})
                setTotalPatients(data.total_patients || 0)
            }
        } catch {
            toast('Erro ao carregar pipeline', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadPipeline() }, [])

    // ── Drag handlers ──────────────────────────────
    function onDragStart(e: React.DragEvent, patient: Patient, fromStage: string) {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('patient_id', patient.id)
        e.dataTransfer.setData('from_stage', fromStage)
        e.dataTransfer.setData('patient_name', patient.full_name)
        setDraggingId(patient.id)
        setDraggingFrom(fromStage)
    }

    function onDragEnd() {
        setDraggingId(null)
        setDraggingFrom(null)
        setDropTarget(null)
    }

    function onDragOver(e: React.DragEvent, toStage: string) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDropTarget(toStage)
    }

    function onDragLeave() {
        setDropTarget(null)
    }

    async function onDrop(e: React.DragEvent, toStage: string) {
        e.preventDefault()
        setDropTarget(null)
        const patientId = e.dataTransfer.getData('patient_id')
        const fromStage = e.dataTransfer.getData('from_stage')
        const patientName = e.dataTransfer.getData('patient_name')

        if (!patientId || fromStage === toStage) return

        setProcessingId(patientId)
        try {
            const res = await fetch('/api/crm/pipeline', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patient_id: patientId, target_stage: toStage }),
            })
            const data = await res.json()

            if (data.action === 'redirect') {
                toast(`Abrindo agenda para ${patientName}...`, 'info')
                setTimeout(() => router.push(data.redirect_url), 800)
                return
            }

            if (data.action === 'blocked' || !data.success) {
                toast(data.message, 'error')
                return
            }

            // Optimistic update: move card locally
            setPipeline(prev => {
                const next = { ...prev }
                const card = next[fromStage as keyof Pipeline]?.find(p => p.id === patientId)
                if (card) {
                    next[fromStage as keyof Pipeline] = next[fromStage as keyof Pipeline].filter(p => p.id !== patientId)
                    const updatedCard = { ...card, stage: data.new_stage || toStage, completed_count: card.completed_count + 1 }
                    const targetKey = (data.new_stage || toStage) as keyof Pipeline
                    next[targetKey] = [...(next[targetKey] || []), updatedCard]
                        .sort((a, b) => a.full_name.localeCompare(b.full_name))
                }
                return next
            })
            toast(data.message, 'success')
        } catch {
            toast('Erro ao mover paciente', 'error')
        } finally {
            setProcessingId(null)
            setDraggingId(null)
            setDraggingFrom(null)
        }
    }

    // ── Filter ────────────────────────────────────
    function filterPatients(patients: Patient[]) {
        if (!search.trim()) return patients
        const q = search.toLowerCase()
        return patients.filter(p =>
            p.full_name.toLowerCase().includes(q) ||
            p.phone?.includes(q) ||
            p.doctor_name?.toLowerCase().includes(q)
        )
    }

    const initials = (name: string) => name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

    function stageColor(stageKey: string) {
        return STAGES.find(s => s.key === stageKey)?.color || '#6b7280'
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Toast area */}
            <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
                {toasts.map(t => (
                    <div key={t.id} className={`flex items-start gap-2 p-3 rounded-lg shadow-lg text-sm text-white transition-all
                        ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}>
                        {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                            : t.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                        <span className="flex-1">{t.msg}</span>
                        <button onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}>
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/crm" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> CRM
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <GripVertical className="w-5 h-5 text-blue-600" />
                            Pipeline de Pacientes
                        </h1>
                        <p className="text-xs text-gray-500">
                            Arraste os cards entre colunas • {totalPatients} pacientes
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar paciente..."
                            className="pl-9 w-52 h-9 text-sm"
                        />
                    </div>
                    <Button variant="outline" size="sm" onClick={loadPipeline} className="gap-1 h-9">
                        <RefreshCw className="w-4 h-4" /> Atualizar
                    </Button>
                </div>
            </div>

            {/* Summary bar */}
            <div className="px-6 py-3 bg-white border-b flex gap-4 overflow-x-auto">
                {STAGES.map(s => (
                    <div key={s.key} className="flex items-center gap-2 whitespace-nowrap">
                        <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                        <span className="text-sm font-medium text-gray-700">{s.label}</span>
                        <span className="text-sm text-gray-500">{totals[s.key] ?? 0}</span>
                    </div>
                ))}
            </div>

            {/* Drag hint */}
            <div className="px-6 pt-3 pb-1">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                    <GripVertical className="w-3.5 h-3.5" />
                    Arraste um card para outra coluna para executar a ação correspondente
                </p>
            </div>

            {/* Kanban board */}
            <div className="flex-1 overflow-x-auto px-6 pb-6 pt-2">
                <div className="flex gap-4 min-w-max h-full">
                    {STAGES.map(stage => {
                        const patients = filterPatients(pipeline[stage.key as keyof Pipeline] || [])
                        const isDropTarget = dropTarget === stage.key
                        const isDraggingFromThis = draggingFrom === stage.key

                        return (
                            <div
                                key={stage.key}
                                onDragOver={e => onDragOver(e, stage.key)}
                                onDragLeave={onDragLeave}
                                onDrop={e => onDrop(e, stage.key)}
                                className={`flex flex-col w-64 rounded-xl border-2 transition-all duration-150
                                    ${isDropTarget
                                        ? 'border-blue-400 bg-blue-50/80 scale-[1.01] shadow-lg shadow-blue-100'
                                        : isDraggingFromThis
                                        ? 'border-dashed border-gray-300 opacity-70'
                                        : `${stage.border} ${stage.bg}`
                                    }`}
                            >
                                {/* Column header */}
                                <div className="px-4 pt-4 pb-3 border-b border-inherit">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2.5 h-2.5 rounded-full ${stage.dot}`} />
                                            <span className="font-semibold text-sm text-gray-800">{stage.label}</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 bg-white px-2 py-0.5 rounded-full border">
                                            {patients.length}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 ml-4">{stage.desc}</p>
                                </div>

                                {/* Drop zone hint */}
                                {isDropTarget && (
                                    <div className="mx-3 mt-3 border-2 border-dashed border-blue-400 rounded-lg p-3 text-center">
                                        <p className="text-xs font-medium text-blue-600">
                                            {stage.key === 'agendou' ? '📅 Criar agendamento'
                                                : stage.key === 'lead' ? '🚫 Ação bloqueada'
                                                : '✅ Marcar consulta como realizada'}
                                        </p>
                                    </div>
                                )}

                                {/* Cards */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[calc(100vh-280px)]">
                                    {patients.length === 0 && !isDropTarget && (
                                        <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                                            <Users className="w-8 h-8 mb-2" />
                                            <p className="text-xs">Vazio</p>
                                        </div>
                                    )}

                                    {patients.map(patient => {
                                        const isProcessing = processingId === patient.id
                                        const isDragging = draggingId === patient.id
                                        return (
                                            <div
                                                key={patient.id}
                                                draggable
                                                onDragStart={e => onDragStart(e, patient, stage.key)}
                                                onDragEnd={onDragEnd}
                                                className={`bg-white rounded-lg border p-3 cursor-grab active:cursor-grabbing select-none
                                                    transition-all duration-150 hover:shadow-md hover:-translate-y-0.5
                                                    ${isDragging ? 'opacity-40 scale-95 rotate-1' : ''}
                                                    ${isProcessing ? 'opacity-60 pointer-events-none' : ''}
                                                `}
                                                style={{ borderLeft: `3px solid ${stageColor(stage.key)}` }}
                                            >
                                                {/* Card header */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                                        style={{ backgroundColor: stageColor(stage.key) }}
                                                    >
                                                        {initials(patient.full_name)}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-gray-800 truncate leading-tight">
                                                            {patient.full_name}
                                                        </p>
                                                        {patient.doctor_name && (
                                                            <p className="text-[10px] text-gray-400 truncate">
                                                                {patient.doctor_name}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />}
                                                </div>

                                                {/* Stats */}
                                                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {patient.completed_count} realizada{patient.completed_count !== 1 ? 's' : ''}
                                                    </span>
                                                    {patient.ltv > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <DollarSign className="w-3 h-3" />
                                                            {patient.ltv.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Quick actions */}
                                                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                                                    {patient.phone && (
                                                        <a
                                                            href={`https://wa.me/55${patient.phone.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={e => e.stopPropagation()}
                                                            className="text-[10px] text-green-600 hover:text-green-700 font-medium flex items-center gap-0.5"
                                                        >
                                                            <Phone className="w-3 h-3" /> WhatsApp
                                                        </a>
                                                    )}
                                                    <span className="flex-1" />
                                                    <Link
                                                        href={`/dashboard/pacientes/${patient.id}`}
                                                        onClick={e => e.stopPropagation()}
                                                        className="text-[10px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
                                                    >
                                                        <ExternalLink className="w-3 h-3" /> Ficha
                                                    </Link>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
