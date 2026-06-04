const fetch = require('node-fetch');

async function testBot() {
  const url = 'https://clinigo-whatsapp-service-production.up.railway.app/clin/status';
  console.log(`Fazendo requisição para o bot em: ${url}`);
  try {
    const res = await fetch(url);
    console.log(`Status HTTP: ${res.status}`);
    const text = await res.text();
    console.log('--- Resposta do Bot ---');
    console.log(text.substring(0, 500));
  } catch (err) {
    console.error('Erro de conexão:', err.message);
  }
}

testBot();
