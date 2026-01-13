/**
 * Medical Records API
 * GET /api/medical-records - List medical records for clinic
 * POST /api/medical-records - Create new medical record
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse } from '@/lib/utils/responses'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Get user info from headers (set by middleware)
        const userId = request.headers.get('x-user-id')
        const clinicId = request.headers.get('x-clinic-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId || !clinicId) {
            return errorResponse('Unauthorized', 401)
        }

        // Build query
        let query = supabase
            .from('consultations')
            .select(`
                id,
                consultation_date,
                chief_complaint,
                diagnosis,
                prescription,
                is_signed,
                created_at,
                patient:patients!inner(
                    id,
                    full_name
                ),
                doctor:doctors!inner(
                    id,
                    specialty,
                    user:users!inner(
                        full_name
                    )
                ),
                appointment:appointments(
                    id,
                    appointment_date,
                    appointment_time
                )
            `)
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })
            .limit(100)

        const { data: consultations, error } = await query

        if (error) {
            console.error('Error fetching medical records:', error)
            return errorResponse('Failed to fetch medical records', 500)
        }

        // Transform data to match frontend interface
        const records = (consultations || []).map((c: any) => ({
            id: c.id,
            appointment_id: c.appointment?.id, // Added appointment_id for navigation
            patient_name: c.patient?.full_name || 'Unknown',
            doctor_name: c.doctor?.user?.full_name || 'Unknown',
            specialty: c.doctor?.specialty || 'General',
            date: c.appointment?.appointment_date || c.consultation_date || c.created_at,
            chief_complaint: c.chief_complaint,
            is_signed: c.is_signed || false,
            created_at: c.created_at,
        }))

        return successResponse({
            records,
            total: records.length,
        })

    } catch (error) {
        console.error('Medical records API error:', error)
        return errorResponse('Internal server error', 500)
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const userId = request.headers.get('x-user-id')
        const clinicId = request.headers.get('x-clinic-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId || !clinicId) {
            return errorResponse('Unauthorized', 401)
        }

        // Only doctors can create medical records
        if (userRole !== 'DOCTOR') {
            return errorResponse('Only doctors can create medical records', 403)
        }

        const body = await request.json()
        const {
            appointment_id,
            patient_id,
            chief_complaint,
            history,
            physical_exam,
            diagnosis,
            prescription,
            notes,
        } = body

        if (!appointment_id || !patient_id) {
            return errorResponse('appointment_id and patient_id are required', 400)
        }

        // Get doctor_id from user
        const { data: doctor } = await supabase
            .from('doctors')
            .select('id')
            .eq('user_id', userId)
            .single()

        if (!doctor) {
            return errorResponse('Doctor profile not found', 404)
        }

        // Create/update consultation record
        const { data: consultation, error: consultationError } = await supabase
            .from('consultations')
            .upsert({
                appointment_id,
                patient_id,
                doctor_id: doctor.id,
                clinic_id: clinicId,
                chief_complaint,
                history,
                physical_exam,
                diagnosis,
                prescription,
                notes,
                consultation_date: new Date().toISOString().split('T')[0],
                is_signed: false,
                created_at: new Date().toISOString(),
            })
            .select()
            .single()

        if (consultationError) {
            console.error('Error creating consultation:', consultationError)
            return errorResponse('Failed to create medical record', 500)
        }

        return successResponse({
            message: 'Medical record created successfully',
            record: consultation,
        }, 201)

    } catch (error) {
        console.error('Create medical record error:', error)
        return errorResponse('Internal server error', 500)
    }
}
