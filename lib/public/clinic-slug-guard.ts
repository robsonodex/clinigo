/**
 * Guardas puros de borda contra sondas de scanners/bots e slugs inválidos.
 * 100% compatível com Edge Runtime (middleware.ts) e Server Components.
 * Zero dependências de Node.js ou banco de dados.
 */

const VALID_CLINIC_SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/

const RESERVED_OR_SCANNER_SLUGS = new Set([
    'admin',
    'api',
    'api-v2',
    'backup',
    'blog',
    'buscar',
    'cadastro',
    'cgi-bin',
    'clinica',
    'config',
    'contato',
    'dashboard',
    'database',
    'db',
    'demo',
    'dump',
    'entrar',
    'etc',
    'familia',
    'help',
    'lgpd',
    'login',
    'm',
    'manutencao',
    'medico',
    'miscadmin',
    'paciente',
    'pagar',
    'painel-tv',
    'partners',
    'phpinfo',
    'phpmyadmin',
    'planos',
    'pre-cadastro',
    'privacidade',
    'recuperar-senha',
    'redefinir-senha',
    'registro',
    'robots.txt',
    'sitemap.xml',
    'site',
    'sobre',
    'solucoes',
    'status',
    'system-master-hub',
    'terminal',
    'termos',
    'totem',
    'trial',
    'video',
    'wp-admin',
    'wp-content',
    'wp-includes',
    'wp-login',
    'xmlrpc',
])

const BLOCKED_EXPLOIT_EXTENSION_REGEX =
    /\.(?:php\d?|phtml|sql|sqlite\d?|bak|old|env|ini|cgi|asp|aspx|jsp|jspx|log|zip|tar|gz|tgz|rar|7z|sh|bat|cmd|exe|dll|db|swp|swo|dist|orig|cfm|pl|py|rb)(?:\/|\.\d+)?$/i

const BLOCKED_SCANNER_PREFIXES = [
    '/wp-admin',
    '/wp-login',
    '/wp-content',
    '/wp-includes',
    '/xmlrpc',
    '/phpmyadmin',
    '/phpinfo',
    '/miscadmin',
    '/cgi-bin',
    '/_session',
    '/_sql',
    '/nuclei',
    '/etc.json',
    '/etc.children.json',
    '/const.db',
    '/backup.sql',
    '/database.sql',
    '/dump.sql',
]

/**
 * Valida se um slug de clínica tem formato seguro antes de consultar o banco.
 * Rejeita extensões de arquivos, pontos, underscores, prefixos de scanners e rotas reservadas.
 */
export function isValidPublicClinicSlug(slug: string | null | undefined): boolean {
    if (!slug) return false
    const normalized = slug.trim().toLowerCase()
    if (!VALID_CLINIC_SLUG_REGEX.test(normalized)) return false
    if (RESERVED_OR_SCANNER_SLUGS.has(normalized)) return false
    if (normalized.startsWith('wp-') || normalized.startsWith('cgi-')) return false
    return true
}

/**
 * Detecta sondas automatizadas de vulnerabilidade (Nuclei, bots PHP/WordPress/SQL/.env)
 * para barrar na borda com HTTP 404 sem acionar Functions Node.js nem Supabase.
 */
export function isBlockedScannerProbe(pathname: string): boolean {
    if (!pathname) return false
    const lower = pathname.toLowerCase()

    // Preserva /.well-known/ (necessário para ai-summary.json, SSL, Apple/Android)
    if (lower.startsWith('/.well-known/')) {
        return false
    }

    // Bloqueia dotfiles na raiz ou em qualquer segmento (/.env, /.git, /.htaccess, /.json, /.children.json)
    if (/\/\.[^/]+/.test(lower)) {
        return true
    }

    if (BLOCKED_EXPLOIT_EXTENSION_REGEX.test(lower)) {
        return true
    }

    return BLOCKED_SCANNER_PREFIXES.some(
        (prefix) => lower === prefix || lower.startsWith(`${prefix}/`) || lower.startsWith(`${prefix}.`)
    )
}

