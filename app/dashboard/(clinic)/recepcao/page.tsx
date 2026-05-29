'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Users, Clock, CheckCircle2, QrCode, User, UserX, Settings, FileText,
    Megaphone, Loader2, Tv, Monitor, Undo2, ChevronRight, MoreVertical, Plus, CheckCircle, SlidersHorizontal
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import PatientSelector from '@/components/prontuarios/patient-selector'
import { QuickPatientForm } from '@/components/appointments/QuickPatientForm'
import { QRCodeSVG } from 'qrcode.react'
import { QRScannerDialog } from '@/components/reception/qr-scanner-dialog'
import { CheckinDocumentsModal } from './components/checkin-documents-modal'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { hasFeature } from '@/lib/constants/plan-features'
import { type PlanType } from '@/lib/constants/plans'

interface QueueItem {
    id: string
    type: 'appointment' | 'walk-in'
    patient: {
        id: string
        full_name: string
        birth_date?: string
        gender?: string
    }
    doctor?: {
        user: {
            name?: string
            full_name?: string
        }
    }
    arrivalTime: string
    scheduledTime?: string
    isPriority: boolean
    status: string
    notes?: string
    checkedInAt?: string
    consulting_room_id?: string
}

interface ConsultingRoom {
    id: string
    name: string
    display_name: string | null
    room_number: number
    doctor_id: string | null
    doctor?: { id: string; user: { full_name: string }; specialty: string }
}

interface Stats {
    waiting_count: number
    in_service_count: number
    completed_count: number
    no_show_count: number
}

