/**
 * Individual Medical Record API
 * GET /api/medical-records/[id] - Get specific record
 * PATCH /api/medical-records/[id] - Update/sign record
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse } from '@/lib/utils/responses'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()

        const userId = request.headers.get('x-user-id')
        const clinicId = request.headers.get('x-clinic-id')

        if (!userId || !clinicId) {
            return errorResponse('Unauthorized', 401)
        }

        const { data: consultation, error } = await supabase
            .from('consultations')
            .select(`
                *,
                patient:patients(
                    id,
                    full_name,
                    date_of_birth,
                    allergies,
                    medical_history
                ),
                doctor:doctors(
                    id,
                    specialty,
                    crm,
                    user:users(
                        full_name
                    )
                )
            `)
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .single()

        if (error || !consultation) {
            return errorResponse('Medical record not found', 404)
        }

        return successResponse({ record: consultation })

    } catch (error) {
        console.error('Get medical record error:', error)
        return errorResponse('Internal server error', 500)
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()

        const userId = request.headers.get('x-user-id')
        const clinicId = request.headers.get('x-clinic-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId || !clinicId) {
            return errorResponse('Unauthorized', 401)
        }

        if (userRole !== 'DOCTOR') {
            return errorResponse('Only doctors can update medical records', 403)
        }

        const body = await request.json()
        const updates: any = {}

        // Allow updating these fields
        if (body.chief_complaint !== undefined) updates.chief_complaint = body.chief_complaint
        if (body.history !== undefined) updates.history = body.history
        if (body.physical_exam !== undefined) updates.physical_exam = body.physical_exam
        if (body.diagnosis !== undefined) updates.diagnosis = body.diagnosis
        if (body.prescription !== undefined) updates.prescription = body.prescription
        if (body.notes !== undefined) updates.notes = body.notes

        // Sign record
        if (body.sign === true) {
            updates.is_signed = true
            updates.signed_at = new Date().toISOString()
            updates.signed_by = userId
        }

        const { data: consultation, error } = await supabase
            .from('consultations')
            .update(updates)
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .select()
            .single()

        if (error) {
            console.error('Error updating medical record:', error)
            return errorResponse('Failed to update medical record', 500)
        }

        return successResponse({
            message: 'Medical record updated successfully',
            record: consultation,
        })

    } catch (error) {
        console.error('Update medical record error:', error)
        return errorResponse('Internal server error', 500)
    }
}
