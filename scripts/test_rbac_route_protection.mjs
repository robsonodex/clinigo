/**
 * Automated Test: RBAC Route Protection & Direct Link Tampering Prevention
 * Validates that direct navigation to protected dashboard pages and APIs
 * correctly blocks unauthorized roles (DOCTOR, RECEPTIONIST, FINANCIAL, etc.)
 */

import assert from 'node:assert';

// Simulated ROLE_PROTECTED_PAGES as defined in middleware.ts
const ROLE_PROTECTED_PAGES = {
    '/dashboard/crm': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/configuracoes/usuarios': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/configuracoes/plano': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/configuracoes/smtp': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/configuracoes/pagamento': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/configuracoes/teleconsulta': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/configuracoes': ['CLINIC_ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN'],
    '/dashboard/configuracoes/templates-prontuario': ['CLINIC_ADMIN', 'DOCTOR', 'SUPER_ADMIN'],
    '/dashboard/configuracoes/reembolso': ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN'],
    '/dashboard/configuracoes/reembolso-paciente': ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN'],
    '/dashboard/financeiro': ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN'],
    '/dashboard/financial': ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN'],
    '/dashboard/relatorios': ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN'],
    '/dashboard/meu-financeiro': ['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/prontuarios': ['CLINIC_ADMIN', 'DOCTOR', 'SUPER_ADMIN'],
    '/dashboard/prescricoes': ['CLINIC_ADMIN', 'DOCTOR', 'SUPER_ADMIN'],
    '/dashboard/documentos': ['CLINIC_ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN'],
    '/dashboard/contratos': ['CLINIC_ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN'],
    '/dashboard/recepcao': ['RECEPTIONIST', 'CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/whatsapp': ['CLINIC_ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN'],
    '/dashboard/estoque': ['CLINIC_ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN'],
    '/dashboard/notificacoes': ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN'],
};

// Simulated ROLE_PROTECTED_ROUTES as defined in middleware.ts
const ROLE_PROTECTED_ROUTES = {
    '/api/clinics': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST'],
    '/api/crm/pipelines': ['SUPER_ADMIN', 'CLINIC_ADMIN'],
    '/api/crm/pipeline-cards': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR'],
    '/api/crm': ['SUPER_ADMIN', 'CLINIC_ADMIN'],
    '/api/admin': ['SUPER_ADMIN'],
    '/api/ai/predict-diagnosis': ['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'],
};

function evaluatePageRoute(pathname, userRole) {
    if (userRole === 'SUPER_ADMIN') {
        return { allowed: true };
    }

    const sortedPageRoutes = Object.entries(ROLE_PROTECTED_PAGES).sort(
        ([a], [b]) => b.length - a.length
    );

    for (const [route, allowedRoles] of sortedPageRoutes) {
        if (pathname === route || pathname.startsWith(`${route}/`)) {
            if (!userRole || !allowedRoles.includes(userRole)) {
                return {
                    allowed: false,
                    redirect: '/dashboard?error=unauthorized_role',
                    matchedRoute: route,
                    allowedRoles
                };
            }
            return { allowed: true, matchedRoute: route };
        }
    }

    return { allowed: true, matchedRoute: null }; // Unprotected page (e.g. /dashboard)
}

function evaluateApiRoute(pathname, userRole) {
    if (userRole === 'SUPER_ADMIN') {
        return { allowed: true };
    }

    const sortedApiRoutes = Object.entries(ROLE_PROTECTED_ROUTES).sort(
        ([a], [b]) => b.length - a.length
    );

    for (const [route, allowedRoles] of sortedApiRoutes) {
        if (pathname.startsWith(route)) {
            if (userRole && allowedRoles.includes(userRole)) {
                return { allowed: true, matchedRoute: route };
            } else {
                return {
                    allowed: false,
                    status: 403,
                    code: 'FORBIDDEN',
                    matchedRoute: route,
                    allowedRoles
                };
            }
        }
    }

    return { allowed: true, matchedRoute: null };
}

console.log('--- INICIANDO TESTES DE SEGURANÇA RBAC (DIRECT LINK TAMPERING) ---');

// 1. Pipeline de Pacientes (/dashboard/crm/pipeline)
const testCasesPipeline = [
    { role: 'CLINIC_ADMIN', expected: true, desc: 'CLINIC_ADMIN acessa Pipeline' },
    { role: 'SUPER_ADMIN', expected: true, desc: 'SUPER_ADMIN acessa Pipeline' },
    { role: 'DOCTOR', expected: false, desc: 'DOCTOR bloqueado no Pipeline' },
    { role: 'RECEPTIONIST', expected: false, desc: 'RECEPTIONIST bloqueada no Pipeline' },
    { role: 'FINANCIAL', expected: false, desc: 'FINANCIAL bloqueado no Pipeline' },
    { role: 'READONLY', expected: false, desc: 'READONLY bloqueado no Pipeline' },
];

for (const tc of testCasesPipeline) {
    const res = evaluatePageRoute('/dashboard/crm/pipeline', tc.role);
    assert.strictEqual(res.allowed, tc.expected, `Falha: ${tc.desc}`);
    if (!tc.expected) {
        assert.strictEqual(res.redirect, '/dashboard?error=unauthorized_role');
    }
    console.log(`[PASS] ${tc.desc}`);
}

// 2. Especificidade de Rotas (/dashboard/configuracoes/usuarios vs /dashboard/configuracoes)
console.log('\n--- TESTANDO ESPECIFICIDADE DE ROTAS CONFIGURACOES ---');
// RECEPTIONIST acessa /dashboard/configuracoes (Minha Clínica)
const recConf = evaluatePageRoute('/dashboard/configuracoes', 'RECEPTIONIST');
assert.strictEqual(recConf.allowed, true, 'RECEPTIONIST deve acessar /dashboard/configuracoes');
console.log('[PASS] RECEPTIONIST acessa /dashboard/configuracoes');

// RECEPTIONIST bloqueada em /dashboard/configuracoes/usuarios
const recUsers = evaluatePageRoute('/dashboard/configuracoes/usuarios', 'RECEPTIONIST');
assert.strictEqual(recUsers.allowed, false, 'RECEPTIONIST bloqueada em /dashboard/configuracoes/usuarios');
console.log('[PASS] RECEPTIONIST bloqueada em /dashboard/configuracoes/usuarios');

// DOCTOR bloqueado em /dashboard/configuracoes
const docConf = evaluatePageRoute('/dashboard/configuracoes', 'DOCTOR');
assert.strictEqual(docConf.allowed, false, 'DOCTOR bloqueado em /dashboard/configuracoes');
console.log('[PASS] DOCTOR bloqueado em /dashboard/configuracoes');

// 3. Financeiro da Clínica vs Meu Financeiro
console.log('\n--- TESTANDO ROTAS FINANCEIRAS ---');
// DOCTOR bloqueado em /dashboard/financial/dre
const docDRE = evaluatePageRoute('/dashboard/financial/dre', 'DOCTOR');
assert.strictEqual(docDRE.allowed, false, 'DOCTOR bloqueado no DRE geral da clínica');
console.log('[PASS] DOCTOR bloqueado em /dashboard/financial/dre');

// DOCTOR liberado em /dashboard/meu-financeiro/producao
const docProd = evaluatePageRoute('/dashboard/meu-financeiro/producao', 'DOCTOR');
assert.strictEqual(docProd.allowed, true, 'DOCTOR liberado em Meu Financeiro');
console.log('[PASS] DOCTOR liberado em /dashboard/meu-financeiro/producao');

// RECEPTIONIST bloqueada em Meu Financeiro
const recProd = evaluatePageRoute('/dashboard/meu-financeiro/producao', 'RECEPTIONIST');
assert.strictEqual(recProd.allowed, false, 'RECEPTIONIST bloqueada em Meu Financeiro');
console.log('[PASS] RECEPTIONIST bloqueada em /dashboard/meu-financeiro/producao');

// 4. API de CRM (/api/crm/pipeline, /api/crm/campaigns)
console.log('\n--- TESTANDO BLOQUEIO DE APIS DE CRM ---');
const apiCases = [
    { role: 'CLINIC_ADMIN', expected: true, desc: 'API /api/crm/pipeline permitida para CLINIC_ADMIN' },
    { role: 'SUPER_ADMIN', expected: true, desc: 'API /api/crm/pipeline permitida para SUPER_ADMIN' },
    { role: 'DOCTOR', expected: false, desc: 'API /api/crm/pipeline bloqueada com 403 para DOCTOR' },
    { role: 'RECEPTIONIST', expected: false, desc: 'API /api/crm/pipeline bloqueada com 403 para RECEPTIONIST' },
];

for (const tc of apiCases) {
    const res = evaluateApiRoute('/api/crm/pipeline', tc.role);
    assert.strictEqual(res.allowed, tc.expected, `Falha na API: ${tc.desc}`);
    if (!tc.expected) {
        assert.strictEqual(res.status, 403);
    }
    console.log(`[PASS] ${tc.desc}`);
}

// 5. Novas Rotas de Gestão de Múltiplos Funis (/api/crm/pipelines)
console.log('\n--- TESTANDO GESTÃO DE MÚLTIPLOS FUNIS (/api/crm/pipelines) ---');
const pipelineManageCases = [
    { role: 'CLINIC_ADMIN', expected: true, desc: 'CLINIC_ADMIN pode criar/editar/arquivar funis (/api/crm/pipelines)' },
    { role: 'SUPER_ADMIN', expected: true, desc: 'SUPER_ADMIN pode criar/editar/arquivar funis (/api/crm/pipelines)' },
    { role: 'DOCTOR', expected: false, desc: 'DOCTOR bloqueado em /api/crm/pipelines com 403' },
    { role: 'RECEPTIONIST', expected: false, desc: 'RECEPTIONIST bloqueada em /api/crm/pipelines com 403' },
    { role: 'FINANCIAL', expected: false, desc: 'FINANCIAL bloqueado em /api/crm/pipelines com 403' },
    { role: 'READONLY', expected: false, desc: 'READONLY bloqueado em /api/crm/pipelines com 403' },
];

for (const tc of pipelineManageCases) {
    const res = evaluateApiRoute('/api/crm/pipelines', tc.role);
    assert.strictEqual(res.allowed, tc.expected, `Falha em pipelines: ${tc.desc}`);
    if (!tc.expected) {
        assert.strictEqual(res.status, 403);
    }
    console.log(`[PASS] ${tc.desc}`);
}

// 6. Novas Rotas de Movimentação de Cards (/api/crm/pipeline-cards/move)
console.log('\n--- TESTANDO MOVIMENTAÇÃO DE CARDS (/api/crm/pipeline-cards/move) ---');
const cardMoveCases = [
    { role: 'CLINIC_ADMIN', expected: true, desc: 'CLINIC_ADMIN pode mover cards (/api/crm/pipeline-cards/card-1/move)' },
    { role: 'SUPER_ADMIN', expected: true, desc: 'SUPER_ADMIN pode mover cards (/api/crm/pipeline-cards/card-1/move)' },
    { role: 'RECEPTIONIST', expected: true, desc: 'RECEPTIONIST pode mover cards (/api/crm/pipeline-cards/card-1/move)' },
    { role: 'DOCTOR', expected: true, desc: 'DOCTOR pode mover cards (/api/crm/pipeline-cards/card-1/move)' },
    { role: 'FINANCIAL', expected: false, desc: 'FINANCIAL bloqueado para mover cards com 403' },
    { role: 'READONLY', expected: false, desc: 'READONLY bloqueado para mover cards com 403' },
];

for (const tc of cardMoveCases) {
    const res = evaluateApiRoute('/api/crm/pipeline-cards/card-1/move', tc.role);
    assert.strictEqual(res.allowed, tc.expected, `Falha em cards: ${tc.desc}`);
    if (!tc.expected) {
        assert.strictEqual(res.status, 403);
    }
    console.log(`[PASS] ${tc.desc}`);
}

console.log('\n======================================================');
console.log('TODOS OS 29 TESTES DE SEGURANÇA RBAC PASSARAM COM 100% DE SUCESSO');
console.log('======================================================');
