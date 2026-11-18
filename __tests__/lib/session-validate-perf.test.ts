/**
 * @jest-environment node
 */
/* Testes das otimizações de CPU na validação de sessão única e Realtime Broadcast. */
import fs from 'node:fs';
import path from 'node:path';

jest.mock('next-axiom', () => ({
    withAxiomRouteHandler: (handler: any) => (req: any, ctx: any) => handler(req, ctx),
    AxiomRequest: class {},
}));

const mockCookies = {
    get: jest.fn(),
    getAll: jest.fn(() => []),
};

jest.mock('next/headers', () => ({
    cookies: jest.fn(() => Promise.resolve(mockCookies)),
}));

const mockGetVerifiedUser = jest.fn();
jest.mock('@/lib/auth/verify-token', () => ({
    getVerifiedUser: (...args: any[]) => mockGetVerifiedUser(...args),
}));

const mockAdminFrom = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve({})),
    createServiceRoleClient: jest.fn(() => ({ from: mockAdminFrom })),
}));

import { GET as validateSessionGet } from '@/app/api/auth/session/validate/route';
import { registerSingleSession, SESSION_COOKIE_NAME } from '@/lib/services/single-session';

function makeChain(result: { data?: any; error?: any }) {
    const chain: any = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(result),
        maybeSingle: jest.fn().mockResolvedValue(result),
        then: (resolve: any) => Promise.resolve(result).then(resolve),
    };
    return chain;
}

describe('Otimizações de CPU Vercel - Sessão Única e Broadcast Realtime', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCookies.get.mockImplementation((name: string) =>
            name === SESSION_COOKIE_NAME ? { value: 'sess-tok-1' } : undefined
        );
    });

    it('use-session-guard deve usar fallback de 5 minutos, cooldown de 60s e assinatura Realtime Broadcast', () => {
        const src = fs.readFileSync(
            path.join(process.cwd(), 'lib/hooks/use-session-guard.ts'),
            'utf8'
        );
        expect(src).toContain('POLLING_INTERVAL = 300_000');
        expect(src).toContain('MIN_COOLDOWN = 60_000');
        expect(src).toContain("event: 'session-replaced'");
    });

    it('registerSingleSession deve sinalizar previousSessionInvalidated corretamente', async () => {
        const fakeDbClean: any = {
            from: jest.fn(() => ({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                select: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({ data: { id: 'new-sess-1' }, error: null }),
                    then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
                })),
                insert: jest.fn().mockReturnThis(),
            })),
        };
        const cleanReg = await registerSingleSession(fakeDbClean, 'u-clean', 'Chrome', '1.1.1.1', 'user@clinic.test');
        expect(cleanReg.previousSessionInvalidated).toBe(false);

        const fakeDbReplaced: any = {
            from: jest.fn(() => ({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                select: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({ data: { id: 'new-sess-2' }, error: null }),
                    then: (resolve: any) => Promise.resolve({ data: [{ id: 'old-1' }], error: null }).then(resolve),
                })),
                insert: jest.fn().mockReturnThis(),
            })),
        };
        const repReg = await registerSingleSession(fakeDbReplaced, 'u-rep', 'Chrome', '1.1.1.1', 'user@clinic.test');
        expect(repReg.previousSessionInvalidated).toBe(true);
    });

    it('GET /api/auth/session/validate deve reusar cache de clínica (30s) sem repetir query de users/clinics e ainda detectar session_replaced', async () => {
        mockGetVerifiedUser.mockResolvedValue({
            user: { id: 'usr-cache-1', email: 'rec@clinica.test' },
            isLocal: true,
        });

        let activeSessionValid = true;
        mockAdminFrom.mockImplementation((table: string) => {
            if (table === 'users') {
                return makeChain({ data: { clinic_id: 'cli-active-1', role: 'RECEPTIONIST' }, error: null });
            }
            if (table === 'clinics') {
                return makeChain({ data: { is_active: true }, error: null });
            }
            if (table === 'active_sessions') {
                if (activeSessionValid) {
                    return makeChain({
                        data: { id: 's-1', last_active_at: new Date().toISOString() },
                        error: null,
                    });
                }
                return makeChain({
                    data: { device_info: 'Chrome Windows', created_at: '2026-11-18T16:00:00Z' },
                    error: null,
                });
            }
            return makeChain({ data: null, error: null });
        });

        const req = {} as any;
        const res1 = await validateSessionGet(req);
        expect((await res1.json()).valid).toBe(true);

        const usersCallsFirst = mockAdminFrom.mock.calls.filter(([t]) => t === 'users').length;
        const clinicsCallsFirst = mockAdminFrom.mock.calls.filter(([t]) => t === 'clinics').length;
        expect(usersCallsFirst).toBe(1);
        expect(clinicsCallsFirst).toBe(1);

        // Segunda chamada dentro de 30s não deve consultar users nem clinics novamente
        const res2 = await validateSessionGet(req);
        expect((await res2.json()).valid).toBe(true);
        expect(mockAdminFrom.mock.calls.filter(([t]) => t === 'users').length).toBe(1);
        expect(mockAdminFrom.mock.calls.filter(([t]) => t === 'clinics').length).toBe(1);

        // Quando a sessão é invalidada no banco, o cache de clínica NÃO mascara a derrubada da sessão
        mockAdminFrom.mockImplementation((table: string) => {
            if (table === 'active_sessions') {
                // Primeira chamada (single) falha -> segunda chamada (maybeSingle) retorna dispositivo novo
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    order: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                    maybeSingle: jest.fn().mockResolvedValue({
                        data: { device_info: 'Edge Windows', created_at: '2026-11-18T16:30:00Z' },
                        error: null,
                    }),
                };
            }
            return makeChain({ data: null, error: null });
        });

        const res3 = await validateSessionGet(req);
        const body3 = await res3.json();
        expect(body3.valid).toBe(false);
        expect(body3.reason).toBe('session_replaced');
    });

    it('GET /api/auth/session/validate deve bloquear usuário quando clínica está inativa', async () => {
        mockGetVerifiedUser.mockResolvedValue({
            user: { id: 'usr-blocked-99', email: 'med@bloqueada.test' },
            isLocal: true,
        });

        mockAdminFrom.mockImplementation((table: string) => {
            if (table === 'users') return makeChain({ data: { clinic_id: 'cli-blocked', role: 'DOCTOR' }, error: null });
            if (table === 'clinics') return makeChain({ data: { is_active: false }, error: null });
            return makeChain({ data: { id: 's-1', last_active_at: new Date().toISOString() }, error: null });
        });

        const res = await validateSessionGet({} as any);
        const body = await res.json();
        expect(body.valid).toBe(false);
        expect(body.reason).toBe('clinic_blocked');
    });
});
