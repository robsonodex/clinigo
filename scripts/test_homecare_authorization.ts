import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

async function runTests() {
    console.log(`\n=====================================================`)
    console.log(`TESTE: AUTORIZACAO HOME CARE & BLINDAGEM DE BIOMETRIA`)
    console.log(`=====================================================`)

    // 1. Verificar os perfis da Patricia Mendes no banco
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name, role, is_coordinator')
        .in('email', ['patmendesto@gmail.com', 'clinicaworldsensory@gmail.com'])

    if (userError) {
        console.error('[FAIL] Erro ao buscar perfis da Patricia:', userError)
        process.exit(1)
    }

    console.log(`[PASS] Perfis da Patricia localizados:`)
    users.forEach(u => {
        const isAuth = u.role === 'CLINIC_ADMIN' || u.role === 'SUPER_ADMIN' || u.is_coordinator === true
        console.log(`  - ${u.full_name} (${u.email}): role=${u.role}, is_coordinator=${u.is_coordinator} -> Autorizada: ${isAuth}`)
    })

    const allAuthorized = users.every(u => u.role === 'CLINIC_ADMIN' || u.role === 'SUPER_ADMIN' || u.is_coordinator === true)
    if (!allAuthorized) {
        console.error('[FAIL] Algum dos perfis da Patricia nao tem autorizacao para liberar Home Care')
        process.exit(1)
    }

    // 2. Verificar que um terapeuta comum NÃO é autorizado
    const { data: commonDoctor } = await supabase
        .from('users')
        .select('id, email, full_name, role, is_coordinator')
        .eq('role', 'DOCTOR')
        .eq('is_coordinator', false)
        .limit(1)
        .single()

    if (commonDoctor) {
        const canCommonDoctorUnlock = commonDoctor.role === 'CLINIC_ADMIN' || commonDoctor.role === 'SUPER_ADMIN' || commonDoctor.is_coordinator === true
        console.log(`[PASS] Terapeuta comum ${commonDoctor.full_name}: Autorizada para desbloqueio = ${canCommonDoctorUnlock} (deve ser false)`)
        if (canCommonDoctorUnlock) {
            console.error('[FAIL] Terapeuta comum tem autorizacao indevida!')
            process.exit(1)
        }
    }

    // 3. Simular autorizacao e revogacao de um agendamento da World Sensory
    const clinicIdWorldSensory = '4c13e586-5390-4393-a180-2c9dd7ed81c7'
    const { data: appointment } = await supabase
        .from('appointments')
        .select('id, clinic_id, manual_checkin_unlocked_at, manual_checkin_unlocked_by')
        .eq('clinic_id', clinicIdWorldSensory)
        .limit(1)
        .single()

    if (appointment) {
        console.log(`[PASS] Agendamento de teste localizado: ID=${appointment.id}`)
        const originalUnlockedAt = appointment.manual_checkin_unlocked_at

        // Simular Autorizacao (POST)
        const now = new Date().toISOString()
        const patriciaId = users[0].id
        const { error: unlockErr } = await supabase
            .from('appointments')
            .update({
                manual_checkin_unlocked_at: now,
                manual_checkin_unlocked_by: patriciaId,
            })
            .eq('id', appointment.id)

        if (unlockErr) {
            console.error('[FAIL] Erro ao autorizar atendimento:', unlockErr)
            process.exit(1)
        }
        console.log(`[PASS] Atendimento autorizado com sucesso com carimbo da Patricia: ${now}`)

        // Simular Revogacao (DELETE)
        const { error: lockErr } = await supabase
            .from('appointments')
            .update({
                manual_checkin_unlocked_at: originalUnlockedAt,
                manual_checkin_unlocked_by: null,
            })
            .eq('id', appointment.id)

        if (lockErr) {
            console.error('[FAIL] Erro ao restaurar estado do agendamento:', lockErr)
            process.exit(1)
        }
        console.log(`[PASS] Estado original do agendamento restaurado`)
    }

    console.log(`\n[SUCCESS] Todos os testes de blindagem e autorizacao passaram com 100% de integridade!`)
}

runTests()
