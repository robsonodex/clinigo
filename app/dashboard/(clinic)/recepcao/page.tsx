'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Users, Clock, CheckCircle, XCircle, AlertTriangle,
    Plus, Search, QrCode, User, Calendar, Phone, MessageCircle
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
}

interface Stats {
    waiting_count: number
    in_service_count: number
    completed_count: number
    no_show_count: number
}

export default function RecepcaoPage() {
    const { toast } = useToast()
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

    const [isCreatingPatient, setIsCreatingPatient] = useState(false)
    const [isSubmittingPatient, setIsSubmittingPatient] = useState(false)
    const [createdWalkIn, setCreatedWalkIn] = useState<any>(null)

    useEffect(() => {
        loadData()
        // Poll every 30s
        const interval = setInterval(loadData, 30000)
        return () => clearInterval(interval)
    }, [])

    async function loadData() {
        setLoading(true)
        try {
            // Load stats
            const statsRes = await fetch('/api/reception/dashboard')
            if (statsRes.ok) {
                const data = await statsRes.json()
                if (data.stats) {
                    setStats(data.stats)
                }
            }

            // Load queue
            const queueRes = await fetch('/api/reception/queue')
            if (queueRes.ok) {
                const data = await queueRes.json()
                setQueue(data.queue || [])
            }
        } catch (error) {
            console.error('Error loading reception data:', error)
        } finally {
            setLoading(false)
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
                <div className="flex gap-2">
                    {/* QR Scanner Button */}
                    <QRScannerDialog onCheckIn={loadData} />

                    <Dialog open={showWalkInDialog} onOpenChange={(open) => {
                        setShowWalkInDialog(open)
                        if (!open) setIsCreatingPatient(false)
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Atendimento Sem Agendamento
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
                                    <Button className="w-full" onClick={handleCreateWalkIn}>
                                        Adicionar à Fila
                                    </Button>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-100 rounded-lg">
                                <Clock className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-amber-600">
                                    {stats.waiting_count}
                                </div>
                                <p className="text-xs text-muted-foreground">Aguardando</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-blue-600">
                                    {stats.in_service_count}
                                </div>
                                <p className="text-xs text-muted-foreground">Em Atendimento</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-600">
                                    {stats.completed_count}
                                </div>
                                <p className="text-xs text-muted-foreground">Atendidos Hoje</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-red-100 rounded-lg">
                                <XCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-red-600">
                                    {stats.no_show_count}
                                </div>
                                <p className="text-xs text-muted-foreground">Não Compareceram</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Queue */}
            <Card>
                <CardHeader>
                    <CardTitle>Fila de Atendimento</CardTitle>
                    <CardDescription>
                        {queue.length} {queue.length === 1 ? 'paciente' : 'pacientes'} na fila
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-center py-8 text-muted-foreground">Carregando...</p>
                    ) : queue.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">
                            Nenhum paciente na fila
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {queue.map((item, index) => (
                                <div
                                    key={item.id}
                                    className={`p-4 rounded-lg border-2 ${item.isPriority ? 'border-red-200 bg-red-50' : 'border-border'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 font-bold text-primary">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold">{item.patient.full_name}</h4>
                                                    {item.isPriority && (
                                                        <Badge variant="destructive" className="text-xs">
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                            Prioridade
                                                        </Badge>
                                                    )}
                                                    <Badge variant="outline" className="text-xs">
                                                        {item.type === 'appointment' ? 'Agendado' : 'Walk-in'}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Aguardando há {getTimeWaiting(item.arrivalTime)}
                                                    </span>
                                                    {item.doctor && (
                                                        <span className="flex items-center gap-1">
                                                            <User className="w-3 h-3" />
                                                            {item.doctor.user.name}
                                                        </span>
                                                    )}
                                                </div>
                                                {item.notes && (
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {item.notes}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {item.type === 'appointment' && item.status === 'CONFIRMED' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCheckIn(item.id)}
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Check-in
                                                </Button>
                                            )}
                                            <Button size="sm">
                                                Chamar Paciente
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

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
        </div>
    )
}
