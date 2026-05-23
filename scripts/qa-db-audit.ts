import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runAudit() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('       INICIANDO AUDITORIA DE BANCO     ')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // 1. Verificar Colunas em medical_records
    console.log('--- [1] Verificando colunas de Assinatura Digital em medical_records ---')
    try {
        const { error } = await supabase
            .from('medical_records')
            .select('signed_at, signed_by_patient, signature_url, signature_token, signature_token_expires_at')
            .limit(1)

        if (error) {
            if (error.message.includes('does not exist') || error.code === 'PGRST100') {
                console.log('❌ FALHA: Colunas de assinatura digital NÃO existem em medical_records!')
                console.log('Detalhes:', error.message)
            } else {
                console.log('⚠️ AVISO: Erro ao consultar colunas (mas a tabela existe):', error.message)
            }
        } else {
            console.log('✅ SUCESSO: Colunas de assinatura digital existem em medical_records!')
        }
    } catch (e: any) {
        console.log('❌ ERRO:', e.message)
    }

    // 2. Verificar Coluna lead_source em patients
    console.log('\n--- [2] Verificando coluna lead_source em patients ---')
    try {
        const { error } = await supabase
            .from('patients')
            .select('lead_source')
            .limit(1)

        if (error) {
            if (error.message.includes('does not exist') || error.code === 'PGRST100') {
                console.log('❌ FALHA: Coluna lead_source NÃO existe em patients!')
                console.log('Detalhes:', error.message)
            } else {
                console.log('⚠️ AVISO: Erro ao consultar lead_source:', error.message)
            }
        } else {
            console.log('✅ SUCESSO: Coluna lead_source existe em patients!')
        }
    } catch (e: any) {
        console.log('❌ ERRO:', e.message)
    }

    // 3. Verificar Tabela crm_stages
    console.log('\n--- [3] Verificando tabela crm_stages ---')
    try {
        const { error } = await supabase
            .from('crm_stages')
            .select('id, stage')
            .limit(1)

        if (error) {
            console.log('❌ FALHA: Tabela crm_stages NÃO existe ou está inacessível!')
            console.log('Detalhes:', error.message)
        } else {
            console.log('✅ SUCESSO: Tabela crm_stages existe no banco!')
        }
    } catch (e: any) {
        console.log('❌ ERRO:', e.message)
    }

    // 4. Verificar Tabela satisfaction_surveys
    console.log('\n--- [4] Verificando tabela satisfaction_surveys ---')
    try {
        const { error } = await supabase
            .from('satisfaction_surveys')
            .select('id, nps_score')
            .limit(1)

        if (error) {
            console.log('❌ FALHA: Tabela satisfaction_surveys NÃO existe ou está inacessível!')
            console.log('Detalhes:', error.message)
        } else {
            console.log('✅ SUCESSO: Tabela satisfaction_surveys existe no banco!')
        }
    } catch (e: any) {
        console.log('❌ ERRO:', e.message)
    }

    // 5. Auditoria de Contagem de Linhas para as 18 tabelas zeradas
    console.log('\n--- [5] Contagem de registros nas 18 tabelas críticas ---')
    const criticalTables = [
        'pre_checkin_submissions',
        'appointment_checkins',
        'appointment_queue',
        'patient_credentials',
        'patient_sessions',
        'patient_consents',
        'product_categories',
        'document_views',
        'therapeutic_plans',
        'therapeutic_plan_goals',
        'partner_commissions',
        'clinic_referrals',
        'tiss_glosas',
        'tiss_authorization_requests',
        'tiss_returns',
        'tiss_webservice_configs',
        'clinic_custom_permissions',
        'clinic_integrations'
    ]

    for (const table of criticalTables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true })

            if (error) {
                console.log(`❌ ${table}: Tabela não existe ou erro ao ler. Erro: ${error.message}`)
            } else {
                console.log(`📊 ${table}: ${count} registros`)
            }
        } catch (e: any) {
            console.log(`❌ ${table}: Exceção: ${e.message}`)
        }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('       FIM DA AUDITORIA DE BANCO        ')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

runAudit().catch(console.error)
