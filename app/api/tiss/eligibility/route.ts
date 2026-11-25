import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { requireTissAction } from '@/lib/auth/tiss-role-guard'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ROLE_HIERARCHY: Record<string, number> = {
    SUPER_ADMIN: 100,
    CLINIC_ADMIN: 80,
    FINANCIAL: 70,
    DOCTOR: 60,
    RECEPTIONIST: 40,
    NURSE: 30,
    STAFF: 20,
}

const PLAN_HIERARCHY: Record<string, number> = {
    NETWORK: 100,
    ENTERPRISE: 80,
    PROFESSIONAL: 60,
    PRO: 60,
    AVANCADO: 50,
    BASIC: 40,
    BASICO: 40,
    STARTER: 20,
    FREE: 10,
}

export const POST = withAxiom(async (request: AxiomRequest) => {
    const guard = await requireTissAction(request, 'guia.validar')
    if (!guard.authorized) {
        return guard.response
    }
    try {
        const supabase = await createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, clinic_id, clinics(plan_type, is_active)')
            .eq('id', user.id)
            .single()

        if (userError || !userData) {
            return NextResponse.json({ error: 'Erro ao validar autorização do usuário' }, { status: 403 })
        }

        const clinicId = userData.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não vinculada' }, { status: 400 })
        }

        const clinic = Array.isArray(userData.clinics) ? userData.clinics[0] : userData.clinics
        if (!clinic || !clinic.is_active) {
            return NextResponse.json({ error: 'Clínica inativa' }, { status: 403 })
        }

        const userRoleValue = ROLE_HIERARCHY[userData.role] || 0
        if (userRoleValue < ROLE_HIERARCHY.RECEPTIONIST) {
            return NextResponse.json(
                { error: 'Nível de acesso insuficiente para realizar conferência de elegibilidade' },
                { status: 403 }
            )
        }

        const planTypeValue = PLAN_HIERARCHY[clinic.plan_type as string] || 0
        if (planTypeValue < PLAN_HIERARCHY.AVANCADO) {
            return NextResponse.json(
                { error: 'Esta funcionalidade (Autorizador TISS) requer no mínimo o plano AVANÇADO' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const {
            patient_id,
            health_insurance_id,
            card_number,
            card_validity,
            execution_date,
            manual_conference_confirmed,
            manual_conference_notes,
        } = body

        if (!health_insurance_id || !card_number) {
            return NextResponse.json(
                { error: 'Campos obrigatórios: health_insurance_id, card_number' },
                { status: 400 }
            )
        }

        // Validação real (sem mock): consulta operadora ativa na clínica, formato e vigência real da carteirinha
        const { data: operadora } = await supabase
            .from('health_insurances')
            .select('id, name, code, status, tiss_version')
            .eq('id', health_insurance_id)
            .eq('clinic_id', clinicId)
            .maybeSingle()

        if (!operadora) {
            return NextResponse.json({ error: 'Operadora não encontrada para esta clínica' }, { status: 404 })
        }

        const cleanCard = String(card_number).replace(/\s+/g, '')
        const digitsOnly = cleanCard.replace(/\D/g, '')
        const refDate = execution_date
            ? new Date(`${String(execution_date).split('T')[0]}T00:00:00Z`)
            : new Date()
        const validityDate = card_validity
            ? new Date(`${String(card_validity).split('T')[0]}T23:59:59Z`)
            : null
        const isExpired = Boolean(validityDate && !Number.isNaN(validityDate.getTime()) && validityDate < refDate)
        const isOperatorInactive = operadora.status === 'INACTIVE'
        const isCardFormatWeak = digitsOnly.length < 6

        let finalStatus: 'ELIGIBLE' | 'INELIGIBLE' = 'ELIGIBLE'
        let verificationMessage = 'Validação cadastral interna aprovada (operadora ativa e carteirinha vigente).'
        let verificationMethod: 'INTERNAL_CHECK' | 'MANUAL_CONFERENCE' = 'INTERNAL_CHECK'

        if (manual_conference_confirmed) {
            verificationMethod = 'MANUAL_CONFERENCE'
            finalStatus = 'ELIGIBLE'
            verificationMessage = manual_conference_notes
                ? `Conferido manualmente no portal da operadora: ${String(manual_conference_notes).slice(0, 200)}`
                : 'Elegibilidade confirmada manualmente no portal da operadora.'
        } else if (isOperatorInactive) {
            finalStatus = 'INELIGIBLE'
            verificationMessage = `Operadora ${operadora.name} está inativa no cadastro da clínica.`
        } else if (isExpired) {
            finalStatus = 'INELIGIBLE'
            verificationMessage = `Carteirinha vencida na data de referência (${String(card_validity).split('T')[0]}). Alto risco de glosa ANS 1001.`
        } else if (isCardFormatWeak) {
            finalStatus = 'INELIGIBLE'
            verificationMessage = 'Número da carteirinha possui menos de 6 dígitos numéricos válidos.'
        }

        const providerResponse = {
            message: verificationMessage,
            timestamp: new Date().toISOString(),
            verification_method: verificationMethod,
            tiss_version: operadora.tiss_version || '4.01.00',
            operator_name: operadora.name,
            operator_ans_code: operadora.code || null,
            disclaimer:
                verificationMethod === 'MANUAL_CONFERENCE'
                    ? 'Conferência auditada registrada pelo operador após consulta ao portal da operadora.'
                    : 'Validação cadastral e de vigência interna do CliniGo (não substitui retorno online de WebService da operadora quando aplicável).',
        }

        const { data: eligibilityCheck, error: insertError } = await supabase
            .from('tiss_eligibility_checks')
            .insert({
                clinic_id: clinicId,
                patient_id: patient_id || null,
                health_insurance_id,
                card_number: cleanCard,
                card_validity: card_validity || null,
                status: finalStatus,
                provider_response: providerResponse,
                checked_by: user.id,
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error inserting eligibility check:', insertError)
            return NextResponse.json({ error: 'Erro ao registrar auditoria da Elegibilidade' }, { status: 500 })
        }

        return NextResponse.json({
            success: finalStatus === 'ELIGIBLE',
            data: eligibilityCheck,
        })
    } catch (error) {
        request.log.error('tiss/eligibility', { error: error instanceof Error ? error.message : String(error) })
        console.error('Eligibility check error:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
})
