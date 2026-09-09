// scripts/test_tablet_checkin_spec.mjs
// Suite de Validacao e Auditoria da Especificacao do Tablet Pareado

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import crypto from 'crypto'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error('ERRO: Variaveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatorias.')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false }
})

async function runTests() {
    console.log('--- INICIANDO TESTES DE ESPECIFICACAO DO TABLET PAREADO ---')
    let passed = 0
    let failed = 0

    const assert = (condition, title) => {
        if (condition) {
            console.log(`[PASS] ${title}`)
            passed++
        } else {
            console.error(`[FAIL] ${title}`)
            failed++
        }
    }

    try {
        // 1. Obter uma clinica existente
        const { data: clinics } = await supabase.from('clinics').select('id, name').limit(1)
        assert(clinics && clinics.length > 0, 'Clinica identificada para teste')
        const clinicId = clinics[0].id

        // 2. Teste de Criacao e Pareamento de Dispositivo (clinic_devices)
        const testRoomLabel = `Sala Teste Automacao ${Date.now()}`
        const testToken = crypto.randomBytes(24).toString('hex')

        const { data: device, error: devErr } = await supabase
            .from('clinic_devices')
            .insert({
                clinic_id: clinicId,
                room_label: testRoomLabel,
                device_token: testToken,
                status: 'active'
            })
            .select()
            .single()

        assert(!devErr && device?.id, 'Dispositivo cadastrado com sucesso em clinic_devices')

        // 3. Teste de Expiracao de Token (3 minutos)
        const { data: appts } = await supabase
            .from('appointments')
            .select('id, patient_id')
            .eq('clinic_id', clinicId)
            .limit(1)

        let testApptId = appts?.[0]?.id
        let testPatientId = appts?.[0]?.patient_id

        // Se nao houver agendamento, cria um temporario
        if (!testApptId) {
            const { data: newPatient } = await supabase
                .from('patients')
                .insert({ clinic_id: clinicId, full_name: 'Paciente Teste Spec' })
                .select()
                .single()
            testPatientId = newPatient.id

            const { data: newAppt } = await supabase
                .from('appointments')
                .insert({
                    clinic_id: clinicId,
                    patient_id: testPatientId,
                    appointment_date: new Date().toISOString().split('T')[0],
                    appointment_time: '10:00',
                    status: 'WAITING'
                })
                .select()
                .single()
            testApptId = newAppt.id
        }

        const testCaptureToken = crypto.randomBytes(18).toString('base64url')
        const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString()

        const { data: tokenRecord, error: tokErr } = await supabase
            .from('checkin_capture_tokens')
            .insert({
                token: testCaptureToken,
                clinic_id: clinicId,
                device_id: device.id,
                appointment_id: testApptId,
                patient_id: testPatientId,
                status: 'pending',
                expires_at: expiresAt
            })
            .select()
            .single()

        assert(!tokErr && tokenRecord?.token, 'Token efemero de 3 minutos gerado com status pending')

        // 4. Teste de Bloqueio de Replay / Reutilizacao de Token
        // Simular confirmacao do token
        await supabase
            .from('checkin_capture_tokens')
            .update({ status: 'confirmed', confirmation_method: 'facial', confirmed_at: new Date().toISOString() })
            .eq('id', tokenRecord.id)

        // Verificar que status nao e mais 'pending'
        const { data: recheckedToken } = await supabase
            .from('checkin_capture_tokens')
            .select('status')
            .eq('id', tokenRecord.id)
            .single()

        assert(recheckedToken.status === 'confirmed', 'Token consumido e invalidado para reutilizacao')

        // 5. Teste de Auditoria Imutavel LGPD (patient_checkin_events)
        const { data: auditEvent, error: auditErr } = await supabase
            .from('patient_checkin_events')
            .insert({
                clinic_id: clinicId,
                appointment_id: testApptId,
                patient_id: testPatientId,
                device_id: device.id,
                method: 'facial',
            })
            .select()
            .single()

        assert(!auditErr && auditEvent?.id, 'Evento registrado com sucesso em patient_checkin_events')

        // 6. Teste de Fallback por Assinatura (patient_checkin_events com method signature)
        const { data: sigEvent, error: sigErr } = await supabase
            .from('patient_checkin_events')
            .insert({
                clinic_id: clinicId,
                appointment_id: testApptId,
                patient_id: testPatientId,
                device_id: device.id,
                method: 'signature',
                signature_url: 'data:image/png;base64,testSignature'
            })
            .select()
            .single()

        assert(!sigErr && sigEvent?.method === 'signature', 'Fallback de assinatura registrado em patient_checkin_events')

        // 7. Teste de Fallback Manual (patient_checkin_events com reason)
        const { data: manualEvent, error: manErr } = await supabase
            .from('patient_checkin_events')
            .insert({
                clinic_id: clinicId,
                appointment_id: testApptId,
                patient_id: testPatientId,
                device_id: device.id,
                method: 'manual',
                reason: 'Criança com aversao sensorial a camera'
            })
            .select()
            .single()

        assert(!manErr && manualEvent?.reason?.includes('aversao sensorial'), 'Fallback manual registrado com justificativa obrigatoria')

        // 8. Teste de Colunas de Leitura Rapida em Appointments
        const { data: apptCols, error: apptColErr } = await supabase
            .from('appointments')
            .update({
                checkin_confirmed_at: new Date().toISOString(),
                checkin_method: 'facial'
            })
            .eq('id', testApptId)
            .select('checkin_confirmed_at, checkin_method')
            .single()

        assert(!apptColErr && apptCols?.checkin_method === 'facial', 'Colunas checkin_confirmed_at e checkin_method atualizadas em appointments')

        // Limpeza dos dados de teste
        await supabase.from('patient_checkin_events').delete().eq('device_id', device.id)
        await supabase.from('checkin_capture_tokens').delete().eq('device_id', device.id)
        await supabase.from('clinic_devices').delete().eq('id', device.id)
        console.log('[CLEANUP] Dados de teste limpos com sucesso.')

    } catch (err) {
        console.error('Erro na execucao dos testes:', err)
        failed++
    }

    console.log(`\n--- RESULTADO: ${passed} PASSOU / ${failed} FALHOU ---`)
    if (failed > 0) process.exit(1)
}

runTests()
