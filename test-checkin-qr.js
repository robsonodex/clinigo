/**
 * Script para testar o QR Code de Check-in
 * 
 * COMO USAR:
 * 1. Certifique-se que o servidor está rodando (npm run dev)
 * 2. Execute: node test-checkin-qr.js
 * 3. O script criará um agendamento de teste
 * 4. Acesse a URL gerada no navegador
 * 5. Preencha o formulário
 * 6. Veja o QR Code gerado
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://seu-projeto.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sua-chave-service-role'

console.log('🔧 Script de Teste - QR Code Check-in\n')

// URL base local
const BASE_URL = 'http://localhost:3000'

console.log('📋 OPÇÕES DE TESTE:\n')
console.log('Opção 1: Pegar ID de agendamento existente')
console.log('========================================')
console.log('1. Acesse o Supabase Dashboard')
console.log('2. Vá em: Table Editor → appointments')
console.log('3. Copie qualquer ID da coluna "id"')
console.log('4. Acesse: http://localhost:3000/checkin/[COLE-O-ID-AQUI]\n')

console.log('Opção 2: Usar agendamento de teste (se existir)')
console.log('==============================================')
console.log('Se você já tem agendamentos no banco, pegue um ID assim:\n')

console.log('-- Execute no SQL Editor do Supabase:')
console.log('SELECT id, appointment_date, appointment_time, status')
console.log('FROM appointments')
console.log('WHERE status IN (\'CONFIRMED\', \'PENDING_PAYMENT\')')
console.log('LIMIT 5;\n')

console.log('Opção 3: Criar agendamento via Dashboard')
console.log('========================================')
console.log('1. Acesse: http://localhost:3000/dashboard/agenda')
console.log('2. Crie um agendamento manualmente')
console.log('3. Pegue o ID gerado')
console.log('4. Acesse: http://localhost:3000/checkin/[ID]\n')

console.log('📱 EXEMPLO de URL completa:')
console.log(BASE_URL + '/checkin/550e8400-e29b-41d4-a916-446655440000\n')

console.log('⚠️  IMPORTANTE:')
console.log('- Substitua [COLE-O-ID-AQUI] por um UUID real')
console.log('- O agendamento deve ter status: CONFIRMED ou PENDING_PAYMENT')
console.log('- O servidor deve estar rodando: npm run dev\n')

console.log('🎯 TESTANDO CONECTIVIDADE:\n')

// Test se o servidor está rodando
fetch(BASE_URL)
    .then(res => {
        if (res.ok) {
            console.log('✅ Servidor local está rodando!')
            console.log(`   Acesse: ${BASE_URL}\n`)
        } else {
            console.log('⚠️  Servidor respondeu mas com erro')
        }
    })
    .catch(err => {
        console.log('❌ Servidor NÃO está rodando!')
        console.log('   Execute: npm run dev\n')
    })

console.log('\n💡 DICA RÁPIDA:')
console.log('Se você tem acesso ao Supabase Dashboard agora:')
console.log('1. Abra: ' + SUPABASE_URL)
console.log('2. SQL Editor → Cole e execute:')
console.log('\n   SELECT id FROM appointments LIMIT 1;\n')
console.log('3. Copie o resultado')
console.log('4. Cole na URL: http://localhost:3000/checkin/[resultado-aqui]')
