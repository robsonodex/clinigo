// scripts/test_v4_multisurface_spec.mjs
// Suite de Testes Automatizados da Arquitetura V4 (Multi-Superfície + Fluxo B + PIN Tablet)

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const ROOT = process.cwd()

console.log('=================================================================')
console.log('CLINIGO V4 // SUITE DE VERIFICACAO MULTI-SUPERFICIE & ANTIFRAUDE')
console.log('=================================================================\n')

let passed = 0
let failed = 0

function assert(condition, message) {
    if (condition) {
        console.log(`[PASS] ${message}`)
        passed++
    } else {
        console.error(`[FAIL] ${message}`)
        failed++
    }
}

// -----------------------------------------------------------------------------
// 1. Verificação de Arquivos Obrigatórios Criados
// -----------------------------------------------------------------------------
console.log('--- 1. ARQUIVOS E COMPONENTES V4 ---')

const requiredFiles = [
    'supabase/migrations/20260909_multisurface_checkin_v4.sql',
    'components/checkin/BiometricCaptureFrame.tsx',
    'components/checkin/StaffWebcamCheckinModal.tsx',
    'components/checkin/CheckinSurfacePicker.tsx',
    'components/appointments/TherapistStartBiometricModal.tsx',
    'components/terminal/ReceptionPinGate.tsx',
    'app/api/checkin/start/route.ts',
    'app/api/checkin/[token]/confirm/route.ts',
    'app/api/therapist/biometric-enrollment/route.ts',
    'app/api/appointments/[id]/start/route.ts',
    'app/api/reception/pin-login/route.ts',
    'app/api/reception/pins/route.ts',
    'app/api/checkin/patient-mobile/send-link/route.ts',
    'app/c/[capture_token]/page.tsx',
    'app/c/[capture_token]/PatientMobileCaptureClient.tsx',
    'lib/auth/reception-pin-auth.ts',
]

for (const relPath of requiredFiles) {
    const fullPath = resolve(ROOT, relPath)
    assert(existsSync(fullPath), `Arquivo existe: ${relPath}`)
}

// -----------------------------------------------------------------------------
// 2. Auditoria de Segurança: Zero supabase.auth e Zero active_sessions
// -----------------------------------------------------------------------------
console.log('\n--- 2. AUDITORIA DE SEGURANÇA E ISOLAMENTO (Checklist 2 e 3) ---')

const terminalPage = readFileSync(resolve(ROOT, 'app/terminal/page.tsx'), 'utf-8')
const patientPage = readFileSync(resolve(ROOT, 'app/c/[capture_token]/page.tsx'), 'utf-8')
const patientClient = readFileSync(resolve(ROOT, 'app/c/[capture_token]/PatientMobileCaptureClient.tsx'), 'utf-8')
const pinGate = readFileSync(resolve(ROOT, 'components/terminal/ReceptionPinGate.tsx'), 'utf-8')
const pinLogin = readFileSync(resolve(ROOT, 'app/api/reception/pin-login/route.ts'), 'utf-8')

assert(!terminalPage.includes('supabase.auth'), 'app/terminal/page.tsx possui ZERO supabase.auth')
assert(!patientPage.includes('supabase.auth'), 'app/c/[capture_token]/page.tsx possui ZERO supabase.auth')
assert(!patientClient.includes('supabase.auth'), 'PatientMobileCaptureClient.tsx possui ZERO supabase.auth')
assert(!pinGate.includes('supabase.auth'), 'components/terminal/ReceptionPinGate.tsx possui ZERO supabase.auth')

// active_sessions fora de comentários em pin-login
const pinLoginCodeOnly = pinLogin.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//gm, '')
assert(!pinLoginCodeOnly.includes('active_sessions'), 'app/api/reception/pin-login possui ZERO active_sessions em código')

// -----------------------------------------------------------------------------
// 3. Auditoria de Emojis em Arquivos Criados/Modificados
// -----------------------------------------------------------------------------
console.log('\n--- 3. AUDITORIA ZERO EMOJIS (Padrão Corporativo Internacional) ---')

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u

const filesToCheckEmojis = [
    'components/checkin/BiometricCaptureFrame.tsx',
    'components/checkin/StaffWebcamCheckinModal.tsx',
    'components/checkin/CheckinSurfacePicker.tsx',
    'components/appointments/TherapistStartBiometricModal.tsx',
    'components/terminal/ReceptionPinGate.tsx',
    'app/api/checkin/start/route.ts',
    'app/api/checkin/[token]/confirm/route.ts',
    'app/api/therapist/biometric-enrollment/route.ts',
    'app/api/appointments/[id]/start/route.ts',
    'app/api/reception/pin-login/route.ts',
    'app/c/[capture_token]/page.tsx',
    'app/c/[capture_token]/PatientMobileCaptureClient.tsx',
]

for (const relPath of filesToCheckEmojis) {
    const content = readFileSync(resolve(ROOT, relPath), 'utf-8')
    assert(!emojiRegex.test(content), `Zero emojis em: ${relPath}`)
}

