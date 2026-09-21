// scripts/test-hide-insurance-from-doctors.mjs
// Teste de validação de isolamento e bloqueio de informações de convênio para perfil DOCTOR

import fs from 'fs';
import path from 'path';

console.log('[TEST] Iniciando verificação de segurança: Restrição de dados de convênio para DOCTOR...');

let hasErrors = false;

function assert(condition, message) {
    if (!condition) {
        console.error(`[FAIL] ${message}`);
        hasErrors = true;
    } else {
        console.log(`[PASS] ${message}`);
    }
}

// 1. Verificar app/api/patients/route.ts
const patientsApi = fs.readFileSync('app/api/patients/route.ts', 'utf-8');
assert(patientsApi.includes("userData.role === 'DOCTOR'"), "app/api/patients/route.ts deve checar userData.role === 'DOCTOR'");
assert(patientsApi.includes("health_insurance_id: null"), "app/api/patients/route.ts GET deve anular health_insurance_id para DOCTOR");
assert(patientsApi.includes("insurance_card_number: null"), "app/api/patients/route.ts GET deve anular insurance_card_number para DOCTOR");
assert(patientsApi.includes("insurance_plan_name: null"), "app/api/patients/route.ts GET deve anular insurance_plan_name para DOCTOR");
assert(patientsApi.includes("health_insurances: null"), "app/api/patients/route.ts GET deve anular health_insurances para DOCTOR");

// 2. Verificar app/api/patients/[id]/route.ts
const patientDetailApi = fs.readFileSync('app/api/patients/[id]/route.ts', 'utf-8');
assert(patientDetailApi.includes("userData?.role === 'DOCTOR'"), "app/api/patients/[id]/route.ts deve checar userData?.role === 'DOCTOR'");
assert(patientDetailApi.includes("patient.health_insurance_id = null"), "app/api/patients/[id]/route.ts GET deve anular health_insurance_id");
assert(patientDetailApi.includes("patient.insurance_card_number = null"), "app/api/patients/[id]/route.ts GET deve anular insurance_card_number");
assert(patientDetailApi.includes("delete updatePayload.health_insurance_id"), "app/api/patients/[id]/route.ts PATCH deve impedir DOCTOR de alterar health_insurance_id");

// 3. Verificar app/dashboard/(clinic)/pacientes/page.tsx
const patientsListPage = fs.readFileSync('app/dashboard/(clinic)/pacientes/page.tsx', 'utf-8');
assert(patientsListPage.includes("const isDoctor = user?.role === 'DOCTOR'"), "app/dashboard/(clinic)/pacientes/page.tsx deve definir isDoctor");
assert(patientsListPage.includes("{!isDoctor && ("), "app/dashboard/(clinic)/pacientes/page.tsx deve ter proteções {!isDoctor && (");
assert(patientsListPage.includes("health_insurance_id: null"), "app/dashboard/(clinic)/pacientes/page.tsx exportação deve sanear dados para DOCTOR");

// 4. Verificar app/dashboard/(clinic)/pacientes/[id]/page.tsx
const patientDetailPage = fs.readFileSync('app/dashboard/(clinic)/pacientes/[id]/page.tsx', 'utf-8');
assert(patientDetailPage.includes("const isDoctor = user?.role === 'DOCTOR'"), "app/dashboard/(clinic)/pacientes/[id]/page.tsx deve definir isDoctor");
assert(patientDetailPage.includes("if (isDoctor) return;"), "app/dashboard/(clinic)/pacientes/[id]/page.tsx loadInsurances deve retornar se isDoctor");
assert(patientDetailPage.includes("delete mappedData.health_insurance_id"), "app/dashboard/(clinic)/pacientes/[id]/page.tsx handleEditSubmit deve remover dados de plano se isDoctor");
assert(patientDetailPage.includes("!isDoctor && ("), "app/dashboard/(clinic)/pacientes/[id]/page.tsx deve ocultar seções com !isDoctor");

// 5. Verificar ausência de emojis proibidos nos arquivos alterados
const modifiedFiles = [
    'app/api/patients/route.ts',
    'app/api/patients/[id]/route.ts',
    'app/dashboard/(clinic)/pacientes/page.tsx',
    'app/dashboard/(clinic)/pacientes/[id]/page.tsx'
];

const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}\u{20D0}-\u{20FF}]/u;

for (const file of modifiedFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const hasEmoji = emojiRegex.test(content);
    assert(!hasEmoji, `Arquivo ${file} nao deve conter emojis (padrao premium internacional)`);
}

if (hasErrors) {
    console.error('[TEST] Falhas detectadas nos testes de restrição de convênios.');
    process.exit(1);
} else {
    console.log('[TEST] Todos os testes passaram com sucesso! 100% isolado.');
}
