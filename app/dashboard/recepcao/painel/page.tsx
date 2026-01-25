/**
 * Real-time Reception Panel for TV Display
 * URL: /dashboard/recepcao/painel
 */

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Clock, Stethoscope, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Appointment {
    id: string
    status: string
    appointment_time: string
    checked_in_at?: string
    started_at?: string
    patient: {
        full_name: string
    }
    doctor: {
        user: {
            full_name: string
        }
    }
}

export default function PainelChamadasPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [lastCalled, setLastCalled] = useState<Appointment | null>(null)
    const [currentTime, setCurrentTime] = useState(new Date())

    const supabase = createClient()

    useEffect(() => {
        // Fetch today's appointments
        const fetchAppointments = async () => {
            const today = new Date().toISOString().split('T')[0]

            const { data } = await supabase
                .from('appointments')
                .select(`
          *,
          patient:patients(full_name),
          doctor:doctors(user:users(full_name))
        `)
                .eq('appointment_date', today)
                .in('status', ['WAITING', 'IN_PROGRESS', 'COMPLETED'])
                .order('appointment_time', { ascending: true })

            if (data) setAppointments(data as any)
        }

        fetchAppointments()

        // Real-time subscription
        const channel = supabase
            .channel('appointments_realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'appointments',
                },
                (payload: any) => {
                    if (payload.eventType === 'UPDATE') {
                        setAppointments((prev) =>
                            prev.map((apt) =>
                                apt.id === payload.new.id ? { ...apt, ...(payload.new as any) } : apt
                            )
                        )

                        // Show call animation when status changes to IN_PROGRESS
                        if (
                            payload.new.status === 'IN_PROGRESS' &&
                            payload.old?.status === 'WAITING'
                        ) {
                            // Recharger les données complètes pour avoir patient et doctor
                            fetchAppointments()
                            setTimeout(() => {
                                const updatedApt = appointments.find(a => a.id === payload.new.id)
                                if (updatedApt) {
                                    setLastCalled(updatedApt)
                                    setTimeout(() => setLastCalled(null), 5000) // Hide after 5s
                                }
                            }, 100)
                        }
                    }
                }
            )
            .subscribe()

        // Clock update
        const interval = setInterval(() => setCurrentTime(new Date()), 1000)

        return () => {
            channel.unsubscribe()
            clearInterval(interval)
        }
    }, [])

    const waiting = appointments.filter((a) => a.status === 'WAITING')
    const inProgress = appointments.filter((a) => a.status === 'IN_PROGRESS')
    const completed = appointments.filter((a) => a.status === 'COMPLETED')

    return (
        <div className="h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white p-8 overflow-hidden">
            {/* Header */}
            <header className="text-center mb-8">
                <h1 className="text-6xl font-bold">🏥 Painel de Atendimento</h1>
                <p className="text-2xl mt-2 opacity-80">
                    {format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
                <div className="text-4xl mt-2 font-mono tracking-wider">
                    {format(currentTime, 'HH:mm:ss')}
                </div>
            </header>

            {/* Grid de Status */}
            <div className="grid grid-cols-3 gap-6 h-[calc(100vh-220px)]">
                {/* Aguardando */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 overflow-y-auto">
                    <h2 className="text-3xl font-bold mb-4 flex items-center gap-3 sticky top-0 bg-white/10 backdrop-blur-md pb-2">
                        <Clock className="w-10 h-10" />
                        Aguardando ({waiting.length})
                    </h2>
                    <div className="space-y-3">
                        {waiting.map((apt) => (
                            <div
                                key={apt.id}
                                className="bg-white/20 rounded-xl p-4 hover:bg-white/30 transition"
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-14 h-14 border-2 border-white">
                                        <AvatarFallback className="bg-blue-600 text-white text-lg">
                                            {apt.patient.full_name
                                                .split(' ')
                                                .map((n) => n[0])
                                                .join('')}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="font-semibold text-xl">{apt.patient.full_name}</p>
                                        <p className="text-sm opacity-90">
                                            Dr(a). {apt.doctor.user.full_name}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-bold">{apt.appointment_time}</p>
                                        {apt.checked_in_at && (
                                            <p className="text-sm opacity-80">
                                                Chegou: {format(new Date(apt.checked_in_at), 'HH:mm')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Em Atendimento */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 overflow-y-auto">
                    <h2 className="text-3xl font-bold mb-4 flex items-center gap-3 sticky top-0 bg-white/10 backdrop-blur-md pb-2">
                        <Stethoscope className="w-10 h-10" />
                        Em Atendimento ({inProgress.length})
                    </h2>
                    <div className="space-y-3">
                        {inProgress.map((apt) => (
                            <div
                                key={apt.id}
                                className="bg-green-500/40 rounded-xl p-4 border-2 border-green-400"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Avatar className="w-14 h-14 border-2 border-green-400">
                                            <AvatarFallback className="bg-green-600 text-white text-lg">
                                                {apt.patient.full_name
                                                    .split(' ')
                                                    .map((n) => n[0])
                                                    .join('')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-xl">{apt.patient.full_name}</p>
                                        <p className="text-sm opacity-90">
                                            Dr(a). {apt.doctor.user.full_name}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm opacity-80">Iniciou</p>
                                        {apt.started_at && (
                                            <p className="text-2xl font-bold">
                                                {format(new Date(apt.started_at), 'HH:mm')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Concluídos */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 overflow-y-auto">
                    <h2 className="text-3xl font-bold mb-4 flex items-center gap-3 sticky top-0 bg-white/10 backdrop-blur-md pb-2">
                        <CheckCircle className="w-10 h-10" />
                        Concluídos Hoje ({completed.length})
                    </h2>
                    <div className="space-y-3">
                        {completed
                            .slice(-10)
                            .reverse()
                            .map((apt) => (
                                <div key={apt.id} className="bg-white/20 rounded-xl p-4 opacity-70">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-12 h-12">
                                            <AvatarFallback className="bg-gray-600 text-white">
                                                {apt.patient.full_name
                                                    .split(' ')
                                                    .map((n) => n[0])
                                                    .join('')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-semibold">{apt.patient.full_name}</p>
                                            <p className="text-sm opacity-80">
                                                Dr(a). {apt.doctor.user.full_name}
                                            </p>
                                        </div>
                                        <CheckCircle className="w-7 h-7 text-green-400" />
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            {/* Call Animation */}
            {lastCalled && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 animate-in fade-in duration-300">
                    <div className="text-center">
                        <h2 className="text-7xl font-bold mb-6 text-yellow-400 animate-bounce">
                            🔔 CHAMADA
                        </h2>
                        <p className="text-9xl font-bold mb-8">{lastCalled.patient.full_name}</p>
                        <p className="text-5xl opacity-90">
                            Dr(a). {lastCalled.doctor.user.full_name}
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