export default function RecepcaoPage() {
    const { toast } = useToast()
    const { user: currentUser } = useUser()
    const [queue, setQueue] = useState<QueueItem[]>([])
    const [stats, setStats] = useState<Stats>({
        waiting_count: 0,
        in_service_count: 0,
        completed_count: 0,
        no_show_count: 0
    })
    const [loading, setLoading] = useState(true)
    const [showWalkInDialog, setShowWalkInDialog] = useState(false)
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
    const [urgency, setUrgency] = useState<string>('normal')
    const [reason, setReason] = useState('')
    const [refreshInterval, setRefreshInterval] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('reception-refresh-interval')
            return saved ? Math.min(Number(saved), 300) : 60
        }
        return 60
    })

    const [isCreatingPatient, setIsCreatingPatient] = useState(false)
    const [isSubmittingPatient, setIsSubmittingPatient] = useState(false)
    const [createdWalkIn, setCreatedWalkIn] = useState<any>(null)
    const [documentsModalOpen, setDocumentsModalOpen] = useState(false)
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
    const [selectedPatientName, setSelectedPatientName] = useState<string>('')
    const [callingId, setCallingId] = useState<string | null>(null)
    const [actionId, setActionId] = useState<string | null>(null)
    const [consultingRooms, setConsultingRooms] = useState<ConsultingRoom[]>([])
    const [showNoShowList, setShowNoShowList] = useState(false)
    const [clinicPlanType, setClinicPlanType] = useState<PlanType>('BASICO')
    const [isPlanLoading, setIsPlanLoading] = useState(true)

    // Espaço Incluir
    const isEspacoIncluir = currentUser?.clinic_id === '5163c916-8b82-4d80-8a71-01726836ee46'
    const [checkInModal, setCheckInModal] = useState<{ open: boolean, appointmentId: string | null, notes: string }>({ open: false, appointmentId: null, notes: '' })
    const [noShowModal, setNoShowModal] = useState<{ open: boolean, appointmentId: string | null, patientName: string, notes: string }>({ open: false, appointmentId: null, patientName: '', notes: '' })

    useEffect(() => {
        loadData()
        const interval = setInterval(loadData, refreshInterval * 1000)
        return () => clearInterval(interval)
    }, [refreshInterval])

    useEffect(() => {
        async function fetchPlanType() {
            try {
                const res = await fetch('/api/setup/status')
                if (res.ok) {
                    const data = await res.json()
                    if (data.planType) setClinicPlanType(data.planType as PlanType)
                }
            } catch { /* silent */ } finally {
                setIsPlanLoading(false)
            }
        }
        fetchPlanType()
    }, [])

    useEffect(() => {
        const supabase = createClient()
        const channel = supabase
            .channel('reception_realtime_updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'appointments',
                },
                () => {
                    loadData()
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [])

    async function loadData() {
        setLoading(true)
        try {
            const queueRes = await fetch('/api/reception/queue')
            if (queueRes.ok) {
                const data = await queueRes.json()
                const q: QueueItem[] = data.queue || []
                setQueue(q)

                setStats({
                    waiting_count: q.filter(i => ['SCHEDULED', 'CONFIRMED', 'WAITING'].includes(i.status)).length,
                    in_service_count: q.filter(i => i.status === 'IN_PROGRESS').length,
                    completed_count: q.filter(i => i.status === 'COMPLETED').length,
                    no_show_count: q.filter(i => i.status === 'NO_SHOW').length
                })
            }
            const roomsRes = await fetch('/api/consulting-rooms')
            if (roomsRes.ok) {
                const data = await roomsRes.json()
                setConsultingRooms(data.rooms || [])
            }
        } catch (error) {
            console.error('Error loading reception data:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleCallPatient(appointmentId: string, patientName: string) {
        setCallingId(appointmentId)
        try {
            const res = await fetch('/api/reception/call-patient', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId })
            })

            if (res.ok) {
                toast({
                    title: '📢 Paciente Chamado!',
                    description: `${patientName} foi chamado(a) para atendimento.`,
                })
                loadData()
            } else {
                const errData = await res.json()
                throw new Error(errData.error || 'Falha ao chamar paciente')
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error instanceof Error ? error.message : 'Não foi possível chamar o paciente',
            })
        } finally {
            setCallingId(null)
        }
    }

    async function handleStartService(appointmentId: string, patientName: string) {
        setActionId(appointmentId)
        try {
            const res = await fetch('/api/reception/start-service', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId })
            })
            if (res.ok) {
                toast({ title: '🩺 Em Atendimento', description: `${patientName} está em atendimento.` })
                loadData()
            } else {
                const errData = await res.json()
                throw new Error(errData.error || 'Falha ao iniciar atendimento')
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Erro ao iniciar atendimento' })
        } finally {
            setActionId(null)
        }
    }

    async function handleCompleteService(appointmentId: string, patientName: string) {
        setActionId(appointmentId)
        try {
            const res = await fetch('/api/reception/complete-service', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId })
            })
            if (res.ok) {
                toast({ title: '✅ Concluído', description: `Atendimento de ${patientName} concluído.` })
                loadData()
            } else {
                const errData = await res.json()
                throw new Error(errData.error || 'Falha ao concluir atendimento')
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Erro ao concluir atendimento' })
        } finally {
            setActionId(null)
        }
    }

    async function handleNoShow(appointmentId: string, patientName: string, notes: string = '') {
        setActionId(appointmentId)
        try {
            const res = await fetch('/api/reception/no-show', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId, notes })
            })
            if (res.ok) {
                toast({ title: 'Não Compareceu', description: `${patientName} marcado como não compareceu.` })
                setNoShowModal({ open: false, appointmentId: null, patientName: '', notes: '' })
                loadData()
            } else {
                const errData = await res.json()
                throw new Error(errData.error || 'Falha ao marcar não comparecimento')
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Erro ao marcar não comparecimento' })
        } finally {
            setActionId(null)
        }
    }

    async function handleRevertStatus(appointmentId: string, patientName: string) {
        setActionId(appointmentId)
        try {
            const res = await fetch('/api/reception/revert-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId })
            })
            if (res.ok) {
                toast({ title: '↩️ Desfeito', description: `Ação revertida para ${patientName}.` })
                loadData()
            } else {
                const errData = await res.json()
                throw new Error(errData.error || 'Falha ao desfazer')
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: error instanceof Error ? error.message : 'Erro ao desfazer ação' })
        } finally {
            setActionId(null)
        }
    }

    async function handleCheckIn(appointmentId: string, notes: string = '') {
        try {
            const res = await fetch(`/api/reception/checkin/${appointmentId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes })
            })

            if (res.ok) {
                toast({
                    title: 'Check-in realizado',
                    description: 'Paciente confirmado na fila de atendimento'
                })
                setCheckInModal({ open: false, appointmentId: null, notes: '' })
                loadData()
            } else {
                throw new Error('Falha no check-in')
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível realizar o check-in'
            })
        }
    }

    async function handleCreateWalkIn() {
        if (!selectedPatientId) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Selecione um paciente'
            })
            return
        }

        try {
            const res = await fetch('/api/reception/walk-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: selectedPatientId,
                    urgency_level: urgency,
                    reason
                })
            })

            if (res.ok) {
                const data = await res.json()
                setCreatedWalkIn(data)

                toast({
                    title: 'Atendimento criado',
                    description: 'Paciente adicionado à fila de espera'
                })
                setShowWalkInDialog(false)
                setSelectedPatientId(null)
                setReason('')
                loadData()
            } else {
                throw new Error('Falha ao criar walk-in')
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível adicionar o paciente'
            })
        }
    }

    async function handleCreatePatient(data: any) {
        setIsSubmittingPatient(true)
        try {
            const res = await fetch('/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao criar paciente')
            }

            const newPatient = await res.json()

            toast({
                title: 'Paciente criado',
                description: 'Paciente cadastrado com sucesso'
            })

            setSelectedPatientId(newPatient.id)
            setIsCreatingPatient(false)
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error instanceof Error ? error.message : 'Erro ao criar paciente'
            })
        } finally {
            setIsSubmittingPatient(false)
        }
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto px-1 sm:px-4 py-2">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100/80 dark:border-indigo-900/30">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                            Recepção
                        </h1>
                        <div className="flex items-center gap-3 mt-1.5">
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
                                Gestão de fila e check-in de pacientes
                            </p>
                            
                            {/* Filtros e Ações Dropdown Button */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex gap-1.5 h-8 text-xs bg-white hover:bg-slate-50 border-slate-200 transition-all duration-200 shadow-sm rounded-xl px-3 font-bold text-slate-700 dark:text-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800"
                                    >
                                        <SlidersHorizontal className="h-3.5 w-3.5" />
                                        <span>Filtros e Ações</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-64 p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
                                    {currentUser?.clinic_id && (
                                        <>
                                            <DropdownMenuItem
                                                className="cursor-pointer gap-2.5 p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                onSelect={() => {
                                                    const url = `${window.location.origin}/painel-tv/${currentUser.clinic_id}`
                                                    window.open(url, '_blank')
                                                }}
                                            >
                                                <Tv className="w-4 h-4 text-blue-600" />
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Painel TV</p>
                                                    <p className="text-[10px] text-muted-foreground">Exibir na recepção</p>
                                                </div>
                                            </DropdownMenuItem>

                                            <DropdownMenuItem
                                                className="cursor-pointer gap-2.5 p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                onSelect={() => {
                                                    const url = `${window.location.origin}/totem/${currentUser.clinic_id}`
                                                    window.open(url, '_blank')
                                                }}
                                            >
                                                <Monitor className="w-4 h-4 text-cyan-600" />
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Auto Atendimento</p>
                                                    <p className="text-[10px] text-muted-foreground">Totem e cadastro</p>
                                                </div>
                                            </DropdownMenuItem>
                                        </>
                                    )}

                                    <DropdownMenuItem
                                        asChild
                                        className="cursor-pointer gap-2.5 p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <Link href="/dashboard/recepcao/face-checkin">
                                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Check-in Fácil</p>
                                                <p className="text-[10px] text-muted-foreground">Iniciar atendimento</p>
                                            </div>
                                        </Link>
                                    </DropdownMenuItem>

                                    <QRScannerDialog onCheckIn={loadData}>
                                        <DropdownMenuItem
                                            onSelect={(e) => e.preventDefault()}
                                            className="cursor-pointer gap-2.5 p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <QrCode className="w-4 h-4 text-sky-600" />
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Escanear QR Code</p>
                                                <p className="text-[10px] text-muted-foreground">Buscar paciente</p>
                                            </div>
                                        </DropdownMenuItem>
                                    </QRScannerDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Sem Agendamento (Atendimento avulso) */}
                    <Dialog open={showWalkInDialog} onOpenChange={(open) => {
                        setShowWalkInDialog(open)
                        if (!open) setIsCreatingPatient(false)
                    }}>
                        <DialogTrigger asChild>
                            <Button 
                                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-10 px-5 text-sm font-semibold gap-1.5 border-0"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Sem Agendamento</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {isCreatingPatient ? 'Novo Paciente' : 'Novo Atendimento (Walk-in)'}
                                </DialogTitle>
                            </DialogHeader>

                            {isCreatingPatient ? (
                                <QuickPatientForm
                                    onSubmit={handleCreatePatient}
                                    onBack={() => setIsCreatingPatient(false)}
                                    isSubmitting={isSubmittingPatient}
                                />
                            ) : (
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Paciente</Label>
                                        <PatientSelector
                                            value={selectedPatientId}
                                            onChange={setSelectedPatientId}
                                            onNewPatient={() => setIsCreatingPatient(true)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Urgência</Label>
                                        <Select value={urgency} onValueChange={setUrgency}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="normal">Normal</SelectItem>
                                                <SelectItem value="priority">Prioridade</SelectItem>
                                                <SelectItem value="urgent">Urgente</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Motivo</Label>
                                        <Input
                                            placeholder="Motivo da consulta..."
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                        />
                                    </div>
                                    <Button className="w-full hover:shadow-md transition-all duration-300 rounded-xl h-10" onClick={handleCreateWalkIn}>
                                        Adicionar à Fila
                                    </Button>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* Settings Configurations Button */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="h-10 gap-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-all shadow-sm">
                                <Settings className="w-4 h-4 text-slate-400" />
                                Configurações
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Configurações de Atualização</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Intervalo de Atualização Automática</Label>
                                    <Select
                                        value={refreshInterval.toString()}
                                        onValueChange={(value) => {
                                            const interval = Number(value)
                                            setRefreshInterval(interval)
                                            localStorage.setItem('reception-refresh-interval', interval.toString())
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="30">30 segundos</SelectItem>
                                            <SelectItem value="60">1 minuto (recomendado)</SelectItem>
                                            <SelectItem value="90">1 minuto e 30 segundos</SelectItem>
                                            <SelectItem value="120">2 minutos</SelectItem>
                                            <SelectItem value="180">3 minutos</SelectItem>
                                            <SelectItem value="240">4 minutos</SelectItem>
                                            <SelectItem value="300">5 minutos (máximo)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        A fila será atualizada automaticamente a cada {refreshInterval >= 60
                                            ? `${Math.floor(refreshInterval / 60)} minuto${Math.floor(refreshInterval / 60) > 1 ? 's' : ''}${refreshInterval % 60 ? ` e ${refreshInterval % 60} segundos` : ''}`
                                            : `${refreshInterval} segundos`}
                                    </p>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Horizontal Stats Capsules (compact inline indicators styled as premium buttons) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* 1. Aguardando */}
                <div className="flex items-center justify-between h-10 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-extrabold">{stats.waiting_count}</span>
                        <span className="text-sm font-semibold">Aguardando</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                </div>

                {/* 2. Em Atendimento */}
                <div className="flex items-center justify-between h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-extrabold">{stats.in_service_count}</span>
                        <span className="text-sm font-semibold">Em Atendimento</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                </div>

                {/* 3. Atendidos Hoje */}
                <div className="flex items-center justify-between h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-extrabold">{stats.completed_count}</span>
                        <span className="text-sm font-semibold">Atendidos</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                </div>

                {/* 4. Não Compareceram */}
                <div 
                    onClick={() => setShowNoShowList(true)}
                    className="flex items-center justify-between h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <UserX className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-extrabold">{stats.no_show_count}</span>
                        <span className="text-sm font-semibold">Ausentes</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                </div>
            </div>

            {/* Modals & Dialogs */}
            <Dialog open={checkInModal.open} onOpenChange={(open) => setCheckInModal({ ...checkInModal, open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Check-in</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Observação (Falta justificada/Cobrada ou notas)</Label>
                            <Input
                                placeholder="Adicione uma observação (opcional)..."
                                value={checkInModal.notes}
                                onChange={(e) => setCheckInModal({ ...checkInModal, notes: e.target.value })}
                            />
                        </div>
                        <Button className="w-full" onClick={() => checkInModal.appointmentId && handleCheckIn(checkInModal.appointmentId, checkInModal.notes)}>
                            Confirmar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={noShowModal.open} onOpenChange={(open) => setNoShowModal({ ...noShowModal, open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Marcar como Não Compareceu</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">Paciente: <span className="font-medium text-foreground">{noShowModal.patientName}</span></p>
                        <div className="space-y-2">
                            <Label>Observação (Falta justificada, cobrada, motivo, etc.)</Label>
                            <Input
                                placeholder="Adicione uma observação (opcional)..."
                                value={noShowModal.notes}
                                onChange={(e) => setNoShowModal({ ...noShowModal, notes: e.target.value })}
                            />
                        </div>
                        <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => noShowModal.appointmentId && handleNoShow(noShowModal.appointmentId, noShowModal.patientName, noShowModal.notes)}>
                            Confirmar Não Comparecimento
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showNoShowList} onOpenChange={setShowNoShowList}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pacientes que não compareceram</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pt-2">
                        {stats.no_show_count === 0 ? (
                            <p className="text-center text-muted-foreground py-4 text-sm">Nenhum paciente nesta lista.</p>
                        ) : (
                            <div className="space-y-2">
                                {queue.filter(i => i.status === 'NO_SHOW').map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-xl bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900/30">
                                        <div>
                                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.patient.full_name}</p>
                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 font-semibold">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                Chegada original: {item.arrivalTime ? new Date(item.arrivalTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Sem registro'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isEspacoIncluir && (
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl" onClick={() => handleRevertStatus(item.id, item.patient?.full_name || '')} disabled={actionId === item.id} title="Desfazer">
                                                    <Undo2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Badge variant="outline" className="text-red-650 dark:text-red-400 border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 font-bold text-[10px]">Ausente</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* 3-Panel Kanban Queue Layout (Highly premium, 100% matched design) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1: Aguardando */}
                <div className="bg-slate-50/30 dark:bg-slate-900/10 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col min-h-[500px]">
                    <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800/60">
                        <div className="flex items-center gap-2.5">
                            <Clock className="w-5 h-5 text-amber-500" />
                            <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm tracking-wide">
                                Aguardando
                            </h3>
                            <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                {queue.filter(i => ['SCHEDULED', 'CONFIRMED', 'WAITING'].includes(i.status)).length}
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-slate-600 rounded-lg">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center flex-1 py-12 text-slate-400 text-sm">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mb-2" />
                            Carregando...
                        </div>
                    ) : queue.filter(i => ['SCHEDULED', 'CONFIRMED', 'WAITING'].includes(i.status)).length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-1 py-12 text-slate-400/80 dark:text-slate-500 text-center">
                            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10 rounded-full text-amber-500 mb-3">
                                <Clock className="w-6 h-6" />
                            </div>
                            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Nenhum paciente aguardando</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1 px-4">Os pacientes que chegarem na clínica serão listados aqui.</p>
                        </div>
                    ) : (
                        <div className="space-y-3.5 overflow-y-auto max-h-[600px] pr-1">
                            {queue.filter(i => ['SCHEDULED', 'CONFIRMED', 'WAITING'].includes(i.status)).map((item, index) => (
                                <div 
                                    key={item.id} 
                                    className={`p-4 rounded-2xl border ${
                                        item.isPriority 
                                            ? 'border-rose-200 dark:border-rose-900/40 bg-rose-50/80 dark:bg-rose-950/30' 
                                            : 'border-amber-200 dark:border-amber-900/40 bg-amber-50/85 dark:bg-amber-950/30'
                                    } shadow-sm hover:shadow-md transition-all duration-300 relative group`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Golden Circular Numbering */}
                                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-extrabold text-xs shrink-0 border border-amber-200/60 dark:border-amber-800/40 shadow-sm">
                                            {index + 1}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm truncate max-w-[180px]" title={item.patient?.full_name}>
                                                    {item.patient?.full_name || 'Paciente'}
                                                </h4>
                                                
                                                {/* Labels/Badges para deixar o card mais completo */}
                                                {item.isPriority && (
                                                    <Badge variant="destructive" className="text-[8px] px-1 py-0 font-extrabold uppercase shrink-0 bg-red-600 dark:bg-red-800">
                                                        Prioridade
                                                    </Badge>
                                                )}
                                                {item.type === 'walk-in' && (
                                                    <Badge className="text-[8px] bg-sky-100 dark:bg-sky-950/60 text-sky-850 dark:text-sky-305 border border-sky-200 dark:border-sky-850 px-1 py-0 font-extrabold shrink-0 shadow-sm">
                                                        Encaixe
                                                    </Badge>
                                                )}
                                            </div>
                                            
                                            {item.doctor && (
                                                <p className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5 mt-1">
                                                    <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-450 shrink-0" />
                                                    <span className="truncate">
                                                        {item.doctor.user?.name || item.doctor.user?.full_name || 'Profissional'}
                                                    </span>
                                                </p>
                                            )}

                                            <div className="flex items-center gap-3 mt-1 font-semibold text-[10.5px] text-slate-600 dark:text-slate-400">
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-450 shrink-0" />
                                                    {item.arrivalTime 
                                                        ? `Espera: ${getTimeWaiting(item.arrivalTime)}` 
                                                        : item.scheduledTime 
                                                            ? `Agendado para ${new Date(item.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` 
                                                            : 'Sem horário'
                                                    }
                                                </span>
                                                {item.status === 'WAITING' && (
                                                    <Badge className="text-[8px] bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-1.5 py-0 font-extrabold shadow-sm">Chamado</Badge>
                                                )}
                                            </div>

                                            {/* Observações legíveis se existirem */}
                                            {item.notes && (
                                                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 bg-white/40 dark:bg-slate-950/20 p-1.5 rounded-lg border border-amber-200/40 dark:border-amber-900/10 italic leading-relaxed text-xs">
                                                    <span className="font-bold not-italic text-slate-700 dark:text-slate-350">Obs:</span> {item.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Footbar */}
                                    <div className="flex items-center justify-between gap-1.5 mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/80">
                                        <div className="flex items-center gap-1.5">
                                            {/* Prontuário / Documentos */}
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl" 
                                                onClick={() => { setSelectedAppointmentId(item.id); setSelectedPatientName(item.patient?.full_name || ''); setDocumentsModalOpen(true) }} 
                                                title="Documentos"
                                            >
                                                <FileText className="w-4 h-4" />
                                            </Button>

                                            {/* Chamar Paciente */}
                                            {item.type === 'appointment' && item.checkedInAt && item.status === 'CONFIRMED' && (
                                                <Button size="sm" variant="ghost" className="h-8 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-100/50 rounded-xl px-2.5" onClick={() => handleCallPatient(item.id, item.patient?.full_name || '')} disabled={callingId === item.id}>
                                                    {callingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Megaphone className="w-3.5 h-3.5 mr-1" />Chamar</>}
                                                </Button>
                                            )}
                                            {item.status === 'WAITING' && (
                                                <Button size="sm" variant="ghost" className="h-8 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-100/50 rounded-xl px-2.5" onClick={() => handleCallPatient(item.id, item.patient?.full_name || '')} disabled={callingId === item.id}>
                                                    {callingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Megaphone className="w-3.5 h-3.5 mr-1" />Chamar</>}
                                                </Button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {/* Iniciar Atendimento */}
                                            {item.type === 'appointment' && item.status === 'CONFIRMED' && !item.checkedInAt && (
                                                <button 
                                                    className="h-8 text-[11px] font-extrabold bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-700 dark:hover:bg-amber-600 rounded-xl px-3 flex items-center gap-1.5 transition-all shadow-sm" 
                                                    onClick={() => isEspacoIncluir ? handleStartService(item.id, item.patient?.full_name || '') : handleCheckIn(item.id)} 
                                                    disabled={actionId === item.id}
                                                >
                                                    {actionId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 text-white" />{isEspacoIncluir ? 'Em Atendimento' : 'Check-in'}</>}
                                                </button>
                                            )}
                                            {item.status === 'WAITING' && (
                                                <button 
                                                    className="h-8 text-[11px] font-extrabold bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-650 rounded-xl px-3 flex items-center gap-1.5 transition-all shadow-sm" 
                                                    onClick={() => handleStartService(item.id, item.patient?.full_name || '')} 
                                                    disabled={actionId === item.id}
                                                >
                                                    {actionId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 text-white" />Em Atendimento</>}
                                                </button>
                                            )}

                                            {/* Desfazer */}
                                            {isEspacoIncluir && (item.checkedInAt || item.status === 'WAITING') && (
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-650 hover:text-amber-750 hover:bg-amber-100 rounded-xl shrink-0" onClick={() => handleRevertStatus(item.id, item.patient?.full_name || '')} disabled={actionId === item.id} title="Desfazer">
                                                    <Undo2 className="w-4 h-4" />
                                                </Button>
                                            )}

                                            {/* Não Compareceu */}
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-xl shrink-0" onClick={() => isEspacoIncluir ? setNoShowModal({ open: true, appointmentId: item.id, patientName: item.patient?.full_name || '', notes: '' }) : handleNoShow(item.id, item.patient?.full_name || '')} disabled={actionId === item.id} title="Não Compareceu">
                                                <UserX className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Column 2: Em Atendimento */}
                <div className="bg-slate-50/30 dark:bg-slate-900/10 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col min-h-[500px]">
                    <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800/60">
                        <div className="flex items-center gap-2.5">
                            <Users className="w-5 h-5 text-blue-500" />
                            <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm tracking-wide">
                                Em Atendimento
                            </h3>
                            <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                {queue.filter(i => i.status === 'IN_PROGRESS').length}
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-slate-600 rounded-lg">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </div>

                    {queue.filter(i => i.status === 'IN_PROGRESS').length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-1 py-12 text-slate-450 dark:text-slate-500 text-center">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/20 text-blue-500 rounded-full flex items-center justify-center mb-3">
                                <Users className="w-8 h-8 text-blue-600 dark:text-blue-500" />
                            </div>
                            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Nenhum paciente em atendimento</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1 px-4">Os pacientes em atendimento aparecerão aqui.</p>
                        </div>
                    ) : (
                        <div className="space-y-3.5 overflow-y-auto max-h-[600px] pr-1">
                            {queue.filter(i => i.status === 'IN_PROGRESS').map((item) => (
                                <div key={item.id} className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 shadow-sm hover:shadow-md transition-all duration-300">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm truncate max-w-[180px]" title={item.patient?.full_name}>
                                                    {item.patient?.full_name || 'Paciente'}
                                                </h4>
                                                {item.type === 'walk-in' && (
                                                    <Badge className="text-[8px] bg-sky-100 dark:bg-sky-950/60 text-sky-850 dark:text-sky-305 border border-sky-200 dark:border-sky-850 px-1 py-0 font-extrabold shrink-0 shadow-sm">
                                                        Encaixe
                                                    </Badge>
                                                )}
                                            </div>
                                            {item.doctor && (
                                                <p className="text-[11px] text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5 mt-1">
                                                    <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-450 shrink-0" />
                                                    <span className="truncate">
                                                        {item.doctor.user?.name || item.doctor.user?.full_name || 'Profissional'}
                                                    </span>
                                                </p>
                                            )}

                                            {/* Observações legíveis se existirem */}
                                            {item.notes && (
                                                <p className="text-[11px] text-slate-650 dark:text-slate-355 mt-1.5 bg-white/40 dark:bg-slate-950/20 p-1.5 rounded-lg border border-blue-200/40 dark:border-blue-900/10 italic leading-relaxed text-xs">
                                                    <span className="font-bold not-italic text-slate-700 dark:text-slate-350">Obs:</span> {item.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2.5 mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-805">
                                        {isEspacoIncluir && (
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-650 hover:text-amber-750 hover:bg-amber-100 rounded-xl" onClick={() => handleRevertStatus(item.id, item.patient?.full_name || '')} disabled={actionId === item.id} title="Desfazer">
                                                <Undo2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                        
                                        <button 
                                            className="h-8 w-full text-xs font-extrabold bg-[#007D40] hover:bg-[#006835] text-white rounded-xl px-4 flex items-center justify-center gap-1.5 transition-all shadow-sm ml-auto" 
                                            onClick={() => handleCompleteService(item.id, item.patient?.full_name || '')} 
                                            disabled={actionId === item.id}
                                        >
                                            {actionId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-100" />Concluir</>}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Column 3: Concluídos */}
                <div className="bg-slate-50/30 dark:bg-slate-900/10 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col min-h-[500px]">
                    <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800/60">
                        <div className="flex items-center gap-2.5">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                            <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm tracking-wide">
                                Concluídos
                            </h3>
                            <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                {queue.filter(i => i.status === 'COMPLETED').length}
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-slate-600 rounded-lg">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </div>

                    {queue.filter(i => i.status === 'COMPLETED').length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-1 py-12 text-slate-450 dark:text-slate-500 text-center">
                            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                                <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
                            </div>
                            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Nenhum atendimento concluído</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1 px-4">Os atendimentos concluídos aparecerão aqui.</p>
                        </div>
                    ) : (
                        <div className="space-y-3.5 overflow-y-auto max-h-[600px] pr-1">
                            {queue.filter(i => i.status === 'COMPLETED').map((item) => (
                                <div key={item.id} className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-250/70 dark:border-emerald-900/40 shadow-sm hover:shadow-md transition-all duration-300">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm truncate max-w-[180px]" title={item.patient?.full_name}>
                                                    {item.patient?.full_name || 'Paciente'}
                                                </h4>
                                                {item.type === 'walk-in' && (
                                                    <Badge className="text-[8px] bg-sky-100 dark:bg-sky-950/60 text-sky-850 dark:text-sky-305 border border-sky-200 dark:border-sky-850 px-1 py-0 font-extrabold shrink-0 shadow-sm">
                                                        Encaixe
                                                    </Badge>
                                                )}
                                            </div>
                                            {item.doctor && (
                                                <p className="text-[11px] text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5 mt-1">
                                                    <User className="w-3.5 h-3.5 text-slate-550 dark:text-slate-455 shrink-0" />
                                                    <span className="truncate">
                                                        {item.doctor.user?.name || item.doctor.user?.full_name || 'Profissional'}
                                                    </span>
                                                </p>
                                            )}

                                            {/* Observações legíveis se existirem */}
                                            {item.notes && (
                                                <p className="text-[11px] text-slate-650 dark:text-slate-350 mt-1.5 bg-white/40 dark:bg-slate-950/20 p-1.5 rounded-lg border border-emerald-200/45 dark:border-emerald-900/10 italic leading-relaxed text-xs">
                                                    <span className="font-bold not-italic text-slate-700 dark:text-slate-350">Obs:</span> {item.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2.5 mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-805">
                                        <div className="h-8 w-full text-xs font-extrabold bg-[#007D40] text-white rounded-xl px-4 flex items-center justify-center gap-1.5 transition-all shadow-sm select-none opacity-90 cursor-default">
                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-105" />
                                            <span>Atendido</span>
                                        </div>
                                        
                                        {isEspacoIncluir && (
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-650 hover:text-amber-750 hover:bg-amber-100 rounded-xl shrink-0" onClick={() => handleRevertStatus(item.id, item.patient?.full_name || '')} disabled={actionId === item.id} title="Desfazer">
                                                <Undo2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Success Dialog */}
            <Dialog open={!!createdWalkIn} onOpenChange={(open) => !open && setCreatedWalkIn(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Atendimento Criado!</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                        <div className="p-4 bg-white rounded-lg shadow-sm border">
                            <QRCodeSVG value={createdWalkIn?.qrCode?.checkinUrl || ''} size={200} />
                        </div>
                        <p className="text-center text-sm text-muted-foreground">
                            Peça para o paciente escanear para fazer check-in ou envie pelo WhatsApp.
                        </p>
                        <div className="flex gap-2 w-full">
                            <Button className="flex-1" variant="outline" onClick={() => window.open(createdWalkIn?.qrCode?.whatsappLink, '_blank')}>
                                Enviar WhatsApp
                            </Button>
                            <Button className="flex-1" onClick={() => setCreatedWalkIn(null)}>
                                Concluir
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Documents Modal */}
            {selectedAppointmentId && (
                <CheckinDocumentsModal
                    isOpen={documentsModalOpen}
                    onClose={() => {
                        setDocumentsModalOpen(false)
                        setSelectedAppointmentId(null)
                    }}
                    appointmentId={selectedAppointmentId}
                    patientName={selectedPatientName}
                />
            )}
        </div>
    )
}
