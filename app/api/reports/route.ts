import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

// Interfaces for database query results
interface AppointmentRecord {
    id: string
    status: string
    appointment_date?: string
    created_at?: string
    payments?: PaymentRecord[]
    doctor_id?: string
    doctors?: { specialty: string } | null
}

interface PaymentRecord {
    amount: number
    status: string
    paid_at?: string
}

interface DoctorRecord {
    id: string
    specialty: string
    users?: { full_name: string } | null
    appointments?: AppointmentRecord[]
}

interface PatientRecord {
    id: string
    created_at: string
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!userData) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
        }

        const searchParams = request.nextUrl.searchParams
        const reportType = searchParams.get('type') || 'kpis'
        const startDate = searchParams.get('start_date') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
        const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0]
        const doctorId = searchParams.get('doctor_id')

        // Type safe user data extraction
        const userRole = (userData as { role?: string }).role
        const clinicId = (userData as { clinic_id?: string }).clinic_id

        if (!clinicId && userRole !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        switch (reportType) {
            case 'kpis':
                return await getKPIs(supabase, clinicId, startDate, endDate)

            case 'revenue_by_doctor':
                return await getRevenueByDoctor(supabase, clinicId, startDate, endDate)

            case 'appointments_by_day':
                return await getAppointmentsByDay(supabase, clinicId, startDate, endDate)

            case 'appointments_by_status':
                return await getAppointmentsByStatus(supabase, clinicId, startDate, endDate)

            case 'patients_growth':
                return await getPatientsGrowth(supabase, clinicId, startDate, endDate)

            case 'revenue_by_month':
                return await getRevenueByMonth(supabase, clinicId, startDate, endDate)

            case 'top_specialties':
                return await getTopSpecialties(supabase, clinicId, startDate, endDate)

            case 'health_insurance_stats':
                return await getHealthInsuranceStats(supabase, clinicId, startDate, endDate)

            case 'agenda_report':
                return await getAgendaReport(supabase, clinicId, startDate, endDate)

            case 'reimbursement_report':
                return await getReimbursementReport(supabase, clinicId, startDate, endDate)

            case 'patient_frequency': {
                const patientId = searchParams.get('patient_id')
                return await getPatientFrequency(supabase, clinicId, startDate, endDate, patientId)
            }

            case 'patient_sessions': {
                const patientId = searchParams.get('patient_id')
                return await getPatientSessions(supabase, clinicId, startDate, endDate, patientId)
            }

            default:
                return NextResponse.json({ error: 'Tipo de relatório inválido' }, { status: 400 })
        }
    } catch (error) {
        console.error('Reports error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

async function getKPIs(supabase: SupabaseClient<any, "public", any>, clinicId: string, startDate: string, endDate: string) {
    return await getKPIsManual(supabase, clinicId, startDate, endDate)
}

async function getKPIsManual(supabase: SupabaseClient<Database>, clinicId: string, startDate: string, endDate: string) {
    // Get appointment stats with patient_id for reimbursement rule matching
    const { data: appointments } = await supabase
        .from('appointments')
        .select('id, status, patient_id, appointment_type')
        .eq('clinic_id', clinicId)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)

    const total = appointments?.length || 0
    const completed = appointments?.filter((a: any) => a.status === 'COMPLETED').length || 0
    const cancelled = appointments?.filter((a: any) => a.status === 'CANCELLED').length || 0
    const noShow = appointments?.filter((a: any) => a.status === 'NO_SHOW').length || 0

    // Get revenue from financial_entries
    const { data: financialIncome } = await supabase
        .from('financial_entries')
        .select('amount')
        .eq('clinic_id', clinicId)
        .eq('entry_type', 'INCOME')
        .eq('status', 'PAID')
        .gte('due_date', startDate)
        .lte('due_date', endDate)

    let totalRevenue = financialIncome?.reduce((sum: number, p: { amount: any }) => sum + (Number(p.amount) || 0), 0) || 0

    // FALLBACK: If no financial_entries in this period, calculate from reimbursement rules
    if (totalRevenue === 0 && completed > 0) {
        totalRevenue = await calculateRevenueFromRules(supabase, clinicId, appointments || [])
    }

    // Get patient counts
    const { count: newPatients } = await supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .is('deleted_at', null)

    // Get doctor counts
    const { count: totalDoctors } = await supabase
        .from('doctors')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)

    const { count: activeDoctors } = await supabase
        .from('doctors')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .eq('is_accepting_appointments', true)

    return NextResponse.json({
        kpis: {
            total_revenue: totalRevenue,
            total_appointments: total,
            completed_appointments: completed,
            cancelled_appointments: cancelled,
            no_show_count: noShow,
            no_show_rate: total > 0 ? ((noShow / total) * 100).toFixed(2) : 0,
            average_ticket: completed > 0 ? (totalRevenue / completed).toFixed(2) : 0,
            new_patients: newPatients || 0,
            total_doctors: totalDoctors || 0,
            active_doctors: activeDoctors || 0,
        }
    })
}

