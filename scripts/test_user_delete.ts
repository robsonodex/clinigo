import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { permanentlyDeleteUser } from '../lib/services/user-cleanup'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Erro: Variaveis Supabase nao configuradas no .env.local')
    process.exit(1)
}

const adminClient = createClient(supabaseUrl, serviceRoleKey)

async function runTests() {
    console.log('=====================================================')
    console.log('TESTES DE EXCLUSAO DEFINITIVA DE USUARIO / PROFISSIONAL')
    console.log('=====================================================\n')

    let passed = 0
    let failed = 0

    function assert(name: string, condition: boolean, details?: string) {
        if (condition) {
            console.log(`[PASS] ${name}`)
            passed++
        } else {
            console.error(`[FAIL] ${name}${details ? ` -> ${details}` : ''}`)
            failed++
        }
    }

    try {
        // Obter uma clínica existente para vincular os testes
        const { data: clinic, error: clinicErr } = await adminClient
            .from('clinics')
            .select('id')
            .limit(1)
            .single()

        assert('Clinica de teste identificada', !clinicErr && !!clinic?.id, clinicErr?.message)
        const clinicId = clinic.id

        // ----------------------------------------------------
        // Teste 1: Exclusão definitiva de Usuário Comum (Recepcionista)
        // ----------------------------------------------------
        console.log('\n--- TESTE 1: Usuario Comum (Recepcionista) ---')
        const testUserEmail = `test_delete_${Date.now()}@clinigo.test`
        const { data: authUser, error: createAuthErr } = await adminClient.auth.admin.createUser({
            email: testUserEmail,
            password: 'Password123!@#',
            email_confirm: true,
        })
        assert('Usuario criado no auth.users', !createAuthErr && !!authUser?.user?.id, createAuthErr?.message)

        const testUserId = authUser.user.id

        const { error: insertUserErr } = await adminClient.from('users').insert({
            id: testUserId,
            email: testUserEmail,
            full_name: 'Usuario Teste Exclusao Definitiva',
            role: 'RECEPTIONIST',
            clinic_id: clinicId,
            is_active: true
        })
        assert('Usuario inserido em public.users', !insertUserErr, insertUserErr?.message)

        // Criar dependência vinculada (ex: staff_legal_acceptances)
        await adminClient.from('staff_legal_acceptances').insert({
            user_id: testUserId,
            document_type: 'TERMS_OF_USE',
            version: '1.0'
        })

        // Executar exclusão definitiva
        const deleteResult = await permanentlyDeleteUser(adminClient, testUserId)
        assert('permanentlyDeleteUser executado com sucesso', deleteResult.success, deleteResult.error)

        // Verificar se usuário foi removido de public.users
        const { data: checkPublicUser } = await adminClient.from('users').select('id').eq('id', testUserId).maybeSingle()
        assert('Usuario nao existe mais em public.users', !checkPublicUser)

        // Verificar se usuário foi removido de auth.users
        const { data: checkAuthUser } = await adminClient.auth.admin.getUserById(testUserId)
        assert('Usuario nao existe mais em auth.users', !checkAuthUser?.user)

        // ----------------------------------------------------
        // Teste 2: Exclusão definitiva de Médico/Profissional com dependências
        // ----------------------------------------------------
        console.log('\n--- TESTE 2: Profissional / Medico com dependencias relacionais ---')
        const testDocEmail = `test_doc_delete_${Date.now()}@clinigo.test`
        const { data: authDocUser, error: createDocAuthErr } = await adminClient.auth.admin.createUser({
            email: testDocEmail,
            password: 'Password123!@#',
            email_confirm: true,
        })
        assert('Profissional criado no auth.users', !createDocAuthErr && !!authDocUser?.user?.id, createDocAuthErr?.message)

        const testDocUserId = authDocUser.user.id

        await adminClient.from('users').insert({
            id: testDocUserId,
            email: testDocEmail,
            full_name: 'Dr. Teste Exclusao Profissional',
            role: 'DOCTOR',
            clinic_id: clinicId,
            is_active: true
        })

        let doctorId = ''
        const { data: doctorRow, error: doctorInsertErr } = await adminClient.from('doctors').insert({
            user_id: testDocUserId,
            clinic_id: clinicId,
            crm: '123456',
            crm_state: 'SP',
            specialty: 'Psicologia',
            consultation_price: 150,
            consultation_duration: 50,
            is_accepting_appointments: true
        }).select().single()
        assert('Registro de doctors inserido com sucesso', !doctorInsertErr && !!doctorRow?.id, doctorInsertErr?.message)

        if (doctorRow?.id) {
            doctorId = doctorRow.id

            // Inserir registro em therapist_capacity (que causava FK violation anteriormente)
            await adminClient.from('therapist_capacity').insert({
                doctor_id: doctorId,
                clinic_id: clinicId,
                weekly_capacity_hours: 20
            })
        }

        // Executar exclusão definitiva do profissional
        const deleteDocResult = await permanentlyDeleteUser(adminClient, testDocUserId)
        assert('permanentlyDeleteUser para medico executado com sucesso', deleteDocResult.success, deleteDocResult.error)

        // Verificar ausência em doctors
        if (doctorId) {
            const { data: checkDoctor } = await adminClient.from('doctors').select('id').eq('id', doctorId).maybeSingle()
            assert('Registro de doctors removido com sucesso', !checkDoctor)

            // Verificar ausência em therapist_capacity
            const { data: checkCapacity } = await adminClient.from('therapist_capacity').select('id').eq('doctor_id', doctorId)
            assert('Registros de therapist_capacity removidos', !checkCapacity || checkCapacity.length === 0)
        }

        // Verificar ausência em public.users
        const { data: checkDocPublicUser } = await adminClient.from('users').select('id').eq('id', testDocUserId).maybeSingle()
        assert('Profissional nao existe mais em public.users', !checkDocPublicUser)

        // Verificar ausência em auth.users
        const { data: checkDocAuthUser } = await adminClient.auth.admin.getUserById(testDocUserId)
        assert('Profissional nao existe mais em auth.users', !checkDocAuthUser?.user)

    } catch (error: any) {
        console.error('Erro durante a execucao dos testes:', error)
        failed++
    }

    console.log('\n=====================================================')
    console.log(`RESULTADO: ${passed} passaram, ${failed} falharam`)
    console.log('=====================================================')

    if (failed > 0) {
        process.exit(1)
    }
}

runTests()
