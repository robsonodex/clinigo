'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Lock, Clock, Calendar, UserCheck, Loader2, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useAuth } from '@/lib/hooks/use-auth'

interface Doctor {
    id: string
    specialty: string
    user_id?: string
    user: {
        full_name: string
        email?: string
    }
}

interface BlockScheduleModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    preselectedDate?: string
    preselectedTime?: string
    preselectedDoctorId?: string
    onSuccess?: (appointmentDate: string) => void
}

export function BlockScheduleModal({
    open,
    onOpenChange,
    preselectedDate,
    preselectedTime,
    preselectedDoctorId,
    onSuccess,
}: BlockScheduleModalProps) {
    const queryClient = useQueryClient()
    const { user, profile } = useAuth()

    const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([])
    const [appointmentDate, setAppointmentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [appointmentTime, setAppointmentTime] = useState('')
    const [durationMinutes, setDurationMinutes] = useState(30)
    const [blockTitle, setBlockTitle] = useState('Discussão de Casos')

    // Fetch doctors
    const { data: doctors, isLoading: doctorsLoading } = useQuery({
        queryKey: ['doctors', 'block-modal'],
        queryFn: async () => {
            return await api.get<Doctor[]>('/doctors')
        },
        enabled: open,
        staleTime: 5 * 60 * 1000,
    })

    // Localizar o médico correspondente ao usuário logado
    const loggedDoctor = doctors?.find((d) => {
        if (!user && !profile) return false
        return (
            d.id === profile?.id ||
            d.user_id === user?.id ||
            d.user_id === profile?.id ||
            (profile?.email && d.user?.email && d.user.email.toLowerCase() === profile.email.toLowerCase()) ||
            (profile?.full_name && d.user?.full_name && d.user.full_name.toLowerCase() === profile.full_name.toLowerCase())
        )
    })

    useEffect(() => {
        if (open) {
            // Seleção inicial de profissional
            let initialId = ''
            if (loggedDoctor) {
                initialId = loggedDoctor.id
            } else if (preselectedDoctorId) {
                initialId = preselectedDoctorId
            } else if (doctors && doctors.length > 0) {
                initialId = doctors[0].id
            }
            if (initialId && selectedDoctorIds.length === 0) {
                setSelectedDoctorIds([initialId])
            }
        }
    }, [open, preselectedDate, preselectedTime, preselectedDoctorId, doctors, loggedDoctor])

    const { mutate: createBlock, isPending } = useMutation({
        mutationFn: async () => {
            if (selectedDoctorIds.length === 0) throw new Error('Selecione pelo menos um profissional participante')
            if (!appointmentDate) throw new Error('Selecione uma data')
            if (!appointmentTime) throw new Error('Selecione um horário')
            if (!blockTitle.trim()) throw new Error('Informe o título do compromisso')

            const payload = {
                doctor_id: selectedDoctorIds[0],
                doctor_ids: selectedDoctorIds,
                appointment_date: appointmentDate,
                appointment_time: appointmentTime,
                duration_minutes: durationMinutes,
                is_block: true,
                block_title: blockTitle.trim(),
                overrides: {
                    ignore_schedule_constraints: true,
                    allow_double_booking: false,
                    reason: `Bloqueio interno: ${blockTitle.trim()}`
                }
            }

            const res = await fetch('/api/appointments/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao criar compromisso/bloqueio')
            }

            return res.json()
        },
        onSuccess: (data) => {
            toast.success('🔒 Compromisso/Bloqueio salvo na agenda com sucesso!')
            queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
            onSuccess?.(appointmentDate)
            onOpenChange(false)
        },
        onError: (err: Error) => {
            toast.error(err.message)
        }
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] rounded-2xl p-6">
                <DialogHeader className="space-y-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center">
                            <Lock className="w-5 h-5" />
                        </div>
                        Compromisso / Bloqueio Interno
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500">
                        Insira um compromisso (reunião, treinamento, ausência) na agenda do terapeuta sem vincular a um paciente. Impede agendamentos da recepção no horário.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-3">
                    {/* Título do Bloqueio */}
                    <div className="space-y-1.5">
                        <Label htmlFor="block_title" className="text-sm font-semibold">Título do Compromisso</Label>
                        <Input
                            id="block_title"
                            value={blockTitle}
                            onChange={(e) => setBlockTitle(e.target.value)}
                            placeholder="Ex: Reunião de Equipe, Treinamento, Supervisão..."
                            className="min-h-[44px]"
                            style={{ fontSize: '16px' }}
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {['Discussão de Casos', 'Reunião de Equipe', 'Supervisão ABA', 'Treinamento', 'Ausência Interna', 'Horário Administrativo'].map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setBlockTitle(preset)}
                                    className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors font-medium"
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Seleção Múltipla de Profissionais / Terapeutas Participantes */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                Profissionais Participantes * ({selectedDoctorIds.length} selecionado{selectedDoctorIds.length !== 1 ? 's' : ''})
                            </Label>
                            <button
                                type="button"
                                onClick={() => {
                                    if (doctors && selectedDoctorIds.length === doctors.length) {
                                        setSelectedDoctorIds([])
                                    } else if (doctors) {
                                        setSelectedDoctorIds(doctors.map(d => d.id))
                                    }
                                }}
                                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                                {doctors && selectedDoctorIds.length === doctors.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                            </button>
                        </div>

                        {doctorsLoading ? (
                            <div className="flex items-center justify-center p-4 text-xs text-slate-500">
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Carregando profissionais...
                            </div>
                        ) : (
                            <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                                {(doctors || []).map((doc) => {
                                    const isChecked = selectedDoctorIds.includes(doc.id)
                                    return (
                                        <label
                                            key={doc.id}
                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                                                isChecked
                                                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100/60'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedDoctorIds(prev => [...prev, doc.id])
                                                        } else {
                                                            setSelectedDoctorIds(prev => prev.filter(id => id !== doc.id))
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <span className="text-xs font-semibold">{doc.user?.full_name || doc.id}</span>
                                            </div>
                                            {doc.specialty && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                                    {doc.specialty}
                                                </span>
                                            )}
                                        </label>
                                    )
                                })}
                            </div>
                        )}
                        <p className="text-[11px] text-slate-500">
                            Selecione todas as terapeutas que participarão da reunião/discussão. A agenda de todas será travada neste horário.
                        </p>
                    </div>

                    {/* Data e Horário */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold">Data</Label>
                            <Input
                                type="date"
                                value={appointmentDate}
                                onChange={(e) => setAppointmentDate(e.target.value)}
                                className="min-h-[44px]"
                                style={{ fontSize: '16px' }}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold">Horário Inicial</Label>
                            <Input
                                type="time"
                                value={appointmentTime}
                                onChange={(e) => setAppointmentTime(e.target.value)}
                                className="min-h-[44px]"
                                style={{ fontSize: '16px' }}
                            />
                        </div>
                    </div>

                    {/* Duração */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold">Duração</Label>
                        <Select
                            value={String(durationMinutes)}
                            onValueChange={(val) => setDurationMinutes(Number(val))}
                        >
                            <SelectTrigger className="min-h-[44px]">
                                <SelectValue placeholder="Duração" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="15">15 minutos</SelectItem>
                                <SelectItem value="30">30 minutos</SelectItem>
                                <SelectItem value="45">45 minutos</SelectItem>
                                <SelectItem value="60">1 hora</SelectItem>
                                <SelectItem value="90">1h 30min</SelectItem>
                                <SelectItem value="120">2 horas</SelectItem>
                                <SelectItem value="180">3 horas</SelectItem>
                                <SelectItem value="240">4 horas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="min-h-[44px] px-5"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={() => createBlock()}
                        disabled={isPending}
                        className="min-h-[44px] px-6 bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-2"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        Salvar Bloqueio / Compromisso
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
