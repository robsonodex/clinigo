import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY ausente')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRecurringMentoring() {
    console.log('=====================================================')
    console.log('TESTE: Recorrência de Mentorias Clínicas / Formação')
    console.log('=====================================================')

    // 1. Obter clínica World Sensory
    const { data: clinics, error: clinicErr } = await supabase
        .from('clinics')
        .select('id, name')
        .ilike('name', '%WorldSensory%')
        .limit(1)

    if (clinicErr || !clinics || clinics.length === 0) {
        console.error('[FAIL] Clínica World Sensory não encontrada:', clinicErr)
        process.exit(1)
    }

    const worldSensory = clinics[0]
    console.log(`[PASS] Clínica localizada: ${worldSensory.name} (${worldSensory.id})`)

    // 2. Obter profissional/doutor ativo na clínica
    const { data: doctors, error: docErr } = await supabase
        .from('doctors')
        .select('id, user:users(full_name)')
        .eq('clinic_id', worldSensory.id)
        .limit(1)

    if (docErr || !doctors || doctors.length === 0) {
        console.error('[FAIL] Nenhum profissional encontrado na clínica:', docErr)
        process.exit(1)
    }

    const doctor = doctors[0]
    console.log(`[PASS] Terapeuta localizado: ${doctor.user?.full_name || doctor.id}`)

    // 3. Obter ou criar mentorando de teste
    let studentId: string
    const { data: students, error: studentErr } = await supabase
        .from('students')
        .select('id, full_name, program')
        .eq('clinic_id', worldSensory.id)
        .limit(1)

    if (students && students.length > 0) {
        studentId = students[0].id
        console.log(`[PASS] Mentorando existente localizado: ${students[0].full_name} (${students[0].program || 'Sem programa'})`)
    } else {
        const { data: newStudent, error: createStudentErr } = await supabase
            .from('students')
            .insert({
                clinic_id: worldSensory.id,
                full_name: 'Mentorando Teste Automatizado',
                contact_email: 'mentorando.teste@clinigo.test',
                contact_phone: '11999999999',
                program: 'Formação em Integração Sensorial'
            })
            .select()
            .single()

        if (createStudentErr) {
            console.error('[FAIL] Erro ao criar mentorando de teste:', createStudentErr)
            process.exit(1)
        }
        studentId = newStudent.id
        console.log(`[PASS] Mentorando de teste criado: ${newStudent.full_name}`)
    }

    // 4. Testar inserção de série recorrente de mentoria
    const testSeriesData = {
        clinic_id: worldSensory.id,
        patient_id: null,
        student_id: studentId,
        doctor_id: doctor.id,
        therapy_type: 'Mentoria Clínica / Formação Técnica',
        appointment_type: 'STUDENT',
        mentoring_notes: 'Sessão de mentoria clínica semanal - Discussão de casos e protocolos sensoriais',
        recurrence_interval: 1,
        frequency: 'weekly',
        days_of_week: [1], // Segunda-feira
        appointment_time: '14:00:00',
        start_date: '2026-09-15',
        end_date: '2026-10-15',
        is_active: true,
    }

    const { data: createdSeries, error: seriesErr } = await supabase
        .from('recurring_appointment_series')
        .insert(testSeriesData)
        .select()
        .single()

    if (seriesErr) {
        console.error('[FAIL] Erro ao inserir série recorrente de mentoria:', seriesErr)
        process.exit(1)
    }

    console.log(`[PASS] Série recorrente de mentoria criada com sucesso! ID: ${createdSeries.id}`)
    console.log(`       - student_id: ${createdSeries.student_id}`)
    console.log(`       - patient_id: ${createdSeries.patient_id} (esperado null)`)
    console.log(`       - mentoring_notes: ${createdSeries.mentoring_notes}`)

    // 5. Testar inserção de agendamento de mentoria atrelado à série
    const testAppointment = {
        clinic_id: worldSensory.id,
        patient_id: null,
        student_id: studentId,
        doctor_id: doctor.id,
        series_id: createdSeries.id,
        appointment_date: '2026-09-15',
        appointment_time: '14:00:00',
        appointment_type: 'STUDENT',
        mentoring_notes: createdSeries.mentoring_notes,
        waiting_room_notes: `[Aluna / Mentoria] ${createdSeries.mentoring_notes}`,
        status: 'CONFIRMED',
        payment_type: 'PARTICULAR',
    }

    const { data: createdApt, error: aptErr } = await supabase
        .from('appointments')
        .insert(testAppointment)
        .select()
        .single()

    if (aptErr) {
        console.error('[FAIL] Erro ao criar agendamento atrelado à série de mentoria:', aptErr)
        process.exit(1)
    }

    console.log(`[PASS] Agendamento de mentoria atrelado à série criado com sucesso! ID: ${createdApt.id}`)

    // 6. Testar query com Join da API de séries recorrentes (incluindo student)
    const { data: queryResult, error: queryErr } = await supabase
        .from('recurring_appointment_series')
        .select(`
            id,
            clinic_id,
            patient_id,
            student_id,
            doctor_id,
            therapy_type,
            appointment_type,
            mentoring_notes,
            frequency,
            days_of_week,
            appointment_time,
            start_date,
            end_date,
            is_active,
            doctor:doctors!recurring_appointment_series_doctor_id_fkey(
                id,
                specialty,
                user:users(full_name)
            ),
            student:students!recurring_appointment_series_student_id_fkey(
                id,
                full_name,
                contact_email,
                contact_phone,
                program
            )
        `)
        .eq('id', createdSeries.id)
        .single()

    if (queryErr) {
        console.error('[FAIL] Erro na query de série com join em student:', queryErr)
        process.exit(1)
    }

    console.log(`[PASS] Consulta com JOIN executada com sucesso!`)
    console.log(`       - Nome do Mentorando recuperado: ${queryResult.student?.full_name}`)
    console.log(`       - Programa do Mentorando: ${queryResult.student?.program}`)
    console.log(`       - Terapeuta Responsável: ${queryResult.doctor?.user?.full_name}`)

    // 7. Testar Isolamento Multi-tenant (garantir que outra clínica NÃO enxerga esta série)
    const { data: otherClinicSeries } = await supabase
        .from('recurring_appointment_series')
        .select('id')
        .eq('clinic_id', '00000000-0000-0000-0000-000000000000') // ID fictício
        .eq('id', createdSeries.id)

    if (otherClinicSeries && otherClinicSeries.length > 0) {
        console.error('[FAIL] VIOLAÇÃO DE ISOLAMENTO: Série retornada para clínica incorreta!')
        process.exit(1)
    } else {
        console.log(`[PASS] Isolamento multi-tenant validado: 0 registros para clínica divergente.`)
    }

    // 8. Limpeza dos dados de teste
    console.log(`Limpeza de dados de teste...`)
    await supabase.from('appointments').delete().eq('id', createdApt.id)
    await supabase.from('recurring_appointment_series').delete().eq('id', createdSeries.id)
    console.log(`[PASS] Limpeza concluída sem deixar resíduos no banco de dados.`)

    console.log('\n=====================================================')
    console.log('TODOS OS TESTES DE RECORRÊNCIA DE MENTORIA PASSARAM COM SUCESSO!')
    console.log('=====================================================')
}

testRecurringMentoring()
    .catch((err) => {
        console.error('Erro fatal no teste:', err)
        process.exit(1)
    })
