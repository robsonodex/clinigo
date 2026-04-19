'use client'

/**
 * PrescriptionForm — Formulário reutilizável de prescrição
 * Usado na página principal, no PEP e no fluxo de finalização
 */

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Plus, Trash2, Pill, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PrescriptionItem {
    medication_name: string
    dosage: string
    frequency: string
    duration: string
    instructions: string
}

interface PrescriptionFormProps {
    initialItems?: PrescriptionItem[]
    initialNotes?: string
    onSubmit: (data: { items: PrescriptionItem[]; notes: string }) => void
    onCancel?: () => void
    isSubmitting?: boolean
    submitLabel?: string
    className?: string
}

const EMPTY_ITEM: PrescriptionItem = {
    medication_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
}

export function PrescriptionForm({
    initialItems = [{ ...EMPTY_ITEM }],
    initialNotes = '',
    onSubmit,
    onCancel,
    isSubmitting = false,
    submitLabel = 'Salvar Prescrição',
    className,
}: PrescriptionFormProps) {
    const [items, setItems] = useState<PrescriptionItem[]>(
        initialItems.length > 0 ? initialItems : [{ ...EMPTY_ITEM }]
    )
    const [notes, setNotes] = useState(initialNotes)

    const addItem = useCallback(() => {
        setItems(prev => [...prev, { ...EMPTY_ITEM }])
    }, [])

    const removeItem = useCallback((index: number) => {
        setItems(prev => {
            if (prev.length <= 1) return prev
            return prev.filter((_, i) => i !== index)
        })
    }, [])

    const updateItem = useCallback((index: number, field: keyof PrescriptionItem, value: string) => {
        setItems(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], [field]: value }
            return updated
        })
    }, [])

    const handleSubmit = () => {
        // Validate at least one complete item
        const validItems = items.filter(
            item => item.medication_name.trim() && item.dosage.trim() && item.frequency.trim()
        )

        if (validItems.length === 0) {
            return // Form validation will catch this
        }

        onSubmit({ items: validItems, notes })
    }

    const isValid = items.some(
        item => item.medication_name.trim() && item.dosage.trim() && item.frequency.trim()
    )

    return (
        <div className={cn('space-y-4', className)}>
            {/* Medication List */}
            <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                    <Pill className="w-4 h-4 text-primary" />
                    Medicamentos
                </Label>

                {items.map((item, idx) => (
                    <Card key={idx} className="p-4 border-l-4 border-l-primary/30">
                        <div className="flex items-start gap-2">
                            <div className="flex items-center pt-2 text-muted-foreground">
                                <GripVertical className="w-4 h-4" />
                                <span className="text-xs font-bold w-5">{idx + 1}</span>
                            </div>

                            <div className="flex-1 space-y-3">
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">
                                            Medicamento *
                                        </Label>
                                        <Input
                                            placeholder="Ex: Amoxicilina"
                                            value={item.medication_name}
                                            onChange={(e) => updateItem(idx, 'medication_name', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">
                                            Dosagem *
                                        </Label>
                                        <Input
                                            placeholder="Ex: 500mg"
                                            value={item.dosage}
                                            onChange={(e) => updateItem(idx, 'dosage', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">
                                            Posologia *
                                        </Label>
                                        <Input
                                            placeholder="Ex: 2x ao dia"
                                            value={item.frequency}
                                            onChange={(e) => updateItem(idx, 'frequency', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">
                                            Duração
                                        </Label>
                                        <Input
                                            placeholder="Ex: 7 dias"
                                            value={item.duration}
                                            onChange={(e) => updateItem(idx, 'duration', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        Orientações adicionais
                                    </Label>
                                    <Input
                                        placeholder="Ex: Tomar após as refeições"
                                        value={item.instructions}
                                        onChange={(e) => updateItem(idx, 'instructions', e.target.value)}
                                    />
                                </div>
                            </div>

                            {items.length > 1 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive/80 mt-1"
                                    onClick={() => removeItem(idx)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </Card>
                ))}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    className="w-full border-dashed"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar medicamento
                </Button>
            </div>

            {/* Notes */}
            <div className="space-y-2">
                <Label className="text-sm font-semibold">Observações gerais</Label>
                <Textarea
                    placeholder="Instruções adicionais para o paciente..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[80px]"
                />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2">
                {onCancel && (
                    <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                )}
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !isValid}
                >
                    {isSubmitting ? 'Salvando...' : submitLabel}
                </Button>
            </div>
        </div>
    )
}
