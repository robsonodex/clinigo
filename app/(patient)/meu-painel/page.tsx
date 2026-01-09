'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    Calendar,
    Clock,
    User,
    History,
    Plus,
    LogOut,
    Stethoscope,
    ChevronRight,
    Loader2,
    Heart
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface Patient {
    id: string
    full_name: string
    email: string
    health_score?: number
}

interface Appointment {
    id: string
    date: string
    time: string
    status: string
    doctor: { name: string; specialty: string }
    clinic: { name: string }
}

export default function PatientDashboardPage() {
    const router = useRouter()
    const [patient, setPatient] = useState<Patient | null>(null)
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            // Buscar perfil
            const profileRes = await fetch('/api/patient/profile')
            if (!profileRes.ok) {
                router.push('/paciente/entrar')
                return
            }
            const profileData = await profileRes.json()
            setPatient(profileData.patient)

            // Buscar próximas consultas
            const appointmentsRes = await fetch('/api/patient/appointments?status=upcoming&limit=5')
            if (appointmentsRes.ok) {
                const appointmentsData = await appointmentsRes.json()
                setAppointments(appointmentsData.appointments)
            }

        } catch (error) {
            console.error('Erro ao carregar dados:', error)
            router.push('/paciente/entrar')
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogout = async () => {
        document.cookie = 'patient_token=; path=/paciente; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        router.push('/paciente/entrar')
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
            SCHEDULED: { variant: 'secondary', label: 'Agendada' },
            CONFIRMED: { variant: 'default', label: 'Confirmada' },
            CANCELLED: { variant: 'destructive', label: 'Cancelada' },
        }
        const config = variants[status] || { variant: 'outline', label: status }
        return <Badge variant={config.variant}>{config.label}</Badge>
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 p-4">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Stethoscope className="h-6 w-6 text-primary" />
                        <span className="font-bold text-lg">Portal do Paciente</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Sair
                    </Button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Welcome Card */}
                <Card className="bg-gradient-to-r from-primary to-emerald-600 text-white">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-emerald-100 text-sm">Bem-vindo(a)</p>
                                <h1 className="text-2xl font-bold">{patient?.full_name}</h1>
                                <p className="text-emerald-100 text-sm mt-1">{patient?.email}</p>
                            </div>
                            {patient?.health_score && (
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                                        <Heart className="h-8 w-8" />
                                    </div>
                                    <p className="text-xs mt-1">Score: {patient.health_score}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <Link href="/paciente/agendar">
                        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                            <CardContent className="pt-6 text-center">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                                    <Plus className="h-6 w-6 text-primary" />
                                </div>
                                <p className="font-medium">Agendar Consulta</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/paciente/historico">
                        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                            <CardContent className="pt-6 text-center">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                                    <History className="h-6 w-6 text-blue-600" />
                                </div>
                                <p className="font-medium">Meu Histórico</p>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Próximas Consultas */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Próximas Consultas
                        </CardTitle>
                        <CardDescription>
                            Seus agendamentos confirmados
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {appointments.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>Nenhuma consulta agendada</p>
                                <Link href="/paciente/agendar">
                                    <Button variant="link" className="mt-2">
                                        Agendar agora
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {appointments.map((apt) => (
                                    <div
                                        key={apt.id}
                                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-primary">
                                                    {format(new Date(apt.date), 'd')}
                                                </p>
                                                <p className="text-xs uppercase text-muted-foreground">
                                                    {format(new Date(apt.date), 'MMM', { locale: ptBR })}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="font-medium">{apt.doctor.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {apt.doctor.specialty}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-sm">{apt.time}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {getStatusBadge(apt.status)}
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {apt.clinic.name}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}

