const fetch = require('node-fetch');

async function testHealth() {
  const urls = [
    'https://clinigo-whatsapp-service-production.up.railway.app/health',
    'https://clinigo-whatsapp-service-production.up.railway.app/clin/status'
  ];

  console.log('📡 Iniciando teste de conectividade com o Bot no Railway...');

  for (const url of urls) {
    try {
      console.log(`\nBando em: ${url}`);
      const res = await fetch(url);
      console.log(`Status HTTP: ${res.status} ${res.statusText}`);
      console.log(`Content-Type: ${res.headers.get('content-type')}`);
      
      const text = await res.text();
      console.log('Corpo da Resposta (primeiros 300 caracteres):');
      console.log(text.substring(0, 300));
    } catch (err) {
      console.error(`❌ Erro ao conectar em ${url}:`, err.message);
    }
  }
}

testHealth();