/**
 * Calcula receita a partir de regras de reembolso × agendamentos concluídos.
 * Usado como fallback quando não há financial_entries no período.
 */
async function calculateRevenueFromRules(
    supabase: SupabaseClient<any, "public", any>,
    clinicId: string,
    appointments: any[]
): Promise<number> {
    const completedAppts = appointments.filter(a => a.status === 'COMPLETED')
    if (completedAppts.length === 0) return 0

    // Get active reimbursement rules for this clinic
    const { data: rules } = await supabase
        .from('patient_reimbursement_rules')
        .select('patient_id, therapy_type, billing_amount, guides_per_session')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)

    if (!rules || rules.length === 0) return 0

    // Build map: patient_id -> rules (keyed by therapy_type)
    const rulesMap = new Map<string, any[]>()
    for (const rule of rules) {
        if (!rulesMap.has(rule.patient_id)) rulesMap.set(rule.patient_id, [])
        rulesMap.get(rule.patient_id)!.push(rule)
    }

    let totalRevenue = 0
    for (const appt of completedAppts) {
        const patientRules = rulesMap.get(appt.patient_id)
        if (patientRules && patientRules.length > 0) {
            // Try to match by appointment_type to therapy_type
            const matchedRule = patientRules.find(
                (r: any) => r.therapy_type?.toLowerCase() === (appt.appointment_type || '').toLowerCase()
            ) || patientRules[0] // Fallback to first rule if no match
            totalRevenue += Number(matchedRule.billing_amount) || 0
        }
    }

    return totalRevenue
}

