/**
 * CliniGo Sentinel - Poller Autônomo para o Agente de IA
 * Consulta a Vercel por novos erros de produção e detecta se há novos incidentes.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sentinelDir = path.join(rootDir, '.sentinel');

if (!fs.existsSync(sentinelDir)) {
  fs.mkdirSync(sentinelDir, { recursive: true });
}

const lastSeenFile = path.join(sentinelDir, 'last-seen-timestamp.txt');

// Obtém o timestamp do último erro processado
let lastSeenTimestamp = 0;
if (fs.existsSync(lastSeenFile)) {
  try {
    lastSeenTimestamp = parseInt(fs.readFileSync(lastSeenFile, 'utf-8').trim(), 10) || 0;
  } catch {}
}

try {
  // Busca os últimos erros na Vercel via CLI oficial
  const cmd = `npx vercel@59.14.0 logs -n 15 --level error --environment production --json --scope nodexs-projects-8a6ee1f1`;
  const output = execSync(cmd, { cwd: rootDir, encoding: 'utf-8', timeout: 30000 });

  const lines = output.split('\n').filter(l => l.trim().startsWith('{') && l.trim().endsWith('}'));
  const newErrors = [];

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      const ts = entry.timestamp || 0;
      
      // Ignora se for mais antigo ou igual ao último visto
      if (ts <= lastSeenTimestamp) continue;

      // Filtra ruído conhecido ou benigno
      const msg = entry.message || '';
      const reqPath = entry.requestPath || '';
      if (reqPath.includes('wp-admin') || reqPath.includes('.env') || reqPath.includes('xmlrpc.php')) {
        continue;
      }

      newErrors.push(entry);
    } catch {}
  }

  if (newErrors.length === 0) {
    console.log('ALL_CLEAR');
    process.exit(0);
  }

  // Atualiza o timestamp do erro mais recente visto
  const highestTs = Math.max(...newErrors.map(e => e.timestamp || 0));
  if (highestTs > lastSeenTimestamp) {
    fs.writeFileSync(lastSeenFile, String(highestTs), 'utf-8');
  }

  console.log(JSON.stringify({
    status: 'NEW_INCIDENTS_FOUND',
    count: newErrors.length,
    incidents: newErrors.map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      method: e.requestMethod,
      path: e.requestPath,
      status: e.responseStatusCode,
      message: e.message,
      logs: e.logs
    }))
  }, null, 2));

  // Exit code 1 para alertar que há incidentes novos
  process.exit(1);

} catch (err) {
  // Se falhar a consulta da CLI
  console.log('POLL_ERROR: ' + err.message);
  process.exit(0);
}
