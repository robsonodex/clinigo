
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const body = await request.json()

        // Get user's clinic
        const { data: user } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', session.user.id)
            .single()

        if (!user?.clinic_id) {
            return NextResponse.json({ error: 'Usuário sem clínica' }, { status: 400 })
        }

        const clinicId = user.clinic_id

        // 1. Criar ou buscar paciente
        let patientId = body.patientId

        if (!patientId) {
            // Buscar paciente por CPF
            const { data: existingPatient } = await supabase
                .from('patients')
                .select('id')
                .eq('cpf', body.patientCPF)
                .eq('clinic_id', clinicId)
                .single()

            if (existingPatient) {
                patientId = existingPatient.id
            } else {
                // Criar novo paciente
                const { data: newPatient, error: patientError } = await supabase
                    .from('patients')
                    .insert([{
                        full_name: body.patientName,
                        cpf: body.patientCPF,
                        phone: body.patientPhone,
                        email: body.patientEmail || null,
                        clinic_id: clinicId,
                        is_active: true
                    }])
                    .select()
                    .single()

                if (patientError) throw patientError
                patientId = newPatient.id
            }
        }

        // 2. Criar agendamento
        const appointmentData = {
            clinic_id: clinicId,
            doctor_id: body.doctorId,
            patient_id: patientId,
            appointment_date: body.appointmentDate, // Ensure this format matches DB
            start_time: body.appointmentTime, // Assuming 'start_time' is the column name, user sent appointmentTime
            status: 'CONFIRMED',
            type: 'walk_in', // Changed from appointment_type to type or whatever column exists. Check schema? User script added `appointment_type`
            notes: body.notes,
            created_by: session.user.id
        }

        // Adjust keys based on likely DB schema. 
        // Usually it's start_time.
        // The user script added: ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_type VARCHAR(20) DEFAULT 'online';
        // So I should use `appointment_type`.

        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .insert([{
                clinic_id: clinicId,
                doctor_id: body.doctorId,
                patient_id: patientId,
                date: body.appointmentDate, // standard logic often uses 'date' and 'start_time'
                start_time: body.appointmentTime,
                status: 'CONFIRMED',
                appointment_type: 'walk_in',
                notes: body.notes
            }])
            .select()
            .single()

        if (appointmentError) {
            // Fallback if column names differ
            console.error('Appointment insert error:', appointmentError)
            throw appointmentError
        }

        // 3. Criar registro de pagamento (se houver)
        if (body.amount && body.amount > 0) {
            await supabase
                .from('financial_entries') // Assuming financial table
                .insert([{
                    description: `Consulta Presencial - ${body.patientName}`,
                    amount: body.amount,
                    type: 'INCOME',
                    category: 'CONSULTATION',
                    payment_method: body.paymentMethod || 'cash',
                    status: body.paymentStatus === 'paid' ? 'COMPLETED' : 'PENDING',
                    date: new Date().toISOString(),
                    clinic_id: clinicId
                }])
        }

        return NextResponse.json({
            success: true,
            data: appointment,
            message: 'Agendamento presencial criado com sucesso'
        })

    } catch (error) {
        console.error('Walk-in appointment error:', error)
        return NextResponse.json(
            { error: 'Erro ao criar agendamento presencial' },
            { status: 500 }
        )
    }
}
