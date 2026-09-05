import React from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { enforceSessionPlanRouteGuard } from '@/lib/services/session-plans-guard'
import { getSpecialtyTemplate } from '@/lib/session-plans/registry'
import { SessionPlanFormClient } from '@/components/session-plans/SessionPlanFormClient'

interface PageProps {
    params: Promise<{
        id: string
        especialidade: string
        sessaoId: string
    }>
}

export default async function SessionPlanFormPage({ params }: PageProps) {
    const { id: patientId, especialidade, sessaoId } = await params

    const serviceClient = createServiceRoleClient()
    const { data: patientCheck } = await serviceClient
        .from('patients')
        .select('id, clinic_id')
        .eq('id', patientId)
        .maybeSingle()

    if (!patientCheck) {
        notFound()
    }

    // 1. Route Guard de Servidor (Camada A + Camada B) -> 404 estrito se não autorizado
    const guard = await enforceSessionPlanRouteGuard(
        `/dashboard/pacientes/${patientId}/planos-sessao/${especialidade}/sessao/${sessaoId}`,
        especialidade,
        patientCheck.clinic_id
    )

    const template = getSpecialtyTemplate(especialidade)
    if (!template) {
        notFound()
    }

    // 2. Busca paciente
    const { data: patientRaw, error: pError } = await serviceClient
        .from('patients')
        .select('id, full_name, date_of_birth, gender, cpf')
        .eq('id', patientId)
        .eq('clinic_id', guard.clinicId)
        .single()

    if (pError || !patientRaw) {
        console.error('[planos-sessao-detail] Patient fetch error:', pError)
        notFound()
    }

    const patient = {
        ...patientRaw,
        birth_date: patientRaw.date_of_birth
    }

    // 3. Busca sessão
    const { data: sessao, error: sError } = await serviceClient
        .from('planos_sessao')
        .select(`
            *,
            users:profissional_id (
                id,
                full_name,
                email
            )
        `)
        .eq('id', sessaoId)
        .eq('clinica_id', guard.clinicId)
        .eq('paciente_id', patientId)
        .single()

    if (sError || !sessao) {
        notFound()
    }

    return (
        <SessionPlanFormClient
            patient={patient}
            especialidade={especialidade}
            template={template}
            initialSessao={sessao}
        />
    )
}
