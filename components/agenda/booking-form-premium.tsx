'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import {
    Clock,
    Lock,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    TrendingUp,
    Zap
} from 'lucide-react'
import confetti from 'canvas-confetti'

interface SlotLockIndicatorProps {
    lockId: string | null
    expiresInSeconds: number
    onExpire: () => void
    onConfirm: () => void
    isConfirming: boolean
}

export function SlotLockIndicator({
    lockId,
    expiresInSeconds: initialSeconds,
    onExpire,
    onConfirm,
    isConfirming
}: SlotLockIndicatorProps) {
    const [secondsLeft, setSecondsLeft] = useState(initialSeconds)
    const { toast } = useToast()

    useEffect(() => {
        if (!lockId) return

        const timer = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer)
                    onExpire()
                    toast({
                        variant: 'destructive',
                        title: '⏰ Tempo expirado',
                        description: 'O horário foi liberado. Selecione novamente se ainda estiver disponível.'
                    })
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [lockId, onExpire, toast])

    if (!lockId) return null

    const percentageLeft = (secondsLeft / initialSeconds) * 100
    const isUrgent = secondsLeft <= 10

    return (
        <Card className={`border-2 ${isUrgent ? 'border-amber-500 animate-pulse' : 'border-green-500'}`}>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    {/* Status Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Lock className={`w-5 h-5 ${isUrgent ? 'text-amber-600' : 'text-green-600'}`} />
                            <h4 className="font-semibold">
                                {isUrgent ? '⚠️ Últimos segundos!' : '✅ Horário Reservado'}
                            </h4>
                        </div>
                        <Badge variant={isUrgent ? 'destructive' : 'success'}>
                            <Clock className="w-3 h-3 mr-1" />
                            {secondsLeft}s
                        </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ${isUrgent ? 'bg-amber-500' : 'bg-green-500'
                                }`}
                            style={{ width: `${percentageLeft}%` }}
                        />
                    </div>

                    {/* Action */}
                    <Button
                        onClick={onConfirm}
                        disabled={isConfirming}
                        className="w-full"
                        size="lg"
                    >
                        {isConfirming ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Confirmando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Confirmar Agendamento
                            </>
                        )}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                        Este horário está reservado para você por {secondsLeft} segundos
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

interface PlanLimitWarningProps {
    currentUsage: number
    limit: number
    planType: string
    onUpgrade: () => void
}

export function PlanLimitWarning({
    currentUsage,
    limit,
    planType,
    onUpgrade
}: PlanLimitWarningProps) {
    const percentageUsed = (currentUsage / limit) * 100
    const isNearLimit = percentageUsed >= 80
    const isAtLimit = percentageUsed >= 100

    if (percentageUsed < 80) return null

    return (
        <Alert variant={isAtLimit ? 'destructive' : 'default'} className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
                {isAtLimit ? '🚫 Limite do Plano Atingido' : '⚠️ Próximo do Limite'}
            </AlertTitle>
            <AlertDescription>
                <p className="mb-3">
                    {isAtLimit
                        ? `Você atingiu o limite de ${limit} agendamentos/mês do plano ${planType}.`
                        : `Você usou ${currentUsage} de ${limit} agendamentos este mês (${percentageUsed.toFixed(0)}%).`}
                </p>

                {/* Usage Bar */}
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                    <div
                        className={`h-full ${isAtLimit ? 'bg-red-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                    />
                </div>

                <Button
                    onClick={onUpgrade}
                    variant={isAtLimit ? 'destructive' : 'outline'}
                    size="sm"
                    className="w-full"
                >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    {isAtLimit ? 'Fazer Upgrade Agora' : 'Ver Planos Maiores'}
                </Button>
            </AlertDescription>
        </Alert>
    )
}

interface BookingFormState {
    status: 'idle' | 'checking' | 'locked' | 'confirming' | 'success' | 'error'
    lockId: string | null
    expiresIn: number
    errorMessage: string | null
    planUsage: {
        current: number
        limit: number
        planType: string
    } | null
}

interface BookingFormProps {
    doctorId: string
    selectedDateTime: string
    patientId?: string
    duration?: number
    onSuccess: (appointmentId: string) => void
    onCancel: () => void
}

export function BookingForm({
    doctorId,
    selectedDateTime,
    patientId,
    duration = 30,
    onSuccess,
    onCancel
}: BookingFormProps) {
    const { toast } = useToast()
    const [state, setState] = useState<BookingFormState>({
        status: 'idle',
        lockId: null,
        expiresIn: 30,
        errorMessage: null,
        planUsage: null
    })

    // Auto-check availability on mount
    useEffect(() => {
        handleCheckAvailability()
    }, [])

    const handleCheckAvailability = async () => {
        setState(prev => ({ ...prev, status: 'checking' }))

        try {
            const response = await fetch('/api/appointments/check-availability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    doctor_id: doctorId,
                    slot_datetime: selectedDateTime,
                    patient_id: patientId,
                    duration
                })
            })

            const data = await response.json()

            if (response.status === 402) {
                // Plan limit reached
                setState({
                    status: 'error',
                    lockId: null,
                    expiresIn: 0,
                    errorMessage: data.error,
                    planUsage: {
                        current: data.details.current_appointments,
                        limit: data.details.plan_limit,
                        planType: data.details.plan_type
                    }
                })
                return
            }

            if (!response.ok || !data.available) {
                setState({
                    status: 'error',
                    lockId: null,
                    expiresIn: 0,
                    errorMessage: data.message || data.error,
                    planUsage: null
                })

                toast({
                    variant: 'destructive',
                    title: 'Horário Indisponível',
                    description: data.message
                })
                return
            }

            // Success - slot locked
            setState({
                status: 'locked',
                lockId: data.lock_id,
                expiresIn: data.expires_in_seconds,
                errorMessage: null,
                planUsage: data.plan_usage
            })

            toast({
                title: '✅ Horário Reservado!',
                description: `Você tem ${data.expires_in_seconds} segundos para confirmar.`
            })

        } catch (error) {
            setState({
                status: 'error',
                lockId: null,
                expiresIn: 0,
                errorMessage: 'Erro ao verificar disponibilidade',
                planUsage: null
            })

            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível verificar a disponibilidade. Tente novamente.'
            })
        }
    }

    const handleConfirm = async () => {
        if (!state.lockId) return

        setState(prev => ({ ...prev, status: 'confirming' }))

        try {
            const response = await fetch('/api/appointments/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: patientId,
                    doctor_id: doctorId,
                    date: selectedDateTime.split('T')[0],
                    time: new Date(selectedDateTime).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    duration,
                    lock_id: state.lockId, // Enviar lock_id para confirmação
                    type: 'presencial',
                    status: 'CONFIRMED'
                })
            })

            if (!response.ok) {
                throw new Error('Falha ao criar agendamento')
            }

            const data = await response.json()

            // Success!
            setState(prev => ({ ...prev, status: 'success' }))

            // Confetti celebration
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            })

            toast({
                title: '🎉 Agendamento Confirmado!',
                description: 'O paciente foi notificado via WhatsApp.'
            })

            setTimeout(() => {
                onSuccess(data.appointment.id)
            }, 1500)

        } catch (error) {
            setState(prev => ({ ...prev, status: 'error', errorMessage: 'Erro ao confirmar agendamento' }))

            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível confirmar o agendamento. Tente novamente.'
            })
        }
    }

    const handleExpire = () => {
        setState({
            status: 'idle',
            lockId: null,
            expiresIn: 30,
            errorMessage: null,
            planUsage: state.planUsage
        })
    }

    const handleUpgrade = () => {
        window.location.href = '/dashboard/planos'
    }

    if (state.status === 'checking') {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                        <p className="text-sm text-muted-foreground">Verificando disponibilidade...</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (state.status === 'error' && state.planUsage?.current >= state.planUsage?.limit) {
        return (
            <div className="space-y-4">
                <PlanLimitWarning
                    currentUsage={state.planUsage.current}
                    limit={state.planUsage.limit}
                    planType={state.planUsage.planType}
                    onUpgrade={handleUpgrade}
                />
                <Button onClick={onCancel} variant="outline" className="w-full">
                    Voltar
                </Button>
            </div>
        )
    }

    if (state.status === 'error') {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Horário Indisponível</AlertTitle>
                <AlertDescription>
                    <p className="mb-3">{state.errorMessage}</p>
                    <div className="flex gap-2">
                        <Button onClick={handleCheckAvailability} variant="outline" size="sm">
                            <Zap className="w-4 h-4 mr-2" />
                            Tentar Novamente
                        </Button>
                        <Button onClick={onCancel} variant="ghost" size="sm">
                            Cancelar
                        </Button>
                    </div>
                </AlertDescription>
            </Alert>
        )
    }

    if (state.status === 'locked') {
        return (
            <div className="space-y-4">
                {state.planUsage && (
                    <PlanLimitWarning
                        currentUsage={state.planUsage.current}
                        limit={state.planUsage.limit}
                        planType={state.planUsage.planType}
                        onUpgrade={handleUpgrade}
                    />
                )}

                <SlotLockIndicator
                    lockId={state.lockId}
                    expiresInSeconds={state.expiresIn}
                    onExpire={handleExpire}
                    onConfirm={handleConfirm}
                    isConfirming={state.status === 'confirming'}
                />

                <Button onClick={onCancel} variant="ghost" className="w-full">
                    Cancelar
                </Button>
            </div>
        )
    }

    if (state.status === 'success') {
        return (
            <Card className="border-2 border-green-500">
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center py-8">
                        <CheckCircle2 className="w-16 h-16 text-green-600 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Agendamento Confirmado!</h3>
                        <p className="text-sm text-muted-foreground">Redirecionando...</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return null
}
