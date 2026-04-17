import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Mapeamento de hierarquia de roles para simplificar permissões
const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 100,
  CLINIC_ADMIN: 80,
  DOCTOR: 60,
  RECEPTIONIST: 40,
  NURSE: 30,
  STAFF: 20
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
  FREE: 10
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
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

    // Role mínima: RECEPTIONIST (40)
    const userRoleValue = ROLE_HIERARCHY[userData.role] || 0
    if (userRoleValue < ROLE_HIERARCHY.RECEPTIONIST) {
      return NextResponse.json({ error: 'Nível de acesso insuficiente para realizar testes de elegibilidade' }, { status: 403 })
    }

    // Plano mínimo: AVANCADO (50)
    const planTypeValue = PLAN_HIERARCHY[clinic.plan_type as string] || 0
    if (planTypeValue < PLAN_HIERARCHY.AVANCADO) {
      return NextResponse.json({ error: 'Esta funcionalidade (Autorizador TISS) requer no mínimo o plano AVANÇADO' }, { status: 403 })
    }

    const body = await request.json()
    const { patient_id, health_insurance_id, card_number, card_validity } = body

    if (!health_insurance_id || !card_number) {
      return NextResponse.json({
        error: 'Campos obrigatórios: health_insurance_id, card_number'
      }, { status: 400 })
    }

    // PING SIMULADO DE OPERADORA PARA FASE DE IMPLEMENTAÇÃO E TESTES LOCAIS
    // Aqui no futuro será conectada a engine de WS (SOAP/REST) da respectiva operadora.
    // Lógica Mockada: se terminar em '00', rejeita. Senão, aprova.
    const isError = card_number.endsWith('99')
    const isIneligible = card_number.endsWith('00')
    const isExpired = card_validity && new Date(card_validity).getTime() < new Date().getTime()

    let finalStatus = 'ELIGIBLE'
    let fakeMessage = 'Elegível'

    if (isError) {
      finalStatus = 'ERROR'
      fakeMessage = 'Erro de comunicação com o WebService da operadora'
    } else if (isIneligible || isExpired) {
      finalStatus = 'INELIGIBLE'
      fakeMessage = isExpired ? 'Carteirinha vencida' : 'Beneficiário não bloqueado/inativo na operadora'
    }

    const providerResponse = {
      message: fakeMessage,
      timestamp: new Date().toISOString(),
      mocked: true,
      tiss_version: '4.01.00',
      ans_transaction_id: `TISS_800_${Math.floor(Math.random() * 9999999)}`
    }

    // Salva o registro de elegibilidade na tabela de log (tiss_eligibility_checks)
    const { data: eligibilityCheck, error: insertError } = await supabase
      .from('tiss_eligibility_checks')
      .insert({
        clinic_id: clinicId,
        patient_id: patient_id || null,
        health_insurance_id,
        card_number,
        card_validity: card_validity || null,
        status: finalStatus,
        provider_response: providerResponse,
        checked_by: user.id
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting eligibility check:', insertError)
      return NextResponse.json({ error: 'Erro ao registrar auditoria da Elegibilidade' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: finalStatus === 'ELIGIBLE',
      data: eligibilityCheck 
    })
  } catch (error) {
    console.error('Eligibility check error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