async function getRevenueByDoctor(supabase: SupabaseClient<any, "public", any>, clinicId: string, startDate: string, endDate: string) {
    // Get doctors with their appointments in the period (include patient_id and appointment_type)
    const { data: doctors } = await supabase
        .from('doctors')
        .select(`
            id,
            specialty,
            users(full_name),
            appointments(
                id,
                status,
                appointment_date,
                patient_id,
                appointment_type
            )
        `)
        .eq('clinic_id', clinicId)

    // Get financial entries for this clinic in the period
    const { data: financialEntries } = await supabase
        .from('financial_entries')
        .select('amount, appointment_id, description')
        .eq('clinic_id', clinicId)
        .eq('entry_type', 'INCOME')
        .gte('due_date', startDate)
        .lte('due_date', endDate)

    // Strategy 1: Build map of appointment_id -> amount
    const appointmentRevenueMap = new Map<string, number>()
    for (const fe of financialEntries || []) {
        if (fe.appointment_id) {
            appointmentRevenueMap.set(fe.appointment_id, (appointmentRevenueMap.get(fe.appointment_id) || 0) + (Number(fe.amount) || 0))
        }
    }

    // Check if we have any linked entries
    const hasLinkedEntries = appointmentRevenueMap.size > 0

    // Strategy 2: Build map of doctor name fragment -> amount from description
    const descriptionRevenueMap = new Map<string, number>()
    if (!hasLinkedEntries && financialEntries && financialEntries.length > 0) {
        for (const fe of financialEntries || []) {
            const desc = (fe.description || '').trim()
            if (desc) {
                const nameFragment = desc.split(' - ')[0].trim().toLowerCase()
                descriptionRevenueMap.set(nameFragment, (descriptionRevenueMap.get(nameFragment) || 0) + (Number(fe.amount) || 0))
            }
        }
    }

    // Strategy 3 (FALLBACK): Use reimbursement rules when no financial_entries exist at all
    let rulesMap = new Map<string, any[]>()
    const noFinancialData = !financialEntries || financialEntries.length === 0
    if (noFinancialData) {
        const { data: rules } = await supabase
            .from('patient_reimbursement_rules')
            .select('patient_id, therapy_type, billing_amount')
            .eq('clinic_id', clinicId)
            .eq('is_active', true)

        for (const rule of rules || []) {
            if (!rulesMap.has(rule.patient_id)) rulesMap.set(rule.patient_id, [])
            rulesMap.get(rule.patient_id)!.push(rule)
        }
    }

    const result = (doctors as unknown as DoctorRecord[] || []).map((d) => {
        const appointments = d.appointments?.filter((a) =>
            a.appointment_date && a.appointment_date >= startDate && a.appointment_date <= endDate
        ) || []

        const completedAppointments = appointments.filter((a) => a.status === 'COMPLETED')

        let revenue = 0

        if (hasLinkedEntries) {
            // Strategy 1: Sum revenue from linked financial entries
            for (const appt of appointments) {
                revenue += appointmentRevenueMap.get(appt.id) || 0
            }
        } else if (descriptionRevenueMap.size > 0) {
            // Strategy 2: Match by doctor's first name in description
            const doctorFullName = (d.users?.full_name || '').toLowerCase()
            const doctorFirstName = doctorFullName.split(' ')[0]
            if (doctorFirstName) {
                revenue = descriptionRevenueMap.get(doctorFirstName) || 0
            }
        } else if (noFinancialData) {
            // Strategy 3: Calculate from reimbursement rules
            for (const appt of completedAppointments) {
                const patientRules = rulesMap.get((appt as any).patient_id)
                if (patientRules && patientRules.length > 0) {
                    const matchedRule = patientRules.find(
                        (r: any) => r.therapy_type?.toLowerCase() === ((appt as any).appointment_type || '').toLowerCase()
                    ) || patientRules[0]
                    revenue += Number(matchedRule.billing_amount) || 0
                }
            }
        }

        return {
            doctor_id: d.id,
            doctor_name: d.users?.full_name || 'N/A',
            specialty: d.specialty,
            total_appointments: appointments.length,
            completed_appointments: completedAppointments.length,
            total_revenue: revenue,
            average_ticket: completedAppointments.length > 0 ? revenue / completedAppointments.length : 0,
        }
    })

    // Sort by revenue descending
    result.sort((a, b) => b.total_revenue - a.total_revenue)

    return NextResponse.json({ data: result })
}

async function getAppointmentsByDay(supabase: SupabaseClient<any, "public", any>, clinicId: string, startDate: string, endDate: string) {
    const { data: appointments } = await supabase
        .from('appointments')
        .select('appointment_date, status')
        .eq('clinic_id', clinicId)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)

    // Group by date
    const grouped: Record<string, any> = {}
    for (const a of appointments || []) {
        const date = a.appointment_date
        if (!grouped[date]) {
            grouped[date] = { day: date, total: 0, completed: 0, cancelled: 0, no_show: 0 }
        }
        grouped[date].total++
        if (a.status === 'COMPLETED') grouped[date].completed++
        if (a.status === 'CANCELLED') grouped[date].cancelled++
        if (a.status === 'NO_SHOW') grouped[date].no_show++
    }

    const sortedData = Object.values(grouped).sort((a, b) => a.day.localeCompare(b.day))
    return NextResponse.json({ data: sortedData })
}

async function getAppointmentsByStatus(supabase: SupabaseClient<any, "public", any>, clinicId: string, startDate: string, endDate: string) {
    const { data: appointments } = await supabase
        .from('appointments')
        .select('status')
        .eq('clinic_id', clinicId)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)

    const statusCounts: Record<string, number> = {}
    for (const a of appointments || []) {
        statusCounts[a.status] = (statusCounts[a.status] || 0) + 1
    }

    const result = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        label: getStatusLabel(status),
    }))

    return NextResponse.json({ data: result })
}

