import { type NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { preCheckinSchema } from '@/lib/validations/pre-checkin'
import { handleApiError, ValidationError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import jwt from 'jsonwebtoken'

export const runtime = 'nodejs'

// Secret key for JWT signing
const JWT_SECRET = process.env.CHECKIN_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'clinigo-checkin-secret-2026'

/**
 * Generate JWT token for QR Code
 */
function generateCheckinToken(payload: {
    appointment_id: string
    clinic_id: string
    patient_id?: string
}): string {
    return jwt.sign(
        {
            ...payload,
            type: 'clinigo_checkin',
            version: '1.0',
        },
        JWT_SECRET,
        {
            expiresIn: '2h', // Token expires in 2 hours
            issuer: 'clinigo',
            audience: 'checkin',
        }
    )
}

/**
 * Verify JWT token
 */
export function verifyCheckinToken(token: string): {
    valid: boolean
    payload?: any
    error?: string
} {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'clinigo',
            audience: 'checkin',
        })
        return { valid: true, payload: decoded }
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            return { valid: false, error: 'Token expirado' }
        }
        if (error.name === 'JsonWebTokenError') {
            return { valid: false, error: 'Token inválido' }
        }
        return { valid: false, error: 'Erro ao verificar token' }
    }
}

/**
 * POST /api/checkin/pre-checkin
 * Process pre-check-in form and generate JWT QR code token
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { appointment_id, clinic_id, documents, ...formData } = body

        if (!appointment_id || !clinic_id) {
            throw new ValidationError('appointment_id e clinic_id são obrigatórios')
        }

        // Validate form data (allow partial for draft)
        const validationResult = preCheckinSchema.safeParse({
            ...formData,
            consent_treatment: formData.consent_treatment ?? formData.consent,
            consent_data_usage: formData.consent_data_usage ?? true,
        })

        // If validation fails but we have required fields, continue
        if (!validationResult.success && !formData.main_complaint) {
            throw new ValidationError(
                validationResult.error.errors[0]?.message || 'Dados inválidos'
            )
        }

        const supabase = createServiceRoleClient()

        // Verify appointment exists and belongs to clinic
        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .select('id, patient_id, status, doctor_id')
            .eq('id', appointment_id)
            .eq('clinic_id', clinic_id)
            .single()

        if (appointmentError || !appointment) {
            throw new ValidationError('Agendamento não encontrado')
        }

        // Check if appointment is in a valid status for check-in
        const validStatuses = ['CONFIRMED', 'PENDING_PAYMENT', 'PENDING']
        if (!validStatuses.includes((appointment as any).status)) {
            throw new ValidationError(
                `Agendamento não pode fazer check-in. Status atual: ${(appointment as any).status}`
            )
        }

        // Prepare health data for storage
        const healthData = {
            main_complaint: formData.main_complaint,
            medications: formData.medications,
            medications_list: formData.medications_list,
            allergies: formData.allergies,
            allergies_list: formData.allergies_list,
            blood_pressure: formData.blood_pressure,
            heart_rate: formData.heart_rate,
            temperature: formData.temperature,
            weight: formData.weight,
            height: formData.height,
            observations: formData.observations,
            symptoms_duration: formData.symptoms_duration,
        }

        // Prepare submission data
        const submissionData = {
            appointment_id,
            clinic_id,
            patient_id: (appointment as any).patient_id,
            data: {
                phone: formData.phone,
                address: formData.address,
                address_complement: formData.address_complement,
                emergency_contact_name: formData.emergency_contact_name,
                emergency_contact_phone: formData.emergency_contact_phone,
                health_insurance: formData.health_insurance,
                health_insurance_number: formData.health_insurance_number,
                health_data: healthData,
                consent_treatment: formData.consent_treatment ?? formData.consent,
                consent_data_usage: formData.consent_data_usage,
                consent_telemedicine: formData.consent_telemedicine,
                consent_whatsapp: formData.consent_whatsapp,
            },
            document_url: documents?.[0]?.url || null,
            document_type: documents?.[0]?.type || null,
            status: 'completed',
            checked_in_at: new Date().toISOString(),
        }

        // Save pre-checkin submission using upsert
        const { data: submission, error: submissionError } = await supabase
            .from('pre_checkin_submissions')
            .upsert(submissionData as any, { onConflict: 'appointment_id' })
            .select()
            .single()

        if (submissionError) {
            console.error('[Pre-Checkin] Error saving submission:', submissionError)
            // Continue even if table doesn't exist
            if (!submissionError.message?.includes('does not exist')) {
                throw submissionError
            }
        }

        // Also save to appointment_checkins if documents provided
        if (documents && documents.length > 0) {
            await supabase
                .from('appointment_checkins')
                .upsert({
                    appointment_id,
                    clinic_id,
                    patient_id: (appointment as any).patient_id,
                    health_data: healthData,
                    documents: documents,
                    checkin_method: 'online',
                    status: 'completed',
                } as any, { onConflict: 'appointment_id' })
                .select()
        }

        // Generate JWT token for QR Code
        const qrToken = generateCheckinToken({
            appointment_id,
            clinic_id,
            patient_id: (appointment as any).patient_id,
        })

        // Decode to get expiration
        const decoded = jwt.decode(qrToken) as any

        // Generate QR code data payload
        const qrData = JSON.stringify({
            token: qrToken,
            appointment_id,
            clinic_id,
            type: 'clinigo_checkin',
            version: '1.0',
        })

        return successResponse({
            message: 'Pré-check-in realizado com sucesso!',
            qr_token: qrToken,
            qr_data: qrData,
            submission_id: (submission as any)?.id,
            expires_at: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null,
            expires_in: 7200, // 2 hours in seconds
        })
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * GET /api/checkin/pre-checkin?appointment_id=xxx
 * Get pre-checkin status for an appointment
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const appointmentId = searchParams.get('appointment_id')

        if (!appointmentId) {
            throw new ValidationError('appointment_id é obrigatório')
        }

        const supabase = createServiceRoleClient()

        const { data, error } = await supabase
            .from('pre_checkin_submissions')
            .select('*')
            .eq('appointment_id', appointmentId)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return successResponse({ checked_in: false, submission: null })
            }
            throw error
        }

        return successResponse({
            checked_in: (data as any).status === 'completed',
            submission: data,
        })
    } catch (error) {
        return handleApiError(error)
    }
}

