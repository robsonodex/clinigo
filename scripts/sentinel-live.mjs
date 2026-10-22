/**
 * CliniGo Real-Time Sentinel - Monitoramento de Produção em Tempo Real
 * Observa streams de logs da Vercel (Produção) e captura falhas/erros para auto-diagnóstico.
 */

import { spawn } from 'child_process';
import readline from 'readline';
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

const incidentFile = path.join(sentinelDir, 'active-incident.json');
const historyFile = path.join(sentinelDir, 'sentinel-history.log');

// Paleta ANSI sóbria (Padrão Corporativo)
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bgRed: '\x1b[41m\x1b[37m',
  bgYellow: '\x1b[43m\x1b[30m',
  gray: '\x1b[90m',
};

// Padrões conhecidos de bots maliciosos que varrem a internet (ruído benigno a ser filtrado)
const BOT_NOISE_PATTERNS = [
  /\/\.env/i,
  /\/wp-login/i,
  /\/wp-admin/i,
  /\/\.git/i,
  /\/xmlrpc\.php/i,
  /\/phpmyadmin/i,
  /\/actuator/i,
  /\/boaform/i,
  /\/HNAP1/i,
  /\/remote\/login/i
];

function isBotNoise(pathStr) {
  if (!pathStr) return false;
  return BOT_NOISE_PATTERNS.some(regex => regex.test(pathStr));
}

