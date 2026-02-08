'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, Trash2, Calendar, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Schedule {
    id: string
    day_of_week: number
    start_time: string
    end_time: string
    slot_duration_minutes: number
    is_active: boolean
}

const DAYS_OF_WEEK = [
    { value: 0, label: 'Domingo', short: 'Dom' },
    { value: 1, label: 'Segunda-feira', short: 'Seg' },
    { value: 2, label: 'Terça-feira', short: 'Ter' },
    { value: 3, label: 'Quarta-feira', short: 'Qua' },
    { value: 4, label: 'Quinta-feira', short: 'Qui' },
    { value: 5, label: 'Sexta-feira', short: 'Sex' },
    { value: 6, label: 'Sábado', short: 'Sáb' },
]

interface SavedSchedulesListProps {
    doctorId: string
}

export function SavedSchedulesList({ doctorId }: SavedSchedulesListProps) {
    const queryClient = useQueryClient()

    // Fetch saved schedules - using api client for proper credentials in production
    const { data: schedules, isLoading, error } = useQuery({
        queryKey: ['schedules', doctorId],
        queryFn: async () => {
            const result = await api.get<Schedule[]>(`/doctors/${doctorId}/schedules`)
            return result || []
        },
        enabled: !!doctorId,
    })

    // Group schedules by day of week
    const schedulesByDay = schedules?.reduce((acc, schedule) => {
        const day = schedule.day_of_week
        if (!acc[day]) acc[day] = []
        acc[day].push(schedule)
        return acc
    }, {} as Record<number, Schedule[]>) || {}

    // Count configured days
    const configuredDays = Object.keys(schedulesByDay).length
    const totalSlots = schedules?.length || 0

    // Format time for display (remove seconds)
    const formatTime = (time: string) => time?.substring(0, 5) || time

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Horários Configurados
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        Erro ao carregar horários
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Não foi possível carregar os horários salvos. Tente recarregar a página.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-primary/20">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Horários Configurados
                    </CardTitle>
                    {totalSlots > 0 && (
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {configuredDays} {configuredDays === 1 ? 'dia' : 'dias'} configurado{configuredDays !== 1 ? 's' : ''}
                            </Badge>
                        </div>
                    )}
                </div>
                {totalSlots === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                        Nenhum horário configurado ainda. Use o formulário abaixo para definir a disponibilidade.
                    </p>
                )}
            </CardHeader>
            <CardContent>
                {totalSlots === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">
                            Este médico ainda não tem horários de atendimento definidos.
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Configure os dias e horários abaixo para disponibilizar na agenda.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {DAYS_OF_WEEK.map((day) => {
                            const daySchedules = schedulesByDay[day.value] || []
                            const hasSchedule = daySchedules.length > 0

                            return (
                                <div
                                    key={day.value}
                                    className={`flex items-start justify-between p-3 rounded-lg border transition-colors ${hasSchedule
                                        ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                                        : 'bg-muted/30 border-muted'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${hasSchedule
                                                ? 'bg-green-600 text-white'
                                                : 'bg-muted text-muted-foreground'
                                                }`}
                                        >
                                            {day.short}
                                        </div>
                                        <div>
                                            <p className={`font-medium ${hasSchedule ? 'text-green-900 dark:text-green-100' : 'text-muted-foreground'}`}>
                                                {day.label}
                                            </p>
                                            {hasSchedule ? (
                                                <div className="space-y-1 mt-1">
                                                    {daySchedules.map((schedule, idx) => (
                                                        <div key={schedule.id || idx} className="flex items-center gap-2 text-sm">
                                                            <Clock className="h-3.5 w-3.5 text-green-600" />
                                                            <span className="font-mono text-green-800 dark:text-green-200">
                                                                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                                            </span>
                                                            <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                                                                {schedule.slot_duration_minutes}min
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground italic">
                                                    Não atende
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {hasSchedule && (
                                        <Badge variant="outline" className="border-green-300 text-green-700 bg-green-100/50">
                                            Ativo
                                        </Badge>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {totalSlots > 0 && (
                    <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                Total: {configuredDays} {configuredDays === 1 ? 'dia' : 'dias'} de atendimento configurado{configuredDays !== 1 ? 's' : ''}
                            </span>
                            <span className="text-muted-foreground">
                                Última atualização: agora
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
