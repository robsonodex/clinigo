jest.mock('next/server', () => {
    class MockNextRequest {
        url: string;
        method: string;
        private _body: any;
        private _headers: Map<string, string>;

        constructor(url: string, init?: any) {
            this.url = url;
            this.method = init?.method || 'GET';
            this._body = init?.body ? JSON.parse(init.body) : {};
            this._headers = new Map();
            if (init?.headers) {
                Object.entries(init.headers).forEach(([k, v]) => this._headers.set(k.toLowerCase(), v as string));
            }
        }

        json() {
            return Promise.resolve(this._body);
        }

        get headers() {
            return {
                get: (name: string) => this._headers.get(name.toLowerCase()) || null,
            };
        }
    }

    return {
        NextRequest: MockNextRequest,
        NextResponse: {
            json: jest.fn().mockImplementation((body, init) => ({
                status: init?.status || 200,
                json: async () => body,
            })),
            redirect: jest.fn().mockImplementation((url) => ({ status: 307, url })),
        },
    };
});

const mockSupabase = {
    auth: {
        getUser: jest.fn(),
    },
    from: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}));

jest.mock('@/lib/auth/tiss-role-guard', () => ({
    requireTissAction: jest.fn((request: any, action: string) => {
        const role = request.headers.get('x-mock-role') || 'FINANCIAL';
        if (role === 'RECEPTIONIST' || role === 'READONLY' || role === 'DOCTOR') {
            return Promise.resolve({
                authorized: false,
                response: {
                    status: 403,
                    json: async () => ({ success: false, error: 'Acesso negado' }),
                },
            });
        }
        return Promise.resolve({ authorized: true });
    }),
    enforceTissAdministrativeGuard: jest.fn(() => Promise.resolve({ authorized: true })),
}));

import { PUT } from '@/app/api/tiss/batches/[id]/route';
import { NextRequest } from 'next/server';

