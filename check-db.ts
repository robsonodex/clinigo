
const supabaseUrl = 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo'

import { createClient } from '@supabase/supabase-js'

async function checkDuplicates() {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('--- Checking Clinics ---')
    const { data: clinics, error: clinicsError } = await supabase
        .from('clinics')
        .select('id, name, slug, email, cnpj, is_active')

    if (clinicsError) {
        console.error('Error fetching clinics:', clinicsError)
    } else {
        console.log(JSON.stringify(clinics, null, 2))
    }

    console.log('\n--- Checking Public Users ---')
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, role, clinic_id, is_active')

    if (usersError) {
        console.error('Error fetching users:', usersError)
    } else {
        console.log(JSON.stringify(users, null, 2))
    }
}

checkDuplicates().catch(console.error)
