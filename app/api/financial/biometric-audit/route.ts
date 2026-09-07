import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('clinic_id, role')
      .eq('id', user.id)
      .single()

    const clinicId = profile?.clinic_id
    if (!clinicId) {
      return NextResponse.json({ error: 'Clinica nao vinculada' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const now = new Date()
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const month = searchParams.get('month') || defaultMonth
    let doctorId = searchParams.get('doctor_id') || undefined

    // Se for medico/terapeuta, forcar para seu proprio ID
    if (profile.role === 'DOCTOR') {
      const { data: doc } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .eq('clinic_id', clinicId)
        .maybeSingle()

      if (doc) {
        doctorId = doc.id
      }
    }

    // Intervalo do mes
    const [yearStr, monthStr] = month.split('-')
    const yearNum = parseInt(yearStr, 10)
    const monthNum = parseInt(monthStr, 10)

    const startDate = `${month}-01`
    const lastDayOfMonth = new Date(yearNum, monthNum, 0).getDate()
    const endDate = `${month}-${String(lastDayOfMonth).padStart(2, '0')}`

    const adminSupabase = createServiceRoleClient()

    // 1. Buscar agendamentos do mes que representem sessoes ou atendimentos
    let query = adminSupabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        session_status,
        session_status_notes,
        checked_in_at,
        patient_id,
        doctor_id,
        patient:patients(id, full_name, phone, cpf),
        doctor:doctors(id, specialty, user:users(full_name))
      `)
      .eq('clinic_id', clinicId)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)
      .in('status', ['COMPLETED', 'CHECKED_IN', 'IN_PROGRESS', 'CONFIRMED'])
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: true })

    if (doctorId && doctorId !== 'ALL') {
      query = query.eq('doctor_id', doctorId)
    }

    const { data: appointments, error: aptError } = await query

    if (aptError) {
      console.error('[Biometric Audit] Erro ao buscar agendamentos:', aptError)
      return NextResponse.json({ error: 'Erro ao carregar atendimentos' }, { status: 500 })
    }

    const aptList = appointments || []
    const patientIds = [...new Set(aptList.map((a: any) => a.patient_id).filter(Boolean))]

    // 2. Buscar todas as biometrias faciais registradas para esses pacientes
    let biometricsMap: Record<string, any[]> = {}

    if (patientIds.length > 0) {
      const { data: biometrics, error: bioError } = await adminSupabase
        .from('patient_face_biometrics')
        .select('id, patient_id, person_type, person_name, created_at, reference_image_url')
        .eq('clinic_id', clinicId)
        .in('patient_id', patientIds)

      if (!bioError && biometrics) {
        biometrics.forEach((bio: any) => {
          if (!biometricsMap[bio.patient_id]) {
            biometricsMap[bio.patient_id] = []
          }
          biometricsMap[bio.patient_id].push(bio)
        })
      }
    }

    // 3. Cruzar atendimentos com registros biometricos
    let withBioCount = 0
    let withoutBioCount = 0
    const uniquePatientsWithBio = new Set<string>()
    const uniquePatientsWithoutBio = new Set<string>()

    const items = aptList.map((apt: any) => {
      const patientBios = biometricsMap[apt.patient_id] || []
      const hasBiometric = patientBios.length > 0

      if (hasBiometric) {
        withBioCount++
        uniquePatientsWithBio.add(apt.patient_id)
      } else {
        withoutBioCount++
        uniquePatientsWithoutBio.add(apt.patient_id)
      }

      const doctorFullName = apt.doctor?.user?.full_name || 'Profissional Nao Identificado'
      const patientFullName = apt.patient?.full_name || 'Paciente Nao Identificado'

      return {
        id: apt.id,
        date: apt.appointment_date,
        time: apt.appointment_time?.substring(0, 5) || '',
        patient_id: apt.patient_id,
        patient_name: patientFullName,
        patient_phone: apt.patient?.phone || '',
        doctor_id: apt.doctor_id,
        doctor_name: doctorFullName,
        specialty: apt.doctor?.specialty || '',
        appointment_status: apt.status,
        session_status: apt.session_status || (apt.status === 'COMPLETED' ? 'Presente' : 'Agendado'),
        session_status_notes: apt.session_status_notes || '',
        checked_in_at: apt.checked_in_at,
        has_biometric: hasBiometric,
        biometrics_count: patientBios.length,
        biometric_types: patientBios.map((b: any) => b.person_type || 'Paciente'),
        biometrics: patientBios.map((b: any) => ({
          id: b.id,
          person_type: b.person_type || 'Paciente',
          person_name: b.person_name || '',
          created_at: b.created_at,
        })),
        audit_verdict: hasBiometric ? 'CONFORME' : 'NAO_CONFORME',
      }
    })

    const totalSessions = aptList.length
    const complianceRate = totalSessions > 0 ? Number(((withBioCount / totalSessions) * 100).toFixed(1)) : 0

    return NextResponse.json({
      success: true,
      month,
      kpis: {
        total_sessions: totalSessions,
        sessions_with_biometric: withBioCount,
        sessions_without_biometric: withoutBioCount,
        compliance_rate: complianceRate,
        unique_patients_total: patientIds.length,
        patients_with_biometric: uniquePatientsWithBio.size,
        patients_without_biometric: uniquePatientsWithoutBio.size,
      },
      items,
    })
  } catch (error: any) {
    console.error('[Biometric Audit API] Erro:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
