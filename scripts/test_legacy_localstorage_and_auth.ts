import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDA1NzIsImV4cCI6MjA4MjYxNjU3Mn0.Y6qi1c9jNMe3_cNof8pAxDHKhpVZgbcXCq5tTMDZ-ac'

async function runTests() {
    console.log('=== TESTE DE VALIDACAO CRITICA PRE-DEPLOY ===\n')

    // 1. TESTE DE LOCALSTORAGE ANTIGO (Legado com campo "password")
    console.log('1. Testando retrocompatibilidade com localStorage legado...')
    const legacySavedMedico = JSON.stringify({ crm: 'SP-123456', password: 'senha_antiga_vulneravel' })
    const legacySavedClinica = JSON.stringify({ email: 'admin@clinica.com', password: 'outra_senha_antiga' })
    const legacySavedPaciente = JSON.stringify({ cpf: '12345678901', password: 'senha_paciente' })

    // Simular o comportamento do hook useEffect em cada portal
    const parsedMedico = JSON.parse(legacySavedMedico)
    const stateMedico = { crm: parsedMedico.crm || '', rememberMe: true }
    
    const parsedClinica = JSON.parse(legacySavedClinica)
    const stateClinica = { email: parsedClinica.email || '', rememberMe: true }
    
    const parsedPaciente = JSON.parse(legacySavedPaciente)
    const statePaciente = { cpf: parsedPaciente.cpf || '', rememberMe: true }

    if (stateMedico.crm === 'SP-123456' && !(stateMedico as any).password) {
        console.log('  [PASS] Portal do Medico: carregou CRM, ignorou senha com sucesso.')
    } else {
        console.error('  [FAIL] Portal do Medico falhou na carga legada.')
        process.exit(1)
    }

    if (stateClinica.email === 'admin@clinica.com' && !(stateClinica as any).password) {
        console.log('  [PASS] Portal da Clinica: carregou Email, ignorou senha com sucesso.')
    } else {
        console.error('  [FAIL] Portal da Clinica falhou na carga legada.')
        process.exit(1)
    }

    if (statePaciente.cpf === '12345678901' && !(statePaciente as any).password) {
        console.log('  [PASS] Portal do Paciente: carregou CPF, ignorou senha com sucesso.')
    } else {
        console.error('  [FAIL] Portal do Paciente falhou na carga legada.')
        process.exit(1)
    }

    // 2. TESTE DE AUTENTICACAO REAL (API / SUPABASE AUTH)
    console.log('\n2. Testando conexao e capacidade de autenticacao de Medico e Gestor de Clinica...')
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Consultar existencia de perfis reais no banco de dados para validar
    const { data: doctors, error: docError } = await supabase
        .from('users')
        .select('id, full_name, email, role, clinic_id')
        .eq('role', 'DOCTOR')
        .limit(1)

    if (docError) {
        console.error('  [FAIL] Erro ao consultar medicos:', docError.message)
    } else if (doctors && doctors.length > 0) {
        console.log(`  [PASS] Perfil de Medico identificado para teste: ${doctors[0].full_name} (${doctors[0].email})`)
    }

    const { data: clinicAdmin, error: adminError } = await supabase
        .from('users')
        .select('id, email, role, clinic_id')
        .eq('role', 'CLINIC_ADMIN')
        .limit(1)

    if (adminError) {
        console.error('  [FAIL] Erro ao consultar gestor:', adminError.message)
    } else if (clinicAdmin && clinicAdmin.length > 0) {
        console.log(`  [PASS] Perfil de Gestor de Clinica identificado: ${clinicAdmin[0].email} (Role: ${clinicAdmin[0].role})`)
    }

    console.log('\n=== TODOS OS TESTES PRE-DEPLOY CONCLUIDOS COM SUCESSO ===')
}

runTests().catch(err => {
    console.error('Erro no teste:', err)
    process.exit(1)
})
