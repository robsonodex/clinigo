/**
 * Script: Relatório Agendamentos Atendidos x Evoluções Realizadas
 * Solicitação: Jefferson - Espaço Incluir
 * Objetivo: Identificar terapeutas que não estão gerando evolução diariamente
 * 
 * Execução: npx tsx scripts/report-evolution-vs-attended.ts
 */

const SUPABASE_URL = 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo'

// Espaço Incluir clinic_id
const CLINIC_ID = '5163c916-8b82-4d80-8a71-01726836ee46'

interface AppointmentRow {
    id: string
    doctor_id: string
    appointment_date: string
    status: string
    doctors: { id: string; user: { full_name: string } | { full_name: string }[] }
}

interface EvolutionRow {
    id: string
    doctor_id: string
    appointment_id: string | null
    evolution_date: string
}

async function supabaseQuery(table: string, params: Record<string, string>) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`)
    for (const [key, val] of Object.entries(params)) {
        url.searchParams.set(key, val)
    }
    
    const res = await fetch(url.toString(), {
        headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'count=exact',
        },
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Supabase error (${res.status}): ${text}`)
    }

    const totalCount = res.headers.get('content-range')
    const data = await res.json()
    return { data, totalCount }
}

async function supabaseRPC(fnName: string, body: Record<string, any>) {
    const url = `${SUPABASE_URL}/rest/v1/rpc/${fnName}`
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Supabase RPC error (${res.status}): ${text}`)
    }

    return res.json()
}

async function fetchAllPages(table: string, baseParams: Record<string, string>, pageSize = 1000): Promise<any[]> {
    let allData: any[] = []
    let offset = 0
    let hasMore = true

    while (hasMore) {
        const params = {
            ...baseParams,
            'limit': pageSize.toString(),
            'offset': offset.toString(),
        }

        const { data } = await supabaseQuery(table, params)
        allData = allData.concat(data)

        if (data.length < pageSize) {
            hasMore = false
        } else {
            offset += pageSize
        }
    }

    return allData
}

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════════╗')
    console.log('║   RELATÓRIO: ATENDIDOS x EVOLUÇÕES — ESPAÇO INCLUIR           ║')
    console.log('╚══════════════════════════════════════════════════════════════════╝')
    console.log()

    // Período: últimos 30 dias
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    
    const startStr = startDate.toISOString().split('T')[0]
    const endStr = endDate.toISOString().split('T')[0]

    console.log(`📅 Período: ${startStr} a ${endStr} (últimos 30 dias)`)
    console.log()

    // 1. Buscar agendamentos atendidos (status completed/attended/confirmed)
    console.log('🔄 Buscando agendamentos atendidos...')
    const appointments = await fetchAllPages('appointments', {
        'select': 'id,doctor_id,appointment_date,status,doctors(id,users(full_name))',
        'clinic_id': `eq.${CLINIC_ID}`,
        'appointment_date': `gte.${startStr}`,
        'status': 'eq.COMPLETED',
    })

    console.log(`   ✅ Total de agendamentos atendidos: ${appointments.length}`)
    console.log()

    // 2. Buscar evoluções do período
    console.log('🔄 Buscando evoluções realizadas...')
    const evolutions = await fetchAllPages('session_evolutions', {
        'select': 'id,doctor_id,appointment_id,evolution_date',
        'clinic_id': `eq.${CLINIC_ID}`,
        'evolution_date': `gte.${startStr}`,
    })

    console.log(`   ✅ Total de evoluções: ${evolutions.length}`)
    console.log()

    // 3. Mapear por terapeuta
    const doctorMap: Record<string, {
        name: string
        totalAttended: number
        totalEvolutions: number
        appointmentsWithEvolution: Set<string>
        appointmentsWithoutEvolution: string[]
        dailyBreakdown: Record<string, { attended: number; evolutions: number }>
    }> = {}

    // Processar agendamentos
    for (const apt of appointments) {
        const did = apt.doctor_id
        if (!did) continue

        const docUser = apt.doctors?.users
        const docName = docUser 
            ? (Array.isArray(docUser) ? docUser[0]?.full_name : (docUser as any)?.full_name) 
            : 'N/A'

        if (!doctorMap[did]) {
            doctorMap[did] = {
                name: docName || 'N/A',
                totalAttended: 0,
                totalEvolutions: 0,
                appointmentsWithEvolution: new Set(),
                appointmentsWithoutEvolution: [],
                dailyBreakdown: {},
            }
        }

        doctorMap[did].totalAttended++

        const dateKey = apt.appointment_date
        if (!doctorMap[did].dailyBreakdown[dateKey]) {
            doctorMap[did].dailyBreakdown[dateKey] = { attended: 0, evolutions: 0 }
        }
        doctorMap[did].dailyBreakdown[dateKey].attended++
    }

    // Processar evoluções
    for (const evo of evolutions) {
        const did = evo.doctor_id
        if (!did || !doctorMap[did]) {
            // Terapeuta tem evolução mas não está no mapa (pode não ter agendamento atendido no período)
            if (did && !doctorMap[did]) {
                doctorMap[did] = {
                    name: 'N/A (sem agendamentos atendidos)',
                    totalAttended: 0,
                    totalEvolutions: 0,
                    appointmentsWithEvolution: new Set(),
                    appointmentsWithoutEvolution: [],
                    dailyBreakdown: {},
                }
            }
            if (!did) continue
        }

        doctorMap[did].totalEvolutions++

        if (evo.appointment_id) {
            doctorMap[did].appointmentsWithEvolution.add(evo.appointment_id)
        }

        const dateKey = evo.evolution_date
        if (!doctorMap[did].dailyBreakdown[dateKey]) {
            doctorMap[did].dailyBreakdown[dateKey] = { attended: 0, evolutions: 0 }
        }
        doctorMap[did].dailyBreakdown[dateKey].evolutions++
    }

    // Identificar agendamentos sem evolução
    for (const apt of appointments) {
        const did = apt.doctor_id
        if (!did || !doctorMap[did]) continue
        if (!doctorMap[did].appointmentsWithEvolution.has(apt.id)) {
            doctorMap[did].appointmentsWithoutEvolution.push(apt.id)
        }
    }

    // 4. Exibir resultados
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  RESUMO POR TERAPEUTA')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log()

    // Ordenar por % de falta de evolução (pior primeiro)
    const sortedDoctors = Object.entries(doctorMap)
        .map(([id, data]) => ({
            id,
            ...data,
            missingRate: data.totalAttended > 0 
                ? Math.round(((data.totalAttended - data.appointmentsWithEvolution.size) / data.totalAttended) * 100) 
                : 0,
        }))
        .sort((a, b) => b.missingRate - a.missingRate)

    // Header da tabela
    console.log(
        'Terapeuta'.padEnd(35) +
        'Atendidos'.padEnd(12) +
        'Evoluções'.padEnd(12) +
        'Sem Evolução'.padEnd(15) +
        '% Faltando'
    )
    console.log('─'.repeat(85))

    for (const doc of sortedDoctors) {
        const missing = doc.totalAttended - doc.appointmentsWithEvolution.size
        const missingPct = doc.totalAttended > 0 
            ? Math.round((missing / doc.totalAttended) * 100) 
            : 0

        const alert = missingPct > 30 ? ' ⚠️' : missingPct > 10 ? ' ⚡' : ' ✅'

        console.log(
            doc.name.substring(0, 33).padEnd(35) +
            doc.totalAttended.toString().padEnd(12) +
            doc.totalEvolutions.toString().padEnd(12) +
            missing.toString().padEnd(15) +
            `${missingPct}%${alert}`
        )
    }

    console.log()
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  LEGENDA:')
    console.log('  ⚠️  = Mais de 30% de agendamentos sem evolução (CRÍTICO)')
    console.log('  ⚡ = Entre 10% e 30% sem evolução (ATENÇÃO)')
    console.log('  ✅ = Menos de 10% sem evolução (OK)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log()

    // 5. Detalhamento dos piores (top 5)
    const criticalDoctors = sortedDoctors.filter(d => d.missingRate > 0).slice(0, 10)
    
    if (criticalDoctors.length > 0) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('  DETALHAMENTO DIÁRIO — TERAPEUTAS COM EVOLUÇÕES PENDENTES')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log()

        for (const doc of criticalDoctors) {
            console.log(`📋 ${doc.name} (${doc.missingRate}% sem evolução)`)
            console.log('   ' + 'Data'.padEnd(15) + 'Atendidos'.padEnd(12) + 'Evoluções'.padEnd(12) + 'Diferença')
            console.log('   ' + '─'.repeat(50))

            const sortedDates = Object.entries(doc.dailyBreakdown)
                .sort(([a], [b]) => b.localeCompare(a))
                .slice(0, 15)  // últimos 15 dias com atividade

            for (const [date, stats] of sortedDates) {
                const diff = stats.attended - stats.evolutions
                const diffStr = diff > 0 ? `🔴 -${diff}` : diff === 0 ? '✅ 0' : `⬆️ +${Math.abs(diff)}`
                console.log(
                    '   ' +
                    date.padEnd(15) +
                    stats.attended.toString().padEnd(12) +
                    stats.evolutions.toString().padEnd(12) +
                    diffStr
                )
            }
            console.log()
        }
    }

    // 6. Resumo geral
    const totalAttended = sortedDoctors.reduce((sum, d) => sum + d.totalAttended, 0)
    const totalEvolutions = sortedDoctors.reduce((sum, d) => sum + d.totalEvolutions, 0)
    const totalMissing = sortedDoctors.reduce((sum, d) => sum + (d.totalAttended - d.appointmentsWithEvolution.size), 0)

    console.log('╔══════════════════════════════════════════════════════════════════╗')
    console.log('║   RESUMO GERAL                                                 ║')
    console.log('╠══════════════════════════════════════════════════════════════════╣')
    console.log(`║   Total Agendamentos Atendidos:  ${totalAttended.toString().padEnd(29)}║`)
    console.log(`║   Total Evoluções Realizadas:    ${totalEvolutions.toString().padEnd(29)}║`)
    console.log(`║   Agendamentos SEM Evolução:     ${totalMissing.toString().padEnd(29)}║`)
    console.log(`║   Taxa de Conformidade:          ${totalAttended > 0 ? Math.round(((totalAttended - totalMissing) / totalAttended) * 100) + '%' : 'N/A'}${' '.repeat(Math.max(0, 28 - (totalAttended > 0 ? (Math.round(((totalAttended - totalMissing) / totalAttended) * 100) + '%').length : 3)))}║`)
    console.log('╚══════════════════════════════════════════════════════════════════╝')
}

main().catch(console.error)
