// components/reception/TerminalEscalationAlert.tsx
// Monitoramento em tempo real de chamadas de apoio de tablets na recepcao

'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PhoneCall, Check, X, Tablet, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface EscalationItem {
    appointment_id: string
    device_id: string
    room_label: string
    patient_id?: string
    requested_at: string
}

interface TerminalEscalationAlertProps {
    clinicId: string
}

export function TerminalEscalationAlert({ clinicId }: TerminalEscalationAlertProps) {
    const [escalations, setEscalations] = useState<EscalationItem[]>([])

    useEffect(() => {
        if (!clinicId) return

        const supabase = createClient()
        const channelName = `reception:${clinicId}`

        const channel = supabase
            .channel(channelName)
            .on('broadcast', { event: 'escalation_requested' }, (payload: any) => {
                const data = payload.payload || payload
                const item: EscalationItem = {
                    appointment_id: data.appointment_id,
                    device_id: data.device_id,
                    room_label: data.room_label || 'Sala de Atendimento',
                    patient_id: data.patient_id,
                    requested_at: data.requested_at || new Date().toISOString(),
                }

                setEscalations((prev) => [item, ...prev])
                toast.warning(`Apoio solicitado no tablet da ${item.room_label}!`, {
                    description: 'Paciente ou terapeuta solicitou suporte presencial da recepção.',
                    duration: 10000,
                })
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [clinicId])

    const handleDismiss = (appointmentId: string) => {
        setEscalations((prev) => prev.filter((e) => e.appointment_id !== appointmentId))
    }

    if (escalations.length === 0) return null

    return (
        <div className="space-y-2 mb-4">
            {escalations.map((item) => (
                <div
                    key={item.appointment_id}
                    className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-3 shadow-md animate-in slide-in-from-top duration-300"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0">
                            <PhoneCall className="w-4 h-4 animate-bounce" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                    Chamada de Apoio no Tablet: {item.room_label}
                                </span>
                                <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300">
                                    Pendente
                                </Badge>
                            </div>
                            <p className="text-[11px] text-amber-700 dark:text-amber-300/80">
                                Compareça à sala para prestar assistência no check-in presencial do paciente.
                            </p>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismiss(item.appointment_id)}
                        className="h-8 px-3 text-xs text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg gap-1"
                    >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Atendido
                    </Button>
                </div>
            ))}
        </div>
    )
}
