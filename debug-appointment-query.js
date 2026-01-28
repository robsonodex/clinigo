const { createClient } = require('@supabase/supabase-js');

// Config
const supabaseUrl = 'https://dlxakeejmyzhzdxzjgne.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo';
const appointmentId = '7d399c12-48c1-4aa7-914f-cda77fae513b';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
});

async function runDebug() {
    console.log('--- START DEBUG ---');

    // 1. Check existence simple
    console.log('1. Checking existence...');
    const { data: simple, error: simpleErr } = await supabase
        .from('appointments')
        .select('id, clinic_id')
        .eq('id', appointmentId)
        .single();

    console.log('Simple Result:', simple ? 'FOUND' : 'NOT FOUND');
    if (simpleErr) console.error('Simple Error:', simpleErr);

    // 2. Full Query
    console.log('\n2. Running Full Query...');
    const { data: full, error: fullErr } = await supabase
        .from('appointments')
        .select(`
            *,
            patient:patients!appointments_patient_id_fkey(id, full_name, phone, email, cpf),
            doctor:doctors!appointments_doctor_id_fkey(
                id,
                user:users(full_name)
            ),
            clinic:clinics!appointments_clinic_id_fkey(id, name, slug),
            video_room:video_rooms!video_rooms_appointment_id_fkey(room_id, patient_token, doctor_token)
        `)
        .eq('id', appointmentId)
        .single();

    console.log('Full Result:', full ? 'FOUND' : 'NOT FOUND');
    if (fullErr) {
        console.error('Full Error:', JSON.stringify(fullErr, null, 2));
    } else if (full) {
        console.log('Data keys:', Object.keys(full));
        console.log('Patient:', full.patient);
        console.log('Doctor:', full.doctor);
        console.log('Clinic:', full.clinic);
        console.log('VideoRoom:', full.video_room);
    }

    console.log('--- END DEBUG ---');
}

runDebug();
