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
        },
    };
});

const mockSupabase = {
    auth: {
        getUser: jest.fn(),
    },
    from: jest.fn(),
    storage: {
        from: jest.fn(),
    }
};

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}));

jest.mock('@/lib/auth/tiss-role-guard', () => ({
    requireTissAction: jest.fn((request: any, action: string) => {
        const role = request.headers.get('x-mock-role') || 'FINANCIAL';
        if (role === 'RECEPTIONIST' && ['lote.fechar', 'lote.registrar_envio'].includes(action)) {
            return Promise.resolve({
                authorized: false,
                response: {
                    status: 403,
                    json: async () => ({ success: false, error: 'Acesso negado' }),
                },
            });
        }
        if (role === 'READONLY' || role === 'DOCTOR') {
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
}));

jest.mock('@/lib/tiss/audit', () => ({
    writeTissAudit: jest.fn(() => Promise.resolve({ success: true })),
}));

import { GET as getBatchGuides, POST as postBatchGuides } from '@/app/api/tiss/batches/[id]/guides/route';
import { GET as getPreClose } from '@/app/api/tiss/batches/[id]/pre-close/route';
import { POST as postCloseBatch } from '@/app/api/tiss/batches/[id]/close/route';
import { POST as postManualDispatch } from '@/app/api/tiss/batches/[id]/manual-dispatch/route';
import { NextRequest } from 'next/server';

describe('Suíte Nominal de Testes L2, L3 e L7 - Ciclo de Vida de Lotes TISS', () => {
    const mockUser = { id: 'usr-fin-001', email: 'faturamento@clinica.com' };
    const mockProfile = { clinic_id: 'cli-001', role: 'FINANCIAL' };

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    });

    describe('L2: Vincular e Desvincular Guias ao Lote com Totais ao Vivo', () => {
        test('L2-01: GET deve retornar guias vinculadas, guias elegíveis e resumo financeiro', async () => {
            const batchData = {
                id: 'batch-001',
                batch_number: 'LOTE-2026-001',
                status: 'DRAFT',
                insurance_company_id: 'ins-001',
                total_guides: 1,
                total_value: 150.00
            };

            const linkedGuides = [
                { id: 'g-001', guide_number: 'GUIA-001', total_value: 150.00, status: 'IN_BATCH' }
            ];

            const eligibleGuides = [
                { id: 'g-002', guide_number: 'GUIA-002', total_value: 200.00, status: 'VALIDATED' }
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return {
                        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) })
                    };
                }
                if (table === 'tiss_batches') {
                    return {
                        select: () => ({
                            eq: () => ({
                                eq: () => ({ single: () => Promise.resolve({ data: batchData, error: null }) })
                            })
                        })
                    };
                }
                if (table === 'tiss_guides') {
                    return {
                        select: () => ({
                            eq: () => ({
                                eq: () => ({
                                    order: () => Promise.resolve({ data: linkedGuides, error: null })
                                }),
                                is: () => ({
                                    neq: () => ({
                                        or: () => ({
                                            order: () => ({
                                                limit: () => Promise.resolve({ data: eligibleGuides, error: null })
                                            })
                                        })
                                    })
                                })
                            })
                        })
                    };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/batches/batch-001/guides');
            const res = await getBatchGuides(req, { params: Promise.resolve({ id: 'batch-001' }) });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data.summary.linked_count).toBe(1);
            expect(body.data.summary.linked_value).toBe(150.00);
            expect(body.data.summary.eligible_count).toBe(1);
            expect(body.data.summary.is_batch_open).toBe(true);
        });

        test('L2-02: POST deve vincular guias e recalcular total_guides e total_value em lote aberto', async () => {
            const batchData = {
                id: 'batch-001',
                batch_number: 'LOTE-2026-001',
                status: 'DRAFT',
                insurance_company_id: 'ins-001',
                total_guides: 1,
                total_value: 150.00
            };

            const guidesToLink = [
                { id: '11111111-1111-1111-1111-111111111111', guide_number: 'GUIA-002', status: 'VALIDATED', total_value: 200.00, operator_id: 'ins-001' }
            ];

            const updatedBatchGuides = [
                { id: 'g-001', total_value: 150.00 },
                { id: '11111111-1111-1111-1111-111111111111', total_value: 200.00 }
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return {
                        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) })
                    };
                }
                if (table === 'tiss_batches') {
                    return {
                        select: () => ({
                            eq: () => ({
                                eq: () => ({ single: () => Promise.resolve({ data: batchData, error: null }) })
                            })
                        }),
                        update: (updates: any) => ({
                            eq: () => ({
                                eq: () => ({
                                    select: () => ({
                                        single: () => Promise.resolve({
                                            data: { ...batchData, ...updates },
                                            error: null
                                        })
                                    })
                                })
                            })
                        })
                    };
                }
                if (table === 'tiss_guides') {
                    return {
                        select: () => ({
                            in: () => ({
                                eq: () => ({
                                    neq: () => Promise.resolve({ data: guidesToLink })
                                })
                            }),
                            eq: () => ({
                                eq: () => ({
                                    neq: () => Promise.resolve({ data: updatedBatchGuides })
                                })
                            })
                        }),
                        update: () => ({
                            in: () => ({
                                eq: () => Promise.resolve({ error: null })
                            })
                        })
                    };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/batches/batch-001/guides', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'link',
                    guide_ids: ['11111111-1111-1111-1111-111111111111']
                })
            });

            const res = await postBatchGuides(req, { params: Promise.resolve({ id: 'batch-001' }) });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data.total_guides).toBe(2);
            expect(body.data.total_value).toBe(350.00);
        });

        test('L2-03: POST deve rejeitar vinculação com HTTP 409 se o lote estiver fechado ou enviado', async () => {
            const batchClosed = {
                id: 'batch-001',
                batch_number: 'LOTE-2026-001',
                status: 'CLOSED',
                insurance_company_id: 'ins-001'
            };

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return {
                        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) })
                    };
                }
                if (table === 'tiss_batches') {
                    return {
                        select: () => ({
                            eq: () => ({
                                eq: () => ({ single: () => Promise.resolve({ data: batchClosed, error: null }) })
                            })
                        })
                    };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/batches/batch-001/guides', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'link',
                    guide_ids: ['11111111-1111-1111-1111-111111111111']
                })
            });

            const res = await postBatchGuides(req, { params: Promise.resolve({ id: 'batch-001' }) });
            const body = await res.json();

            expect(res.status).toBe(409);
            expect(body.code).toBe('BATCH_NOT_OPEN');
        });
    });

    describe('L3: Fechar Lote com Verificação Prévia de Impeditivos e Checksum', () => {
        test('L3-01: pre-close deve identificar pendências impeditivas (código TUSS ausente, valor zerado)', async () => {
            const batchData = { id: 'batch-001', batch_number: 'LOTE-001', status: 'DRAFT' };
            const guidesWithIssues = [
                {
                    id: 'g-err',
                    guide_number: 'GUIA-ERR',
                    patient_name: 'Paciente Teste',
                    patient_card_number: '12', // Inválida (< 3)
                    procedure_code: '', // Inválido
                    procedure_name: 'Consulta',
                    total_value: 0, // Inválido (<= 0)
                    execution_date: null,
                    status: 'VALIDATED'
                }
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_batches') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: batchData }) }) }) }) };
                }
                if (table === 'tiss_guides') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ neq: () => Promise.resolve({ data: guidesWithIssues }) }) }) }) };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/batches/batch-001/pre-close');
            const res = await getPreClose(req, { params: Promise.resolve({ id: 'batch-001' }) });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.data.can_close).toBe(false);
            expect(body.data.impedimentos.length).toBe(1);
            expect(body.data.impedimentos[0].issues).toContain('Código de procedimento TUSS ausente ou inválido.');
            expect(body.data.impedimentos[0].issues).toContain('Número da carteira do beneficiário ausente ou inválido.');
            expect(body.data.impedimentos[0].issues).toContain('Valor total da guia menor ou igual a zero.');
        });

        test('L3-02: close deve bloquear fechamento com HTTP 422 quando existirem impeditivos', async () => {
            const batchData = { id: 'batch-001', batch_number: 'LOTE-001', status: 'DRAFT' };
            const guidesWithIssues = [
                {
                    id: 'g-err',
                    guide_number: 'GUIA-ERR',
                    patient_card_number: '123456',
                    procedure_code: '', // Falha aqui
                    total_value: 150.00,
                    execution_date: '2026-09-30',
                    status: 'VALIDATED'
                }
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_batches') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: batchData }) }) }) }) };
                }
                if (table === 'tiss_guides') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ neq: () => ({ order: () => Promise.resolve({ data: guidesWithIssues }) }) }) }) }) };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/batches/batch-001/close', { method: 'POST' });
            const res = await postCloseBatch(req, { params: Promise.resolve({ id: 'batch-001' }) });
            const body = await res.json();

            expect(res.status).toBe(422);
            expect(body.code).toBe('BATCH_IMPEDIMENTS_FOUND');
            expect(body.impedimentos_count).toBe(1);
        });

        test('L3-03: close deve fechar com sucesso sem impeditivos, persistindo closed_at, closed_by e checksum', async () => {
            const batchData = { id: 'batch-001', batch_number: 'LOTE-001', status: 'DRAFT' };
            const validGuides = [
                {
                    id: 'g-ok-1',
                    guide_number: 'GUIA-101',
                    patient_card_number: '987654321',
                    procedure_code: '10101012',
                    procedure_name: 'Consulta médica',
                    total_value: 180.00,
                    execution_date: '2026-09-30',
                    status: 'VALIDATED'
                }
            ];

            let updatePayload: any = null;

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_batches') {
                    return {
                        select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: batchData }) }) }) }),
                        update: (payload: any) => {
                            updatePayload = payload;
                            return {
                                eq: () => ({
                                    eq: () => ({
                                        select: () => ({
                                            single: () => Promise.resolve({ data: { ...batchData, ...payload }, error: null })
                                        })
                                    })
                                })
                            };
                        }
                    };
                }
                if (table === 'tiss_guides') {
                    return {
                        select: () => ({ eq: () => ({ eq: () => ({ neq: () => ({ order: () => Promise.resolve({ data: validGuides }) }) }) }) }),
                        update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) })
                    };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/batches/batch-001/close', { method: 'POST' });
            const res = await postCloseBatch(req, { params: Promise.resolve({ id: 'batch-001' }) });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data.checksum).toBeDefined();
            expect(body.data.checksum.length).toBe(64); // SHA-256
            expect(updatePayload.status).toBe('VALID');
            expect(updatePayload.closed_by).toBe('usr-fin-001');
            expect(updatePayload.closed_at).toBeDefined();
        });
    });

    describe('L7: Registrar Envio Manual de Lote', () => {
        test('L7-01: manual-dispatch deve registrar envio com canal, protocolo e URL assinada privada', async () => {
            const batchData = {
                id: 'batch-001',
                batch_number: 'LOTE-001',
                status: 'VALID',
                receipt_proof_url: null
            };

            let batchUpdatePayload: any = null;

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_batches') {
                    return {
                        select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: batchData }) }) }) }),
                        update: (payload: any) => {
                            batchUpdatePayload = payload;
                            return {
                                eq: () => ({
                                    eq: () => ({
                                        select: () => ({
                                            single: () => Promise.resolve({ data: { ...batchData, ...payload }, error: null })
                                        })
                                    })
                                })
                            };
                        }
                    };
                }
                if (table === 'tiss_guides') {
                    return {
                        update: () => ({ eq: () => ({ eq: () => ({ in: () => Promise.resolve({ error: null }) }) }) })
                    };
                }
                return {};
            });

            mockSupabase.storage.from.mockReturnValue({
                createSignedUrl: jest.fn().mockResolvedValue({
                    data: { signedUrl: 'https://storage.supabase.co/documents/proof.pdf?token=exp60s' },
                    error: null
                })
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/batches/batch-001/manual-dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    protocol_number: 'PROT-BR-2026-999',
                    submission_date: '2026-09-30',
                    dispatch_channel: 'PORTAL',
                    proof_storage_path: 'cli-001/proofs/batch-001/comprovante.pdf'
                })
            });

            const res = await postManualDispatch(req, { params: Promise.resolve({ id: 'batch-001' }) });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(batchUpdatePayload.status).toBe('SENT');
            expect(batchUpdatePayload.protocol_number).toBe('PROT-BR-2026-999');
            expect(batchUpdatePayload.dispatch_channel).toBe('PORTAL');
            expect(body.data.signed_proof_url).toContain('https://storage.supabase.co/documents/proof.pdf');
        });

        test('L7-02: manual-dispatch deve rejeitar protocolo com menos de 3 caracteres', async () => {
            const batchData = { id: 'batch-001', batch_number: 'LOTE-001', status: 'VALID' };

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_batches') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: batchData }) }) }) }) };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/batches/batch-001/manual-dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    protocol_number: 'AB', // Inválido (< 3)
                    submission_date: '2026-09-30',
                    dispatch_channel: 'PORTAL'
                })
            });

            const res = await postManualDispatch(req, { params: Promise.resolve({ id: 'batch-001' }) });
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error).toBe('Número do protocolo deve ter ao menos 3 caracteres');
        });

        test('L7-03: manual-dispatch deve retornar 409 quando o lote estiver com status DRAFT ou OPEN (só aceita VALID ou CLOSED pela state-machine)', async () => {
            const batchDraft = { id: 'batch-draft', batch_number: 'LOTE-DRAFT', status: 'DRAFT' };

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_batches') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: batchDraft }) }) }) }) };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/batches/batch-draft/manual-dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    protocol_number: 'PROT-VALIDO-123',
                    submission_date: '2026-09-30',
                    dispatch_channel: 'PORTAL'
                })
            });

            const res = await postManualDispatch(req, { params: Promise.resolve({ id: 'batch-draft' }) });
            const body = await res.json();

            expect(res.status).toBe(409);
            expect(body.success).toBe(false);
            expect(body.code).toBe('INVALID_STATUS');
            expect(body.error).toContain('não pode ser despachado manualmente');
        });

        test('L7-04: manual-dispatch deve aceitar envio de lote com status CLOSED', async () => {
            const batchClosed = { id: 'batch-closed', batch_number: 'LOTE-CLOSED', status: 'CLOSED' };

            let batchUpdatePayload: any = null;

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_batches') {
                    return {
                        select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: batchClosed }) }) }) }),
                        update: (payload: any) => {
                            batchUpdatePayload = payload;
                            return {
                                eq: () => ({
                                    eq: () => ({
                                        select: () => ({
                                            single: () => Promise.resolve({ data: { ...batchClosed, ...payload }, error: null })
                                        })
                                    })
                                })
                            };
                        }
                    };
                }
                if (table === 'tiss_guides') {
                    return {
                        update: () => ({ eq: () => ({ eq: () => ({ in: () => Promise.resolve({ error: null }) }) }) })
                    };
                }
                return {};
            });

            mockSupabase.storage.from.mockReturnValue({
                createSignedUrl: jest.fn().mockResolvedValue({
                    data: { signedUrl: 'https://storage.supabase.co/documents/proof.pdf' },
                    error: null
                })
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/batches/batch-closed/manual-dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    protocol_number: 'PROT-CLOSED-888',
                    submission_date: '2026-09-30',
                    dispatch_channel: 'EMAIL'
                })
            });

            const res = await postManualDispatch(req, { params: Promise.resolve({ id: 'batch-closed' }) });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(batchUpdatePayload.status).toBe('SENT');
            expect(batchUpdatePayload.dispatch_channel).toBe('EMAIL');
        });
    });
});
