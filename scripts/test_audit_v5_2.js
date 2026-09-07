// scripts/test_audit_v5_2.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar .env.local manualmente
const envPath = path.resolve(process.cwd(), '.env.local');
let env = {};
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach(l => {
    const idx = l.indexOf('=');
    if (idx > 0 && !l.trim().startsWith('#')) {
      const key = l.slice(0, idx).trim();
      const val = l.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      env[key] = val;
    }
  });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('ERRO: Variaveis Supabase nao encontradas em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Logica de deteccao de intencao WhatsApp
function normalizeText(text) {
  return (text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isConfirmationMessage(text) {
  if (!text) return false;
  const norm = normalizeText(text);
  const triggers = [
    'sim',
    'confirmo',
    'confirmar',
    'confirmado',
    'confirmada',
    'estarei presente',
    'vou sim',
    'com certeza',
    'ok',
    'vou',
    'positivo',
    'confirmadissimo'
  ];
  return triggers.some((t) => norm === t || norm.startsWith(`${t} `) || norm.endsWith(` ${t}`));
}

function isCancellationMessage(text) {
  if (!text) return false;
  const norm = normalizeText(text);
  const triggers = [
    'nao',
    'nao vou',
    'nao posso',
    'nao poderei',
    'cancelar',
    'desmarcar',
    'cancela',
    'imprevisto'
  ];
  return triggers.some((t) => norm === t || norm.startsWith(`${t} `));
}

// Regex rigorosa para deteccao de Emojis Unicode
const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

async function runAudit() {
  console.log('=====================================================');
  console.log('AUDITORIA SISTEMICA CLINIGO v5.2 — TESTES AUTOMATIZADOS');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  // 1. WhatsApp Intent Recognition
  console.log('--- EIXO 1: RECONHECIMENTO DE INTENCOES WHATSAPP ---');
  assert('Reconhece "Sim" como confirmacao', isConfirmationMessage('Sim'));
  assert('Reconhece "SIM, CONFIRMO" como confirmacao', isConfirmationMessage('SIM, CONFIRMO'));
  assert('Reconhece "vou sim" como confirmacao', isConfirmationMessage('vou sim'));
  assert('Reconhece "com certeza" como confirmacao', isConfirmationMessage('com certeza'));
  assert('Reconhece "ok" como confirmacao', isConfirmationMessage('ok'));
  assert('Reconhece "Nao vou" como cancelamento', isCancellationMessage('Nao vou'));
  assert('Reconhece "cancelar atendimento" como cancelamento', isCancellationMessage('cancelar atendimento'));
  assert('Nao confunde mensagem geral com confirmacao', !isConfirmationMessage('Qual o valor da consulta?'));

  // 2. PostgreSQL Enum appointment_status
  console.log('\n--- EIXO 2: ENUM APPOINTMENT_STATUS NO POSTGRES ---');
  try {
    const { data: enumCheck, error: enumError } = await supabase
      .from('appointments')
      .select('id, status')
      .in('status', ['CHECKED_IN', 'IN_QUEUE', 'WAITING', 'CONFIRMED', 'COMPLETED'])
      .limit(1);

    assert('Query com CHECKED_IN e IN_QUEUE executa sem erro 22P02', !enumError, enumError?.message);
  } catch (e) {
    assert('Query com CHECKED_IN e IN_QUEUE executa sem erro 22P02', false, e.message);
  }

  // 3. Tabela patient_face_biometrics (multi-biometria)
  console.log('\n--- EIXO 3: BIOMETRIA FACIAL E MULTIPLOS REGISTROS ---');
  try {
    const { data: bioColumns, error: bioColError } = await supabase
      .from('patient_face_biometrics')
      .select('id, person_type, person_name, notes, reference_image_url')
      .limit(1);

    assert('Colunas person_type, person_name, notes existem em patient_face_biometrics', !bioColError, bioColError?.message);
  } catch (e) {
    assert('Colunas person_type, person_name, notes existem', false, e.message);
  }

  // 4. Tabela appointments (status de sessao e assinatura)
  console.log('\n--- EIXO 4: PRONTUARIO, STATUS DE SESSAO E ASSINATURA ---');
  try {
    const { data: aptColumns, error: aptColError } = await supabase
      .from('appointments')
      .select('id, session_status, session_status_notes, digital_signature_url, digital_signature_hash')
      .limit(1);

    assert('Colunas session_status e digital_signature_* existem em appointments', !aptColError, aptColError?.message);
  } catch (e) {
    assert('Colunas session_status e digital_signature_* existem', false, e.message);
  }

  // 5. Tabela professional_financial_documents (contestacao)
  console.log('\n--- EIXO 5: DEMONSTRATIVOS E CONTESTACAO DE REPASSE ---');
  try {
    const { data: docColumns, error: docColError } = await supabase
      .from('professional_financial_documents')
      .select('id, inconsistency_notes, contested_at')
      .limit(1);

    assert('Colunas inconsistency_notes e contested_at existem em professional_financial_documents', !docColError, docColError?.message);
  } catch (e) {
    assert('Colunas inconsistency_notes e contested_at existem', false, e.message);
  }

  // 6. Bucket biometric-photos
  console.log('\n--- EIXO 6: STORAGE BUCKET DE FOTOS BIOMETRICAS ---');
  try {
    const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('biometric-photos');
    assert('Bucket biometric-photos existe e esta publico', !bucketError && bucketData?.public === true, bucketError?.message || 'Bucket nao e publico');
  } catch (e) {
    assert('Bucket biometric-photos existe e esta publico', false, e.message);
  }

  // 7. Isolamento de Tenants e Clinica World Sensory
  console.log('\n--- EIXO 7: MULTI-TENANCY E DADOS DA WORLD SENSORY ---');
  try {
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id, name, logo_url')
      .eq('id', '4c13e586-5390-4393-a180-2c9dd7ed81c7')
      .single();

    assert('Clinica World Sensory localizada no banco', !clinicError && !!clinic, clinicError?.message);
    if (clinic) {
      console.log(`     Nome da Clinica: ${clinic.name}`);
      console.log(`     Logo Cadastrado: ${clinic.logo_url ? 'Sim' : 'Nao'}`);
    }
  } catch (e) {
    assert('Clinica World Sensory localizada no banco', false, e.message);
  }

  // 8. Auditoria de Emojis em Arquivos Tocados
  console.log('\n--- EIXO 8: CONFORMIDADE VISUAL SAAS — AUDITORIA ZERO EMOJIS ---');
  const filesToAudit = [
    'components/face-recognition/FaceCheckIn.tsx',
    'components/face-recognition/FaceEnrollment.tsx',
    'components/medical-records/WorldSensoryEvolutionForm.tsx',
    'components/financial/DoctorFinancialDocumentsView.tsx',
    'components/financial/BiometricAuditDialog.tsx',
    'components/appointments/PaymentMethodSelector.tsx',
    'components/layout/sidebar.tsx',
    'app/dashboard/(clinic)/financial/notas-demonstrativos/page.tsx',
    'app/dashboard/(clinic)/recepcao/face-checkin/page.tsx',
    'app/dashboard/(clinic)/pacientes/[id]/page.tsx'
  ];

  for (const relPath of filesToAudit) {
    const absPath = path.resolve(process.cwd(), relPath);
    if (fs.existsSync(absPath)) {
      const content = fs.readFileSync(absPath, 'utf8');
      const lines = content.split('\n');
      let foundEmojis = [];
      lines.forEach((line, lineIdx) => {
        // Ignorar comentarios ou documentacao interna se houver
        if (emojiRegex.test(line) && !line.includes('//')) {
          foundEmojis.push({ line: lineIdx + 1, content: line.trim() });
        }
      });
      assert(
        `Arquivo ${relPath} sem emojis na interface`,
        foundEmojis.length === 0,
        foundEmojis.map(e => `Linha ${e.line}: ${e.content}`).join('; ')
      );
    }
  }

  // Resumo Final
  console.log('\n=====================================================');
  console.log(`TOTAL DE TESTES: ${passed + failed}`);
  console.log(`APROVADOS: ${passed}`);
  console.log(`FALHAS: ${failed}`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit();
