// scripts/test_audit_v5_2.ts
import { isConfirmationMessage, isCancellationMessage } from '../lib/services/whatsapp-appointment-confirmation';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('ERRO: Variaveis de ambiente Supabase nao configuradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runAuditTests() {
  console.log('=====================================================');
  console.log('AUDITORIA SISTEMICA CLINIGO v5.2 — TESTES AUTOMATIZADOS');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, details?: string) {
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
  assert('Reconhece "Preciso cancelar" como cancelamento', isCancellationMessage('cancelar'));
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
  } catch (e: any) {
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
  } catch (e: any) {
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
  } catch (e: any) {
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
  } catch (e: any) {
    assert('Colunas inconsistency_notes e contested_at existem', false, e.message);
  }

  // 6. Bucket biometric-photos
  console.log('\n--- EIXO 6: STORAGE BUCKET DE FOTOS BIOMETRICAS ---');
  try {
    const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('biometric-photos');
    assert('Bucket biometric-photos existe e esta publico', !bucketError && bucketData?.public === true, bucketError?.message || 'Bucket nao e publico');
  } catch (e: any) {
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
  } catch (e: any) {
    assert('Clinica World Sensory localizada no banco', false, e.message);
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

runAuditTests();
