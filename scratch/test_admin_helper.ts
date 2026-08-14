process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dlxakeejmyzhzdxzjgne.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo'

import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp/service'

async function testComercial() {
  const leadPhone = '21965572247'
  const msg = '🎁 *Teste Notificação Novo Cadastrado no CliniGo*'
  try {
    console.log('Tentando via 5163c916-8b82-4d80-8a71-01726836ee46 (comercial)...')
    await sendWhatsAppMessage('5163c916-8b82-4d80-8a71-01726836ee46', leadPhone, msg, 'test-comercial', 'comercial')
    console.log('✅ SUCESSO AO ENVIAR MENSAGEM VIA COMERCIAL!')
  } catch (err: any) {
    console.error('❌ ERRO via comercial:', err.message)
  }
}

testComercial().catch(console.error)
