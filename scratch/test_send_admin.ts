process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dlxakeejmyzhzdxzjgne.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo'

import { sendWhatsAppMessage } from '@/lib/whatsapp/service'

async function testSend() {
  console.log('=== TESTANDO ENVIO WHATSAPP ADMIN ===')
  try {
    console.log('Tentando via clin-sales-bot...')
    await sendWhatsAppMessage('clin-sales-bot', '21975129005', '🎁 *Teste Notificação Admin (clin-sales-bot)*', 'trial-test')
    console.log('✅ Sucesso via clin-sales-bot!')
  } catch (err: any) {
    console.error('❌ Erro via clin-sales-bot:', err.message)
  }

  try {
    console.log('Tentando via clinic de000000-0000-0000-0000-000000000001...')
    await sendWhatsAppMessage('de000000-0000-0000-0000-000000000001', '21975129005', '🎁 *Teste Notificação Admin (demo-clinic)*', 'trial-test')
    console.log('✅ Sucesso via demo clinic!')
  } catch (err: any) {
    console.error('❌ Erro via demo clinic:', err.message)
  }

  try {
    console.log('Tentando via clinic Espaço Incluir (5163c916-8b82-4d80-8a71-01726836ee46 / comercial)...')
    await sendWhatsAppMessage('5163c916-8b82-4d80-8a71-01726836ee46', '21975129005', '🎁 *Teste Notificação Admin (comercial)*', 'trial-test', 'comercial')
    console.log('✅ Sucesso via comercial!')
  } catch (err: any) {
    console.error('❌ Erro via comercial:', err.message)
  }
}

testSend().catch(console.error)
