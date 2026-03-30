'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Users, Clock, CheckCircle, CheckCircle2, XCircle, AlertTriangle,
    Plus, Search, QrCode, User, UserX, Calendar, Phone, MessageCircle, Settings, FileText,
    Megaphone, Bell, Loader2, Tv, Monitor
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
            name: string
        }
    }
    arrivalTime: string
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
        // Load from localStorage or default to 60s
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
    const [preCheckinCount, setPreCheckinCount] = useState(0)
    const [preCheckinAlerts, setPreCheckinAlerts] = useState<Array<{ id: string; patientName: string; time: string }>>([])
    const [showNoShowList, setShowNoShowList] = useState(false)
    const [clinicPlanType, setClinicPlanType] = useState<PlanType>('BASICO')
    const [isPlanLoading, setIsPlanLoading] = useState(true)

    useEffect(() => {
        loadData()
        // Auto-refresh with configurable interval (in seconds)
        const interval = setInterval(loadData, refreshInterval * 1000)
        return () => clearInterval(interval)
    }, [refreshInterval]) // Re-create interval when refreshInterval changes

    // Fetch clinic plan type for feature gating
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

    // Realtime subscription for pre-check-in notifications AND appointment updates (check-in, status changes)
    useEffect(() => {
        const supabase = createClient()
        const channel = supabase
            .channel('reception_realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'pre_checkin_submissions',
                },
                async (payload: any) => {
                    // A new pre-check-in was submitted — notify and refresh
                    const newSubmission = payload.new
                    if (newSubmission?.status === 'completed') {
                        // Fetch patient name for the alert
                        const { data: apt } = await (supabase as any)
                            .from('appointments')
                            .select('patients(full_name)')
                            .eq('id', newSubmission.appointment_id)
                            .single()

                        const patientName = apt?.patients?.full_name || 'Paciente'
                        setPreCheckinAlerts(prev => [
                            { id: newSubmission.id, patientName, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
                            ...prev.slice(0, 4) // Keep max 5 alerts
                        ])
                        setPreCheckinCount(prev => prev + 1)
                        toast({
                            title: '📋 Novo Pré-Check-in Online!',
                            description: `${patientName} completou o pré-check-in.`,
                        })
                        loadData() // Refresh queue
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'appointments',
                },
                () => {
                    // Appointment updated (check-in facial, status change, etc.)
                    // Refresh queue immediately so the "Chamar" button appears instantly
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
            // Load queue and calculate stats locally for consistency
            const queueRes = await fetch('/api/reception/queue')
            if (queueRes.ok) {
                const data = await queueRes.json()
                const q: QueueItem[] = data.queue || []
                setQueue(q)

                // Calculate stats from queue (Dashboard API is redundant for counts)
                setStats({
                    waiting_count: q.filter(i => ['CONFIRMED', 'WAITING'].includes(i.status)).length,
                    in_service_count: q.filter(i => i.status === 'IN_PROGRESS').length,
                    completed_count: q.filter(i => i.status === 'COMPLETED').length,
                    no_show_count: q.filter(i => i.status === 'NO_SHOW').length
                })
            }
            // Load consulting rooms
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

    async function handleNoShow(appointmentId: string, patientName: string) {
        setActionId(appointmentId)
        try {
            const res = await fetch('/api/reception/no-show', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId })
            })
            if (res.ok) {
                toast({ title: 'Não Compareceu', description: `${patientName} marcado como não compareceu.` })
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

    async function handleCheckIn(appointmentId: string) {
        try {
            const res = await fetch(`/api/reception/checkin/${appointmentId}`, {
                method: 'POST'
            })

            if (res.ok) {
                toast({
                    title: 'Check-in realizado',
                    description: 'Paciente confirmado na fila de atendimento'
                })
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

    function getTimeWaiting(arrivalTime: string): string {
        const now = new Date()
        const arrival = new Date(arrivalTime)
        const diffMs = now.getTime() - arrival.getTime()
        const diffMins = Math.floor(diffMs / 60000)

        if (diffMins < 60) return `${diffMins} min`
        const hours = Math.floor(diffMins / 60)
        const mins = diffMins % 60
        return `${hours}h ${mins}min`
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Users className="w-7 h-7" />
                            Recepção
                        </h1>
                        <p className="text-muted-foreground">
                            Gestão de fila e check-in de pacientes
                        </p>
                    </div>
                    {/* Settings gear - moved here */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Configurar atualização automática" className="text-muted-foreground hover:text-foreground">
                                <Settings className="w-5 h-5" />
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

                {/* Action Buttons - uniform grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {currentUser === undefined || isPlanLoading ? (
                        <>
                            <div className="h-12 rounded-lg bg-slate-200 animate-pulse shadow-sm" />
                            <div className="h-12 rounded-lg bg-slate-200 animate-pulse shadow-sm" />
                            <div className="h-12 rounded-lg bg-slate-200 animate-pulse shadow-sm" />
                            <div className="h-12 rounded-lg bg-slate-200 animate-pulse shadow-sm" />
                            <div className="h-12 rounded-lg bg-slate-200 animate-pulse shadow-sm" />
                        </>
                    ) : (
                        <>
                            {/* Painel TV */}
                            {currentUser?.clinic_id && (
                                <Button
                                    className="h-12 gap-2 text-sm font-medium text-white border border-slate-600/50 bg-gradient-to-br from-slate-700 to-slate-900 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 shadow-md ring-1 ring-black/5"
                                    onClick={() => {
                                        const url = `${window.location.origin}/painel-tv/${currentUser.clinic_id}`
                                        window.open(url, '_blank')
                                    }}
                                >
                                    <Tv className="w-4 h-4" />
                                    Painel TV
                                </Button>
                            )}

                            {/* Auto Atendimento */}
                            {currentUser?.clinic_id && hasFeature(clinicPlanType, 'totem') && (
                                <Button
                                    className="h-12 gap-2 text-sm font-medium text-white border border-cyan-600/50 bg-gradient-to-br from-cyan-700 to-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 shadow-md ring-1 ring-black/5"
                                    onClick={() => {
                                        const url = `${window.location.origin}/totem/${currentUser.clinic_id}`
                                        window.open(url, '_blank')
                                    }}
                                >
                                    <Monitor className="w-4 h-4" />
                                    Auto Atendimento
                                </Button>
                            )}

                            {/* Check-in Fácil */}
                            <Link href="/dashboard/recepcao/face-checkin">
                                <Button className="h-12 w-full gap-2 text-sm font-medium text-white border border-emerald-500/50 bg-gradient-to-br from-emerald-600 to-teal-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 shadow-md ring-1 ring-black/5">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Check-in Fácil
                                </Button>
                            </Link>

                            {/* QR Scanner */}
                            <QRScannerDialog onCheckIn={loadData} />

                            {/* Sem Agendamento */}
                            <Dialog open={showWalkInDialog} onOpenChange={(open) => {
                                setShowWalkInDialog(open)
                                if (!open) setIsCreatingPatient(false)
                            }}>
                                <DialogTrigger asChild>
                                    <Button className="h-12 gap-2 text-sm font-medium text-white border border-sky-400/50 bg-gradient-to-br from-sky-500 to-blue-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 shadow-md ring-1 ring-black/5">
                                        <Plus className="w-4 h-4" />
                                        Sem Agendamento
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
                                            <Button className="w-full hover:shadow-md transition-all duration-300" onClick={handleCreateWalkIn}>
                                                Adicionar à Fila
                                            </Button>
                                        </div>
                                    )}
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                </div>
            </div>

            {/* Stats Bar - compact */}
            <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-lg font-bold text-amber-600">{stats.waiting_count}</span>
                    <span className="text-xs text-muted-foreground">Aguardando</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-lg font-bold text-blue-600">{stats.in_service_count}</span>
                    <span className="text-xs text-muted-foreground">Em Atendimento</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-lg font-bold text-green-600">{stats.completed_count}</span>
                    <span className="text-xs text-muted-foreground">Atendidos Hoje</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors" onClick={() => setShowNoShowList(true)} role="button" tabIndex={0}>
                    <UserX className="w-4 h-4 text-red-600" />
                    <span className="text-lg font-bold text-red-600">{stats.no_show_count}</span>
                    <span className="text-xs text-muted-foreground">Não Compareceram</span>
                </div>
            </div>

            <Dialog open={showNoShowList} onOpenChange={setShowNoShowList}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pacientes que não compareceram</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {stats.no_show_count === 0 ? (
                            <p className="text-center text-muted-foreground py-4 text-sm">Nenhum paciente nesta lista.</p>
                        ) : (
                            <div className="space-y-2">
                                {queue.filter(i => i.status === 'NO_SHOW').map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50/50 border-red-100">
                                        <div>
                                            <p className="font-medium text-sm">{item.patient.full_name}</p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                <Clock className="w-3 h-3" />
                                                Chegada original: {getTimeWaiting(item.arrivalTime)}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">Ausente</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Pre-Check-in Realtime Alerts */}
            {
                preCheckinAlerts.length > 0 && (
                    <Card className="border-2 border-amber-300 bg-amber-50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Bell className="w-5 h-5 text-amber-600" />
                                Pré-Check-ins Online Recentes
                                <Badge className="bg-amber-600 text-white">{preCheckinAlerts.length}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-2">
                                {preCheckinAlerts.map((alert) => (
                                    <div key={alert.id} className="flex items-center justify-between p-2 rounded-lg bg-white border border-amber-200">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-amber-600" />
                                            <span className="font-medium text-sm">{alert.patientName}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">{alert.time}</span>
                                    </div>
                                ))}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 w-full text-amber-700 hover:bg-amber-100"
                                onClick={() => setPreCheckinAlerts([])}
                            >
                                Limpar notificações
                            </Button>
                        </CardContent>
                    </Card>
                )
            }

            {/* 3-Panel Queue Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Panel 1: Aguardando */}
                <Card className="border-t-4 border-t-amber-500">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-600" />
                            Aguardando
                            <Badge className="bg-amber-100 text-amber-800">
                                {queue.filter(i => ['CONFIRMED', 'WAITING'].includes(i.status)).length}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {loading ? (
                            <p className="text-center py-6 text-muted-foreground text-sm">Carregando...</p>
                        ) : queue.filter(i => ['CONFIRMED', 'WAITING'].includes(i.status)).length === 0 ? (
                            <p className="text-center py-6 text-muted-foreground text-sm">Nenhum paciente aguardando</p>
                        ) : (
                            <div className="space-y-2">
                                {queue.filter(i => ['CONFIRMED', 'WAITING'].includes(i.status)).map((item, index) => (
                                    <div key={item.id} className={`p-3 rounded-lg border ${item.isPriority ? 'border-red-200 bg-red-50' : 'border-border'}`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-sm shrink-0">
                                                {index + 1}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-semibold text-sm truncate">{item.patient?.full_name || 'Paciente'}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {getTimeWaiting(item.arrivalTime)}
                                                    </span>
                                                    {item.status === 'WAITING' && (
                                                        <Badge className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0">Chamado</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 flex-wrap">
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setSelectedAppointmentId(item.id); setSelectedPatientName(item.patient?.full_name || ''); setDocumentsModalOpen(true) }} title="Documentos">
                                                <FileText className="w-3.5 h-3.5" />
                                            </Button>
                                            {item.type === 'appointment' && item.status === 'CONFIRMED' && !item.checkedInAt && (
                                                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleCheckIn(item.id)}>
                                                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                                    Check-in
                                                </Button>
                                            )}
                                            {item.type === 'appointment' && item.checkedInAt && item.status === 'CONFIRMED' && (
                                                <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleCallPatient(item.id, item.patient?.full_name || '')} disabled={callingId === item.id}>
                                                    {callingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Megaphone className="w-3.5 h-3.5 mr-1" />Chamar</>}
                                                </Button>
                                            )}
                                            {item.status === 'WAITING' && (
                                                <>
                                                    <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleCallPatient(item.id, item.patient?.full_name || '')} disabled={callingId === item.id}>
                                                        {callingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Megaphone className="w-3.5 h-3.5 mr-1" />Chamar</>}
                                                    </Button>
                                                    <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleStartService(item.id, item.patient?.full_name || '')} disabled={actionId === item.id}>
                                                        {actionId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>🩺 Em Atend.</>}
                                                    </Button>
                                                </>
                                            )}
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleNoShow(item.id, item.patient?.full_name || '')} disabled={actionId === item.id} title="Não Compareceu">
                                                <UserX className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Panel 2: Em Atendimento */}
                <Card className="border-t-4 border-t-emerald-500">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-600" />
                            Em Atendimento
                            <Badge className="bg-emerald-100 text-emerald-800">
                                {queue.filter(i => i.status === 'IN_PROGRESS').length}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {queue.filter(i => i.status === 'IN_PROGRESS').length === 0 ? (
                            <p className="text-center py-6 text-muted-foreground text-sm">Nenhum paciente em atendimento</p>
                        ) : (
                            <div className="space-y-2">
                                {queue.filter(i => i.status === 'IN_PROGRESS').map((item) => (
                                    <div key={item.id} className="p-3 rounded-lg border border-emerald-200 bg-emerald-50">
                                        <div className="flex items-center justify-between">
                                            <div className="min-w-0">
                                                <h4 className="font-semibold text-sm truncate">{item.patient?.full_name || 'Paciente'}</h4>
                                                {item.doctor && (
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                        <User className="w-3 h-3" />
                                                        {item.doctor.user.name}
                                                    </span>
                                                )}
                                            </div>
                                            <Button size="sm" className="h-8 text-xs bg-gray-600 hover:bg-gray-700 text-white shrink-0" onClick={() => handleCompleteService(item.id, item.patient?.full_name || '')} disabled={actionId === item.id}>
                                                {actionId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>✅ Concluir</>}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Panel 3: Concluídos */}
                <Card className="border-t-4 border-t-gray-400">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-gray-500" />
                            Concluídos
                            <Badge className="bg-gray-100 text-gray-600">
                                {queue.filter(i => i.status === 'COMPLETED').length}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {queue.filter(i => i.status === 'COMPLETED').length === 0 ? (
                            <p className="text-center py-6 text-muted-foreground text-sm">Nenhum atendimento concluído</p>
                        ) : (
                            <div className="space-y-2">
                                {queue.filter(i => i.status === 'COMPLETED').map((item) => (
                                    <div key={item.id} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                                        <div className="min-w-0">
                                            <h4 className="font-medium text-sm text-gray-600 truncate">{item.patient?.full_name || 'Paciente'}</h4>
                                            {item.doctor && (
                                                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                    <User className="w-3 h-3" />
                                                    {item.doctor.user.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
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
                                <MessageCircle className="w-4 h-4 mr-2" />
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
            {
                selectedAppointmentId && (
                    <CheckinDocumentsModal
                        isOpen={documentsModalOpen}
                        onClose={() => {
                            setDocumentsModalOpen(false)
                            setSelectedAppointmentId(null)
                        }}
                        appointmentId={selectedAppointmentId}
                        patientName={selectedPatientName}
                    />
                )
            }
        </div >
    )
}
