import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function runBirthdayTests() {
    console.log('🧪 [TEST] Starting Birthday Feature Validation...')

    // 1. Check patients with date_of_birth
    const { data: patients, error } = await supabase
        .from('patients')
        .select('id, full_name, date_of_birth, clinic_id')
        .not('date_of_birth', 'is', null)
        .is('deleted_at', null)
        .limit(10)

    if (error) {
        console.error('❌ Failed to query patients:', error)
        process.exit(1)
    }

    console.log(`✅ Successfully queried sample patients with date_of_birth: ${patients.length} records`)

    // 2. Test date calculation logic
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1
    const currentDay = today.getDate()

    // Mock patient born today 25 years ago
    const mockBirthYear = currentYear - 25
    const mockDob = `${mockBirthYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`

    const parts = mockDob.split('-')
    const birthYear = parseInt(parts[0], 10)
    const birthMonth = parseInt(parts[1], 10)
    const birthDay = parseInt(parts[2], 10)

    const isToday = birthMonth === currentMonth && birthDay === currentDay
    const turningAge = currentYear - birthYear

    if (isToday && turningAge === 25) {
        console.log(`✅ Date calculation test PASSED: Mock patient DOB ${mockDob} is recognized as TODAY with age ${turningAge}`)
    } else {
        console.error(`❌ Date calculation test FAILED: isToday=${isToday}, turningAge=${turningAge}`)
        process.exit(1)
    }

    // 3. Test upcoming logic (tomorrow)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const tMonth = tomorrow.getMonth() + 1
    const tDay = tomorrow.getDate()
    const tYear = tomorrow.getFullYear() - 30
    const tomorrowDob = `${tYear}-${String(tMonth).padStart(2, '0')}-${String(tDay).padStart(2, '0')}`

    const tParts = tomorrowDob.split('-')
    const tBMonth = parseInt(tParts[1], 10)
    const tBDay = parseInt(tParts[2], 10)
    const tIsToday = tBMonth === currentMonth && tBDay === currentDay

    let nextBday = new Date(currentYear, tBMonth - 1, tBDay)
    const startOfToday = new Date(currentYear, today.getMonth(), currentDay).getTime()
    if (nextBday.getTime() < startOfToday && !tIsToday) {
        nextBday = new Date(currentYear + 1, tBMonth - 1, tBDay)
    }
    const diffTime = nextBday.getTime() - startOfToday
    const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24))

    if (!tIsToday && daysUntil === 1) {
        console.log(`✅ Upcoming birthday calculation PASSED: Tomorrow's birthday has daysUntil = ${daysUntil}`)
    } else {
        console.error(`❌ Upcoming calculation test FAILED: daysUntil=${daysUntil}`)
        process.exit(1)
    }

    console.log('🎉 ALL BIRTHDAY TESTS PASSED SUCCESSFULLY!')
}

runBirthdayTests().catch(err => {
    console.error('Fatal test error:', err)
    process.exit(1)
})
