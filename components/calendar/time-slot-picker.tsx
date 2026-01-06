'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, AlertCircle } from 'lucide-react'
import type { AvailableSlot } from '@/lib/api-client'

interface TimeSlotPickerProps {
    slots: AvailableSlot[] | undefined
    selected: string | null
    onSelect: (time: string) => void
    isLoading: boolean
}

export function TimeSlotPicker({
    slots,
    selected,
    onSelect,
    isLoading,
}: TimeSlotPickerProps) {
    if (isLoading) {
        return (
            <div className="mt-6">
                <h3 className="font-medium mb-4">Horários disponíveis</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-10" />
                    ))}
                </div>
            </div>
        )
    }

    if (!slots || slots.length === 0) {
        return (
            <div className="mt-6 p-6 border rounded-lg bg-muted/50 text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                    Nenhum horário disponível para esta data.
                    <br />
                    Selecione outra data.
                </p>
            </div>
        )
    }

    const availableCount = slots.filter((s) => s.available).length

    return (
        <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Horários disponíveis
                </h3>
                {availableCount <= 3 && (
                    <span className="text-xs font-medium text-destructive">
                        Poucos horários restantes!
                    </span>
                )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {slots.map((slot) => (
                    <Button
                        key={slot.time}
                        variant={selected === slot.time ? 'default' : 'outline'}
                        disabled={!slot.available}
                        onClick={() => onSelect(slot.time)}
                        className={cn(
                            'h-10',
                            selected === slot.time && 'ring-2 ring-ring ring-offset-2'
                        )}
                    >
                        {slot.time}
                    </Button>
                ))}
            </div>

            {selected && (
                <p className="mt-4 text-sm text-muted-foreground">
                    Horário selecionado: <strong>{selected}</strong>
                </p>
            )}
        </div>
    )
}
