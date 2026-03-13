'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
    Lightbulb,
    Calendar,
    Clock,
    Stethoscope,
    Plus,
    Trash2,
    CheckCircle2,
    Sparkles,
} from 'lucide-react'

interface TherapyEntry {
    id: string
    specialty: string
    sessions_per_week: number
}

interface DaySuggestion {
    day_of_week: number
    day_name: string
    time: string
}

interface TherapySuggestion {
    specialty: string
    doctor_id: string
    doctor_name: string
    days: DaySuggestion[]
}

interface SuggestionOption {
    option_number: number
    therapies: TherapySuggestion[]
    score: number
}

interface SuggestResponse {
    success: boolean
    period: string
    options: SuggestionOption[]
    total_options: number
    message: string
    error?: string
    missing_specialties?: string[]
}

const SPECIALTIES = [
    'ABA', 'Fonoaudiologia', 'Terapia Ocupacional', 'Psicologia',
    'Psicopedagogia', 'Fisioterapia', 'Musicoterapia', 'Neuropediatria',
]

interface SlotSuggestionModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelectOption?: (option: SuggestionOption) => void
}

export function SlotSuggestionModal({
    open,
    onOpenChange,
    onSelectOption,
}: SlotSuggestionModalProps) {
    const [step, setStep] = useState<'config' | 'results'>('config')
    const [therapies, setTherapies] = useState<TherapyEntry[]>([
        { id: '1', specialty: '', sessions_per_week: 2 },
    ])
    const [period, setPeriod] = useState<'morning' | 'afternoon' | 'any'>('any')
    const [results, setResults] = useState<SuggestResponse | null>(null)

    const addTherapy = () => {
        setTherapies(prev => [
            ...prev,
            { id: String(Date.now()), specialty: '', sessions_per_week: 2 },
        ])
    }

    const removeTherapy = (id: string) => {
        if (therapies.length === 1) return
        setTherapies(prev => prev.filter(t => t.id !== id))
    }

    const updateTherapy = (id: string, field: keyof TherapyEntry, value: string | number) => {
        setTherapies(prev =>
            prev.map(t => t.id === id ? { ...t, [field]: value } : t)
        )
    }

    const searchMutation = useMutation({
        mutationFn: async () => {
            const validTherapies = therapies.filter(t => t.specialty)
            if (validTherapies.length === 0) throw new Error('Selecione ao menos uma terapia')

            const response = await fetch('/api/appointments/suggest-slots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    therapies: validTherapies.map(t => ({
                        specialty: t.specialty,
                        sessions_per_week: t.sessions_per_week,
                    })),
                    period,
                }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error)
            return data as SuggestResponse
        },
        onSuccess: (data) => {
            setResults(data)
            setStep('results')
        },
        onError: (error: Error) => {
            toast.error(error.message)
        },
    })

    const handleSelectOption = (option: SuggestionOption) => {
        onSelectOption?.(option)
        toast.success(`Opção ${option.option_number} selecionada! Configure o agendamento recorrente com esses dados.`)
        handleClose()
    }

    const handleClose = () => {
        setStep('config')
        setTherapies([{ id: '1', specialty: '', sessions_per_week: 2 }])
        setPeriod('any')
        setResults(null)
        onOpenChange(false)
    }

    const canSearch = therapies.some(t => t.specialty)

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-amber-500" />
                        Sugerir Horários — Novo Paciente
                    </DialogTitle>
                    <DialogDescription>
                        Informe as terapias necessárias e a preferência de período. O sistema sugere as melhores combinações.
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Configuration */}
                {step === 'config' && (
                    <div className="space-y-4">
                        {/* Therapies list */}
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                                <Stethoscope className="h-4 w-4" />
                                Terapias Necessárias
                            </Label>

                            {therapies.map((therapy, idx) => (
                                <div key={therapy.id} className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <Select
                                            value={therapy.specialty}
                                            onValueChange={(val) => updateTherapy(therapy.id, 'specialty', val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione a terapia" />
                                            </SelectTrigger>
                                            <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                                                {SPECIALTIES.map(spec => (
                                                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-24">
                                        <Input
                                            type="number"
                                            min={1}
                                            max={7}
                                            value={therapy.sessions_per_week}
                                            onChange={(e) => updateTherapy(therapy.id, 'sessions_per_week', parseInt(e.target.value) || 1)}
                                            className="text-center"
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">x/sem</span>
                                    {therapies.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500"
                                            onClick={() => removeTherapy(therapy.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={addTherapy}
                            >
                                <Plus className="h-3 w-3" />
                                Adicionar Terapia
                            </Button>
                        </div>

                        <Separator />

                        {/* Period preference */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Preferência de Período
                            </Label>
                            <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="morning">☀️ Manhã (7h - 12h)</SelectItem>
                                    <SelectItem value="afternoon">🌤️ Tarde (13h - 18h)</SelectItem>
                                    <SelectItem value="any">🕐 Qualquer período</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleClose}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => searchMutation.mutate()}
                                disabled={!canSearch || searchMutation.isPending}
                            >
                                {searchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Sparkles className="mr-2 h-4 w-4" />
                                Buscar Melhores Horários
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {/* Step 2: Results */}
                {step === 'results' && results && (
                    <div className="space-y-4">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-amber-600" />
                            <div>
                                <p className="font-semibold text-amber-800">
                                    {results.total_options} opção(ões) encontrada(s)
                                </p>
                                <p className="text-sm text-amber-700">Período: {results.period}</p>
                            </div>
                        </div>

                        {results.options.length === 0 && (
                            <div className="p-6 text-center text-muted-foreground">
                                <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                <p className="font-medium">Nenhuma combinação disponível</p>
                                <p className="text-sm mt-1">Tente outro período ou verifique a disponibilidade dos terapeutas</p>
                            </div>
                        )}

                        {results.options.map((option) => (
                            <div
                                key={option.option_number}
                                className="p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <Badge variant="outline" className="text-sm font-semibold">
                                        Opção {option.option_number}
                                    </Badge>
                                    <Button
                                        size="sm"
                                        onClick={() => handleSelectOption(option)}
                                    >
                                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                        Selecionar
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {option.therapies.map((therapy, tIdx) => (
                                        <div key={tIdx} className="flex items-start gap-2">
                                            <Badge className="text-xs shrink-0 mt-0.5">
                                                {therapy.specialty}
                                            </Badge>
                                            <div className="text-sm">
                                                <span className="font-medium">{therapy.doctor_name}</span>
                                                <span className="text-muted-foreground"> — </span>
                                                <span className="text-muted-foreground">
                                                    {therapy.days.map(d => `${d.day_name} ${d.time}`).join(', ')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <Separator />

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setStep('config')}>
                                Voltar
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
