import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { enforceSessionPlanRouteGuard } from '@/lib/services/session-plans-guard'
import { getSpecialtyTemplate } from '@/lib/session-plans/registry'
import { SESSION_PLAN_SPECIALTIES_META } from '@/lib/constants/session-plans-beta-clinics'
import { SpecialtyDashboardClient } from '@/components/session-plans/SpecialtyDashboardClient'

interface PageProps {
    params: Promise<{
        id: string
        especialidade: string
    }>
}

export default async function SpecialtySessionPlansPage({ params }: PageProps) {
    const { id: patientId, especialidade } = await params

    const serviceClient = createServiceRoleClient()
    const { data: patientCheck } = await serviceClient
        .from('patients')
        .select('id, clinic_id')
        .eq('id', patientId)
        .maybeSingle()

    if (!patientCheck) {
        notFound()
    }

    // 1. Guard rigoroso de rotas em servidor (Fase 0): retorna 404 sem pistas se não autorizado
    const guard = await enforceSessionPlanRouteGuard(
        `/dashboard/pacientes/${patientId}/planos-sessao/${especialidade}`,
        especialidade,
        patientCheck.clinic_id
    )

    // 2. Busca template da especialidade
    const template = getSpecialtyTemplate(especialidade)
    if (!template) {
        notFound()
    }

    const meta = (SESSION_PLAN_SPECIALTIES_META as any)[especialidade]

    // 3. Busca dados do paciente
    const { data: patientRaw, error: pError } = await serviceClient
        .from('patients')
        .select('id, full_name, date_of_birth, cpf, phone, gender, created_at')
        .eq('id', patientId)
        .eq('clinic_id', guard.clinicId)
        .single()

    if (pError || !patientRaw) {
        console.error('[planos-sessao] Patient fetch error:', pError)
        notFound()
    }

    const patient = {
        ...patientRaw,
        birth_date: patientRaw.date_of_birth
    }

    // 4. Busca Capa do paciente
    const { data: capa } = await serviceClient
        .from('planos_sessao_capa')
        .select('*')
        .eq('clinica_id', guard.clinicId)
        .eq('paciente_id', patientId)
        .eq('especialidade', especialidade)
        .maybeSingle()

    // 5. Busca lista de sessões
    const { data: sessoes } = await serviceClient
        .from('planos_sessao')
        .select(`
            id,
            data_sessao,
            duracao_minutos,
            status,
            contexto,
            forma_mobilidade,
            created_at,
            updated_at,
            users:profissional_id (
                full_name
            )
        `)
        .eq('clinica_id', guard.clinicId)
        .eq('paciente_id', patientId)
        .eq('especialidade', especialidade)
        .order('data_sessao', { ascending: false })
        .order('created_at', { ascending: false })

    return (
        <SpecialtyDashboardClient
            patient={patient}
            especialidade={especialidade}
            meta={meta}
            template={template}
            initialCapa={capa}
            initialSessoes={sessoes || []}
        />
    )
}
