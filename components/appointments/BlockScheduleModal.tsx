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
    const [blockTitle, setBlockTitle] = useState('Reunião de Equipe')

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
            if (preselectedDate) setAppointmentDate(preselectedDate)
            if (preselectedTime) setAppointmentTime(preselectedTime)
            
            if (preselectedDoctorId) {
                setSelectedDoctorIds([preselectedDoctorId])
            } else if (loggedDoctor) {
                setSelectedDoctorIds([loggedDoctor.id])
            } else if (doctors && doctors.length > 0) {
                setSelectedDoctorIds([doctors[0].id])
            }
        }
    }, [open, preselectedDate, preselectedTime, preselectedDoctorId, doctors, loggedDoctor])

    const toggleDoctor = (id: string) => {
        setSelectedDoctorIds(prev => {
            if (prev.includes(id)) {
                if (prev.length === 1) return prev // Mantém ao menos 1
                return prev.filter(item => item !== id)
            } else {
                return [...prev, id]
            }
        })
    }

    const selectAllDoctors = () => {
        if (!doctors) return
        if (selectedDoctorIds.length === doctors.length) {
            // Se já estão todos, seleciona apenas o primeiro ou o logado
            setSelectedDoctorIds(loggedDoctor ? [loggedDoctor.id] : [doctors[0].id])
        } else {
            setSelectedDoctorIds(doctors.map(d => d.id))
        }
    }

    const { mutate: createBlock, isPending } = useMutation({
        mutationFn: async () => {
            if (!selectedDoctorIds || selectedDoctorIds.length === 0) throw new Error('Selecione ao menos um profissional')
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
            const countMsg = selectedDoctorIds.length > 1 ? ` para ${selectedDoctorIds.length} profissionais` : ''
            toast.success(`🔒 Compromisso salvo na agenda com sucesso${countMsg}!`)
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
            <DialogContent className="w-full sm:max-w-[540px] max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
                <DialogHeader className="space-y-2">
                    <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center shrink-0">
                            <Lock className="w-5 h-5" />
                        </div>
                        Compromisso / Bloqueio Interno
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-slate-500">
                        Insira um compromisso (reunião, treinamento, ausência) na agenda de um ou múltiplos terapeutas da equipe sem vincular a um paciente.
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
                            placeholder="Ex: Reunião de Equipe, Supervisão, Alinhamento..."
                            className="min-h-[44px]"
                            style={{ fontSize: '16px' }}
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {['Reunião de Equipe', 'Supervisão ABA', 'Treinamento', 'Alinhamento Clínico', 'Ausência Interna', 'Horário Administrativo'].map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setBlockTitle(preset)}
                                    className="text-xs px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors font-medium touch-manipulation"
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Múltiplos Terapeutas / Profissionais */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">Profissionais / Terapeutas Envolvidos</Label>
                            {doctors && doctors.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={selectAllDoctors}
                                    className="h-8 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 font-semibold"
                                >
                                    {selectedDoctorIds.length === doctors.length ? 'Desmarcar Todos' : 'Selecionar Todos da Clínica'}
                                </Button>
                            )}
                        </div>

                        {doctorsLoading ? (
                            <div className="flex items-center justify-center p-4 border rounded-xl bg-slate-50 dark:bg-slate-900">
                                <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                            </div>
                        ) : (
                            <div className="max-h-44 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
                                {(doctors || []).map((doc) => {
                                    const isSelected = selectedDoctorIds.includes(doc.id)
                                    return (
                                        <button
                                            key={doc.id}
                                            type="button"
                                            onClick={() => toggleDoctor(doc.id)}
                                            className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all text-sm font-medium ${
                                                isSelected
                                                    ? 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 truncate">
                                                <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                                                    isSelected ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300 dark:border-slate-600'
                                                }`}>
                                                    {isSelected && <span className="text-xs">✓</span>}
                                                </div>
                                                <span className="truncate">{doc.user?.full_name || 'Profissional'}</span>
                                                <span className="text-xs text-muted-foreground font-normal">({doc.specialty || 'Geral'})</span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                        <p className="text-xs text-slate-500">
                            Selecionados: <strong>{selectedDoctorIds.length} profissional(is)</strong>. O compromisso será inserido na agenda de cada terapeuta selecionado simultaneamente.
                        </p>
                    </div>

                    {/* Data e Horário */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3 pt-3 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto min-h-[44px] px-5"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={() => createBlock()}
                        disabled={isPending}
                        className="w-full sm:w-auto min-h-[44px] px-6 bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-2"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        Salvar Compromisso ({selectedDoctorIds.length})
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
