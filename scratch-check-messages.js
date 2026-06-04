const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Carregar variáveis de ambiente do .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkScheduledMessages() {
  try {
    console.log('Consultando as últimas mensagens da tabela scheduled_whatsapp_messages...');
    const { data, error } = await supabase
      .from('scheduled_whatsapp_messages')
      .select('id, recipient_name, recipient_phone, scheduled_for, status, sent_at, error_message, image_base64, subject, message')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log('Nenhuma mensagem encontrada na tabela.');
      return;
    }

    console.log('\n--- ÚLTIMOS AGENDAMENTOS ---');
    data.forEach((msg, idx) => {
      console.log(`\n[${idx + 1}] ID: ${msg.id}`);
      console.log(`Destinatário: ${msg.recipient_name} (${msg.recipient_phone})`);
      console.log(`Agendado para: ${msg.scheduled_for}`);
      console.log(`Assunto: ${msg.subject}`);
      console.log(`Mensagem: ${msg.message}`);
      console.log(`Status atual: ${msg.status}`);
      console.log(`Enviado em: ${msg.sent_at || 'Ainda não enviado'}`);
      console.log(`Mensagem de erro: ${msg.error_message || 'Nenhum erro'}`);
      console.log(`Tem Imagem base64? ${msg.image_base64 ? `Sim (${Math.round(msg.image_base64.length / 1024)} KB)` : 'Não'}`);
    });
  } catch (err) {
    console.error('Erro ao consultar:', err.message);
  }
}

checkScheduledMessages();
