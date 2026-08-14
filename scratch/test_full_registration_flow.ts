process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dlxakeejmyzhzdxzjgne.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo'

import { sendWhatsAppToLeadAdmin } from '@/lib/whatsapp/service'

async function runTest() {
  console.log('=== TESTANDO ENVIAR NOTIFICAÇÃO DE REGISTRO PARA 21965572247 ===')
  const waMessage = `🎁 *Novo Cliente Trial (7 Dias) se cadastrou!* 🎁\n\n` +
    `👤 *Nome:* Rodrigo Vilela (Reenvio Notificação)\n` +
    `🏥 *Clínica:* Consultório de Rodrigo\n` +
    `📧 *E-mail:* rvbarbosa2018@gmail.com\n` +
    `📱 *WhatsApp do cliente:* (62) 99118-8899\n\n` +
    `🚀 _Acesse em segundos. Sem cartão._`

  const success = await sendWhatsAppToLeadAdmin(waMessage, 'trial-notification-fix')
  console.log('Resultado do envio:', success ? '✅ NOTIFICAÇÃO DO RODRIGO ENTREGUE NO SEU WHATSAPP (21 96557-2247)!' : '❌ FALHOU!')
}

runTest().catch(console.error)
