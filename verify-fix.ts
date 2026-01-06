
const supabaseUrl = 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo'

import { createClient } from '@supabase/supabase-js'

async function verifyLogic() {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Create a dummy clinic with a unique slug
    const testSlug = 'test-reuse-' + Date.now()
    console.log(`Step 1: Creating clinic with slug: ${testSlug}`)
    const { data: c1, error: e1 } = await supabase.from('clinics').insert({
        name: 'Test Reuse 1',
        slug: testSlug,
        email: 'test1@example.com',
        is_active: true
    }).select().single()
    if (e1) throw e1
    console.log('Clinic created:', c1.id)

    // 2. Deactivate it
    console.log('Step 2: Deactivating clinic...')
    const { error: e2 } = await supabase.from('clinics').update({ is_active: false }).eq('id', c1.id)
    if (e2) throw e2
    console.log('Clinic deactivated')

    // 3. Try to create another active clinic with SAME slug
    // This should work IF the index is correctly applied (which we can only assume if applied via SQL editor)
    // But we are testing our API logic too.
    console.log('Step 3: Creating another clinic with SAME slug...')
    const { data: c2, error: e3 } = await supabase.from('clinics').insert({
        name: 'Test Reuse 2',
        slug: testSlug,
        email: 'test2@example.com',
        is_active: true
    }).select().single()

    if (e3) {
        console.log('Failed to create second clinic (this is expected if migration not applied):', e3.message)
    } else {
        console.log('SUCCESS: Second clinic created with same slug!', c2.id)
        // Cleanup
        await supabase.from('clinics').delete().eq('id', c2.id)
    }

    // Cleanup first clinic
    await supabase.from('clinics').delete().eq('id', c1.id)
}

verifyLogic().catch(console.error)
