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
            return errorResponse('Unauthorized', { status: 401 })
        }

        // Build query - Filter by clinic_id for security
        let query = supabase
            .from('medical_records')
            .select(`
                id,
                created_at,
                chief_complaint,
                diagnosis,
                treatment_plan,
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

        // DOCTOR não-coordenador: filtrar apenas prontuários do próprio doctor
        if (userRole === 'DOCTOR') {
            const supabaseAuth = await createClient()
            const { data: userFull } = await supabaseAuth
                .from('users')
                .select('is_coordinator')
                .eq('id', userId)
                .single()

            if (!(userFull as any)?.is_coordinator) {
                const { data: doctor } = await supabaseAuth
                    .from('doctors')
                    .select('id')
                    .eq('user_id', userId)
                    .single()

                if (doctor) {
                    query = query.eq('doctor_id', doctor.id)
                }
            }
        }

        const { data: records, error } = await query

        // DEBUG: Log query results
        console.log('[DEBUG medical-records] clinicId:', clinicId)
        console.log('[DEBUG medical-records] userId:', userId)
        console.log('[DEBUG medical-records] records count:', records?.length || 0)
        console.log('[DEBUG medical-records] error:', error)

        if (error) {
            console.error('Error fetching medical records:', error)
            return errorResponse(`Failed to fetch medical records: ${error.message} (${error.details}, ${error.hint})`, { status: 500 })
        }

        // Transform data to match frontend interface
        const transformedRecords = (records || []).map((c: any) => ({
            id: c.id,
            appointment_id: c.appointment?.id,
            patient_name: c.patient?.full_name || 'Unknown',
            doctor_name: c.doctor?.user?.full_name || 'Unknown',
            specialty: c.doctor?.specialty || 'General',
            date: c.appointment?.appointment_date || c.created_at,
            chief_complaint: c.chief_complaint,
            is_signed: false, // medical_records table might not have is_signed yet, default to false
            created_at: c.created_at,
        }))

        return successResponse({
            records: transformedRecords,
            total: transformedRecords.length,
        })

    } catch (error) {
        console.error('Medical records API error:', error)
        return errorResponse('Internal server error', { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const userId = request.headers.get('x-user-id')
        const clinicId = request.headers.get('x-clinic-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId || !clinicId) {
            return errorResponse('Unauthorized', { status: 401 })
        }

        // Only doctors and clinic admins can create medical records
        if (userRole !== 'DOCTOR' && userRole !== 'CLINIC_ADMIN') {
            return errorResponse('Only doctors and admins can create medical records', { status: 403 })
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
            return errorResponse('appointment_id and patient_id are required', { status: 400 })
        }

        // Get doctor_id from user
        const { data: doctor } = await supabase
            .from('doctors')
            .select('id')
            .eq('user_id', userId)
            .single()

        if (!doctor) {
            return errorResponse('Doctor profile not found', { status: 404 })
        }

        // Create/update medical record
        // Note: Using medical_records table. Mapping prescription to treatment_plan if needed.
        const { data: medicalRecord, error: recordError } = await supabase
            .from('medical_records')
            .upsert({
                appointment_id,
                patient_id,
                clinic_id: clinicId, // Fixed variable reference
                doctor_id: doctor.id,
                chief_complaint,
                present_illness: history, // Mapping history to present_illness
                physical_exam,
                diagnosis: diagnosis, // Correct column name in DB
                treatment_plan: prescription, // Mapping prescription to treatment_plan
                // notes field might need to go somewhere? medical_records usually has notes or observations.
                // If the table strictly follows [id]/medical-records route fields:
                // fields: chief_complaint, present_illness, diagnosis, treatment_plan
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (recordError) {
            console.error('Error creating medical record:', recordError)
            return errorResponse('Failed to create medical record', { status: 500 })
        }

        return successResponse({
            message: 'Medical record created successfully',
            record: medicalRecord,
        }, { status: 201 })

    } catch (error) {
        console.error('Create medical record error:', error)
        return errorResponse('Internal server error', { status: 500 })
    }
}
