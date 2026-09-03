'use client'

import { useState, useEffect, useRef } from 'react'
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
        id?: string
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
    calledAt?: string
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

const getTimeWaiting = (arrivalTime: string | Date) => {
    const start = new Date(arrivalTime).getTime()
    const now = new Date().getTime()
    const diffInMinutes = Math.floor((now - start) / 60000)
    
    if (diffInMinutes < 60) {
        return `${diffInMinutes} min`
    }
    const hours = Math.floor(diffInMinutes / 60)
    const mins = diffInMinutes % 60
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
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

    // Configuração do Painel de TV (default true para todas as clínicas; exceções configuradas no banco)
    const [chamadaPainelTvHabilitada, setChamadaPainelTvHabilitada] = useState(true)
    const [tvRecallMinutes, setTvRecallMinutes] = useState<number>(5)
    const [checkInModal, setCheckInModal] = useState<{ open: boolean, appointmentId: string | null, notes: string }>({ open: false, appointmentId: null, notes: '' })
    const [noShowModal, setNoShowModal] = useState<{ open: boolean, appointmentId: string | null, patientName: string, notes: string }>({ open: false, appointmentId: null, patientName: '', notes: '' })

    const autoRecalledIdsRef = useRef<Set<string>>(new Set())

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
                    if (data.chamadaPainelTvHabilitada !== undefined) {
                        setChamadaPainelTvHabilitada(Boolean(data.chamadaPainelTvHabilitada))
                    }
                }
            } catch { /* silent */ } finally {
                setIsPlanLoading(false)
            }

            try {
                const tvRes = await fetch('/api/clinics/tv-settings')
                if (tvRes.ok) {
                    const tvData = await tvRes.json()
                    if (tvData.tvRecallMinutes !== undefined) {
                        setTvRecallMinutes(Number(tvData.tvRecallMinutes))
                    }
                }
            } catch { /* silent */ }
        }
        fetchPlanType()
    }, [])

    // Escalonamento por ausência de check-in / início de atendimento (Prioridade 4)
    useEffect(() => {
        if (!tvRecallMinutes || tvRecallMinutes <= 0) return

        const checkEscalation = () => {
            const now = Date.now()
            const thresholdMs = tvRecallMinutes * 60 * 1000

            queue.forEach(item => {
                if (item.status === 'WAITING' && (item.calledAt || item.arrivalTime)) {
                    const callTimeStr = item.calledAt || item.arrivalTime
                    const calledTime = new Date(callTimeStr).getTime()
                    const elapsed = now - calledTime

                    // Se passou do tempo de tolerância e ainda não foi re-chamado automaticamente
                    if (elapsed >= thresholdMs && !autoRecalledIdsRef.current.has(item.id)) {
                        autoRecalledIdsRef.current.add(item.id)

                        // Repetir chamada automaticamente na TV/Voz
                        handleCallPatient(
                            item.id,
                            item.patient?.full_name || 'Paciente',
                            item.consulting_room_id,
                            undefined
                        )

                        toast({
                            title: '⚠️ Alerta de Escalonamento (Ausência)',
                            description: `Paciente ${item.patient?.full_name || 'Paciente'} chamado(a) há mais de ${tvRecallMinutes} min sem atendimento. Chamada repetida automaticamente no Painel de TV!`,
                        })
                    }
                }
            })
        }

        const escalationTimer = setInterval(checkEscalation, 15000)
        return () => clearInterval(escalationTimer)
    }, [queue, tvRecallMinutes])

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

        // Listen for new pre-checkins (patients completing online check-in)
        const checkinChannel = supabase
            .channel('reception_checkin_alerts')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'appointment_checkins',
                },
                () => {
                    loadData()
                    toast({
                        title: '📋 Pré-check-in recebido',
                        description: 'Um paciente completou o pré-check-in online.',
                    })
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
            checkinChannel.unsubscribe()
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
                if (data.chamadaPainelTvHabilitada !== undefined) {
                    setChamadaPainelTvHabilitada(Boolean(data.chamadaPainelTvHabilitada))
                }

                setStats({
                    waiting_count: q.filter(i => ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'WAITING', 'PENDING_PAYMENT'].includes(i.status)).length,
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

    async function handleCallPatient(appointmentId: string, patientName: string, consultingRoomId?: string | null, roomName?: string) {
        setCallingId(appointmentId)
        try {
            const res = await fetch('/api/reception/call-patient', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId, consultingRoomId })
            })

            if (res.ok) {
                toast({
                    title: '📢 Paciente Chamado!',
                    description: `${patientName} chamado(a) ${roomName ? `para ${roomName}` : 'no Painel de TV'}.`,
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
                description: error instanceof Error ? error.message : 'Erro ao criar paciente'
            })
        } finally {
            setIsSubmittingPatient(false)
        }
    }

    return (
        <div className="space-y-5 max-w-[1600px] mx-auto px-1 sm:px-4 py-2">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-semibold text-foreground tracking-tight">
                            Recepção
                        </h1>
                        
                        {/* Filtros e Ações Dropdown Button */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-7 text-xs gap-1.5 border-border/70 hover:bg-muted font-medium text-muted-foreground hover:text-foreground rounded-xs px-2.5 shadow-xs"
                                >
                                    <SlidersHorizontal className="h-3 w-3" />
                                    <span>Filtros e Ações</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 p-1 rounded-xs bg-popover border border-border shadow-md">
                                {currentUser?.clinic_id && (
                                    <>
                                        <DropdownMenuItem
                                            className="cursor-pointer gap-2 p-2 rounded-xs hover:bg-muted transition-colors text-xs"
                                            onSelect={() => {
                                                const url = `${window.location.origin}/painel-tv/${currentUser.clinic_id}`
                                                window.open(url, '_blank')
                                            }}
                                        >
                                            <Tv className="w-3.5 h-3.5 text-blue-600" />
                                            <div>
                                                <p className="font-medium text-foreground">Painel TV</p>
                                                <p className="text-[10px] text-muted-foreground">Exibir na recepção</p>
                                            </div>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                            className="cursor-pointer gap-2 p-2 rounded-xs hover:bg-muted transition-colors text-xs"
                                            onSelect={() => {
                                                const url = `${window.location.origin}/totem/${currentUser.clinic_id}`
                                                window.open(url, '_blank')
                                            }}
                                        >
                                            <Monitor className="w-3.5 h-3.5 text-cyan-600" />
                                            <div>
                                                <p className="font-medium text-foreground">Auto Atendimento</p>
                                                <p className="text-[10px] text-muted-foreground">Totem e cadastro</p>
                                            </div>
                                        </DropdownMenuItem>
                                    </>
                                )}

                                <DropdownMenuItem
                                    asChild
                                    className="cursor-pointer gap-2 p-2 rounded-xs hover:bg-muted transition-colors text-xs"
                                >
                                    <Link href="/dashboard/recepcao/face-checkin">
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                        <div>
                                            <p className="font-medium text-foreground">Check-in Fácil</p>
                                            <p className="text-[10px] text-muted-foreground">Iniciar atendimento</p>
                                        </div>
                                    </Link>
                                </DropdownMenuItem>

                                <QRScannerDialog onCheckIn={loadData}>
                                    <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        className="cursor-pointer gap-2 p-2 rounded-xs hover:bg-muted transition-colors text-xs"
                                    >
                                        <QrCode className="w-3.5 h-3.5 text-sky-600" />
                                        <div>
                                            <p className="font-medium text-foreground">Escanear QR Code</p>
                                            <p className="text-[10px] text-muted-foreground">Buscar paciente</p>
                                        </div>
                                    </DropdownMenuItem>
                                </QRScannerDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Gestão de fila e check-in de pacientes
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Sem Agendamento (Atendimento avulso) */}
                    <Dialog open={showWalkInDialog} onOpenChange={(open) => {
                        setShowWalkInDialog(open)
                        if (!open) setIsCreatingPatient(false)
                    }}>
                        <DialogTrigger asChild>
                            <Button 
                                className="h-8 px-3.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-xs shadow-xs gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Sem Agendamento</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-xs">
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
                                            <SelectTrigger className="rounded-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xs">
                                                <SelectItem value="normal">Normal</SelectItem>
                                                <SelectItem value="priority">Prioridade</SelectItem>
                                                <SelectItem value="urgent">Urgente</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Motivo</Label>
                                        <Input
                                            className="rounded-xs"
                                            placeholder="Motivo da consulta..."
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                        />
                                    </div>
                                    <Button className="w-full rounded-xs h-8 text-xs font-medium" onClick={handleCreateWalkIn}>
                                        Adicionar à Fila
                                    </Button>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* Settings Configurations Button */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="h-8 gap-1.5 border-border/70 text-muted-foreground hover:text-foreground font-medium rounded-xs px-3 shadow-xs text-xs">
                                <Settings className="w-3.5 h-3.5" />
                                Configurações
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-xs">
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
                                        <SelectTrigger className="rounded-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xs">
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

            {/* Horizontal Stats Capsules (SaaS Premium Internacional: neutros, limpos, cores suaves) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Aguardando */}
                <div className="flex items-center justify-between h-9 px-3.5 bg-card hover:bg-muted/40 text-card-foreground rounded-xs border border-border/60 shadow-xs hover:border-border transition-all duration-150 cursor-default select-none">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-xs font-medium text-muted-foreground">Aguardando</span>
                    </div>
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold rounded-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        {stats.waiting_count}
                    </span>
                </div>

                {/* 2. Em Atendimento */}
                <div className="flex items-center justify-between h-9 px-3.5 bg-card hover:bg-muted/40 text-card-foreground rounded-xs border border-border/60 shadow-xs hover:border-border transition-all duration-150 cursor-default select-none">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-xs font-medium text-muted-foreground">Em Atendimento</span>
                    </div>
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold rounded-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                        {stats.in_service_count}
                    </span>
                </div>

                {/* 3. Atendidos Hoje */}
                <div className="flex items-center justify-between h-9 px-3.5 bg-card hover:bg-muted/40 text-card-foreground rounded-xs border border-border/60 shadow-xs hover:border-border transition-all duration-150 cursor-default select-none">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-medium text-muted-foreground">Atendidos</span>
                    </div>
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold rounded-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        {stats.completed_count}
                    </span>
                </div>

                {/* 4. Não Compareceram */}
                <div 
                    onClick={() => setShowNoShowList(true)}
                    className="flex items-center justify-between h-9 px-3.5 bg-card hover:bg-muted/40 text-card-foreground rounded-xs border border-border/60 shadow-xs hover:border-border transition-all duration-150 cursor-pointer select-none"
                    title="Clique para ver lista de ausentes"
                >
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="text-xs font-medium text-muted-foreground">Ausentes</span>
                    </div>
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold rounded-xs bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                        {stats.no_show_count}
                    </span>
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
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-xs" onClick={() => handleRevertStatus(item.id, item.patient?.full_name || '')} disabled={actionId === item.id} title="Desfazer">
                                                <Undo2 className="w-4 h-4" />
                                            </Button>
                                            <Badge variant="outline" className="text-red-650 dark:text-red-400 border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 font-bold text-[10px]">Ausente</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* 3-Panel Kanban Queue Layout (SaaS Premium Internacional: neutro, limpo, cantos austeros 2px) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Column 1: Aguardando */}
                <div className="bg-muted/30 dark:bg-slate-900/30 rounded-xs p-3.5 border border-border/60 shadow-xs flex flex-col min-h-[500px]">
                    <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-border/60">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                                Aguardando
                            </h3>
                            <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.2 rounded-xs border border-border/50 shrink-0">
                                {queue.filter(i => ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'WAITING', 'PENDING_PAYMENT'].includes(i.status)).length}
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-xs">
                            <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center flex-1 py-12 text-muted-foreground text-xs">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mb-2" />
                            Carregando fila...
                        </div>
                    ) : queue.filter(i => ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'WAITING', 'PENDING_PAYMENT'].includes(i.status)).length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-1 py-12 text-muted-foreground text-center">
                            <div className="p-2.5 bg-amber-500/10 rounded-xs text-amber-600 dark:text-amber-400 mb-2.5 border border-amber-500/20">
                                <Clock className="w-5 h-5" />
                            </div>
                            <p className="font-medium text-xs text-foreground">Nenhum paciente aguardando</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 px-4">Os pacientes que chegarem na clínica serão listados aqui.</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5 overflow-y-auto max-h-[600px] pr-1">
                            {queue.filter(i => ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'WAITING', 'PENDING_PAYMENT'].includes(i.status)).map((item, index) => (
                                <div 
                                    key={item.id} 
                                    className="p-3.5 rounded-xs border border-border/70 bg-card hover:border-border/90 hover:shadow-xs transition-all duration-150 relative group"
                                >
                                    {/* Card Header: Ordem, Nome, Badges e Ações Secundárias */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            {/* Order Number */}
                                            <div className="flex items-center justify-center w-5 h-5 rounded-xs bg-muted text-muted-foreground font-semibold text-[11px] shrink-0 border border-border/50">
                                                {index + 1}
                                            </div>

                                            <h4 className="font-semibold text-foreground text-sm truncate" title={item.patient?.full_name}>
                                                {item.patient?.full_name || 'Paciente'}
                                            </h4>
                                            
                                            {item.isPriority && (
                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 rounded-xs shrink-0">
                                                    Prioridade
                                                </Badge>
                                            )}
                                            {item.type === 'walk-in' && (
                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 rounded-xs shrink-0">
                                                    Encaixe
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Ações de Suporte (Documentos, Desfazer, Ausente) no topo direito */}
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xs" 
                                                onClick={() => { setSelectedAppointmentId(item.id); setSelectedPatientName(item.patient?.full_name || ''); setDocumentsModalOpen(true) }} 
                                                title="Documentos"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                            </Button>

                                            {(item.checkedInAt || item.status === 'WAITING') && (
                                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xs" onClick={() => handleRevertStatus(item.id, item.patient?.full_name || '')} disabled={actionId === item.id} title="Desfazer">
                                                    <Undo2 className="w-3.5 h-3.5" />
                                                </Button>
                                            )}

                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-xs" onClick={() => !chamadaPainelTvHabilitada ? setNoShowModal({ open: true, appointmentId: item.id, patientName: item.patient?.full_name || '', notes: '' }) : handleNoShow(item.id, item.patient?.full_name || '')} disabled={actionId === item.id} title="Não Compareceu">
                                                <UserX className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Informações do Paciente */}
                                    {/* Informações do Paciente */}
                                    {(() => {
                                        const itemRoom = consultingRooms.find(r => 
                                            (item.consulting_room_id && r.id === item.consulting_room_id) ||
                                            (item.doctor?.id && (r.doctor_id === item.doctor.id || r.doctor?.id === item.doctor.id)) ||
                                            (item.doctor?.user?.full_name && r.doctor?.user?.full_name && 
                                             r.doctor.user.full_name.toLowerCase().trim() === item.doctor.user.full_name.toLowerCase().trim())
                                        )
                                        const roomDisplayName = itemRoom ? itemRoom.display_name || itemRoom.name || `Sala ${itemRoom.room_number}` : null

                                        return (
                                            <>
                                                <div className="mt-1 pl-7">
                                                    {item.doctor && (
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                <User className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                                                <span className="truncate">
                                                                    {item.doctor.user?.name || item.doctor.user?.full_name || 'Profissional'}
                                                                </span>
                                                            </p>
                                                            {roomDisplayName && (
                                                                <Badge variant="outline" className="text-[10px] font-medium bg-muted/60 text-foreground border-border/60 px-1.5 py-0 rounded-xs shrink-0">
                                                                    {roomDisplayName}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                                            {item.arrivalTime 
                                                                ? `Espera: ${getTimeWaiting(item.arrivalTime)}` 
                                                                : item.scheduledTime 
                                                                    ? `Agendado para ${new Date(item.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` 
                                                                    : 'Sem horário'
                                                            }
                                                        </span>
                                                        {item.status === 'WAITING' && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 px-1.5 py-0 font-medium rounded-xs">Chamado</Badge>
                                                                {(() => {
                                                                    const callTimeStr = item.calledAt || item.arrivalTime
                                                                    if (tvRecallMinutes > 0 && callTimeStr) {
                                                                        const elapsedMin = Math.floor((Date.now() - new Date(callTimeStr).getTime()) / 60000)
                                                                        if (elapsedMin >= tvRecallMinutes) {
                                                                            return (
                                                                                <Badge variant="outline" className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0 font-bold animate-pulse rounded-xs">
                                                                                    Não compareceu (+{elapsedMin}m)
                                                                                </Badge>
                                                                            )
                                                                        }
                                                                    }
                                                                    return null
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {item.notes && (
                                                        <p className="text-[11px] text-muted-foreground mt-1.5 bg-muted/40 p-1.5 rounded-xs border border-border/50 italic leading-relaxed">
                                                            <span className="font-semibold not-italic text-foreground">Obs:</span> {item.notes}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Action Footbar: Botões amplos e sem quebra de texto */}
                                                <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border/50">
                                                    {/* Chamar / Re-chamar Paciente no Painel de TV */}
                                                    {chamadaPainelTvHabilitada && (
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className={`h-8 flex-1 text-xs font-medium rounded-xs flex items-center justify-center gap-1.5 whitespace-nowrap ${
                                                                item.status === 'WAITING' 
                                                                    ? 'text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10' 
                                                                    : 'text-blue-600 dark:text-blue-400 border-blue-500/25 hover:bg-blue-500/10'
                                                            }`}
                                                            onClick={() => handleCallPatient(item.id, item.patient?.full_name || '', itemRoom?.id, roomDisplayName || undefined)} 
                                                            disabled={callingId === item.id}
                                                            title={item.status === 'WAITING' ? "Re-chamar paciente no Painel de TV" : "Chamar paciente no Painel de TV"}
                                                        >
                                                            {callingId === item.id ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Megaphone className={`w-3.5 h-3.5 ${item.status === 'WAITING' ? 'text-amber-500' : ''}`} />
                                                                    <span>{item.status === 'WAITING' ? 'Re-chamar' : 'Chamar'}</span>
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}

                                        {/* Iniciar Atendimento / Check-in */}
                                        {item.type === 'appointment' && item.status === 'CONFIRMED' && !item.checkedInAt && (
                                            <button 
                                                className="h-8 flex-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-xs px-3 flex items-center justify-center gap-1.5 whitespace-nowrap transition-all shadow-xs" 
                                                onClick={() => !chamadaPainelTvHabilitada ? handleStartService(item.id, item.patient?.full_name || '') : handleCheckIn(item.id)} 
                                                disabled={actionId === item.id}
                                            >
                                                {actionId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" /><span>{!chamadaPainelTvHabilitada ? 'Em Atendimento' : 'Check-in'}</span></>}
                                            </button>
                                        )}
                                        {item.status === 'WAITING' && (
                                            <button 
                                                className="h-8 flex-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-xs px-3 flex items-center justify-center gap-1.5 whitespace-nowrap transition-all shadow-xs" 
                                                onClick={() => handleStartService(item.id, item.patient?.full_name || '')} 
                                                disabled={actionId === item.id}
                                            >
                                                {actionId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" /><span>Em Atendimento</span></>}
                                            </button>
                                        )}
                                    </div>
                                            </>
                                        )
                                    })()}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Column 2: Em Atendimento */}
                <div className="bg-muted/30 dark:bg-slate-900/30 rounded-xs p-3.5 border border-border/60 shadow-xs flex flex-col min-h-[500px]">
                    <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-border/60">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                                Em Atendimento
                            </h3>
                            <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.2 rounded-xs border border-border/50 shrink-0">
                                {queue.filter(i => i.status === 'IN_PROGRESS').length}
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-xs">
                            <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    {queue.filter(i => i.status === 'IN_PROGRESS').length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-1 py-12 text-muted-foreground text-center">
                            <div className="p-2.5 bg-blue-500/10 rounded-xs text-blue-600 dark:text-blue-400 mb-2.5 border border-blue-500/20">
                                <Users className="w-5 h-5" />
                            </div>
                            <p className="font-medium text-xs text-foreground">Nenhum paciente em atendimento</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 px-4">Os pacientes em atendimento aparecerão aqui.</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5 overflow-y-auto max-h-[600px] pr-1">
                            {queue.filter(i => i.status === 'IN_PROGRESS').map((item) => (
                                <div key={item.id} className="p-3.5 rounded-xs border border-border/70 bg-card hover:border-border/90 hover:shadow-xs transition-all duration-150">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                <h4 className="font-semibold text-foreground text-sm truncate max-w-[200px]" title={item.patient?.full_name}>
                                                    {item.patient?.full_name || 'Paciente'}
                                                </h4>
                                                {item.type === 'walk-in' && (
                                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 rounded-xs">
                                                        Encaixe
                                                    </Badge>
                                                )}
                                            </div>
                                            {item.doctor && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                    <User className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                                    <span className="truncate">
                                                        {item.doctor.user?.name || item.doctor.user?.full_name || 'Profissional'}
                                                    </span>
                                                </p>
                                            )}

                                            {item.notes && (
                                                <p className="text-[11px] text-muted-foreground mt-1.5 bg-muted/40 p-1.5 rounded-xs border border-border/50 italic leading-relaxed">
                                                    <span className="font-semibold not-italic text-foreground">Obs:</span> {item.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border/50">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-7 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border-border/60 rounded-xs px-2.5 flex items-center gap-1 shrink-0" 
                                            onClick={() => handleRevertStatus(item.id, item.patient?.full_name || '')} 
                                            disabled={actionId === item.id} 
                                            title="Voltar para Aguardando"
                                        >
                                            {actionId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Undo2 className="w-3 h-3" /> Voltar</>}
                                        </Button>
                                        
                                        <button 
                                            className="h-7 flex-1 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-xs px-3 flex items-center justify-center gap-1.5 transition-all shadow-xs" 
                                            onClick={() => handleCompleteService(item.id, item.patient?.full_name || '')} 
                                            disabled={actionId === item.id}
                                        >
                                            {actionId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle2 className="w-3 h-3 text-emerald-100" />Concluir</>}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Column 3: Concluídos */}
                <div className="bg-muted/30 dark:bg-slate-900/30 rounded-xs p-3.5 border border-border/60 shadow-xs flex flex-col min-h-[500px]">
                    <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-border/60">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                                Concluídos
                            </h3>
                            <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.2 rounded-xs border border-border/50 shrink-0">
                                {queue.filter(i => i.status === 'COMPLETED').length}
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-xs">
                            <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    {queue.filter(i => i.status === 'COMPLETED').length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-1 py-12 text-muted-foreground text-center">
                            <div className="p-2.5 bg-emerald-500/10 rounded-xs text-emerald-600 dark:text-emerald-400 mb-2.5 border border-emerald-500/20">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <p className="font-medium text-xs text-foreground">Nenhum atendimento concluído</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 px-4">Os atendimentos concluídos aparecerão aqui.</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5 overflow-y-auto max-h-[600px] pr-1">
                            {queue.filter(i => i.status === 'COMPLETED').map((item) => (
                                <div key={item.id} className="p-3.5 rounded-xs border border-border/70 bg-card hover:border-border/90 hover:shadow-xs transition-all duration-150">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                <h4 className="font-semibold text-foreground text-sm truncate max-w-[200px]" title={item.patient?.full_name}>
                                                    {item.patient?.full_name || 'Paciente'}
                                                </h4>
                                                {item.type === 'walk-in' && (
                                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 rounded-xs">
                                                        Encaixe
                                                    </Badge>
                                                )}
                                            </div>
                                            {item.doctor && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                    <User className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                                    <span className="truncate">
                                                        {item.doctor.user?.name || item.doctor.user?.full_name || 'Profissional'}
                                                    </span>
                                                </p>
                                            )}

                                            {item.notes && (
                                                <p className="text-[11px] text-muted-foreground mt-1.5 bg-muted/40 p-1.5 rounded-xs border border-border/50 italic leading-relaxed">
                                                    <span className="font-semibold not-italic text-foreground">Obs:</span> {item.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border/50">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-7 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border-border/60 rounded-xs px-2.5 flex items-center gap-1 shrink-0" 
                                            onClick={() => handleRevertStatus(item.id, item.patient?.full_name || '')} 
                                            disabled={actionId === item.id} 
                                            title="Voltar para Em Atendimento"
                                        >
                                            {actionId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Undo2 className="w-3 h-3" /> Voltar</>}
                                        </Button>

                                        <div className="h-7 flex-1 text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-xs px-3 flex items-center justify-center gap-1.5 transition-all select-none">
                                            <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                            <span>Atendido</span>
                                        </div>
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
