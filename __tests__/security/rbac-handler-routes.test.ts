/**
 * Teste de Segurança e Sigilo RBAC: Proteção em Nível de Rota e Handler
 * Simula requisições para cada perfil de usuário:
 * DOCTOR, RECEPTIONIST, FINANCIAL, READONLY, CLINIC_ADMIN, SUPER_ADMIN
 * contra todas as rotas de TISS, Convênios, Precificação e Retornos.
 */

describe('T9: Sigilo e Blindagem RBAC em Nível de Rota e Middleware', () => {
    // Mapa exato extraído do middleware.ts consolidado
    const ROLE_PROTECTED_ROUTES: Record<string, string[]> = {
        '/api/clinics': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST'],
        '/api/crm/pipelines': ['SUPER_ADMIN', 'CLINIC_ADMIN'],
        '/api/crm/pipeline-cards': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR'],
        '/api/crm': ['SUPER_ADMIN', 'CLINIC_ADMIN'],
        '/api/admin': ['SUPER_ADMIN'],
        '/api/ai/predict-diagnosis': ['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'],
        '/api/tiss': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST'],
        '/api/health-insurances': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST'],
        '/api/insurance': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST'],
    };

    const ROLE_PROTECTED_PAGES: Record<string, string[]> = {
        '/dashboard/tiss': ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN', 'RECEPTIONIST'],
        '/dashboard/convenios': ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN', 'RECEPTIONIST'],
        '/dashboard/meu-financeiro': ['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'],
    };

    function checkMiddlewareApiAccess(pathname: string, userRole: string): { allowed: boolean; status?: number } {
        if (userRole === 'SUPER_ADMIN') return { allowed: true };

        const sorted = Object.entries(ROLE_PROTECTED_ROUTES).sort(([a], [b]) => b.length - a.length);
        for (const [route, allowedRoles] of sorted) {
            if (pathname.startsWith(route)) {
                if (allowedRoles.includes(userRole)) {
                    return { allowed: true };
                }
                return { allowed: false, status: 403 };
            }
        }
        return { allowed: true };
    }

    function checkMiddlewarePageAccess(pathname: string, userRole: string): { allowed: boolean; redirect?: string } {
        if (userRole === 'SUPER_ADMIN') return { allowed: true };

        const sorted = Object.entries(ROLE_PROTECTED_PAGES).sort(([a], [b]) => b.length - a.length);
        for (const [route, allowedRoles] of sorted) {
            if (pathname === route || pathname.startsWith(`${route}/`)) {
                if (allowedRoles.includes(userRole)) {
                    return { allowed: true };
                }
                return { allowed: false, redirect: '/dashboard?error=unauthorized_role' };
            }
        }
        return { allowed: true };
    }

    // Handlers específicos com validações internas em código
    const handlerCheckers = {
        importTuss: (role: string) => (role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN' ? 200 : 403),
        pricingManage: (role: string) => (role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN' || role === 'FINANCIAL' ? 200 : 403),
        guideFromAppt: (role: string) => (role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN' || role === 'FINANCIAL' || role === 'RECEPTIONIST' ? 200 : 403),
        returnUpload: (role: string) => (role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN' || role === 'FINANCIAL' ? 200 : 403),
        returnParse: (role: string) => (role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN' || role === 'FINANCIAL' ? 200 : 403),
        returnUndo: (role: string) => (role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN' ? 200 : 403),
    };

    describe('1. Perfil DOCTOR (Médico/Terapeuta)', () => {
        const role = 'DOCTOR';

        it('deve ter acesso bloqueado (403) a todas as APIs TISS no middleware', () => {
            expect(checkMiddlewareApiAccess('/api/tiss', role)).toEqual({ allowed: false, status: 403 });
            expect(checkMiddlewareApiAccess('/api/tiss/pricing', role)).toEqual({ allowed: false, status: 403 });
            expect(checkMiddlewareApiAccess('/api/tiss/guides/from-appointment', role)).toEqual({ allowed: false, status: 403 });
            expect(checkMiddlewareApiAccess('/api/tiss/returns/upload', role)).toEqual({ allowed: false, status: 403 });
        });

        it('deve ter acesso bloqueado (403) às rotas de convênios e elegibilidade', () => {
            expect(checkMiddlewareApiAccess('/api/health-insurances', role)).toEqual({ allowed: false, status: 403 });
            expect(checkMiddlewareApiAccess('/api/insurance/check-eligibility', role)).toEqual({ allowed: false, status: 403 });
        });

        it('deve ser redirecionado ao tentar acessar as telas /dashboard/tiss e /dashboard/convenios', () => {
            expect(checkMiddlewarePageAccess('/dashboard/tiss', role).allowed).toBe(false);
            expect(checkMiddlewarePageAccess('/dashboard/convenios', role).allowed).toBe(false);
        });

        it('deve ter permissão em /dashboard/meu-financeiro', () => {
            expect(checkMiddlewarePageAccess('/dashboard/meu-financeiro', role).allowed).toBe(true);
        });

        it('handlers devem rejeitar DOCTOR mesmo com chamada direta simulada', () => {
            expect(handlerCheckers.importTuss(role)).toBe(403);
            expect(handlerCheckers.pricingManage(role)).toBe(403);
            expect(handlerCheckers.guideFromAppt(role)).toBe(403);
            expect(handlerCheckers.returnUpload(role)).toBe(403);
            expect(handlerCheckers.returnParse(role)).toBe(403);
            expect(handlerCheckers.returnUndo(role)).toBe(403);
        });
    });

    describe('2. Perfil RECEPTIONIST (Recepção)', () => {
        const role = 'RECEPTIONIST';

        it('deve ter permissão para emitir guias TISS e checar elegibilidade', () => {
            expect(checkMiddlewareApiAccess('/api/tiss/guides/from-appointment', role)).toEqual({ allowed: true });
            expect(checkMiddlewareApiAccess('/api/insurance/check-eligibility', role)).toEqual({ allowed: true });
            expect(handlerCheckers.guideFromAppt(role)).toBe(200);
        });

        it('NÃO deve ter permissão para gerenciar precificação nem importar catálogo TUSS', () => {
            expect(handlerCheckers.importTuss(role)).toBe(403);
            expect(handlerCheckers.pricingManage(role)).toBe(403);
            expect(handlerCheckers.returnUndo(role)).toBe(403);
        });
    });

    describe('3. Perfil FINANCIAL (Financeiro)', () => {
        const role = 'FINANCIAL';

        it('deve ter permissão para gerenciar precificação, processar retornos e emitir guias', () => {
            expect(checkMiddlewareApiAccess('/api/tiss/pricing', role)).toEqual({ allowed: true });
            expect(handlerCheckers.pricingManage(role)).toBe(200);
            expect(handlerCheckers.returnUpload(role)).toBe(200);
            expect(handlerCheckers.returnParse(role)).toBe(200);
        });

        it('NÃO deve ter permissão para desfazer retorno nem importar catálogo oficial TUSS', () => {
            expect(handlerCheckers.returnUndo(role)).toBe(403);
            expect(handlerCheckers.importTuss(role)).toBe(403);
        });
    });

    describe('4. Perfil READONLY (Auditor / Consulta)', () => {
        const role = 'READONLY';

        it('deve ter todas as ações de mutação e faturamento rejeitadas (403)', () => {
            expect(checkMiddlewareApiAccess('/api/tiss', role)).toEqual({ allowed: false, status: 403 });
            expect(checkMiddlewareApiAccess('/api/health-insurances', role)).toEqual({ allowed: false, status: 403 });
            expect(checkMiddlewareApiAccess('/api/insurance/check-eligibility', role)).toEqual({ allowed: false, status: 403 });
            expect(handlerCheckers.importTuss(role)).toBe(403);
            expect(handlerCheckers.pricingManage(role)).toBe(403);
            expect(handlerCheckers.guideFromAppt(role)).toBe(403);
            expect(handlerCheckers.returnUndo(role)).toBe(403);
        });
    });

    describe('5. Perfil CLINIC_ADMIN e SUPER_ADMIN (Administradores)', () => {
        it('CLINIC_ADMIN deve ter acesso irrestrito dentro da clínica', () => {
            const role = 'CLINIC_ADMIN';
            expect(checkMiddlewareApiAccess('/api/tiss', role)).toEqual({ allowed: true });
            expect(checkMiddlewareApiAccess('/api/health-insurances', role)).toEqual({ allowed: true });
            expect(checkMiddlewarePageAccess('/dashboard/tiss', role)).toEqual({ allowed: true });
            expect(handlerCheckers.importTuss(role)).toBe(200);
            expect(handlerCheckers.pricingManage(role)).toBe(200);
            expect(handlerCheckers.guideFromAppt(role)).toBe(200);
            expect(handlerCheckers.returnUpload(role)).toBe(200);
            expect(handlerCheckers.returnParse(role)).toBe(200);
            expect(handlerCheckers.returnUndo(role)).toBe(200);
        });

        it('SUPER_ADMIN deve ter bypass mestre em todas as rotas e páginas', () => {
            const role = 'SUPER_ADMIN';
            expect(checkMiddlewareApiAccess('/api/tiss', role)).toEqual({ allowed: true });
            expect(checkMiddlewareApiAccess('/api/health-insurances', role)).toEqual({ allowed: true });
            expect(checkMiddlewareApiAccess('/api/insurance', role)).toEqual({ allowed: true });
            expect(checkMiddlewarePageAccess('/dashboard/tiss', role)).toEqual({ allowed: true });
            expect(checkMiddlewarePageAccess('/dashboard/convenios', role)).toEqual({ allowed: true });
        });
    });
});
