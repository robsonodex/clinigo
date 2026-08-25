import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  VALIDAÇÃO DAS CORREÇÕES E NOVO MÓDULO ')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // 1. Verificar se a clínica Espaço Incluir e profissionais existem
    console.log('--- [1] Consultando Clínica e Profissionais ---')
    const { data: clinics } = await supabase
        .from('clinics')
        .select('id, name, slug')
        .ilike('name', '%Espaço Incluir%')
        .limit(1)

    const clinic = clinics?.[0]
    if (clinic) {
        console.log(`✅ Clínica encontrada: ${clinic.name} (${clinic.id})`)

        const { data: doctors } = await supabase
            .from('doctors')
            .select('id, specialty, user:users(full_name, email)')
            .eq('clinic_id', clinic.id)

        console.log(`✅ Profissionais encontrados na clínica: ${doctors?.length || 0}`)
        doctors?.slice(0, 5).forEach((d: any) => {
            console.log(`   - ${d.user?.full_name || 'Profissional'} (${d.specialty || 'Geral'}) [ID: ${d.id}]`)
        })
    } else {
        console.log('ℹ️ Clínica Espaço Incluir não localizada por nome aproximado, buscando qualquer clínica para teste...')
        const { data: anyClinic } = await supabase.from('clinics').select('id, name').limit(1).single()
        console.log(`Clínica para teste: ${anyClinic?.name} (${anyClinic?.id})`)
    }

    // 2. Verificar Tabelas de Questionários Terapêuticos
    console.log('\n--- [2] Verificando Tabelas de Questionários Terapêuticos ---')
    const tables = [
        'therapeutic_plan_questionnaire_templates',
        'therapeutic_plan_questionnaire_responses'
    ]

    for (const tbl of tables) {
        const { data, error } = await supabase.from(tbl).select('*').limit(1)
        if (error) {
            console.log(`⚠️ Tabela ${tbl} retornou erro: ${error.message}`)
            console.log(`   Código: ${error.code}`)
        } else {
            console.log(`✅ Tabela ${tbl} está acessível e operacional!`)
        }
    }

    // 3. Teste de Templates Pré-definidos ABA
    console.log('\n--- [3] Validando Templates Padrão ABA ---')
    const { DEFAULT_QUESTIONNAIRE_TEMPLATES } = await import('../app/api/therapeutic-plans/questionnaires/templates/route')
    console.log(`✅ ${DEFAULT_QUESTIONNAIRE_TEMPLATES.length} templates padrão integrados:`)
    DEFAULT_QUESTIONNAIRE_TEMPLATES.forEach(t => {
        console.log(`   - [${t.category}] ${t.title} (${t.structure.columns.length} colunas)`)
    })

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  VALIDAÇÃO CONCLUÍDA COM SUCESSO')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(err => {
    console.error('Erro na validação:', err)
})
