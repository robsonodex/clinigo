'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useDoctors, useUpdateSchedules } from '@/lib/hooks/use-doctors'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useRole } from '@/lib/hooks/use-auth'

const DAYS_OF_WEEK = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' },
]

interface ScheduleFormValues {
    schedules: {
        day_of_week: number
        enabled: boolean
        start_time: string
        end_time: string
        slot_duration_minutes: number
    }[]
}

export default function SchedulePage() {
    const { clinicId } = useRole()
    const { data: doctors } = useDoctors(clinicId)
    const updateSchedules = useUpdateSchedules()

    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null)

    // Fetch schedules for selected doctor
    const { data: currentSchedules, isLoading: isLoadingSchedules } = useQuery({
        queryKey: ['schedules', selectedDoctorId],
        queryFn: async () => {
            if (!selectedDoctorId) return null
            // Assuming we have an endpoint for this, or we fetch from doctor details
            // For now, let's fetch doctor details again or use a dedicated endpoint
            // We'll assume a dedicated endpoint or mocked property on doctor for now
            // Actually the backend endpoint for getting schedules is usually GET /doctors/:id/schedules or included in doctor
            // Based on my backend knowledge, schedules are in the doctor object or separate table.
            // Let's assume we use the GET /doctors/:id which includes schedules if I implemented it that way,
            // or I'll just use the empty state for now and let the user create them.
            // Wait, I implemented `GET /doctors/:id/schedules` in the backend? Let me check.
            // I implemented `POST /doctors/:id/schedules` but `GET`...
            // Checking backend... `app/api/doctors/[doctorId]/schedules/route.ts` has POST only.
            // `app/api/doctors/[doctorId]/route.ts` returns doctor with schedules?
            // `d:\clinigo\app\app\api\doctors\[doctorId]\route.ts` ->
            // It does `select('*, schedules(*)')`. Yes!

            const doctor = await api.get<any>(`/doctors/${selectedDoctorId}`)
            return doctor.schedules as any[]
        },
        enabled: !!selectedDoctorId,
    })

    // Form setup
    const form = useForm<ScheduleFormValues>({
        defaultValues: {
            schedules: DAYS_OF_WEEK.map((day) => ({
                day_of_week: day.value,
                enabled: false,
                start_time: '09:00',
                end_time: '18:00',
                slot_duration_minutes: 30,
            })),
        },
    })

    const { fields } = useFieldArray({
        control: form.control,
        name: 'schedules',
    })

    // Update form when schedules load
    useEffect(() => {
        if (currentSchedules) {
            const newSchedules = DAYS_OF_WEEK.map((day) => {
                const existing = currentSchedules.find(
                    (s: any) => s.day_of_week === day.value
                )
                return {
                    day_of_week: day.value,
                    enabled: !!existing,
                    start_time: existing?.start_time || '09:00',
                    end_time: existing?.end_time || '18:00',
                    slot_duration_minutes: existing?.slot_duration_minutes || 30,
                }
            })
            form.reset({ schedules: newSchedules })
        }
    }, [currentSchedules, form])

    const onSubmit = (data: ScheduleFormValues) => {
        if (!selectedDoctorId) {
            toast.error('Selecione um médico')
            return
        }

        const schedulesToSave = data.schedules
            .filter((s) => s.enabled)
            .map((s) => ({
                day_of_week: s.day_of_week,
                start_time: s.start_time,
                end_time: s.end_time,
                slot_duration_minutes: s.slot_duration_minutes,
            }))

        updateSchedules.mutate({
            doctorId: selectedDoctorId,
            schedules: schedulesToSave,
        })
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Configurar Horários</h1>
                <p className="text-muted-foreground">
                    Defina a disponibilidade semanal dos médicos
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Seleção</CardTitle>
                    <CardDescription>
                        Escolha o médico para configurar a agenda
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Select
                        value={selectedDoctorId || ''}
                        onValueChange={setSelectedDoctorId}
                    >
                        <SelectTrigger className="w-[300px]">
                            <SelectValue placeholder="Selecione um médico" />
                        </SelectTrigger>
                        <SelectContent>
                            {doctors?.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                    {d.user.full_name} - {d.specialty}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {selectedDoctorId && (
                <Card>
                    <CardHeader>
                        <CardTitle>Agenda Semanal</CardTitle>
                        <CardDescription>
                            Marque os dias de atendimento e horários
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingSchedules ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid gap-4">
                                    {fields.map((field, index) => (
                                        <div
                                            key={field.id}
                                            className="flex items-center gap-4 p-4 border rounded-lg bg-card"
                                        >
                                            {/* Checkbox + Day Label */}
                                            <div className="flex items-center gap-2 w-40">
                                                <Checkbox
                                                    id={`day-${index}`}
                                                    checked={form.watch(`schedules.${index}.enabled`)}
                                                    onCheckedChange={(checked) =>
                                                        form.setValue(
                                                            `schedules.${index}.enabled`,
                                                            checked as boolean
                                                        )
                                                    }
                                                />
                                                <Label
                                                    htmlFor={`day-${index}`}
                                                    className="font-medium cursor-pointer"
                                                >
                                                    {DAYS_OF_WEEK[field.day_of_week].label}
                                                </Label>
                                            </div>

                                            {/* Time Fields */}
                                            {form.watch(`schedules.${index}.enabled`) ? (
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className="grid gap-1.5">
                                                        <Label className="text-xs text-muted-foreground">
                                                            Início
                                                        </Label>
                                                        <Input
                                                            type="time"
                                                            {...form.register(`schedules.${index}.start_time`)}
                                                            className="w-32"
                                                        />
                                                    </div>
                                                    <div className="grid gap-1.5">
                                                        <Label className="text-xs text-muted-foreground">
                                                            Fim
                                                        </Label>
                                                        <Input
                                                            type="time"
                                                            {...form.register(`schedules.${index}.end_time`)}
                                                            className="w-32"
                                                        />
                                                    </div>
                                                    <div className="grid gap-1.5">
                                                        <Label className="text-xs text-muted-foreground">
                                                            Duração (min)
                                                        </Label>
                                                        <Select
                                                            value={String(
                                                                form.watch(
                                                                    `schedules.${index}.slot_duration_minutes`
                                                                )
                                                            )}
                                                            onValueChange={(val) =>
                                                                form.setValue(
                                                                    `schedules.${index}.slot_duration_minutes`,
                                                                    Number(val)
                                                                )
                                                            }
                                                        >
                                                            <SelectTrigger className="w-32">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="15">15 min</SelectItem>
                                                                <SelectItem value="30">30 min</SelectItem>
                                                                <SelectItem value="45">45 min</SelectItem>
                                                                <SelectItem value="60">60 min</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex-1 text-sm text-muted-foreground italic">
                                                    Indisponível
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit" size="lg" disabled={updateSchedules.isPending}>
                                        {updateSchedules.isPending && (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        )}
                                        <Save className="w-4 h-4 mr-2" />
                                        Salvar Horários
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

