import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface MedicalRecordRow {
    id: string
    patient_id: string
    doctor_id: string
    diagnosis: string | null
    prescription: string | null
    follow_up_instructions: string | null
    treatment_plan: string | null
    created_at: string
    patient?: { full_name: string; email: string | null } | null
}

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'No clinic found' }, { status: 404 })
        }

        try {
            // Fetch prescriptions/medical records
            const { data: prescriptions, error } = await supabase
                .from('medical_records')
                .select(`
                    id,
                    patient_id,
                    doctor_id,
                    diagnosis,
                    prescription,
                    follow_up_instructions,
                    treatment_plan,
                    created_at,
                    patient:patients(full_name, email)
                `)
                .eq('clinic_id', profile.clinic_id)
                .not('prescription', 'is', null)
                .order('created_at', { ascending: false })
                .limit(50) as { data: MedicalRecordRow[] | null, error: unknown }

            if (error) {
                console.error('Prescriptions fetch error:', error)
                return NextResponse.json({ data: [] })
            }

            // Transform data for frontend
            const formattedPrescriptions = (prescriptions || []).map(p => ({
                id: p.id,
                patient_name: (p.patient as any)?.full_name || 'Paciente',
                patient_email: (p.patient as any)?.email || '',
                date: p.created_at?.split('T')[0] || '',
                medications: parsePrescription(p.prescription),
                notes: p.follow_up_instructions || p.treatment_plan || null,
                is_sent: true,
            }))

            return NextResponse.json({ data: formattedPrescriptions })
        } catch (_catchErr) {
        request.log.error('prescriptions', { error: _catchErr instanceof Error ? _catchErr.message : String(_catchErr) })
            return NextResponse.json({ data: [] })
        }
    } catch (error) {
        request.log.error('prescriptions', { error: error instanceof Error ? error.message : String(error) })
        console.error('Prescriptions API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
})

export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'No clinic found' }, { status: 404 })
        }

        const body = await request.json()
        const { patient_id, doctor_id, prescription, diagnosis, notes } = body

        try {
            const { data, error } = await supabase
                .from('medical_records')
                .insert({
                    clinic_id: profile.clinic_id,
                    patient_id,
                    doctor_id,
                    prescription,
                    diagnosis: diagnosis || null,
                    follow_up_instructions: notes || null,
                } as Record<string, unknown>)
                .select()
                .single()

            if (error) {
                console.error('Prescription insert error:', error)
                return NextResponse.json({ error: 'Failed to create prescription' }, { status: 500 })
            }

            return NextResponse.json({ data, success: true })
        } catch (_catchErr) {
        request.log.error('prescriptions', { error: _catchErr instanceof Error ? _catchErr.message : String(_catchErr) })
            return NextResponse.json({ error: 'Table not available' }, { status: 500 })
        }
    } catch (error) {
        request.log.error('prescriptions', { error: error instanceof Error ? error.message : String(error) })
        console.error('Prescription create error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
})

// Parse prescription text into medication objects
function parsePrescription(prescription: string | null): Array<{
    name: string
    dosage: string
    frequency: string
    duration: string
}> {
    if (!prescription) return []

    // Try to parse if it's JSON
    try {
        const parsed = JSON.parse(prescription)
        if (Array.isArray(parsed)) return parsed
    } catch {
        // If not JSON, return as single medication
        return [{
            name: prescription,
            dosage: '',
            frequency: '',
            duration: '',
        }]
    }

    return []
}
