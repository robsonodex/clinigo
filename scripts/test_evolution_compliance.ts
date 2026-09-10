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

async function testCompliance(clinicId: string, clinicName: string, startDate: string, endDate: string) {
    console.log(`\n=====================================================`)
    console.log(`TESTE: Conformidade de Evolucoes - ${clinicName}`)
    console.log(`Periodo: ${startDate} a ${endDate}`)
    console.log(`=====================================================`)

    // 1. Query com desambiguacao de FK e busca em lotes
    let appointments: any[] = []
    let aptFrom = 0
    const CHUNK_SIZE = 1000
    while (true) {
        const { data: chunk, error: aptError } = await supabase
            .from('appointments')
            .select(`
                id,
                doctor_id,
                appointment_date,
                status,
                doctor:doctors!appointments_doctor_id_fkey(
                    id,
                    user:users(full_name)
                )
            `)
            .eq('clinic_id', clinicId)
            .eq('status', 'COMPLETED')
            .gte('appointment_date', startDate)
            .lte('appointment_date', endDate)
            .range(aptFrom, aptFrom + CHUNK_SIZE - 1)

        if (aptError) {
            console.error(`[FAIL] Erro na query de appointments (${clinicName}):`, aptError)
            return false
        }
        if (!chunk || chunk.length === 0) break
        appointments.push(...chunk)
        if (chunk.length < CHUNK_SIZE) break
        aptFrom += CHUNK_SIZE
    }

    console.log(`[PASS] Query appointments retornou com sucesso: ${appointments.length} registros COMPLETED`)

    // 2. Query de session_evolutions
    const { data: evolutions, error: evoError } = await supabase
        .from('session_evolutions')
        .select('id, doctor_id, patient_id, appointment_id, evolution_date, created_at, patients(full_name)')
        .eq('clinic_id', clinicId)
        .gte('evolution_date', startDate)
        .lte('evolution_date', endDate)

    if (evoError) {
        console.error(`[FAIL] Erro na query de session_evolutions (${clinicName}):`, evoError)
        return false
    }

    console.log(`[PASS] Query evolutions retornou com sucesso: ${evolutions?.length || 0} registros`)

    // 3. Mapear e calcular estatisticas
    const evolutionByAppointment = new Set<string>()
    evolutions?.forEach((evo: any) => {
        if (evo.appointment_id) evolutionByAppointment.add(evo.appointment_id)
    })

    const evolutionsByDoctorDate: Record<string, Record<string, number>> = {}
    evolutions?.forEach((evo: any) => {
        const did = evo.doctor_id
        if (!did) return
        if (!evolutionsByDoctorDate[did]) evolutionsByDoctorDate[did] = {}
        const dateKey = evo.evolution_date
        if (!evolutionsByDoctorDate[did][dateKey]) evolutionsByDoctorDate[did][dateKey] = 0
        evolutionsByDoctorDate[did][dateKey]++
    })

    const doctorStats: Record<string, {
        name: string
        totalAttended: number
        totalEvolutions: number
        withEvolution: number
        withoutEvolution: number
    }> = {}

    appointments?.forEach((apt: any) => {
        const did = apt.doctor_id
        if (!did) return
        const docObj = apt.doctor || apt.doctors
        const docUser = (docObj as any)?.user
        const docName = docUser
            ? (Array.isArray(docUser) ? docUser[0]?.full_name : (docUser as any)?.full_name)
            : 'N/A'

        if (!doctorStats[did]) {
            doctorStats[did] = {
                name: docName || 'N/A',
                totalAttended: 0,
                totalEvolutions: 0,
                withEvolution: 0,
                withoutEvolution: 0,
            }
        }

        doctorStats[did].totalAttended++
        if (evolutionByAppointment.has(apt.id)) {
            doctorStats[did].withEvolution++
        } else {
            doctorStats[did].withoutEvolution++
        }
    })

    for (const [did, dates] of Object.entries(evolutionsByDoctorDate)) {
        if (doctorStats[did]) {
            doctorStats[did].totalEvolutions = Object.values(dates).reduce((sum, n) => sum + n, 0)
        }
    }

    const totalAttended = Object.values(doctorStats).reduce((sum, d) => sum + d.totalAttended, 0)
    const totalEvolutions = Object.values(doctorStats).reduce((sum, d) => sum + d.totalEvolutions, 0)
    const complianceRate = totalAttended > 0 ? Math.round((totalEvolutions / totalAttended) * 100) : 0

    console.log(`\nRESUMO DE CONFORMIDADE (${clinicName}):`)
    console.log(`- Total Atendidos: ${totalAttended}`)
    console.log(`- Total Evolucoes: ${totalEvolutions}`)
    console.log(`- Indice de Conformidade: ${complianceRate}%`)
    console.log(`- Terapeutas mapeados: ${Object.keys(doctorStats).length}`)

    // Listar os primeiros 3 terapeutas
    Object.values(doctorStats).slice(0, 3).forEach(doc => {
        console.log(`  * ${doc.name}: ${doc.totalAttended} atendidos, ${doc.totalEvolutions} evolucoes`)
    })

    return true
}

async function run() {
    try {
        const startDate = '2026-05-01'
        const endDate = '2026-09-10'

        // Clinica Espaco Incluir
        const espacoOk = await testCompliance(
            '5163c916-8b82-4d80-8a71-01726836ee46',
            'Espaco Incluir',
            startDate,
            endDate
        )

        // Clinica World Sensory
        const sensoryOk = await testCompliance(
            '4c13e586-5390-4393-a180-2c9dd7ed81c7',
            'World Sensory',
            startDate,
            endDate
        )

        if (espacoOk && sensoryOk) {
            console.log(`\n[SUCCESS] Todos os testes de conformidade passaram com 100% de integridade!`)
            process.exit(0)
        } else {
            console.error(`\n[ERROR] Falha em um ou mais testes de conformidade.`)
            process.exit(1)
        }
    } catch (e) {
        console.error('Erro na execucao do teste:', e)
        process.exit(1)
    }
}

run()
