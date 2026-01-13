
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUser() {
    const { data: users, error } = await supabase
        .from('users')
        .select('id, email, role, clinic_id')
        .eq('email', 'robsonfenriz@gmail.com')

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('User Data:', JSON.stringify(users, null, 2))

    if (users && users.length > 0 && !users[0].clinic_id) {
        console.log('User has no clinic_id. Fetching a clinic to associate...')
        const { data: clinics } = await supabase.from('clinics').select('id, name').limit(1)
        if (clinics && clinics.length > 0) {
            console.log('Found clinic:', clinics[0].name, clinics[0].id)
            // Note: We cannot update simply with anon key often if RLS blocks it, 
            // but let's see current state first.
        }
    }
}

checkUser()