function formatTime(timestamp) {
  const d = timestamp ? new Date(timestamp) : new Date();
  return d.toLocaleTimeString('pt-BR', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

function logToHistory(text) {
  try {
    fs.appendFileSync(historyFile, text + '\n', 'utf-8');
  } catch {}
}

function displayHeader() {
  console.clear();
  console.log(`${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bold}CLINIGO SENTINEL - MONITORAMENTO DE PRODUÇÃO EM TEMPO REAL${colors.reset}`);
  console.log(`${colors.dim}Ambiente: Produção (clinigo.app) | Escopo: nodexs-projects-8a6ee1f1${colors.reset}`);
  console.log(`${colors.dim}Diretório de incidentes: .sentinel/active-incident.json${colors.reset}`);
  console.log(`${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.gray}Aguardando telemetria em tempo real... (Pressione Ctrl+C para encerrar)${colors.reset}\n`);
}

function handleLogEntry(entry) {
  const time = formatTime(entry.timestamp);
  const method = entry.requestMethod || 'LOG';
  const reqPath = entry.requestPath || entry.message || '-';
  const status = entry.responseStatusCode || 200;
  const level = (entry.level || 'info').toLowerCase();
  const source = entry.source || 'runtime';
  const host = entry.domain || 'clinigo.app';

  // Identificação de severidade
  const is5xx = status >= 500;
  const is4xx = status >= 400 && status < 500;
  const isErrorLevel = level === 'error' || level === 'fatal';
  const isWarnLevel = level === 'warning';

  // Filtragem de ruído de bots de varredura
  if (is4xx && isBotNoise(reqPath)) {
    // Ruído externo irrelevante - ignorado para não poluir
    return;
  }

  // Se for Erro Crítico (5xx ou level error)
  if (is5xx || isErrorLevel) {
    const errorDetails = {
      incidentId: entry.id || `inc_${Date.now()}`,
      timestamp: entry.timestamp || Date.now(),
      timeFormatted: time,
      status,
      level,
      method,
      path: reqPath,
      host,
      source,
      message: entry.message || '',
      internalLogs: entry.logs || [],
      deploymentId: entry.deploymentId || '',
      detectedAt: new Date().toISOString()
    };

    // Grava o arquivo de incidente ativo para consumo do Agente
    try {
      fs.writeFileSync(incidentFile, JSON.stringify(errorDetails, null, 2), 'utf-8');
    } catch (err) {
      console.error('Falha ao registrar incidente no disco:', err);
    }

    const banner = [
      '',
      `${colors.bgRed}${colors.bold} [FALHA CRÍTICA DETECTADA EM PRODUÇÃO] ${colors.reset}`,
      `${colors.red}${colors.bold}Hora:${colors.reset} ${time} | ${colors.red}${colors.bold}Status:${colors.reset} ${status} | ${colors.red}${colors.bold}Rota:${colors.reset} ${method} ${reqPath}`,
      `${colors.red}${colors.bold}Origem:${colors.reset} ${source} (${host})`,
      entry.message ? `${colors.yellow}Mensagem:${colors.reset} ${entry.message}` : '',
      `${colors.cyan}>>> Incidente estruturado salvo em: .sentinel/active-incident.json${colors.reset}`,
      `${colors.cyan}>>> Pronto para inspeção do Agente e proposta de correção cirúrgica.${colors.reset}`,
      ''
    ].filter(Boolean).join('\n');

    console.log(banner);
    logToHistory(`[${time}] CRITICAL [${status}] ${method} ${reqPath} - ${entry.message || ''}`);
    return;
  }

  // Se for Warning relevante
  if (is4xx || isWarnLevel) {
    const warnLine = `${colors.gray}[${time}]${colors.reset} ${colors.yellow}${colors.bold}WARN ${colors.reset} ${colors.yellow}${method} ${reqPath} (${status})${colors.reset} ${colors.dim}[${source}]${colors.reset}`;
    console.log(warnLine);
    logToHistory(`[${time}] WARN [${status}] ${method} ${reqPath}`);
    return;
  }

  // Requisição normal / Sucesso
  const infoLine = `${colors.gray}[${time}]${colors.reset} ${colors.green}INFO ${colors.reset} ${colors.dim}${method}${colors.reset} ${reqPath} ${colors.green}(${status})${colors.reset} ${colors.dim}[${source}]${colors.reset}`;
  console.log(infoLine);
  logToHistory(`[${time}] INFO [${status}] ${method} ${reqPath}`);
}

function startVercelStream() {
  displayHeader();

  const isWin = process.platform === 'win32';
  const npxCmd = isWin ? 'npx.cmd' : 'npx';
  const args = [
    'vercel@59.14.0',
    'logs',
    '--follow',
    '--environment',
    'production',
    '--json',
    '--scope',
    'nodexs-projects-8a6ee1f1'
  ];

  console.log(`${colors.dim}Conectando ao stream: ${npxCmd} ${args.join(' ')}${colors.reset}\n`);

  const child = spawn(npxCmd, args, {
    cwd: rootDir,
    shell: isWin,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const rl = readline.createInterface({
    input: child.stdout,
    terminal: false
  });

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        handleLogEntry(parsed);
      } catch {
        console.log(`${colors.gray}[LOG] ${trimmed}${colors.reset}`);
      }
    } else {
      // Mensagens de status da CLI (ex: "Retrieving project...")
      if (!trimmed.includes('Retrieving project') && !trimmed.includes('Fetching logs')) {
        console.log(`${colors.dim}[Vercel CLI] ${trimmed}${colors.reset}`);
      }
    }
  });

  child.stderr.on('data', (data) => {
    const text = data.toString().trim();
    if (text) {
      console.error(`${colors.yellow}[Vercel Stderr] ${text}${colors.reset}`);
    }
  });

  child.on('close', (code) => {
    console.log(`\n${colors.yellow}Conexão com a Vercel encerrada (código ${code}). Tentando reconectar em 5 segundos...${colors.reset}`);
    setTimeout(() => {
      startVercelStream();
    }, 5000);
  });

  child.on('error', (err) => {
    console.error(`${colors.red}Erro ao iniciar processo Vercel CLI:${colors.reset}`, err.message);
  });

  process.on('SIGINT', () => {
    console.log(`\n${colors.dim}Encerrando monitoramento CliniGo Sentinel...${colors.reset}`);
    child.kill();
    process.exit(0);
  });
}

startVercelStream();