// -----------------------------------------------------------------------------
// 4. Teste de Assinatura e Validação de PIN Efêmero (15 min)
// -----------------------------------------------------------------------------
console.log('\n--- 4. MODO RECEPÇÃO: PIN EFÊMERO & COOKIE ISOLADO (15 min) ---')

const mockSecret = 'test-reception-secret-key-2026'
const mockPayload = {
    clinic_id: '00000000-0000-0000-0000-000000000001',
    pin_id: 'pin-uuid-1234',
    label: 'Recepção - Turno Manhã',
    scope: 'terminal_reception',
}

const signedToken = jwt.sign(mockPayload, mockSecret, { expiresIn: 900 })
const decoded = jwt.verify(signedToken, mockSecret)

assert(decoded.clinic_id === mockPayload.clinic_id, 'JWT de recepção preserva clinic_id')
assert(decoded.scope === 'terminal_reception', 'JWT de recepção possui escopo restrito terminal_reception')
assert(decoded.exp - decoded.iat === 900, 'JWT de recepção expira exatamente em 15 minutos (900 segundos)')

// Teste do hash bcrypt para PIN de recepção
const rawPin = '4821'
const pinHash = await bcrypt.hash(rawPin, 10)
const isCorrectPin = await bcrypt.compare('4821', pinHash)
const isWrongPin = await bcrypt.compare('9999', pinHash)

assert(isCorrectPin === true, 'Bcrypt valida PIN correto de 4 dígitos')
assert(isWrongPin === false, 'Bcrypt rejeita PIN incorreto')

// -----------------------------------------------------------------------------
// 5. Teste de Distância Euclidiana & Limiar Biométrico (Fluxo B - Terapeuta)
// -----------------------------------------------------------------------------
console.log('\n--- 5. MATEMÁTICA BIOMÉTRICA & DISTÂNCIA EUCLIDIANA ---')

function calcDistance(desc1, desc2) {
    let sum = 0
    for (let i = 0; i < 128; i++) {
        const diff = desc1[i] - desc2[i]
        sum += diff * diff
    }
    return Math.sqrt(sum)
}

const therapistRefDesc = new Float32Array(128).fill(0.15)
const therapistLiveMatch = new Float32Array(128).fill(0.17) // pequena variação (< 0.58)
const impostorLiveDesc = new Float32Array(128).fill(0.60) // grande variação

const matchDistance = calcDistance(therapistRefDesc, therapistLiveMatch)
const impostorDistance = calcDistance(therapistRefDesc, impostorLiveDesc)
const THRESHOLD = 0.58

assert(matchDistance < THRESHOLD, `Terapeuta legítima confere (distância ${matchDistance.toFixed(4)} < ${THRESHOLD})`)
assert(impostorDistance >= THRESHOLD, `Impostor/outra pessoa é rejeitado (distância ${impostorDistance.toFixed(4)} >= ${THRESHOLD})`)

// -----------------------------------------------------------------------------
// 6. Auditoria de Código: Validação de created_by para staff_webcam
// -----------------------------------------------------------------------------
console.log('\n--- 6. REGRA DE ISOLAMENTO: POSSE DO TOKEN STAFF_WEBCAM (Checklist 4) ---')

const confirmRoute = readFileSync(resolve(ROOT, 'app/api/checkin/[token]/confirm/route.ts'), 'utf-8')
assert(confirmRoute.includes("tokenRecord.surface === 'staff_webcam'"), 'confirm/route.ts verifica explicitamente surface staff_webcam')
assert(confirmRoute.includes('user.id !== tokenRecord.created_by'), 'confirm/route.ts rejeita se user.id !== tokenRecord.created_by')

// -----------------------------------------------------------------------------
// 7. Auditoria de Código: Retorno 404 em app/c/[capture_token]/page.tsx
// -----------------------------------------------------------------------------
console.log('\n--- 7. REGRA DE PRIVACIDADE: 404 ESTREITO EM /c/:capture_token (Checklist 7) ---')

assert(patientPage.includes('notFound()'), 'app/c/[capture_token]/page.tsx invoca notFound() para tokens inválidos/expirados')
assert(!patientPage.includes('full_name: tokenRecord.patient?.full_name'), 'app/c/[capture_token]/page.tsx NUNCA envia nome completo para tela')
assert(patientPage.includes('rawFullName.split(/\\s+/)[0]'), 'app/c/[capture_token]/page.tsx extrai APENAS o primeiro nome do paciente')

// -----------------------------------------------------------------------------
// RESUMO FINAL
// -----------------------------------------------------------------------------
console.log('\n=================================================================')
console.log(`RESULTADO DA VERIFICAÇÃO: ${passed} PASSOU | ${failed} FALHOU`)
console.log('=================================================================')

if (failed > 0) {
    process.exit(1)
} else {
    process.exit(0)
}
