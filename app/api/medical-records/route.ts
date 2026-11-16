import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
/**
 * Medical Records API
 * GET /api/medical-records - List medical records for clinic
 * POST /api/medical-records - Create new medical record
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse } from '@/lib/utils/responses'

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()

        let userId = request.headers.get('x-user-id')
        let clinicId = request.headers.get('x-clinic-id')
        let userRole = request.headers.get('x-user-role')

        if (!userId || !clinicId) {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                return errorResponse('Unauthorized', { status: 401 })
            }
            userId = user.id
            const { data: profile } = await supabase
                .from('users')
                .select('clinic_id, role')
                .eq('id', user.id)
                .maybeSingle()
            clinicId = clinicId || profile?.clinic_id || (user.user_metadata as any)?.clinic_id
            userRole = userRole || profile?.role || (user.user_metadata as any)?.role
        }

        if (!userId) {
            return errorResponse('Unauthorized', { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const search = (searchParams.get('search') || '').trim()
        const patientIdParam = (searchParams.get('patient_id') || '').trim()
        const limitParam = Number(searchParams.get('limit'))
        const queryLimit = Number.isFinite(limitParam) && limitParam > 0
            ? Math.min(limitParam, 500)
            : (search || patientIdParam ? 200 : 100)

        // Build query - Filter by clinic_id for security
        let query = supabase
            .from('medical_records')
            .select(`
                id,
                patient_id,
                created_at,
                chief_complaint,
                diagnosis,
                treatment_plan,
                signed_by_patient,
                signed_at,
                signature_url,
                patient:patients(
                    id,
                    full_name
                ),
                doctor:doctors(
                    id,
                    specialty,
                    user:users(
                        full_name
                    )
                ),
                appointment:appointments(
                    id,
                    appointment_date,
                    appointment_time
                )
            `)

        if (clinicId && userRole !== 'SUPER_ADMIN') {
            query = query.eq('clinic_id', clinicId)
        }

        if (patientIdParam) {
            query = query.eq('patient_id', patientIdParam)
        } else if (search) {
            let patientSearchQuery = supabase
                .from('patients')
                .select('id')
                .ilike('full_name', `%${search}%`)
                .limit(100)

            if (clinicId && userRole !== 'SUPER_ADMIN') {
                patientSearchQuery = patientSearchQuery.eq('clinic_id', clinicId)
            }

            const { data: matchedPatients, error: patientSearchError } = await patientSearchQuery
            if (patientSearchError) {
                console.error('Error searching patients for medical records:', patientSearchError)
                return errorResponse(`Failed to search patients: ${patientSearchError.message}`, { status: 500 })
            }

            const matchedPatientIds = (matchedPatients || []).map((p: any) => p.id).filter(Boolean)
            if (matchedPatientIds.length === 0) {
                return successResponse({
                    records: [],
                    total: 0,
                })
            }

            query = query.in('patient_id', matchedPatientIds)
        }

        query = query.order('created_at', { ascending: false }).limit(queryLimit)

        // DOCTOR não-coordenador: filtrar apenas prontuários do próprio doctor
        if (userRole === 'DOCTOR') {
            const { data: userFull } = await supabase
                .from('users')
                .select('is_coordinator')
                .eq('id', userId)
                .maybeSingle()

            if (!(userFull as any)?.is_coordinator) {
                const { data: doctor } = await supabase
                    .from('doctors')
                    .select('id')
                    .eq('user_id', userId)
                    .maybeSingle()

                if (doctor) {
                    query = query.eq('doctor_id', doctor.id)
                }
            }
        }

        const { data: records, error } = await query

        if (error) {
            console.error('Error fetching medical records:', error)
            return errorResponse(`Failed to fetch medical records: ${error.message} (${error.details}, ${error.hint})`, { status: 500 })
        }

        // Transform data to match frontend interface
        const transformedRecords = (records || []).map((c: any) => ({
            id: c.id,
            patient_id: c.patient?.id || c.patient_id || null,
            appointment_id: c.appointment?.id,
            patient_name: c.patient?.full_name || 'Unknown',
            doctor_name: c.doctor?.user?.full_name || 'Unknown',
            specialty: c.doctor?.specialty || 'General',
            date: c.appointment?.appointment_date || c.created_at,
            chief_complaint: c.chief_complaint,
            is_signed: c.signed_by_patient || false,
            signed_at: c.signed_at || null,
            signature_url: c.signature_url || null,
            created_at: c.created_at,
        }))

        return successResponse({
            records: transformedRecords,
            total: transformedRecords.length,
        })

    } catch (error) {
        request.log.error('medical-records', { error: error instanceof Error ? error.message : String(error) })
        console.error('Medical records API error:', error)
        return errorResponse('Internal server error', { status: 500 })
    }
})

export const POST = withAxiom(async (request: AxiomRequest) => {
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
        request.log.error('medical-records', { error: error instanceof Error ? error.message : String(error) })
        console.error('Create medical record error:', error)
        return errorResponse('Internal server error', { status: 500 })
    }
})
