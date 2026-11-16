import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/patients/evasion-risk
 * Lista pacientes em risco de evasão (sem agendar há X dias)
 */
export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        const { searchParams } = new URL(request.url)
        const doctorId = searchParams.get('doctor_id')
        const riskLevel = searchParams.get('risk_level') // low, medium, high

        // Get last appointment date per patient
        let query = supabase
            .from('appointments')
            .select(`
                patient_id,
                appointment_date,
                doctor_id,
                status,
                patients!inner(id, full_name, phone, email),
                doctors!inner(id, user:users(full_name))
            `)
            .eq('clinic_id', profile.clinic_id)
            .in('status', ['COMPLETED', 'CONFIRMED'])
            .order('appointment_date', { ascending: false })

        if (doctorId) query = query.eq('doctor_id', doctorId)
        // For DOCTOR role, only show their patients
        if (profile.role === 'DOCTOR') {
            const { data: doctorProfile } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .eq('clinic_id', profile.clinic_id)
                .maybeSingle()
            if (doctorProfile) query = query.eq('doctor_id', doctorProfile.id)
        }

        const { data: appointments, error } = await query
        if (error) throw error

        // Find last appointment per patient
        const lastAppointments: Record<string, any> = {}
        appointments?.forEach((apt: any) => {
            if (apt.patient_id && !lastAppointments[apt.patient_id]) {
                lastAppointments[apt.patient_id] = apt
            }
        })

        const today = new Date()
        const patients = Object.values(lastAppointments).map((apt: any) => {
            const lastDate = new Date(apt.appointment_date)
            const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

            let risk: 'low' | 'medium' | 'high'
            if (daysSince >= 45) risk = 'high'
            else if (daysSince >= 21) risk = 'medium'
            else risk = 'low'

            const patient = Array.isArray(apt.patients) ? apt.patients[0] : apt.patients
            const doctor = Array.isArray(apt.doctors) ? apt.doctors[0] : apt.doctors
            const doctorUser = Array.isArray(doctor?.user) ? doctor.user[0] : doctor?.user

            return {
                patient_id: apt.patient_id,
                patient_name: patient?.full_name || 'N/A',
                patient_phone: patient?.phone || null,
                patient_email: patient?.email || null,
                doctor_name: doctorUser?.full_name || 'N/A',
                doctor_id: apt.doctor_id,
                last_appointment: apt.appointment_date,
                days_since_last: daysSince,
                risk_level: risk,
            }
        })

        // Filter by risk if specified
        let filtered = patients.filter(p => p.days_since_last >= 14) // Only show 14+ days
        if (riskLevel) filtered = filtered.filter(p => p.risk_level === riskLevel)

        // Sort by days since (highest first)
        filtered.sort((a, b) => b.days_since_last - a.days_since_last)

        const summary = {
            total_at_risk: filtered.length,
            high_risk: filtered.filter(p => p.risk_level === 'high').length,
            medium_risk: filtered.filter(p => p.risk_level === 'medium').length,
            low_risk: filtered.filter(p => p.risk_level === 'low').length,
        }

        return NextResponse.json({
            summary,
            patients: filtered.slice(0, 100),
        })
    } catch (error: any) {
        const errMsg = error?.message || (error instanceof Error ? error.message : String(error))
        request.log.error('patients/evasion-risk', { error: errMsg })
        console.error('[API] evasion-risk error:', error)
        return NextResponse.json({ error: errMsg }, { status: 500 })
    }
})
