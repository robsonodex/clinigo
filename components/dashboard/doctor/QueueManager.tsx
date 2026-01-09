'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
    Users,
    Clock,
    Bell,
    Play,
    CheckCircle2,
    XCircle,
    Loader2,
    RefreshCw,
    User,
    Phone,
    AlertTriangle,
    Timer,
    Stethoscope,
    Volume2,
    Wifi,
    WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QueueItem {
    id: string
    appointment_id: string
    status: 'waiting' | 'called' | 'in_consultation'
    priority_score: number
    priority_reason: string
    queue_position: number
    entered_queue_at: string
    called_at: string | null
    wait_time_minutes: number
    patient_name?: string
    patient_phone?: string
    main_complaint?: string
    appointment_time?: string
}

interface QueueStats {
    total_waiting: number
    total_called: number
    total_in_consultation: number
    avg_wait_time: number
}

interface QueueManagerProps {
    doctorId: string
    clinicId: string
    doctorName?: string
}

const priorityLabels: Record<string, { label: string; color: string; icon?: boolean }> = {
    emergencia: { label: 'Emergência', color: 'bg-red-100 text-red-800 border-red-200', icon: true },
    idoso: { label: 'Idoso', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    gestante: { label: 'Gestante', color: 'bg-pink-100 text-pink-800 border-pink-200' },
    deficiente: { label: 'PcD', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    retorno_urgente: { label: 'Retorno', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    normal: { label: 'Normal', color: 'bg-gray-100 text-gray-800 border-gray-200' },
}

export function QueueManager({ doctorId, clinicId, doctorName }: QueueManagerProps) {
    const [queue, setQueue] = useState<QueueItem[]>([])
    const [stats, setStats] = useState<QueueStats>({
        total_waiting: 0,
        total_called: 0,
        total_in_consultation: 0,
        avg_wait_time: 0,
    })
    const [isLoading, setIsLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [soundEnabled, setSoundEnabled] = useState(true)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const supabase = createClient()

    // Play notification sound
    const playNotificationSound = useCallback(() => {
        if (soundEnabled && audioRef.current) {
            audioRef.current.play().catch(() => { })
        }
    }, [soundEnabled])

    // Fetch queue data from API
    const fetchQueue = useCallback(async () => {
        try {
            const response = await fetch(
                `/api/checkin/queue?clinic_id=${clinicId}&doctor_id=${doctorId}`
            )
            const result = await response.json()

            if (result.success) {
                setQueue(result.data.queue || [])
                setStats(result.data.stats || {
                    total_waiting: 0,
                    total_called: 0,
                    total_in_consultation: 0,
                    avg_wait_time: 0,
                })
            }
        } catch (error) {
            console.error('Error fetching queue:', error)
        } finally {
            setIsLoading(false)
        }
    }, [clinicId, doctorId])

    // Initial fetch
    useEffect(() => {
        fetchQueue()
    }, [fetchQueue])

    // Supabase Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel(`queue-${doctorId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'appointment_queue',
                    filter: `doctor_id=eq.${doctorId}`,
                },
                (payload) => {
                    console.log('[Realtime] Queue change:', payload.eventType, payload)

                    // Refresh queue on any change
                    fetchQueue()

                    // Show notification for new patients
                    if (payload.eventType === 'INSERT') {
                        playNotificationSound()
                        toast.info('🔔 Novo paciente na fila!', {
                            duration: 5000,
                        })
                    }

                    // Show notification when patient called arrives
                    if (payload.eventType === 'UPDATE' && payload.new) {
                        const newStatus = (payload.new as any).status
                        if (newStatus === 'waiting') {
                            playNotificationSound()
                        }
                    }
                }
            )
            .on('presence', { event: 'sync' }, () => {
                setIsConnected(true)
            })
            .on('presence', { event: 'leave' }, () => {
                setIsConnected(false)
            })
            .subscribe((status) => {
                setIsConnected(status === 'SUBSCRIBED')
                if (status === 'SUBSCRIBED') {
                    console.log('[Realtime] Connected to queue channel')
                }
            })

        return () => {
            console.log('[Realtime] Unsubscribing from queue channel')
            supabase.removeChannel(channel)
        }
    }, [supabase, doctorId, fetchQueue, playNotificationSound])

    // Auto-refresh every 30 seconds as backup
    useEffect(() => {
        const interval = setInterval(fetchQueue, 30000)
        return () => clearInterval(interval)
    }, [fetchQueue])

    // Queue actions
    const performAction = async (action: string, queueId?: string) => {
        const loadingKey = action + (queueId || '')
        setActionLoading(loadingKey)

        try {
            const response = await fetch('/api/checkin/queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    queue_id: queueId,
                    doctor_id: doctorId,
                }),
            })

            const result = await response.json()

            if (result.success) {
                toast.success(result.data.message)
                fetchQueue()
            } else {
                toast.error(result.error || 'Erro ao executar ação')
            }
        } catch (error) {
            toast.error('Erro de conexão')
        } finally {
            setActionLoading(null)
        }
    }

    const callNext = () => performAction('call_next')
    const startConsultation = (queueId: string) => performAction('start_consultation', queueId)
    const endConsultation = (queueId: string) => performAction('end_consultation', queueId)
    const markNoShow = (queueId: string) => performAction('no_show', queueId)

    // Format wait time
    const formatWaitTime = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return `${hours}h ${mins}min`
    }

    const waitingPatients = queue.filter((q) => q.status === 'waiting')
    const calledPatient = queue.find((q) => q.status === 'called')
    const inConsultation = queue.find((q) => q.status === 'in_consultation')

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Hidden audio element for notifications */}
            <audio ref={audioRef} src="/sounds/notification.mp3" preload="auto" />

            {/* Header with connection status */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6" />
                        Fila de Atendimento
                    </h2>
                    {doctorName && (
                        <p className="text-muted-foreground">Dr(a). {doctorName}</p>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={cn(!soundEnabled && 'text-muted-foreground')}
                    >
                        <Volume2 className={cn('w-4 h-4', !soundEnabled && 'opacity-50')} />
                    </Button>
                    <Badge
                        variant="outline"
                        className={cn(
                            'flex items-center gap-1',
                            isConnected
                                ? 'text-green-600 border-green-200'
                                : 'text-red-600 border-red-200'
                        )}
                    >
                        {isConnected ? (
                            <>
                                <Wifi className="w-3 h-3" />
                                Ao vivo
                            </>
                        ) : (
                            <>
                                <WifiOff className="w-3 h-3" />
                                Offline
                            </>
                        )}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={fetchQueue}>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-200/80 rounded-xl">
                                <Users className="w-5 h-5 text-amber-700" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-amber-900">{stats.total_waiting}</p>
                                <p className="text-sm text-amber-700">Aguardando</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-200/80 rounded-xl">
                                <Bell className="w-5 h-5 text-blue-700" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-blue-900">{stats.total_called}</p>
                                <p className="text-sm text-blue-700">Chamados</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-200/80 rounded-xl">
                                <Stethoscope className="w-5 h-5 text-green-700" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-green-900">{stats.total_in_consultation}</p>
                                <p className="text-sm text-green-700">Em Atendimento</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-200/80 rounded-xl">
                                <Timer className="w-5 h-5 text-purple-700" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-purple-900">{stats.avg_wait_time || 0}</p>
                                <p className="text-sm text-purple-700">Média (min)</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Current Consultation */}
            {inConsultation && (
                <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-green-800 flex items-center gap-2">
                            <Stethoscope className="w-5 h-5" />
                            Em Atendimento Agora
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-green-200 rounded-full flex items-center justify-center">
                                    <User className="w-7 h-7 text-green-700" />
                                </div>
                                <div>
                                    <p className="font-semibold text-lg text-green-900">
                                        {inConsultation.patient_name || 'Paciente'}
                                    </p>
                                    {inConsultation.main_complaint && (
                                        <p className="text-sm text-green-700 mt-1">
                                            {inConsultation.main_complaint}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Button
                                size="lg"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => endConsultation(inConsultation.id)}
                                disabled={actionLoading === 'end_consultation' + inConsultation.id}
                            >
                                {actionLoading === 'end_consultation' + inConsultation.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-5 h-5 mr-2" />
                                        Finalizar Consulta
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Called Patient */}
            {calledPatient && (
                <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 animate-pulse">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-blue-800 flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            Paciente Chamado - Aguardando Entrada
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-blue-200 rounded-full flex items-center justify-center">
                                    <User className="w-7 h-7 text-blue-700" />
                                </div>
                                <div>
                                    <p className="font-semibold text-lg text-blue-900">
                                        {calledPatient.patient_name || 'Paciente'}
                                    </p>
                                    {calledPatient.patient_phone && (
                                        <p className="text-sm text-blue-700 flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            {calledPatient.patient_phone}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="lg"
                                    className="bg-blue-600 hover:bg-blue-700"
                                    onClick={() => startConsultation(calledPatient.id)}
                                    disabled={actionLoading === 'start_consultation' + calledPatient.id}
                                >
                                    {actionLoading === 'start_consultation' + calledPatient.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Play className="w-5 h-5 mr-2" />
                                            Iniciar Consulta
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => markNoShow(calledPatient.id)}
                                    disabled={actionLoading === 'no_show' + calledPatient.id}
                                >
                                    {actionLoading === 'no_show' + calledPatient.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <XCircle className="w-4 h-4 mr-1" />
                                            Não Compareceu
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Call Next Button */}
            {!calledPatient && !inConsultation && waitingPatients.length > 0 && (
                <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
                    <CardContent className="py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-xl">
                                    {waitingPatients.length} paciente{waitingPatients.length !== 1 ? 's' : ''} aguardando
                                </p>
                                <p className="text-muted-foreground">
                                    Próximo: <span className="font-medium">{waitingPatients[0]?.patient_name || 'Paciente'}</span>
                                    {waitingPatients[0]?.priority_reason !== 'normal' && (
                                        <Badge
                                            variant="outline"
                                            className={cn('ml-2', priorityLabels[waitingPatients[0].priority_reason]?.color)}
                                        >
                                            {priorityLabels[waitingPatients[0].priority_reason]?.label}
                                        </Badge>
                                    )}
                                </p>
                            </div>
                            <Button
                                size="lg"
                                className="text-lg px-8"
                                onClick={callNext}
                                disabled={actionLoading === 'call_next'}
                            >
                                {actionLoading === 'call_next' ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Bell className="w-5 h-5 mr-2" />
                                        Chamar Próximo
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Waiting Queue List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Fila de Espera
                    </CardTitle>
                    <CardDescription>
                        Pacientes aguardando ordenados por prioridade
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {waitingPatients.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="text-lg">Nenhum paciente na fila</p>
                            <p className="text-sm">Novos pacientes aparecerão automaticamente</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {waitingPatients.map((patient, index) => (
                                <div
                                    key={patient.id}
                                    className={cn(
                                        'flex items-center justify-between p-4 rounded-xl border transition-all',
                                        index === 0
                                            ? 'bg-primary/5 border-primary/20 shadow-sm'
                                            : 'hover:bg-muted/50'
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={cn(
                                                'w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg',
                                                index === 0
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground'
                                            )}
                                        >
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-lg">
                                                    {patient.patient_name || 'Paciente'}
                                                </p>
                                                {patient.priority_reason !== 'normal' && (
                                                    <Badge
                                                        variant="outline"
                                                        className={priorityLabels[patient.priority_reason]?.color}
                                                    >
                                                        {priorityLabels[patient.priority_reason]?.icon && (
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                        )}
                                                        {priorityLabels[patient.priority_reason]?.label}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    Aguardando: {formatWaitTime(patient.wait_time_minutes)}
                                                </span>
                                                {patient.appointment_time && (
                                                    <span>Horário: {patient.appointment_time}</span>
                                                )}
                                                {patient.patient_phone && (
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="w-3 h-3" />
                                                        {patient.patient_phone}
                                                    </span>
                                                )}
                                            </div>
                                            {patient.main_complaint && (
                                                <p className="text-sm text-muted-foreground mt-1 italic">
                                                    "{patient.main_complaint}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {index === 0 && (
                                        <Badge variant="default" className="text-sm">
                                            Próximo
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
