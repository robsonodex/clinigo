'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Layers, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface CrossSpecialtyNote {
    id: string
    specialty: string
    specialtyLabel: string
    date: string
    professionalName: string
    summary: string
    interferingCount: number
}

export function CrossSpecialtyContextCard({
    patientId,
    currentSpecialty,
}: {
    patientId: string
    currentSpecialty: string
}) {
    const { data: notes } = useQuery<CrossSpecialtyNote[]>({
        queryKey: ['cross-specialty-context', patientId, currentSpecialty],
        queryFn: async () => {
            const res = await fetch(
                `/api/patients/${encodeURIComponent(patientId)}/cross-specialty-context?excludeSpecialty=${encodeURIComponent(currentSpecialty)}`
            )
            if (!res.ok) return []
            const json = await res.json()
            return Array.isArray(json.notes) ? json.notes : []
        },
        staleTime: 1000 * 60 * 3,
    })

    if (!notes || notes.length === 0) {
        return null
    }

    return (
        <div className="rounded-lg border border-[#C4E1D7] bg-[#E6F2EE]/45 p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#114D3E] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#155E4B]" />
                    Integração Multidisciplinar — Registros Recentes de Outras Especialidades (Últimos 7 dias)
                </p>
                <Badge variant="outline" className="text-[10px] bg-white border-[#C4E1D7] text-[#114D3E]">
                    {notes.length} registro(s)
                </Badge>
            </div>

            <div className="space-y-1.5">
                {notes.slice(0, 3).map((note) => (
                    <div
                        key={note.id}
                        className="rounded-md border border-border/60 bg-white px-3 py-2 text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-1.5"
                    >
                        <div className="space-y-0.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px] font-medium bg-slate-50">
                                    {note.specialtyLabel}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">
                                    {note.date.split('-').reverse().join('/')} · {note.professionalName}
                                </span>
                                {note.interferingCount > 0 && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] bg-amber-50 text-amber-800 border-amber-200 gap-0.5"
                                    >
                                        <AlertCircle className="w-3 h-3" />
                                        {note.interferingCount} interferente(s)
                                    </Badge>
                                )}
                            </div>
                            <p className="text-slate-700 leading-snug">{note.summary}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

