/**
 * CliniGo Sentinel - Inspecionador de Incidentes e Diagnóstico
 * Permite checar se há falhas registradas pelo Sentinel e correlacionar com o código-fonte.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sentinelDir = path.join(rootDir, '.sentinel');
const incidentFile = path.join(sentinelDir, 'active-incident.json');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

console.log(`${colors.cyan}======================================================================${colors.reset}`);
console.log(`${colors.bold}CLINIGO SENTINEL - STATUS DE INCIDENTES EM PRODUÇÃO${colors.reset}`);
console.log(`${colors.cyan}======================================================================${colors.reset}`);

if (!fs.existsSync(incidentFile)) {
  console.log(`${colors.green}STATUS: Estável.${colors.reset}`);
  console.log(`${colors.dim}Nenhum incidente crítico não resolvido foi registrado até o momento.${colors.reset}\n`);
  process.exit(0);
}

try {
  const content = fs.readFileSync(incidentFile, 'utf-8');
  const incident = JSON.parse(content);

  console.log(`${colors.red}${colors.bold}ALERTA: Incidente ativo detectado!${colors.reset}\n`);
  console.log(`• ${colors.bold}ID:${colors.reset} ${incident.incidentId}`);
  console.log(`• ${colors.bold}Horário:${colors.reset} ${incident.timeFormatted || incident.detectedAt}`);
  console.log(`• ${colors.bold}Rota:${colors.reset} ${incident.method} ${incident.path}`);
  console.log(`• ${colors.bold}Status HTTP:${colors.reset} ${incident.status}`);
  console.log(`• ${colors.bold}Origem:${colors.reset} ${incident.source} (${incident.host})`);
  
  if (incident.message) {
    console.log(`• ${colors.yellow}${colors.bold}Mensagem de Erro:${colors.reset} ${incident.message}`);
  }

  // Tenta localizar o arquivo de código fonte correspondente à rota
  if (incident.path && incident.path.startsWith('/api/')) {
    const cleanPath = incident.path.split('?')[0].replace(/^\/api\//, '');
    const candidateFile = path.join(rootDir, 'app', 'api', cleanPath, 'route.ts');
    
    if (fs.existsSync(candidateFile)) {
      console.log(`\n${colors.cyan}${colors.bold}Arquivo fonte correlacionado:${colors.reset} ${path.relative(rootDir, candidateFile)}`);
    }
  }

  console.log(`\n${colors.dim}Para resolver: O Agente pode analisar o stack trace e gerar a proposta de correção cirúrgica.${colors.reset}\n`);
} catch (err) {
  console.error(`${colors.red}Falha ao ler arquivo de incidente:${colors.reset}`, err.message);
}