async function getPatientsGrowth(supabase: SupabaseClient<any, "public", any>, clinicId: string, startDate: string, endDate: string) {
    const { data: patients } = await supabase
        .from('patients')
        .select('created_at')
        .eq('clinic_id', clinicId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .is('deleted_at', null)

    // Group by month
    const grouped: Record<string, number> = {}
    for (const p of patients || []) {
        const month = p.created_at.substring(0, 7) // YYYY-MM
        grouped[month] = (grouped[month] || 0) + 1
    }

    const result = Object.entries(grouped)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month))

    return NextResponse.json({ data: result })
}

async function getRevenueByMonth(supabase: SupabaseClient<any, "public", any>, clinicId: string, startDate: string, endDate: string) {
    const { data: payments } = await supabase
        .from('payments')
        .select('amount, paid_at')
        .eq('clinic_id', clinicId)
        .eq('status', 'PAID')
        .gte('paid_at', startDate)
        .lte('paid_at', endDate)

    // Group by month
    const grouped: Record<string, number> = {}
    for (const p of payments || []) {
        const month = p.paid_at?.substring(0, 7) || 'unknown'
        grouped[month] = (grouped[month] || 0) + parseFloat(p.amount)
    }

    const result = Object.entries(grouped)
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => a.month.localeCompare(b.month))

    return NextResponse.json({ data: result })
}

async function getTopSpecialties(supabase: SupabaseClient<any, "public", any>, clinicId: string, startDate: string, endDate: string) {
    const { data: appointments } = await supabase
        .from('appointments')
        .select('doctor_id, status, doctors(specialty)')
        .eq('clinic_id', clinicId)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)

    const grouped: Record<string, { count: number; completed: number }> = {}
    for (const a of appointments as unknown as AppointmentRecord[] || []) {
        const specialty = a.doctors?.specialty || 'Outros'
        if (!grouped[specialty]) {
            grouped[specialty] = { count: 0, completed: 0 }
        }
        grouped[specialty].count++
        if (a.status === 'COMPLETED') grouped[specialty].completed++
    }

    const result = Object.entries(grouped)
        .map(([specialty, data]) => ({ specialty, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

    return NextResponse.json({ data: result })
}

function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        'PENDING_PAYMENT': 'Aguardando Pagamento',
        'CONFIRMED': 'Confirmado',
        'COMPLETED': 'Concluído',
        'CANCELLED': 'Cancelado',
        'NO_SHOW': 'Não Compareceu',
    }
    return labels[status] || status
}

async function getHealthInsuranceStats(supabase: SupabaseClient<any, "public", any>, clinicId: string, startDate: string, endDate: string) {
    const { data: appointments } = await supabase
        .from('appointments')
        .select(`
            id,
            status,
            health_insurance_plan_id,
            health_insurance_plans (
                name,
                health_insurances (name)
            )
        `)
        .eq('clinic_id', clinicId)
        .eq('payment_type', 'HEALTH_INSURANCE')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)

    const stats: Record<string, {
        insuranceName: string,
        total: number,
        plans: Record<string, number>
    }> = {}

    for (const appt of appointments || []) {
        // @ts-ignore - Supabase types join inference can be tricky
        const rawPlan = appt.health_insurance_plans
        const plan = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan

        // @ts-ignore
        const rawInsurance = plan?.health_insurances
        const insurance = Array.isArray(rawInsurance) ? rawInsurance[0] : rawInsurance

        if (insurance && plan) {
            const insuranceName = insurance.name
            const planName = plan.name

            if (!stats[insuranceName]) {
                stats[insuranceName] = { insuranceName, total: 0, plans: {} }
            }

            stats[insuranceName].total++
            stats[insuranceName].plans[planName] = (stats[insuranceName].plans[planName] || 0) + 1
        }
    }

    const result = Object.values(stats).map(item => ({
        ...item,
        plans: Object.entries(item.plans).map(([name, count]) => ({ name, count }))
    })).sort((a, b) => b.total - a.total)

    return NextResponse.json({ data: result })
}

