import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schema for pre-registration data
const preRegistrationSchema = z.object({
    full_name: z.string().min(3, 'Nome completo é obrigatório'),
    cpf: z.string().optional(),
    date_of_birth: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('E-mail inválido').optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    address_street: z.string().optional(),
    address_number: z.string().optional(),
    address_complement: z.string().optional(),
    address_city: z.string().optional(),
    address_state: z.string().max(2).optional(),
    address_zipcode: z.string().optional(),
    emergency_contact: z.string().optional(),
    emergency_phone: z.string().optional(),
    health_insurance: z.string().optional(),
    insurance_card_number: z.string().optional(),
    allergies: z.string().optional(),
    medications: z.string().optional(),
    previous_conditions: z.string().optional()
})

type PreRegistrationData = z.infer<typeof preRegistrationSchema>

/**
 * POST /api/pre-registration/[token]/submit
 * Submits pre-registration data for an appointment
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { token: string } }
) {
    try {
        const supabase = await createClient()
        const token = params.token
        const body = await req.json()

        // Validate input
        const validation = preRegistrationSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Dados inválidos',
                    details: validation.error.errors
                },
                { status: 400 }
            )
        }

        const data: PreRegistrationData = validation.data

        // Fetch QR code record
        const { data: qrDataRaw, error: qrError } = await supabase
            .from('appointment_qr_codes')
            .select(`
                *,
                appointment:appointments(
                    id,
                    patient_id,
                    patient:patients(id)
                )
            `)
            .eq('qr_token', token)
            .single()

        if (qrError || !qrDataRaw) {
            return NextResponse.json(
                { error: 'QR Code inválido ou não encontrado' },
                { status: 404 }
            )
        }

        // Type assertion for Supabase data
        const qrData = qrDataRaw as any

        // Check if expired
        if (new Date(qrData.expires_at) < new Date()) {
            return NextResponse.json(
                { error: 'QR Code expirado' },
                { status: 410 }
            )
        }

        // Check if already checked in
        if (qrData.checked_in) {
            return NextResponse.json(
                { error: 'Check-in já realizado' },
                { status: 409 }
            )
        }

        const patientId = qrData.appointment?.patient_id

        // Update patient data
        const patientUpdate: Record<string, any> = {}

        if (data.full_name) patientUpdate.full_name = data.full_name
        if (data.cpf) patientUpdate.cpf = data.cpf
        if (data.date_of_birth) patientUpdate.date_of_birth = data.date_of_birth
        if (data.phone) patientUpdate.phone = data.phone
        if (data.email) patientUpdate.email = data.email
        if (data.gender) patientUpdate.gender = data.gender
        if (data.address_street) patientUpdate.address_street = data.address_street
        if (data.address_number) patientUpdate.address_number = data.address_number
        if (data.address_complement) patientUpdate.address_complement = data.address_complement
        if (data.address_city) patientUpdate.address_city = data.address_city
        if (data.address_state) patientUpdate.address_state = data.address_state
        if (data.address_zipcode) patientUpdate.address_zipcode = data.address_zipcode

        // Add emergency contact and health info to notes or metadata
        const additionalInfo = {
            emergency_contact: data.emergency_contact,
            emergency_phone: data.emergency_phone,
            health_insurance: data.health_insurance,
            insurance_card_number: data.insurance_card_number,
            allergies: data.allergies,
            medications: data.medications,
            previous_conditions: data.previous_conditions
        }

        if (Object.keys(patientUpdate).length > 0 && patientId) {
            const { error: updateError } = await supabase
                .from('patients')
                .update(patientUpdate as any)
                .eq('id', patientId)

            if (updateError) {
                console.error('Error updating patient:', updateError)
                // Don't fail - continue to save pre-registration data
            }
        }

        // Update QR code record with pre-registration data
        const { error: qrUpdateError } = await supabase
            .from('appointment_qr_codes')
            .update({
                pre_registration_completed: true,
                pre_registration_data: {
                    ...data,
                    additional_info: additionalInfo,
                    submitted_at: new Date().toISOString()
                },
                pre_registration_completed_at: new Date().toISOString()
            } as any)
            .eq('id', qrData.id)

        if (qrUpdateError) {
            console.error('Error updating QR code:', qrUpdateError)
            return NextResponse.json(
                { error: 'Erro ao salvar dados' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Pré-cadastro concluído com sucesso!',
            appointmentId: qrData.appointment?.id
        })

    } catch (error) {
        console.error('Error submitting pre-registration:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}

