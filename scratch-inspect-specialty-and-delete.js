const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log('Testing pg_catalog exposure on Rest API...')
    
    // We try to query a system view if PostgREST allows it.
    // Usually only "public" is exposed, but service_role might bypass or we can specify the query block
    const { data, error } = await supabase
        .from('pg_proc')
        .select('proname')
        .limit(5)

    if (error) {
        console.log('Error querying pg_proc:', error.message)
    } else {
        console.log('Successfully read pg_proc:', data)
    }
}

run()
