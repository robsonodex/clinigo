import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/financial/dashboard
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get clinic ID
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = profile?.clinic_id

        if (!clinicId) {
            return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
        }

        const today = new Date()
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const todayStr = today.toISOString().split('T')[0]
        const startOfMonthStr = startOfMonth.toISOString().split('T')[0]

        // Revenue today from financial_entries
        const { data: todayRevenue } = await supabase
            .from('financial_entries')
            .select('amount')
            .eq('clinic_id', clinicId)
            .eq('entry_type', 'INCOME')
            .gte('due_date', todayStr)
            .is('cancelled_at', null)

        let revenueToday = todayRevenue?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0

        // Revenue this month from financial_entries
        const { data: monthRevenue } = await supabase
            .from('financial_entries')
            .select('amount')
            .eq('clinic_id', clinicId)
            .eq('entry_type', 'INCOME')
            .gte('due_date', startOfMonthStr)
            .is('cancelled_at', null)

        let revenueMonth = monthRevenue?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0

        // FALLBACK: If no financial_entries this month, calculate from reimbursement rules
        if (revenueMonth === 0) {
            const { data: completedAppts } = await supabase
                .from('appointments')
                .select('id, patient_id, appointment_type, appointment_date')
                .eq('clinic_id', clinicId)
                .eq('status', 'COMPLETED')
                .gte('appointment_date', startOfMonthStr)
                .lte('appointment_date', todayStr)

            if (completedAppts && completedAppts.length > 0) {
                const { data: rules } = await supabase
                    .from('patient_reimbursement_rules')
                    .select('patient_id, therapy_type, billing_amount')
                    .eq('clinic_id', clinicId)
                    .eq('is_active', true)

                if (rules && rules.length > 0) {
                    const rulesMap = new Map<string, any[]>()
                    for (const rule of rules) {
                        if (!rulesMap.has(rule.patient_id)) rulesMap.set(rule.patient_id, [])
                        rulesMap.get(rule.patient_id)!.push(rule)
                    }

                    for (const appt of completedAppts) {
                        const patientRules = rulesMap.get(appt.patient_id)
                        if (patientRules && patientRules.length > 0) {
                            const matchedRule = patientRules.find(
                                (r: any) => r.therapy_type?.toLowerCase() === (appt.appointment_type || '').toLowerCase()
                            ) || patientRules[0]
                            const amount = Number(matchedRule.billing_amount) || 0
                            revenueMonth += amount
                            if (appt.appointment_date === todayStr) {
                                revenueToday += amount
                            }
                        }
                    }
                }
            }
        }

        // Pending (appointments without payment)
        const { count: pendingCount } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .eq('status', 'COMPLETED')
            .is('payment_status', null)

        // Revenue by payment method (this month)
        const { data: byMethod } = await supabase
            .from('financial_entries')
            .select('payment_method, amount')
            .eq('clinic_id', clinicId)
            .eq('entry_type', 'INCOME')
            .gte('due_date', startOfMonthStr)
            .is('cancelled_at', null)

        const revenueByMethod = byMethod?.reduce((acc, entry) => {
            const method = entry.payment_method || 'other'
            acc[method] = (acc[method] || 0) + Number(entry.amount)
            return acc
        }, {} as Record<string, number>)

        return NextResponse.json({
            revenueToday,
            revenueMonth,
            pendingCount: pendingCount || 0,
            revenueByMethod: revenueByMethod || {}
        })
    } catch (error) {
        console.error('Error in financial dashboard API:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
