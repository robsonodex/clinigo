const fetch = require('node-fetch');

async function checkHealth() {
  const url = 'https://clinigo-whatsapp-service-production.up.railway.app/health';
  try {
    console.log(`Batendo em: ${url}...`);
    const res = await fetch(url);
    const text = await res.text();
    console.log(`Status HTTP: ${res.status}`);
    console.log(`Resposta:`, text);
  } catch (err) {
    console.error(`❌ Erro ao acessar o bot:`, err.message);
  }
}

checkHealth();
