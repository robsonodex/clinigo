const fetch = require('node-fetch');

// Base64 de uma imagem GIF transparente de 1x1 pixel
const testGifBase64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

async function testSendImage() {
  const url = 'https://clinigo-whatsapp-service-production.up.railway.app/clin/send-image';
  const payload = {
    to: '5588988073740', // Número de teste do Robson
    imageBase64: testGifBase64,
    caption: 'Teste científico de envio de imagem CliniGo - Antigravity Agent'
  };

  console.log(`Enviando POST para o bot no Railway: ${url}...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log(`Status HTTP: ${res.status}`);
    const text = await res.text();
    console.log('--- Resposta do Bot ---');
    console.log(text);
  } catch (err) {
    console.error('Erro na requisição:', err.message);
  }
}

testSendImage();
