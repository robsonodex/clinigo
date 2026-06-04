const fetch = require('node-fetch');

async function triggerCron() {
  const url = 'https://clinigo.app/api/cron/send-scheduled-whatsapp';
  try {
    console.log(`Disparando Cron Job de Produção em: ${url}...`);
    const res = await fetch(url);
    const text = await res.text();
    console.log(`Status HTTP: ${res.status}`);
    console.log(`Resposta consolidada do Cron:`, text);
  } catch (err) {
    console.error(`❌ Erro ao disparar o Cron Job:`, err.message);
  }
}

triggerCron();
