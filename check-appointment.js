// Script para verificar agendamento no banco
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAppointment() {
    const appointmentId = 'ee12aee0-f291-4382-ad2a-24fca1fbc703'

    console.log('Checking appointment:', appointmentId)
    console.log('Using Supabase URL:', supabaseUrl)

    // Check in appointments table
    const { data: appointment, error } = await supabase
        .from('appointments')
        .select('id, status, appointment_date, appointment_time, patient_id, doctor_id, clinic_id')
        .eq('id', appointmentId)
        .single()

    if (error) {
        console.log('Appointment not found in appointments table:', error.message)
    } else {
        console.log('Found appointment:', JSON.stringify(appointment, null, 2))
    }

    // Check in walk_in_registrations table
    const { data: walkIn, error: walkInError } = await supabase
        .from('walk_in_registrations')
        .select('id, status, patient_id, doctor_id, created_at')
        .eq('id', appointmentId)
        .single()

    if (walkInError) {
        console.log('Not found in walk_in_registrations:', walkInError.message)
    } else {
        console.log('Found in walk_in_registrations:', JSON.stringify(walkIn, null, 2))
    }
}

checkAppointment()
