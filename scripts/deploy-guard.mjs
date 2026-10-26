#!/usr/bin/env node
/**
 * Guarda de deploy do CliniGo.
 *
 * Uso:
 *   node scripts/deploy-guard.mjs pre                       -> antes do deploy (bloqueia se houver risco)
 *   node scripts/deploy-guard.mjs post https://clinigo.app  -> depois do deploy (valida rotas críticas)
 *   node scripts/deploy-guard.mjs selftest                  -> prova que a guarda detecta o incidente de 26/10/2026
 *
 * Código de saída 1 = falha. Nenhum deploy pode seguir (pre) ou permanecer no ar (post) com falha.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ignore = require('ignore')

const ROOT = process.cwd()

const CRITICAL_FILES = [
    'package.json',
    'next.config.js',
    'vercel.json',
    'middleware.ts',
    'app/layout.tsx',
    'lib/supabase/server.ts',
    'app/api/auth/login/route.ts',
    'app/api/auth/session/validate/route.ts',
    'app/api/profile/route.ts',
    'app/api/appointments/route.ts',
    'app/api/appointments/recurring/route.ts',
    'app/api/doctors/route.ts',
    'app/api/patients/route.ts',
]

const SOURCE_PREFIXES = ['app/', 'lib/', 'components/', 'hooks/', 'types/', 'public/', 'contexts/', 'providers/']

const POST_CHECKS = [
    { name: 'Página inicial', method: 'GET', path: '/', expect: [200] },
    { name: 'Validação de sessão', method: 'GET', path: '/api/auth/session/validate', expect: [200] },
    { name: 'Rota de login publicada', method: 'GET', path: '/api/auth/login', expect: [405] },
    { name: 'Perfil sem sessão', method: 'GET', path: '/api/profile', expect: [401] },
    { name: 'Agendamentos sem sessão', method: 'GET', path: '/api/appointments', expect: [401] },
    { name: 'Séries recorrentes sem sessão', method: 'GET', path: '/api/appointments/recurring', expect: [401] },
    { name: 'Pacientes sem sessão', method: 'GET', path: '/api/patients', expect: [401] },
    { name: 'Profissionais (público)', method: 'GET', path: '/api/doctors', expect: [200] },
]

function buildMatcher(ignoreContent) {
    return ignore().add(ignoreContent)
}

function readVercelIgnore() {
    const file = path.join(ROOT, '.vercelignore')
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
}

function trackedFiles() {
    return execSync('git ls-files', { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
        .split(/\r?\n/)
        .filter(Boolean)
}

function checkIgnore(ignoreContent, files) {
    const matcher = buildMatcher(ignoreContent)
    const errors = []

    for (const file of CRITICAL_FILES) {
        if (matcher.ignores(file)) errors.push(`Arquivo crítico excluído pelo .vercelignore: ${file}`)
    }

    const sourceIgnored = files.filter(f => SOURCE_PREFIXES.some(p => f.startsWith(p)) && matcher.ignores(f))
    if (sourceIgnored.length > 0) {
        errors.push(`${sourceIgnored.length} arquivo(s) de código-fonte excluído(s) pelo .vercelignore. Exemplos: ${sourceIgnored.slice(0, 5).join(', ')}`)
    }
    return errors
}

function runPre() {
    const errors = []

    for (const file of CRITICAL_FILES) {
        if (!fs.existsSync(path.join(ROOT, file))) errors.push(`Arquivo crítico ausente: ${file}`)
    }

    errors.push(...checkIgnore(readVercelIgnore(), trackedFiles()))

    if (fs.existsSync(path.join(ROOT, 'api')) && fs.statSync(path.join(ROOT, 'api')).isDirectory()) {
        errors.push('Existe uma pasta "api/" na raiz do projeto. A Vercel a trata como funções avulsas (limite de 12 no plano Hobby). Não a ignore no .vercelignore: renomeie-a.')
    }

    const nextConfig = fs.readFileSync(path.join(ROOT, 'next.config.js'), 'utf8')
    const rewritesStart = nextConfig.indexOf('rewrites()')
    const rewritesEnd = nextConfig.indexOf('headers()', rewritesStart)
    const rewritesBlock = rewritesStart === -1 ? '' : nextConfig.slice(rewritesStart, rewritesEnd === -1 ? undefined : rewritesEnd)
    const unconstrained = [...rewritesBlock.matchAll(/source:\s*['"`](\/api[^'"`]*\/:[a-zA-Z_]+)(?![a-zA-Z_(])[^'"`]*['"`]/g)].map(m => m[1])
    if (unconstrained.length > 0) {
        errors.push(`Rewrite com parâmetro dinâmico sem restrição em rota de API (captura rotas estáticas como /recurring): ${unconstrained.join(', ')}`)
    }

    report('PRE-DEPLOY', errors)
}

async function runPost(baseUrl) {
    if (!baseUrl) {
        console.error('Informe a URL: node scripts/deploy-guard.mjs post https://clinigo.app')
        process.exit(1)
    }
    const errors = []
    for (const check of POST_CHECKS) {
        const url = baseUrl.replace(/\/$/, '') + check.path
        try {
            const res = await fetch(url, {
                method: check.method,
                headers: check.body ? { 'Content-Type': 'application/json' } : undefined,
                body: check.body,
                redirect: 'manual',
                cache: 'no-store',
            })
            const ok = check.expect.includes(res.status)
            console.log(`${ok ? 'OK   ' : 'FALHA'} ${res.status} ${check.method} ${check.path} (${check.name})`)
            if (!ok) errors.push(`${check.name}: esperado ${check.expect.join('/')}, recebido ${res.status} em ${check.path}`)
        } catch (err) {
            console.log(`FALHA ERR ${check.method} ${check.path} (${check.name})`)
            errors.push(`${check.name}: erro de rede em ${check.path} (${err.message})`)
        }
    }
    report('PÓS-DEPLOY', errors, true)
}

function runSelfTest() {
    const files = trackedFiles()
    const incident = checkIgnore(readVercelIgnore() + '\napi\napi/**\n', files)
    const current = checkIgnore(readVercelIgnore(), files)
    const detected = incident.some(e => e.includes('app/api/auth/login/route.ts'))
    console.log(`Cenário do incidente (padrão "api" no .vercelignore): ${detected ? 'DETECTADO e bloqueado' : 'NÃO detectado'}`)
    console.log(`Configuração atual: ${current.length === 0 ? 'sem exclusões indevidas' : current.join(' | ')}`)
    process.exit(detected && current.length === 0 ? 0 : 1)
}

function report(stage, errors, rollbackHint = false) {
    if (errors.length === 0) {
        console.log(`\n[${stage}] Aprovado. Nenhum risco detectado.`)
        process.exit(0)
    }
    console.error(`\n[${stage}] REPROVADO. ${errors.length} problema(s):`)
    errors.forEach((e, i) => console.error(`  ${i + 1}. ${e}`))
    if (rollbackHint) {
        console.error('\nAção obrigatória imediata: npx vercel@59.14.0 rollback --yes --scope nodexs-projects-8a6ee1f1')
    }
    process.exit(1)
}

const [, , mode, arg] = process.argv
if (mode === 'pre') runPre()
else if (mode === 'post') await runPost(arg)
else if (mode === 'selftest') runSelfTest()
else {
    console.error('Modo inválido. Use: pre | post <url> | selftest')
    process.exit(1)
}
