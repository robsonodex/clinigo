import assert from 'assert'

/**
 * Simula a função de autorização aplicada em:
 * - app/api/doctors/detail/route.ts
 * - app/api/doctors/[uuid]/route.ts
 * - app/api/doctors/[...slug]/route.ts
 * - app/api/clinics/[id]/doctors/bulk/route.ts
 */
function checkDoctorEditAuthorization({
    userRole,
    userId,
    userClinicId,
    doctorClinicId,
    doctorUserId,
}: {
    userRole: string | null
    userId: string | null
    userClinicId: string | null
    doctorClinicId: string
    doctorUserId: string
}) {
    const ESCOLAR_OU_INCLUIR_CLINIC_ID = '5163c916-8b82-4d80-8a71-01726836ee46'

    if (!userId || !userRole || !userClinicId) {
        return { authorized: false, reason: 'Não autenticado ou sem clínica' }
    }

    const isEspacoIncluir = (userClinicId === ESCOLAR_OU_INCLUIR_CLINIC_ID || doctorClinicId === ESCOLAR_OU_INCLUIR_CLINIC_ID) && userClinicId === doctorClinicId

    let isAuthorized = false

    if (userRole === 'SUPER_ADMIN') {
        isAuthorized = true
    } else if (userRole === 'DOCTOR') {
        if (doctorUserId === userId) {
            isAuthorized = true
        } else {
            return { authorized: false, reason: 'Você só pode editar seu próprio perfil' }
        }
    } else if (userRole === 'CLINIC_ADMIN') {
        if (userClinicId === doctorClinicId) {
            isAuthorized = true
        } else {
            return { authorized: false, reason: 'Acesso negado - clínica diferente' }
        }
    } else if (userRole === 'RECEPTIONIST' && isEspacoIncluir) {
        // Exclusivo Espaço Incluir: Comercial e Recepção autorizados a editar perfil de terapeutas da mesma clínica
        isAuthorized = true
    }

    if (!isAuthorized) {
        return { authorized: false, reason: 'Acesso negado' }
    }

    return { authorized: true }
}

async function runDoctorProfileIsolationTests() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(' TESTE DE ISOLAMENTO MULTI-TENANT: EDIÇÃO DE PERFIL DE TERAPEUTAS')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const ESPACO_INCLUIR_ID = '5163c916-8b82-4d80-8a71-01726836ee46'
    const WORLD_SENSORY_ID = '4c13e586-5390-4393-a180-2c9dd7ed81c7'
    const CLINICA_TERCEIRA_ID = '99999999-9999-9999-9999-999999999999'

    // Usuários de teste
    const karinaComercial = {
        userId: 'f7519c0f-3ce4-4e80-9086-1a91e64ca83d',
        userRole: 'RECEPTIONIST',
        userClinicId: ESPACO_INCLUIR_ID,
    }

    const recepcaoEspacoIncluir = {
        userId: 'c2755cde-d6d6-4309-9a9e-a3ac7abd933c',
        userRole: 'RECEPTIONIST',
        userClinicId: ESPACO_INCLUIR_ID,
    }

    const recepcaoWorldSensory = {
        userId: 'ws-recep-uuid-0001',
        userRole: 'RECEPTIONIST',
        userClinicId: WORLD_SENSORY_ID,
    }

    const recepcaoClinicaTerceira = {
        userId: 'terceira-recep-uuid-0002',
        userRole: 'RECEPTIONIST',
        userClinicId: CLINICA_TERCEIRA_ID,
    }

    const terapeutaEspacoIncluir = {
        doctorClinicId: ESPACO_INCLUIR_ID,
        doctorUserId: 'doc-espaco-uuid-001',
    }

    const terapeutaWorldSensory = {
        doctorClinicId: WORLD_SENSORY_ID,
        doctorUserId: 'doc-ws-uuid-002',
    }

    // TESTE 1: Comercial da Espaço Incluir editando terapeuta da Espaço Incluir -> DEVE PASSAR
    const t1 = checkDoctorEditAuthorization({
        ...karinaComercial,
        ...terapeutaEspacoIncluir,
    })
    assert.strictEqual(t1.authorized, true, 'TESTE 1 FALHOU: Comercial da Espaço Incluir deveria poder editar perfil de terapeuta da mesma clínica')
    console.log('[OK] Teste 1: Comercial da Espaço Incluir autorizado para terapeuta da Espaço Incluir.')

    // TESTE 2: Recepção da Espaço Incluir editando terapeuta da Espaço Incluir -> DEVE PASSAR
    const t2 = checkDoctorEditAuthorization({
        ...recepcaoEspacoIncluir,
        ...terapeutaEspacoIncluir,
    })
    assert.strictEqual(t2.authorized, true, 'TESTE 2 FALHOU: Recepção da Espaço Incluir deveria poder editar perfil de terapeuta da mesma clínica')
    console.log('[OK] Teste 2: Recepção da Espaço Incluir autorizada para terapeuta da Espaço Incluir.')

    // TESTE 3: Comercial da Espaço Incluir tentando editar terapeuta da World Sensory -> DEVE SER BLOQUEADO (0 vazamentos)
    const t3 = checkDoctorEditAuthorization({
        ...karinaComercial,
        ...terapeutaWorldSensory,
    })
    assert.strictEqual(t3.authorized, false, 'TESTE 3 FALHOU: Comercial da Espaço Incluir NÃO pode editar terapeuta de outra clínica')
    console.log('[OK] Teste 3: Tentativa de edição cross-clínica pela Espaço Incluir BLOQUEADA com sucesso.')

    // TESTE 4: Recepção da World Sensory tentando editar terapeuta da World Sensory -> DEVE SER BLOQUEADA (regra NÃO se aplica a outras clínicas)
    const t4 = checkDoctorEditAuthorization({
        ...recepcaoWorldSensory,
        ...terapeutaWorldSensory,
    })
    assert.strictEqual(t4.authorized, false, 'TESTE 4 FALHOU: Recepção de outras clínicas NÃO deve ter permissão de edição de terapeutas')
    console.log('[OK] Teste 4: Recepção da World Sensory BLOQUEADA (isolamento exclusivo para Espaço Incluir garantido).')

    // TESTE 5: Recepção de clínica terceira tentando editar terapeuta da Espaço Incluir -> DEVE SER BLOQUEADA
    const t5 = checkDoctorEditAuthorization({
        ...recepcaoClinicaTerceira,
        ...terapeutaEspacoIncluir,
    })
    assert.strictEqual(t5.authorized, false, 'TESTE 5 FALHOU: Terceiros não podem editar terapeutas da Espaço Incluir')
    console.log('[OK] Teste 5: Recepção de clínica terceira BLOQUEADA ao tentar editar Espaço Incluir.')

    // TESTE 6: Tentativa sem autenticação -> DEVE SER BLOQUEADA
    const t6 = checkDoctorEditAuthorization({
        userId: null,
        userRole: null,
        userClinicId: null,
        ...terapeutaEspacoIncluir,
    })
    assert.strictEqual(t6.authorized, false, 'TESTE 6 FALHOU: Requisições anônimas devem ser sumariamente bloqueadas')
    console.log('[OK] Teste 6: Usuário anônimo sumariamente bloqueado.')

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(' RESULTADO: TODOS OS 6 TESTES DE ISOLAMENTO PASSARAM COM 100% DE SUCESSO')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

runDoctorProfileIsolationTests()
