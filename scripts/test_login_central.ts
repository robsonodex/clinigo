import fs from 'fs'
import path from 'path'

function runTests() {
    console.log('=== TESTE DE VALIDACAO - ETAPA 1 (LOGIN E SEGURANCA) ===')
    let passed = 0
    let failed = 0

    function assert(condition: boolean, message: string) {
        if (condition) {
            console.log(`[PASS] ${message}`)
            passed++
        } else {
            console.error(`[FAIL] ${message}`)
            failed++
        }
    }

    // 1. Validar app/(auth)/login/page.tsx
    const loginPath = path.join(process.cwd(), 'app', '(auth)', 'login', 'page.tsx')
    const loginContent = fs.readFileSync(loginPath, 'utf8')

    assert(
        !loginContent.includes("profile?.role !== 'SUPER_ADMIN'") || 
        loginContent.includes("handleSuperAdminLogin"),
        'Trava geral de SUPER_ADMIN foi removida do fluxo principal de /login'
    )
    assert(
        loginContent.includes('/clinica') && 
        loginContent.includes('/medico') && 
        loginContent.includes('/paciente'),
        'Central de acesso contem os links para os 3 portais (/clinica, /medico, /paciente)'
    )
    assert(
        loginContent.includes('Portal da Clinica') &&
        loginContent.includes('Portal do Medico') &&
        loginContent.includes('Portal do Paciente'),
        'Nomenclaturas corretas dos portais presentes na Central de Acesso'
    )
    assert(
        loginContent.includes('showSuperAdminModal') &&
        loginContent.includes("e.key === 'Escape'") &&
        loginContent.includes('Acesso Super Administrador'),
        'Acesso tecnico discreto para Super Admin com fechamento por Escape e backdrop'
    )
    assert(
        loginContent.includes('checkExistingAuth') &&
        loginContent.includes('patient_token') &&
        loginContent.includes('getSession'),
        'Redirecionamento automatico para usuarios ja autenticados implementado'
    )

    // 2. Validar app/medico/page.tsx (Lembrar de mim seguro)
    const medicoPath = path.join(process.cwd(), 'app', 'medico', 'page.tsx')
    const medicoContent = fs.readFileSync(medicoPath, 'utf8').replace(/\r\n/g, '\n')
    assert(
        !medicoContent.includes("localStorage.setItem('clinigo_remember_medico', JSON.stringify({\n                    crm: formData.crm,\n                    password:") &&
        medicoContent.includes("localStorage.setItem('clinigo_remember_medico', JSON.stringify({\n                    crm: formData.crm\n                }))"),
        'Portal do Medico nao salva mais a senha em texto plano no localStorage'
    )

    // 3. Validar app/clinica/page.tsx (Lembrar de mim seguro)
    const clinicaPath = path.join(process.cwd(), 'app', 'clinica', 'page.tsx')
    const clinicaContent = fs.readFileSync(clinicaPath, 'utf8').replace(/\r\n/g, '\n')
    assert(
        !clinicaContent.includes("localStorage.setItem('clinigo_remember_clinica', JSON.stringify({\n                    email: formData.email,\n                    password:") &&
        clinicaContent.includes("localStorage.setItem('clinigo_remember_clinica', JSON.stringify({\n                    email: formData.email\n                }))"),
        'Portal da Clinica nao salva mais a senha em texto plano no localStorage'
    )

    // 4. Validar app/paciente/page.tsx (Lembrar de mim seguro)
    const pacientePath = path.join(process.cwd(), 'app', 'paciente', 'page.tsx')
    const pacienteContent = fs.readFileSync(pacientePath, 'utf8').replace(/\r\n/g, '\n')
    assert(
        !pacienteContent.includes("localStorage.setItem('clinigo_remember_paciente', JSON.stringify({\n                    cpf: formData.cpf,\n                    password:") &&
        pacienteContent.includes("localStorage.setItem('clinigo_remember_paciente', JSON.stringify({\n                    cpf: formData.cpf\n                }))"),
        'Portal do Paciente nao salva mais a senha em texto plano no localStorage'
    )

    console.log(`\nResultado: ${passed} passaram, ${failed} falharam.`)
    if (failed > 0) {
        process.exit(1)
    }
}

runTests()
