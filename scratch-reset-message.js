const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetFailedMessages() {
  const ids = [
    'b5930aee-fd2f-4317-a8a5-466966c1a91c',
    '5c4c847c-2c19-46ac-ae8c-1dda7725a451'
  ];
  
  try {
    console.log(`Resetando agendamentos IDs: [${ids.join(', ')}] para Pendente...`);
    
    const { data, error } = await supabase
      .from('scheduled_whatsapp_messages')
      .update({
        status: 'pending',
        sent_at: null,
        error_message: null
      })
      .in('id', ids)
      .select();

    if (error) throw error;

    console.log('✅ Agendamentos resetados com sucesso no Supabase!');
    console.log(data.map(d => ({ id: d.id, subject: d.subject, status: d.status })));
  } catch (err) {
    console.error('❌ Erro ao resetar agendamentos:', err.message);
  }
}

resetFailedMessages();
