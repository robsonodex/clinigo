'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, HeartHandshake, School, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { decodeFamilyFeedback } from '@/lib/family-portal/feedback-codec'

interface FamilyCorrelationStripProps {
    patientId: string
}

export function FamilyCorrelationStrip({ patientId }: FamilyCorrelationStripProps) {
    const { data } = useQuery<any[]>({
        queryKey: ['family-portal-correlation', patientId],
        enabled: Boolean(patientId),
        queryFn: async () => {
            const res = await fetch(`/api/family-portal?patientId=${encodeURIComponent(patientId)}`)
            if (!res.ok) return []
            const json = await res.json()
            return Array.isArray(json.shares) ? json.shares : []
        },
        staleTime: 1000 * 60 * 10,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
    })

    if (!data || data.length === 0) {
        return null
    }

    const familyShares = data.filter((s) => s.share_type === 'family')
    const completedHome = familyShares.filter((s) => s.home_activity_completed).length
    const decodedEntries = data.map((s) => ({
        ...s,
        decoded: decodeFamilyFeedback(s.home_activity_feedback),
    }))

    const latestWithConfidence = decodedEntries.find((e) => e.decoded.confidenceScore !== null)
    const latestWithContext = decodedEntries.find(
        (e) => e.decoded.weeklyContextTags.length > 0 || e.decoded.note
    )
    const latestSchoolReturn = decodedEntries.find((e) => e.decoded.schoolReturn !== null)

    const confidence = latestWithConfidence?.decoded.confidenceScore ?? null

    return (
        <div className="rounded-lg border border-border bg-[#FAFAF8] p-3.5 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <HeartHandshake className="w-4 h-4 text-[#155E4B]" />
                    Correlação Casa &times; Clínica &amp; Escola (CliniGo Família)
                </p>

                <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                        variant="outline"
                        className="bg-[#E6F2EE] text-[#114D3E] border-[#C4E1D7] text-[10px] gap-1"
                    >
                        <CheckCircle2 className="w-3 h-3" />
                        {completedHome}/{familyShares.length} atividades feitas em casa
                    </Badge>

                    {confidence !== null && (
                        <Badge
                            variant="outline"
                            className={
                                confidence <= 2
                                    ? 'bg-rose-50 text-rose-800 border-rose-200 text-[10px] gap-1'
                                    : confidence === 3
                                    ? 'bg-amber-50 text-amber-800 border-amber-200 text-[10px]'
                                    : 'bg-[#E6F2EE] text-[#114D3E] border-[#C4E1D7] text-[10px]'
                            }
                        >
                            {confidence <= 2 && <AlertTriangle className="w-3 h-3" />}
                            Confiança da família: {confidence}/5
                        </Badge>
                    )}
                </div>
            </div>

            {latestWithContext && (
                <div className="rounded-md border border-border/70 bg-white px-3 py-2 space-y-1">
                    {latestWithContext.decoded.weeklyContextTags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground mr-1">
                                Contexto semanal relatado pela família:
                            </span>
                            {latestWithContext.decoded.weeklyContextTags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-[10px] bg-slate-50">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}
                    {latestWithContext.decoded.note && (
                        <p className="text-slate-700 leading-snug">
                            &ldquo;{latestWithContext.decoded.note}&rdquo;
                        </p>
                    )}
                </div>
            )}

            {latestSchoolReturn?.decoded.schoolReturn && (
                <div className="rounded-md border border-[#C4E1D7] bg-white px-3 py-2 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#114D3E] inline-flex items-center gap-1">
                            <School className="w-3.5 h-3.5 text-[#155E4B]" />
                            Retorno da Escola
                            {latestSchoolReturn.decoded.schoolReturn.respondentName
                                ? ` (${latestSchoolReturn.decoded.schoolReturn.respondentName})`
                                : ''}
                            :
                        </span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                            Participação {latestSchoolReturn.decoded.schoolReturn.participation}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">
                            Regulação: {latestSchoolReturn.decoded.schoolReturn.regulation}
                        </Badge>
                    </div>
                    {latestSchoolReturn.decoded.schoolReturn.observation && (
                        <p className="text-slate-700 leading-snug">
                            {latestSchoolReturn.decoded.schoolReturn.observation}
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}

