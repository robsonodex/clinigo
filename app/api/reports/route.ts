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

            default:
                return NextResponse.json({ error: 'Tipo de relatório inválido' }, { status: 400 })
        }
    } catch (error) {
        console.error('Reports error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

async function getKPIs(supabase: SupabaseClient<any, "public", any>, clinicId: string, startDate: string, endDate: string) {
    // Call the database function
    // TODO: Fix strict RPC typing inference
    const { data, error } = await (supabase as any).rpc('get_clinic_kpis', {
        p_clinic_id: clinicId,
        p_start_date: startDate,
        p_end_date: endDate,
    })

    if (error) {
        console.error('KPIs error:', error)
        // Fallback to manual calculation if function doesn't exist yet
        return await getKPIsManual(supabase, clinicId, startDate, endDate)
    }

    return NextResponse.json({ kpis: data?.[0] || {} })
}

async function getKPIsManual(supabase: SupabaseClient<Database>, clinicId: string, startDate: string, endDate: string) {
    // Get appointment stats
    const { data: appointments } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('clinic_id', clinicId)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)

    const total = appointments?.length || 0
    const completed = appointments?.filter((a: AppointmentRecord) => a.status === 'COMPLETED').length || 0
    const cancelled = appointments?.filter((a: AppointmentRecord) => a.status === 'CANCELLED').length || 0
    const noShow = appointments?.filter((a: AppointmentRecord) => a.status === 'NO_SHOW').length || 0

    // Get revenue
    const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('clinic_id', clinicId)
        .eq('status', 'PAID')
        .gte('paid_at', startDate)
        .lte('paid_at', endDate)

    const totalRevenue = payments?.reduce((sum: number, p: { amount: any }) => sum + parseFloat(p.amount), 0) || 0

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

async function getRevenueByDoctor(supabase: SupabaseClient<any, "public", any>, clinicId: string, startDate: string, endDate: string) {
    // TODO: Fix strict RPC typing inference
    const { data: revenueData, error } = await (supabase as any).rpc('get_revenue_by_doctor', {
        p_clinic_id: clinicId,
        p_start_date: startDate,
        p_end_date: endDate,
    })

    if (error) {
        console.error('Revenue by doctor error:', error)
        // Fallback query
        const { data: doctors } = await supabase
            .from('doctors')
            .select(`
        id,
        specialty,
        users(full_name),
        appointments(
          id,
          status,
          payments(amount, status)
        )
      `)
            .eq('clinic_id', clinicId)

        const result = (doctors as unknown as DoctorRecord[] || []).map((d) => {
            const appointments = d.appointments?.filter((a) =>
                a.appointment_date && a.appointment_date >= startDate && a.appointment_date <= endDate
            ) || []

            const revenue = appointments
                .flatMap((a) => a.payments || [])
                .filter((p) => p.status === 'PAID')
                .reduce((sum: number, p) => sum + parseFloat(p.amount as unknown as string), 0)

            return {
                doctor_id: d.id,
                doctor_name: d.users?.full_name || 'N/A',
                specialty: d.specialty,
                total_appointments: appointments.length,
                completed_appointments: appointments.filter((a) => a.status === 'COMPLETED').length,
                total_revenue: revenue,
                average_ticket: appointments.length > 0 ? revenue / appointments.length : 0,
            }
        })

        return NextResponse.json({ data: result })
    }

    return NextResponse.json({ data: revenueData })
}

async function getAppointmentsByDay(supabase: SupabaseClient<any, "public", any>, clinicId: string, startDate: string, endDate: string) {
    // TODO: Fix strict RPC typing inference
    const { data: dailyData, error } = await (supabase as any).rpc('get_appointments_by_day', {
        p_clinic_id: clinicId,
        p_start_date: startDate,
        p_end_date: endDate,
    })

    if (error) {
        console.error('Appointments by day error:', error)
        // Fallback: raw query
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

    return NextResponse.json({ data: dailyData })
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