describe('PUT /api/tiss/batches/[id] - Regras Estritas de Reabertura de Lote', () => {
    const mockUser = { id: 'usr-123', email: 'fin@clinica.com' };
    const mockProfile = { clinic_id: 'cli-456', role: 'FINANCIAL' };

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    });

    test('Deve retornar 409 quando tentar reabrir um lote que ja esta em DRAFT/OPEN', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({ data: mockProfile }),
                        }),
                    }),
                };
            }
            if (table === 'tiss_batches') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                single: () => Promise.resolve({ data: { id: 'batch-1', status: 'DRAFT', batch_number: 'LOTE-001' } }),
                            }),
                        }),
                    }),
                };
            }
            return {};
        });

        const req = new NextRequest('http://localhost/api/tiss/batches/batch-1', {
            method: 'PUT',
            body: JSON.stringify({ status: 'DRAFT', reason: 'Necessario incluir mais guias no lote' }),
            headers: { 'Content-Type': 'application/json', 'x-mock-role': 'FINANCIAL' },
        });

        const res = await PUT(req, { params: Promise.resolve({ id: 'batch-1' }) });
        const json = await res.json();

        expect(res.status).toBe(409);
        expect(json.code).toBe('INVALID_STATUS_FOR_REOPEN');
    });

    test('Deve retornar 409 quando tentar reabrir um lote que ja foi ENVIADO (SENT)', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({ data: mockProfile }),
                        }),
                    }),
                };
            }
            if (table === 'tiss_batches') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                single: () => Promise.resolve({ data: { id: 'batch-2', status: 'SENT', batch_number: 'LOTE-002' } }),
                            }),
                        }),
                    }),
                };
            }
            return {};
        });

        const req = new NextRequest('http://localhost/api/tiss/batches/batch-2', {
            method: 'PUT',
            body: JSON.stringify({ status: 'DRAFT', reason: 'Necessario corrigir guia enviada' }),
            headers: { 'Content-Type': 'application/json', 'x-mock-role': 'FINANCIAL' },
        });

        const res = await PUT(req, { params: Promise.resolve({ id: 'batch-2' }) });
        const json = await res.json();

        expect(res.status).toBe(409);
        expect(json.code).toBe('INVALID_STATUS_FOR_REOPEN');
    });

    test('Deve retornar 400 quando tentar reabrir lote fechado mas sem motivo ou com menos de 10 caracteres', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({ data: mockProfile }),
                        }),
                    }),
                };
            }
            if (table === 'tiss_batches') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                single: () => Promise.resolve({ data: { id: 'batch-3', status: 'CLOSED', batch_number: 'LOTE-003' } }),
                            }),
                        }),
                    }),
                };
            }
            return {};
        });

        const req = new NextRequest('http://localhost/api/tiss/batches/batch-3', {
            method: 'PUT',
            body: JSON.stringify({ status: 'DRAFT', reason: 'curto' }),
            headers: { 'Content-Type': 'application/json', 'x-mock-role': 'FINANCIAL' },
        });

        const res = await PUT(req, { params: Promise.resolve({ id: 'batch-3' }) });
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.code).toBe('REOPEN_REASON_REQUIRED');
    });

    test('Deve reabrir com sucesso (200) lote FECHADO com motivo valido (>= 10 chars) e registrar auditoria', async () => {
        const mockAuditInsert = jest.fn().mockResolvedValue({ error: null });
        const mockBatchUpdate = jest.fn().mockReturnValue({
            eq: () => ({
                eq: () => ({
                    select: () => ({
                        single: () => Promise.resolve({
                            data: {
                                id: 'batch-4',
                                status: 'DRAFT',
                                batch_number: 'LOTE-004',
                                reopen_reason: 'Correcao de codigo TUSS solicitada pelo auditor',
                            },
                            error: null,
                        }),
                    }),
                }),
            }),
        });

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({ data: mockProfile }),
                        }),
                    }),
                };
            }
            if (table === 'tiss_batches') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                single: () => Promise.resolve({ data: { id: 'batch-4', status: 'VALID', batch_number: 'LOTE-004' } }),
                            }),
                        }),
                    }),
                    update: mockBatchUpdate,
                };
            }
            if (table === 'audit_logs') {
                return {
                    insert: mockAuditInsert,
                };
            }
            return {};
        });

        const req = new NextRequest('http://localhost/api/tiss/batches/batch-4', {
            method: 'PUT',
            body: JSON.stringify({
                status: 'DRAFT',
                reason: 'Correcao de codigo TUSS solicitada pelo auditor',
            }),
            headers: { 'Content-Type': 'application/json', 'x-mock-role': 'FINANCIAL' },
        });

        const res = await PUT(req, { params: Promise.resolve({ id: 'batch-4' }) });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(mockBatchUpdate).toHaveBeenCalled();
        expect(mockAuditInsert).toHaveBeenCalledWith(expect.objectContaining({
            action: 'TISS_BATCH_REOPEN',
            entity_id: 'batch-4',
        }));
    });

    test('Deve fechar lote com status CLOSED gravando VALID e timestamps de auditoria', async () => {
        let updatedPayload: any = null;
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({ data: mockProfile }),
                        }),
                    }),
                };
            }
            if (table === 'tiss_batches') {
                return {
                    select: (cols?: string) => {
                        if (cols === 'status') {
                            return {
                                eq: () => ({
                                    eq: () => ({
                                        single: () => Promise.resolve({ data: { status: 'DRAFT' } }),
                                    }),
                                }),
                            };
                        }
                        return {
                            eq: () => ({
                                eq: () => ({
                                    single: () => Promise.resolve({ data: { id: 'batch-close', status: 'DRAFT', batch_number: 'LOTE-CLOSE' } }),
                                }),
                            }),
                        };
                    },
                    update: jest.fn((payload) => {
                        updatedPayload = payload;
                        return {
                            eq: () => ({
                                eq: () => ({
                                    select: () => ({
                                        single: () => Promise.resolve({ data: { id: 'batch-close', ...payload }, error: null }),
                                    }),
                                }),
                            }),
                        };
                    }),
                };
            }
            return {};
        });

        const req = new NextRequest('http://localhost/api/tiss/batches/batch-close', {
            method: 'PUT',
            body: JSON.stringify({ status: 'CLOSED' }),
            headers: { 'Content-Type': 'application/json', 'x-mock-role': 'FINANCIAL' },
        });

        const res = await PUT(req, { params: Promise.resolve({ id: 'batch-close' }) });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(updatedPayload.status).toBe('VALID'); // compatibilidade retroativa
        expect(updatedPayload.closed_at).toBeDefined();
        expect(updatedPayload.closed_by).toBe(mockUser.id);
    });

    test('Ciclo completo: Fechar (DRAFT -> VALID) e em seguida Reabrir (VALID -> DRAFT com motivo)', async () => {
        let batchState = 'DRAFT';
        let reopenLogged = false;

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({ data: mockProfile }),
                        }),
                    }),
                };
            }
            if (table === 'tiss_batches') {
                return {
                    select: (cols?: string) => {
                        return {
                            eq: () => ({
                                eq: () => ({
                                    single: () => Promise.resolve({ data: { id: 'batch-cycle', status: batchState, batch_number: 'LOTE-CYCLE' } }),
                                }),
                            }),
                        };
                    },
                    update: jest.fn((payload) => {
                        batchState = payload.status;
                        return {
                            eq: () => ({
                                eq: () => ({
                                    select: () => ({
                                        single: () => Promise.resolve({ data: { id: 'batch-cycle', ...payload }, error: null }),
                                    }),
                                }),
                            }),
                        };
                    }),
                };
            }
            if (table === 'audit_logs') {
                return {
                    insert: jest.fn(() => {
                        reopenLogged = true;
                        return Promise.resolve({ error: null });
                    }),
                };
            }
            return {};
        });

        // Passo 1: Fechar
        const reqClose = new NextRequest('http://localhost/api/tiss/batches/batch-cycle', {
            method: 'PUT',
            body: JSON.stringify({ status: 'VALID' }),
            headers: { 'Content-Type': 'application/json', 'x-mock-role': 'FINANCIAL' },
        });
        const resClose = await PUT(reqClose, { params: Promise.resolve({ id: 'batch-cycle' }) });
        expect(resClose.status).toBe(200);
        expect(batchState).toBe('VALID');

        // Passo 2: Reabrir a partir de VALID
        const reqReopen = new NextRequest('http://localhost/api/tiss/batches/batch-cycle', {
            method: 'PUT',
            body: JSON.stringify({
                status: 'DRAFT',
                reason: 'Revisao solicitada pelo auditor para inclusao de novas guias',
            }),
            headers: { 'Content-Type': 'application/json', 'x-mock-role': 'FINANCIAL' },
        });
        const resReopen = await PUT(reqReopen, { params: Promise.resolve({ id: 'batch-cycle' }) });
        const jsonReopen = await resReopen.json();

        expect(resReopen.status).toBe(200);
        expect(jsonReopen.success).toBe(true);
        expect(batchState).toBe('DRAFT');
        expect(reopenLogged).toBe(true);
    });
});
