'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, User, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OverdueBadge } from '../appointments/OverdueBadge'
import { MarkNoShowButton } from '../appointments/MarkNoShowButton'

interface OverdueAppointment {
    id: string
    patient_name: string
    patient_phone: string
    patient_noshow_count: number
    doctor_name: string
    appointment_time: string
    minutes_overdue: number
    clinic_name: string
}

interface OverdueAppointmentsListProps {
    clinicId?: string
}

export function OverdueAppointmentsList({ clinicId }: OverdueAppointmentsListProps) {
    const [appointments, setAppointments] = useState<OverdueAppointment[]>([])
    const [loading, setLoading] = useState(true)
    const [lastRefresh, setLastRefresh] = useState(new Date())

    const fetchOverdue = async () => {
        setLoading(true)
        try {
            const url = clinicId
                ? `/api/appointments/overdue?clinic_id=${clinicId}`
                : '/api/appointments/overdue'

            const response = await fetch(url)

            // Check if response is OK
            if (!response.ok) {
                console.error('Overdue API error:', response.status, response.statusText)
                setAppointments([])
                setLoading(false)
                return
            }

            const data = await response.json()
            console.log('[DEBUG] Overdue response:', data)

            // ✅ successResponse() returns { success: true, data: { overdue_count, appointments } }
            if (data.success && data.data && Array.isArray(data.data.appointments)) {
                setAppointments(data.data.appointments)
                setLastRefresh(new Date())
            } else {
                console.warn('[DEBUG] Unexpected response format:', data)
                setAppointments([])
            }
        } catch (error) {
            console.error('Error fetching overdue appointments:', error)
            setAppointments([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchOverdue()

        // Auto-refresh every 2 minutes
        const interval = setInterval(fetchOverdue, 120000)

        return () => clearInterval(interval)
    }, [clinicId])

    if (loading && appointments.length === 0) {
        return (
            <Card className="border-gray-200">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-center text-gray-500">
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Carregando consultas atrasadas...
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (appointments.length === 0) {
        return null // Don't show if no overdue appointments
    }

    return (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500" />
                        <CardTitle className="text-red-900 dark:text-red-100">
                            Consultas Atrasadas ({appointments.length})
                        </CardTitle>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchOverdue}
                        disabled={loading}
                        className="gap-2 text-red-700 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                </div>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                    Última atualização: {lastRefresh.toLocaleTimeString('pt-BR')}
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                {appointments.map(apt => (
                    <Card key={apt.id} className="border-red-200 dark:border-red-900">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-2 flex-1">
                                    {/* Patient info */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <User className="w-4 h-4 text-gray-500" />
                                        <span className="font-medium">{apt.patient_name}</span>
                                        <OverdueBadge minutesOverdue={apt.minutes_overdue} />
                                        {apt.patient_noshow_count >= 3 && (
                                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full dark:bg-orange-900/20 dark:text-orange-400">
                                                ⚠️ {apt.patient_noshow_count} faltas
                                            </span>
                                        )}
                                    </div>

                                    {/* Time and doctor */}
                                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span>{apt.appointment_time}</span>
                                        </div>
                                        <span>•</span>
                                        <span>{apt.doctor_name}</span>
                                    </div>

                                    {apt.patient_phone && (
                                        <div className="text-xs text-gray-500 dark:text-gray-500">
                                            📞 {apt.patient_phone}
                                        </div>
                                    )}
                                </div>

                                {/* Action button */}
                                <MarkNoShowButton
                                    appointmentId={apt.id}
                                    patientName={apt.patient_name}
                                    onSuccess={fetchOverdue}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </CardContent>
        </Card>
    )
}
