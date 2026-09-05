import React from 'react'
import { enforceSessionPlanRouteGuard } from '@/lib/services/session-plans-guard'
import { ManualEvolucaoReader } from '@/components/session-plans/ManualEvolucaoReader'

export default async function ManualEvolucaoPage() {
    // 1. Guard de Servidor (Fase 0): Lança notFound() se a clínica não estiver na Allowlist
    await enforceSessionPlanRouteGuard('/dashboard/manual-evolucao', 'manual')

    return <ManualEvolucaoReader />
}
