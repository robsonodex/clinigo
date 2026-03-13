'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Loader2,
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    UserX,
    Clock,
    User,
    XCircle,
} from 'lucide-react'
import { api } from '@/lib/api-client'

interface Doctor {
    id: string
    specialty: string
    user: { full_name: string }
}

interface Suggestion {
    appointment_id: string
    patient_id: string
    patient_name: string
    original_time: string
    original_doctor_name: string
    suggested_doctor_id: string
    suggested_doctor_name: string
    suggested_time: string
    specialty: string
}

interface RearrangeResponse {
    success: boolean
    absent_doctor: string
    specialty: string
    date: string
    affected_count: number
    suggestions: Suggestion[]
    unmatched_count: number
    message: string
    no_alternatives?: boolean
}

interface TherapistAbsenceModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function TherapistAbsenceModal({
    open,
    onOpenChange,
    onSuccess,
}: TherapistAbsenceModalProps) {
    const queryClient = useQueryClient()
    const [step, setStep] = useState<'select' | 'review'>('select')
    const [selectedDoctorId, setSelectedDoctorId] = useState('')
    const [absenceDate, setAbsenceDate] = useState(() => {
        const today = new Date()
        return today.toISOString().split('T')[0]
    })
    const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set())
    const [rearrangeData, setRearrangeData] = useState<RearrangeResponse | null>(null)

    // Fetch doctors
    const { data: doctors, isLoading: doctorsLoading } = useQuery({
        queryKey: ['doctors-for-rearrange'],
        queryFn: async () => api.get<Doctor[]>('/doctors'),
        enabled: open,
        staleTime: 5 * 60 * 1000,
    })

    // Search for suggestions
    const searchMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/appointments/rearrange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    doctor_id: selectedDoctorId,
                    date: absenceDate,
                }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error)
            return data as RearrangeResponse
        },
        onSuccess: (data) => {
            setRearrangeData(data)
            // Auto-accept all suggestions
            setAcceptedSuggestions(new Set(data.suggestions.map(s => s.appointment_id)))
            setStep('review')
        },
        onError: (error: Error) => {
            toast.error(error.message)
        },
    })

    // Confirm transfers
    const confirmMutation = useMutation({
        mutationFn: async () => {
            const transfers = rearrangeData!.suggestions
                .filter(s => acceptedSuggestions.has(s.appointment_id))
                .map(s => ({
                    appointment_id: s.appointment_id,
                    new_doctor_id: s.suggested_doctor_id,
                    new_time: s.suggested_time,
                }))

            const unmatchedIds = rearrangeData!.suggestions
                .filter(s => !acceptedSuggestions.has(s.appointment_id))
                .map(s => s.appointment_id)

            const response = await fetch('/api/appointments/rearrange/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transfers, unmatched_ids: unmatchedIds }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error)
            return data
        },
        onSuccess: (data) => {
            toast.success(data.message)
            queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
            onSuccess?.()
            handleClose()
        },
        onError: (error: Error) => {
            toast.error(error.message)
        },
    })

    const toggleSuggestion = (appointmentId: string) => {
        setAcceptedSuggestions(prev => {
            const next = new Set(prev)
            if (next.has(appointmentId)) next.delete(appointmentId)
            else next.add(appointmentId)
            return next
        })
    }

    const handleClose = () => {
        setStep('select')
        setSelectedDoctorId('')
        setRearrangeData(null)
        setAcceptedSuggestions(new Set())
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserX className="h-5 w-5 text-orange-500" />
                        Terapeuta Ausente — Remanejamento
                    </DialogTitle>
                    <DialogDescription>
                        Selecione o terapeuta que faltou e o sistema sugere para onde mover cada paciente
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Select therapist and date */}
                {step === 'select' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Terapeuta Ausente</Label>
                            <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o terapeuta" />
                                </SelectTrigger>
                                <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                                    {doctorsLoading && (
                                        <div className="p-2 text-center">
                                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                        </div>
                                    )}
                                    {doctors?.filter(d => d.id && d.user).map((doctor) => (
                                        <SelectItem key={doctor.id} value={doctor.id}>
                                            {doctor.user?.full_name} — {doctor.specialty}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Data da Ausência</Label>
                            <Input
                                type="date"
                                value={absenceDate}
                                onChange={(e) => setAbsenceDate(e.target.value)}
                            />
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleClose}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => searchMutation.mutate()}
                                disabled={!selectedDoctorId || !absenceDate || searchMutation.isPending}
                            >
                                {searchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Buscar Sugestões
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {/* Step 2: Review suggestions */}
                {step === 'review' && rearrangeData && (
                    <div className="space-y-4">
                        {/* Summary bar */}
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-orange-600" />
                                <div>
                                    <p className="font-semibold text-orange-800">
                                        {rearrangeData.absent_doctor} — {rearrangeData.specialty}
                                    </p>
                                    <p className="text-sm text-orange-700">
                                        {rearrangeData.affected_count} paciente(s) afetado(s) em {rearrangeData.date}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* No alternatives */}
                        {rearrangeData.no_alternatives && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                                <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                                <p className="font-medium text-red-800">
                                    Nenhum outro terapeuta de {rearrangeData.specialty} disponível
                                </p>
                                <p className="text-sm text-red-600 mt-1">
                                    Será necessário cancelar ou reagendar manualmente
                                </p>
                            </div>
                        )}

                        {/* Suggestions list */}
                        {rearrangeData.suggestions.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base">Sugestões de Remanejamento</Label>
                                    <span className="text-xs text-muted-foreground">
                                        {acceptedSuggestions.size}/{rearrangeData.suggestions.length} aceitas
                                    </span>
                                </div>

                                {rearrangeData.suggestions.map((suggestion) => {
                                    const isAccepted = acceptedSuggestions.has(suggestion.appointment_id)
                                    return (
                                        <div
                                            key={suggestion.appointment_id}
                                            className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                                isAccepted
                                                    ? 'bg-green-50 border-green-300'
                                                    : 'bg-gray-50 border-gray-200 opacity-60'
                                            }`}
                                            onClick={() => toggleSuggestion(suggestion.appointment_id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    checked={isAccepted}
                                                    onCheckedChange={() => toggleSuggestion(suggestion.appointment_id)}
                                                />

                                                <div className="flex-1 flex items-center gap-2 flex-wrap">
                                                    {/* Patient */}
                                                    <div className="flex items-center gap-1">
                                                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="font-medium text-sm">{suggestion.patient_name}</span>
                                                    </div>

                                                    {/* Original */}
                                                    <Badge variant="outline" className="text-xs">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        {suggestion.original_time}
                                                    </Badge>

                                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />

                                                    {/* Suggestion */}
                                                    <Badge className="text-xs bg-green-600">
                                                        {suggestion.suggested_doctor_name} às {suggestion.suggested_time}
                                                    </Badge>
                                                </div>

                                                {isAccepted && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Unmatched patients warning */}
                        {rearrangeData.unmatched_count > 0 && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    ⚠️ {rearrangeData.unmatched_count} paciente(s) sem encaixe disponível.
                                    Será necessário reagendar manualmente.
                                </p>
                            </div>
                        )}

                        <Separator />

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setStep('select')}>
                                Voltar
                            </Button>
                            <Button
                                onClick={() => confirmMutation.mutate()}
                                disabled={acceptedSuggestions.size === 0 || confirmMutation.isPending}
                            >
                                {confirmMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Confirmar {acceptedSuggestions.size} Transferência(s)
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
