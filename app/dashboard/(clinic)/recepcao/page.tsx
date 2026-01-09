'use client'

import { useUser } from '@/hooks/use-user'
import { QRScannerRecepcao } from '@/components/checkin/QRScannerRecepcao'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, QrCode, Users, History, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface RecentCheckin {
    id: string
    patient_name: string
    queue_position: number
    checked_in_at: string
    status: string
}

export default function RecepcaoPage() {
    const { user, isLoading } = useUser()
    const [recentCheckins, setRecentCheckins] = useState<RecentCheckin[]>([])
    const [stats, setStats] = useState({ today: 0, waiting: 0, completed: 0 })
    const supabase = createClient()

    useEffect(() => {
        if (!user?.clinic_id) return

        const fetchRecentCheckins = async () => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const { data } = await supabase
                .from('appointment_queue')
                .select(`
                    id,
                    queue_position,
                    entered_queue_at,
                    status,
                    appointments (
                        patients ( full_name )
                    )
                `)
                .eq('clinic_id', user.clinic_id)
                .gte('entered_queue_at', today.toISOString())
                .order('entered_queue_at', { ascending: false })
                .limit(10)

            if (data) {
                const formatted = data.map((item: any) => ({
                    id: item.id,
                    patient_name: item.appointments?.patients?.full_name || 'Paciente',
                    queue_position: item.queue_position,
                    checked_in_at: item.entered_queue_at,
                    status: item.status,
                }))
                setRecentCheckins(formatted)

                // Calculate stats
                const waiting = data.filter((d: any) => d.status === 'waiting').length
                const completed = data.filter((d: any) =>
                    ['completed', 'in_consultation'].includes(d.status)
                ).length
                setStats({ today: data.length, waiting, completed })
            }
        }

        fetchRecentCheckins()

        // Subscribe to changes
        const channel = supabase
            .channel('recepcao-checkins')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'appointment_queue',
                    filter: `clinic_id=eq.${user.clinic_id}`,
                },
                () => fetchRecentCheckins()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user?.clinic_id, supabase])

    const handleCheckinSuccess = (data: any) => {
        // Refresh recent checkins
        console.log('Check-in realizado:', data)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        )
    }

    if (!user?.clinic_id) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-muted-foreground">Clínica não configurada</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <QrCode className="w-6 h-6" />
                    Recepção - Check-in
                </h1>
                <p className="text-muted-foreground">
                    Escaneie o QR Code do paciente para confirmar a presença
                </p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <Users className="w-5 h-5 text-blue-700" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.today}</p>
                                <p className="text-sm text-muted-foreground">Check-ins hoje</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-100 rounded-xl">
                                <Clock className="w-5 h-5 text-amber-700" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.waiting}</p>
                                <p className="text-sm text-muted-foreground">Aguardando</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-100 rounded-xl">
                                <Users className="w-5 h-5 text-green-700" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.completed}</p>
                                <p className="text-sm text-muted-foreground">Atendidos</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="scanner" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="scanner" className="flex items-center gap-2">
                        <QrCode className="w-4 h-4" />
                        Scanner
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Histórico
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="scanner">
                    <QRScannerRecepcao
                        clinicId={user.clinic_id}
                        onCheckinSuccess={handleCheckinSuccess}
                    />
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Check-ins Recentes</CardTitle>
                            <CardDescription>Últimos 10 check-ins realizados hoje</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {recentCheckins.length === 0 ? (
                                <p className="text-center py-8 text-muted-foreground">
                                    Nenhum check-in realizado hoje
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {recentCheckins.map((checkin) => (
                                        <div
                                            key={checkin.id}
                                            className="flex items-center justify-between p-3 rounded-lg border"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center font-bold">
                                                    {checkin.queue_position}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{checkin.patient_name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {new Date(checkin.checked_in_at).toLocaleTimeString('pt-BR', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge
                                                variant={
                                                    checkin.status === 'waiting'
                                                        ? 'secondary'
                                                        : checkin.status === 'in_consultation'
                                                            ? 'default'
                                                            : 'outline'
                                                }
                                            >
                                                {checkin.status === 'waiting'
                                                    ? 'Aguardando'
                                                    : checkin.status === 'called'
                                                        ? 'Chamado'
                                                        : checkin.status === 'in_consultation'
                                                            ? 'Em Atendimento'
                                                            : 'Concluído'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

