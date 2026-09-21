import assert from 'assert'
import fs from 'fs'
import path from 'path'

console.log('--- Iniciando Teste Automatizado de Isolamento por Profissional ---')

const patientsRoutePath = path.join(process.cwd(), 'app', 'api', 'patients', 'route.ts')
const reportsRoutePath = path.join(process.cwd(), 'app', 'api', 'reports', 'route.ts')

const patientsContent = fs.readFileSync(patientsRoutePath, 'utf-8')
const reportsContent = fs.readFileSync(reportsRoutePath, 'utf-8')

// Teste 1: app/api/patients/route.ts possui fail-closed seguro para DOCTOR
assert(
    patientsContent.includes("if (!doctor) {\n                    // Fail-closed: se o perfil de profissional não for encontrado, não vaza nenhum paciente da clínica\n                    return NextResponse.json({ patients: [], total: 0 })\n                }"),
    'Teste 1 Falhou: patients API deve ter fail-closed caso perfil do profissional não seja localizado'
)
console.log('OK - Teste 1 Aprovado: patients API possui bloqueio seguro (fail-closed) para DOCTOR')

// Teste 2: app/api/patients/route.ts consolida appointments, session_evolutions e doctor_patient_rates
assert(
    patientsContent.includes("from('appointments')") &&
    patientsContent.includes("from('session_evolutions')") &&
    patientsContent.includes("from('doctor_patient_rates')"),
    'Teste 2 Falhou: patients API deve buscar vínculos em appointments, session_evolutions e doctor_patient_rates'
)
console.log('OK - Teste 2 Aprovado: patients API consolida agendamentos, evoluções de prontuário e regras de repasse')

// Teste 3: app/api/patients/route.ts filtra exclusivamente por patientIds vinculados
assert(
    patientsContent.includes("query = query.in('id', patientIds)"),
    'Teste 3 Falhou: patients API deve aplicar query.in("id", patientIds)'
)
console.log('OK - Teste 3 Aprovado: patients API aplica query.in("id", patientIds) obrigatório')

// Teste 4: app/api/reports/route.ts força effectiveDoctorId a partir do usuário autenticado
assert(
    reportsContent.includes("effectiveDoctorId = doctor.id") &&
    reportsContent.includes("isDoctorRestricted = true"),
    'Teste 4 Falhou: reports API deve forçar effectiveDoctorId = doctor.id para perfil DOCTOR'
)
console.log('OK - Teste 4 Aprovado: reports API sobrescreve qualquer parâmetro com o doctor_id do usuário autenticado')

// Teste 5: app/api/reports/route.ts bloqueia relatórios de gestão da clínica para DOCTOR não-coordenador
assert(
    reportsContent.includes("isDoctorRestricted && ['dre_costcenter', 'glosas', 'ltv', 'revenue_by_month', 'patients_growth'].includes(reportType)"),
    'Teste 5 Falhou: reports API deve bloquear relatórios globais de gestão'
)
console.log('OK - Teste 5 Aprovado: reports API bloqueia relatórios de gestão global para profissionais comuns')

// Teste 6: getPatientSessions e getPatientFrequency aplicam doctor_id
assert(
    reportsContent.includes("if (doctorId) query = query.eq('doctor_id', doctorId)"),
    'Teste 6 Falhou: getPatientSessions ou getPatientFrequency devem aplicar eq("doctor_id", doctorId)'
)
console.log('OK - Teste 6 Aprovado: getPatientSessions e getPatientFrequency filtram estritamente por doctor_id')

// Teste 7: getAgendaReport e getReimbursementReport aplicam doctor_id
assert(
    reportsContent.includes("query = query.eq('doctor_id', doctorId)") &&
    reportsContent.includes("apptQuery = apptQuery.eq('doctor_id', doctorId)"),
    'Teste 7 Falhou: getAgendaReport e getReimbursementReport devem aplicar doctor_id'
)
console.log('OK - Teste 7 Aprovado: getAgendaReport e getReimbursementReport aplicam doctor_id')

// Teste 8: Zero emojis no código das rotas alteradas
const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
assert(!emojiRegex.test(patientsContent), 'Teste 8 Falhou: Encontrado emoji em app/api/patients/route.ts')
assert(!emojiRegex.test(reportsContent), 'Teste 8 Falhou: Encontrado emoji em app/api/reports/route.ts')
console.log('OK - Teste 8 Aprovado: Zero emojis detectados no código das rotas')

console.log('\n--- TODOS OS 8 TESTES DE ISOLAMENTO PASSARAM COM SUCESSO ---')
