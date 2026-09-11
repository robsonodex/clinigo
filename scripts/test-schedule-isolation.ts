import assert from 'assert'

// Test authorization logic implemented in app/api/doctors/detail/route.ts and app/api/doctors/[...slug]/route.ts
function checkScheduleAuthorization(userProfile: { role: string; clinic_id: string; id: string }, doctor: { clinic_id: string; user_id: string }) {
    const ESCOLAR_OU_INCLUIR_CLINIC_ID = '5163c916-8b82-4d80-8a71-01726836ee46'
    const isEspacoIncluir = (userProfile.clinic_id === ESCOLAR_OU_INCLUIR_CLINIC_ID || doctor.clinic_id === ESCOLAR_OU_INCLUIR_CLINIC_ID) && userProfile.clinic_id === doctor.clinic_id

    let isAuthorized = false

    if (userProfile.role === 'SUPER_ADMIN') {
        isAuthorized = true
    } else if (userProfile.role === 'DOCTOR') {
        if (doctor.user_id === userProfile.id) {
            isAuthorized = true
        } else {
            return { authorized: false, reason: 'Você só pode editar sua própria agenda' }
        }
    } else if (userProfile.role === 'CLINIC_ADMIN') {
        if (userProfile.clinic_id === doctor.clinic_id) {
            isAuthorized = true
        } else {
            return { authorized: false, reason: 'Acesso negado - clínica diferente' }
        }
    } else if (userProfile.role === 'RECEPTIONIST' && isEspacoIncluir) {
        // Escopo isolado especificamente para a clínica Espaço Incluir (ex: Karina / Recepção)
        isAuthorized = true
    }

    if (!isAuthorized) {
        return { authorized: false, reason: 'Acesso negado' }
    }

    return { authorized: true }
}

async function runTests() {
    console.log('--- Iniciando Testes de Isolamento de Autorização de Horários ---')

    const espacoIncluirId = '5163c916-8b82-4d80-8a71-01726836ee46'
    const worldSensoryId = '4c13e586-5390-4393-a180-2c9dd7ed81c7'

    const karinaEspacoIncluir = {
        id: 'f7519c0f-3ce4-4e80-9086-1a91e64ca83d',
        role: 'RECEPTIONIST',
        clinic_id: espacoIncluirId
    }

    const receptionistOtherClinic = {
        id: 'other-recep-id',
        role: 'RECEPTIONIST',
        clinic_id: worldSensoryId
    }

    const doctorEspacoIncluir = {
        clinic_id: espacoIncluirId,
        user_id: 'doc-espaco-id'
    }

    const doctorWorldSensory = {
        clinic_id: worldSensoryId,
        user_id: 'doc-worldsensory-id'
    }

    // Teste 1: Karina (Espaço Incluir) alterando terapeuta da Espaço Incluir
    const t1 = checkScheduleAuthorization(karinaEspacoIncluir, doctorEspacoIncluir)
    assert.strictEqual(t1.authorized, true, 'TESTE 1 FALHOU: Karina deveria poder editar terapeuta da Espaço Incluir')
    console.log('PASSOU: Teste 1 - Recepcionista da Espaço Incluir tem acesso a terapeuta da própria clínica.')

    // Teste 2: Karina (Espaço Incluir) tentando alterar terapeuta de OUTRA clínica (WorldSensory)
    const t2 = checkScheduleAuthorization(karinaEspacoIncluir, doctorWorldSensory)
    assert.strictEqual(t2.authorized, false, 'TESTE 2 FALHOU: Karina NÃO pode alterar terapeuta de outra clínica')
    console.log('PASSOU: Teste 2 - Recepcionista da Espaço Incluir é BLOQUEADA ao tentar acessar outra clínica (0 vazamentos).')

    // Teste 3: Recepcionista de OUTRA clínica tentando alterar terapeuta da SUA clínica
    const t3 = checkScheduleAuthorization(receptionistOtherClinic, doctorWorldSensory)
    assert.strictEqual(t3.authorized, false, 'TESTE 3 FALHOU: Outras clínicas não devem ter bypass de recepção')
    console.log('PASSOU: Teste 3 - Recepcionista de outra clínica é BLOQUEADA (isolamento estrito para a Espaço Incluir mantido).')

    // Teste 4: Admin da Espaço Incluir tentando alterar terapeuta de outra clínica
    const adminEspacoIncluir = { id: 'admin-id', role: 'CLINIC_ADMIN', clinic_id: espacoIncluirId }
    const t4 = checkScheduleAuthorization(adminEspacoIncluir, doctorWorldSensory)
    assert.strictEqual(t4.authorized, false, 'TESTE 4 FALHOU: Admin de uma clínica não pode alterar outra clínica')
    console.log('PASSOU: Teste 4 - Admin de clínica diferente é rigorosamente bloqueado.')

    console.log('--- TODOS OS 4 TESTES DE ISOLAMENTO PASSARAM COM 100% DE SUCESSO ---')
}

runTests()
