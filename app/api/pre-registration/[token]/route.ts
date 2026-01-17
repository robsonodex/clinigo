import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/pre-registration/[token]
 * Retrieves appointment data by QR token for pre-registration
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { token: string } }
) {
    try {
        const supabase = await createClient()
        const token = params.token

        // Use the helper function or direct query
        const { data: qrDataRaw, error: qrError } = await supabase
            .from('appointment_qr_codes')
            .select(`
                *,
                appointment:appointments(
                    id,
                    scheduled_at,
                    status,
                    patient:patients(
                        id, 
                        full_name, 
                        email, 
                        phone, 
                        cpf,
                        date_of_birth,
                        gender,
                        address_street,
                        address_number,
                        address_city,
                        address_state,
                        address_zipcode
                    ),
                    doctor:doctors(id, full_name, specialty),
                    clinic:clinics(id, name, slug, phone, address)
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

        const appointment = qrData.appointment
        const patient = appointment?.patient
        const doctor = appointment?.doctor
        const clinic = appointment?.clinic

        return NextResponse.json({
            success: true,
            token: qrData.qr_token,
            preRegistrationCompleted: qrData.pre_registration_completed,
            preRegistrationData: qrData.pre_registration_data,
            appointment: {
                id: appointment?.id,
                scheduledAt: appointment?.scheduled_at,
                status: appointment?.status
            },
            patient: patient ? {
                id: patient.id,
                fullName: patient.full_name,
                email: patient.email,
                phone: patient.phone,
                cpf: patient.cpf,
                dateOfBirth: patient.date_of_birth,
                gender: patient.gender,
                addressStreet: patient.address_street,
                addressNumber: patient.address_number,
                addressCity: patient.address_city,
                addressState: patient.address_state,
                addressZipcode: patient.address_zipcode
            } : null,
            doctor: doctor ? {
                id: doctor.id,
                fullName: doctor.full_name,
                specialty: doctor.specialty
            } : null,
            clinic: clinic ? {
                id: clinic.id,
                name: clinic.name,
                phone: clinic.phone,
                address: clinic.address
            } : null
        })

    } catch (error) {
        console.error('Error fetching pre-registration data:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}