async function getAgendaReport(supabase: SupabaseClient<any, "public", any>, clinicId: string, startDate: string, endDate: string) {
    const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
            id,
            appointment_date,
            appointment_time,
            status,
            payment_type,
            appointment_type,
            patient_id,
            patients(id, full_name),
            doctors(id, specialty, users(full_name))
        `)
        .eq('clinic_id', clinicId)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })

    if (error) {
        console.error('Agenda report error:', error)
        return NextResponse.json({ error: 'Erro ao gerar relatório da agenda' }, { status: 500 })
    }

    // Get financial entries linked to appointments for revenue data
    const { data: financialEntries } = await supabase
        .from('financial_entries')
        .select('amount, appointment_id, status')
        .eq('clinic_id', clinicId)
        .eq('entry_type', 'INCOME')
        .gte('due_date', startDate)
        .lte('due_date', endDate)

    // Build appointment -> amount map
    const appointmentAmountMap = new Map<string, { amount: number; status: string }>()
    for (const fe of financialEntries || []) {
        if (fe.appointment_id) {
            const existing = appointmentAmountMap.get(fe.appointment_id)
            appointmentAmountMap.set(fe.appointment_id, {
                amount: (existing?.amount || 0) + (Number(fe.amount) || 0),
                status: fe.status || existing?.status || 'N/A'
            })
        }
    }

    // Check if we have ANY linked entries - if not, use reimbursement rules as fallback
    const hasLinkedEntries = appointmentAmountMap.size > 0
    let rulesMap = new Map<string, any[]>()
    if (!hasLinkedEntries) {
        const { data: rules } = await supabase
            .from('patient_reimbursement_rules')
            .select('patient_id, therapy_type, billing_amount')
            .eq('clinic_id', clinicId)
            .eq('is_active', true)

        for (const rule of rules || []) {
            if (!rulesMap.has(rule.patient_id)) rulesMap.set(rule.patient_id, [])
            rulesMap.get(rule.patient_id)!.push(rule)
        }
    }

    const entries = (appointments || []).map((appt: any) => {
        const patient = Array.isArray(appt.patients) ? appt.patients[0] : appt.patients
        const doctor = Array.isArray(appt.doctors) ? appt.doctors[0] : appt.doctors
        const doctorUser = doctor?.users ? (Array.isArray(doctor.users) ? doctor.users[0] : doctor.users) : null
        const financialInfo = appointmentAmountMap.get(appt.id)

        // Calculate payment amount: first try financial_entries, then fallback to reimbursement rules
        let paymentAmount = financialInfo?.amount || 0
        let paymentStatus = financialInfo?.status || 'N/A'

        if (paymentAmount === 0 && appt.status === 'COMPLETED' && !hasLinkedEntries) {
            const patientRules = rulesMap.get(appt.patient_id)
            if (patientRules && patientRules.length > 0) {
                const matchedRule = patientRules.find(
                    (r: any) => r.therapy_type?.toLowerCase() === (appt.appointment_type || '').toLowerCase()
                ) || patientRules[0]
                paymentAmount = Number(matchedRule.billing_amount) || 0
                paymentStatus = 'ESTIMATED'
            }
        }

        return {
            id: appt.id,
            date: appt.appointment_date,
            start_time: appt.appointment_time,
            end_time: null,
            status: appt.status,
            status_label: getStatusLabel(appt.status),
            payment_type: appt.payment_type || 'N/A',
            patient_name: patient?.full_name || 'N/A',
            doctor_name: doctorUser?.full_name || 'N/A',
            specialty: doctor?.specialty || 'N/A',
            payment_amount: paymentAmount,
            payment_status: paymentStatus,
        }
    })

    const totalAppointments = entries.length
    const completed = entries.filter((e: any) => e.status === 'COMPLETED').length
    const cancelled = entries.filter((e: any) => e.status === 'CANCELLED').length
    const noShow = entries.filter((e: any) => e.status === 'NO_SHOW').length
    const totalRevenue = entries.reduce((sum: number, e: any) => sum + e.payment_amount, 0)

    return NextResponse.json({
        data: entries,
        summary: {
            total: totalAppointments,
            completed,
            cancelled,
            no_show: noShow,
            total_revenue: totalRevenue,
        }
    })
}

async function getReimbursementReport(supabase: SupabaseClient<any, "public", any>, clinicId: string, startDate: string, endDate: string) {
    const { data: rules } = await supabase
        .from('patient_reimbursement_rules')
        .select('*, patients(id, full_name)')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)

    const { data: appointments } = await supabase
        .from('appointments')
        .select(`
            id,
            appointment_date,
            status,
            patient_id,
            patients(id, full_name),
            doctors(id, specialty, users(full_name))
        `)
        .eq('clinic_id', clinicId)
        .eq('status', 'COMPLETED')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .order('appointment_date', { ascending: true })

    // Cross-reference appointments with reimbursement rules
    const rulesMap = new Map<string, any[]>()
    for (const rule of rules || []) {
        const key = rule.patient_id
        if (!rulesMap.has(key)) rulesMap.set(key, [])
        rulesMap.get(key)!.push(rule)
    }

    const entries: any[] = []
    let totalBilling = 0
    let totalReimbursement = 0
    let totalGuides = 0

    for (const appt of appointments || []) {
        const patientRules = rulesMap.get(appt.patient_id) || []
        const patient = Array.isArray(appt.patients) ? appt.patients[0] : appt.patients
        const doctor = Array.isArray(appt.doctors) ? appt.doctors[0] : appt.doctors
        const doctorUser = doctor?.users ? (Array.isArray(doctor.users) ? doctor.users[0] : doctor.users) : null

        if (patientRules.length > 0) {
            for (const rule of patientRules) {
                const billingAmount = parseFloat(rule.billing_amount) || 0
                const reimbursementAmount = parseFloat(rule.reimbursement_amount) || 0
                const guidesCount = rule.guides_per_session || 1

                totalBilling += billingAmount
                totalReimbursement += reimbursementAmount * guidesCount
                totalGuides += guidesCount

                entries.push({
                    appointment_id: appt.id,
                    date: appt.appointment_date,
                    patient_name: patient?.full_name || 'N/A',
                    doctor_name: doctorUser?.full_name || 'N/A',
                    specialty: doctor?.specialty || 'N/A',
                    therapy_type: rule.therapy_type,
                    billing_therapy_type: rule.billing_therapy_type || rule.therapy_type,
                    billing_amount: billingAmount,
                    reimbursement_amount: reimbursementAmount,
                    guides_per_session: guidesCount,
                    total_reimbursement: reimbursementAmount * guidesCount,
                    session_duration: rule.actual_session_duration,
                    guide_duration: rule.guide_session_duration,
                    notes: rule.notes,
                })
            }
        }
    }

    // Group by patient for summary
    const patientSummary: Record<string, { name: string, sessions: number, billing: number, reimbursement: number, guides: number }> = {}
    for (const entry of entries) {
        if (!patientSummary[entry.patient_name]) {
            patientSummary[entry.patient_name] = { name: entry.patient_name, sessions: 0, billing: 0, reimbursement: 0, guides: 0 }
        }
        patientSummary[entry.patient_name].sessions++
        patientSummary[entry.patient_name].billing += entry.billing_amount
        patientSummary[entry.patient_name].reimbursement += entry.total_reimbursement
        patientSummary[entry.patient_name].guides += entry.guides_per_session
    }

    return NextResponse.json({
        data: entries,
        patient_summary: Object.values(patientSummary).sort((a, b) => b.reimbursement - a.reimbursement),
        summary: {
            total_appointments: entries.length,
            total_billing: totalBilling,
            total_reimbursement: totalReimbursement,
            total_guides: totalGuides,
            patients_with_rules: rulesMap.size,
        }
    })
}

// ==========================================
// RELATÓRIO DE FREQUÊNCIA DO PACIENTE
// ==========================================
async function getPatientFrequency(
    supabase: SupabaseClient<any, "public", any>,
    clinicId: string,
    startDate: string,
    endDate: string,
    patientId: string | null
) {
    let query = supabase
        .from('appointments')
        .select(`
            id, status, appointment_date, appointment_time,
            patients(id, full_name),
            doctors(id, specialty, users(full_name))
        `)
        .eq('clinic_id', clinicId)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .order('appointment_date', { ascending: false })

    if (patientId) query = query.eq('patient_id', patientId)

    const { data: appointments, error } = await query
    if (error) throw error

    // Group by patient
    const patientStats: Record<string, {
        patient_name: string, patient_id: string,
        total: number, completed: number, no_show: number, cancelled: number, pending: number,
        attendance_rate: number, professional: string
    }> = {}

    for (const apt of (appointments || [])) {
        const p = Array.isArray(apt.patients) ? apt.patients[0] : apt.patients
        const d = Array.isArray(apt.doctors) ? apt.doctors[0] : apt.doctors
        const pName = p?.full_name || 'N/A'
        const pId = p?.id || 'unknown'
        const dUser = d?.users ? (Array.isArray(d.users) ? d.users[0] : d.users) : null

        if (!patientStats[pId]) {
            patientStats[pId] = {
                patient_name: pName, patient_id: pId,
                total: 0, completed: 0, no_show: 0, cancelled: 0, pending: 0,
                attendance_rate: 0, professional: dUser?.full_name || d?.specialty || 'N/A'
            }
        }

        patientStats[pId].total++
        const status = (apt.status || '').toUpperCase()
        if (status === 'COMPLETED' || status === 'CONFIRMED') patientStats[pId].completed++
        else if (status === 'NO_SHOW') patientStats[pId].no_show++
        else if (status === 'CANCELLED') patientStats[pId].cancelled++
        else patientStats[pId].pending++
    }

    // Calc attendance rate
    const stats = Object.values(patientStats).map(s => ({
        ...s,
        attendance_rate: s.total > 0 ? Math.round(((s.completed) / s.total) * 100) : 0
    }))

    const totalAll = stats.reduce((s, p) => s + p.total, 0)
    const completedAll = stats.reduce((s, p) => s + p.completed, 0)
    const noShowAll = stats.reduce((s, p) => s + p.no_show, 0)

    return NextResponse.json({
        data: stats.sort((a, b) => a.attendance_rate - b.attendance_rate),
        summary: {
            total_appointments: totalAll,
            total_completed: completedAll,
            total_no_show: noShowAll,
            overall_attendance_rate: totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0,
            total_patients: stats.length,
        }
    })
}

// ==========================================
// RELATÓRIO DE SESSÕES POR PACIENTE
// ==========================================
async function getPatientSessions(
    supabase: SupabaseClient<any, "public", any>,
    clinicId: string,
    startDate: string,
    endDate: string,
    patientId: string | null
) {
    let query = supabase
        .from('appointments')
        .select(`
            id, status, appointment_date, appointment_time, appointment_type, waiting_room_notes,
            patients(id, full_name, cpf, date_of_birth),
            doctors(id, specialty, users(full_name)),
            health_insurance_plans(name)
        `)
        .eq('clinic_id', clinicId)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .order('appointment_date', { ascending: true })

    if (patientId) query = query.eq('patient_id', patientId)

    const { data, error } = await query
    if (error) throw error

    const sessions = (data || []).map(apt => {
        const p = Array.isArray(apt.patients) ? apt.patients[0] : apt.patients
        const d = Array.isArray(apt.doctors) ? apt.doctors[0] : apt.doctors
        const dUser = d?.users ? (Array.isArray(d.users) ? d.users[0] : d.users) : null
        const hip = Array.isArray(apt.health_insurance_plans) ? apt.health_insurance_plans[0] : apt.health_insurance_plans

        return {
            id: apt.id,
            date: apt.appointment_date,
            start_time: apt.appointment_time,
            end_time: null,
            status: apt.status,
            therapy_type: apt.appointment_type || 'N/A',
            patient_name: p?.full_name || 'N/A',
            patient_id: p?.id,
            professional: dUser?.full_name || 'N/A',
            specialty: d?.specialty || 'N/A',
            insurance: hip?.name || 'Particular',
            notes: apt.waiting_room_notes || '',
        }
    })

    return NextResponse.json({
        data: sessions,
        summary: {
            total_sessions: sessions.length,
            completed: sessions.filter(s => s.status === 'COMPLETED' || s.status === 'CONFIRMED').length,
            no_show: sessions.filter(s => s.status === 'NO_SHOW').length,
            cancelled: sessions.filter(s => s.status === 'CANCELLED').length,
        }
    })
}
