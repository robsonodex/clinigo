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
}));

jest.mock('@/lib/tiss/audit', () => ({
    writeTissAudit: jest.fn(() => Promise.resolve({ success: true })),
}));

import { POST as postDryRun } from '@/app/api/tiss/returns/dry-run/route';
import { POST as postConfirmReturn } from '@/app/api/tiss/returns/confirm/route';
import { POST as postManualGlosa } from '@/app/api/tiss/glosas/manual/route';
import { DELETE as deleteGlosa } from '@/app/api/tiss/glosas/[id]/route';
import { NextRequest } from 'next/server';

describe('Suíte Nominal de Testes R2 e R3 - Retorno TISS e Glosa Manual', () => {
    const mockUser = { id: 'usr-fin-001', email: 'faturamento@clinica.com' };
    const mockProfile = { clinic_id: 'cli-001', role: 'FINANCIAL' };

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    });

    describe('R2: Processamento de Retorno com Prévia Dry-Run e Confirmação Atômica', () => {
        const sampleCsv = [
            'numero_guia;status;valor_apresentado;valor_pago;valor_glosado;codigo_glosa;motivo_glosa',
            'GUIA-PAGA;APROVADO;150.00;150.00;0.00;;',
            'GUIA-GLOSADA;PARCIAL;200.00;120.00;80.00;1409;Quantidade executada excede autorizacao',
            'GUIA-DIVERGENTE;APROVADO;300.00;300.00;0.00;;',
            'GUIA-DESCONHECIDA;NEGADO;100.00;0.00;100.00;1001;Carteira invalida'
        ].join('\n');

        test('R2-01: dry-run deve categorizar reconhecidas, pagas, glosadas, não reconhecidas e divergências sem gravar no banco', async () => {
            const batchData = { id: 'batch-100', batch_number: 'LOTE-RET-100', status: 'SENT' };
            const existingBatchGuides = [
                { id: 'g-1', guide_number: 'GUIA-PAGA', total_value: 150.00, status: 'SENT' },
                { id: 'g-2', guide_number: 'GUIA-GLOSADA', total_value: 200.00, status: 'SENT' },
                { id: 'g-3', guide_number: 'GUIA-DIVERGENTE', total_value: 250.00, status: 'SENT' }, // Diferença: 300 no CSV vs 250 no sistema
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_return_imports') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ neq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }) }) };
                }
                if (table === 'tiss_batches') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: batchData }) }) }) }) };
                }
                if (table === 'tiss_guides') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ neq: () => Promise.resolve({ data: existingBatchGuides }) }) }) }) };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/returns/dry-run', {
                method: 'POST',
                body: JSON.stringify({
                    batch_id: '11111111-1111-1111-1111-111111111111',
                    file_name: 'retorno_operadora_teste.csv',
                    file_type: 'CSV',
                    file_content: sampleCsv
                })
            });

            const res = await postDryRun(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data.dry_run_token).toBeDefined();
            expect(body.data.counts.reconhecidas).toBe(3);
            expect(body.data.counts.pagas).toBe(2); // GUIA-PAGA e GUIA-DIVERGENTE
            expect(body.data.counts.glosadas).toBe(1); // GUIA-GLOSADA
            expect(body.data.counts.nao_reconhecidas).toBe(1); // GUIA-DESCONHECIDA
            expect(body.data.counts.divergencias).toBe(1); // GUIA-DIVERGENTE (300 vs 250)
            expect(body.data.totals.valor_glosado).toBe(180.00); // 80 + 100
        });

        test('R2-02: dry-run deve rejeitar com HTTP 409 se o arquivo já foi importado anteriormente (idempotência de hash)', async () => {
            const existingImport = { id: 'imp-old', file_name: 'retorno.csv', created_at: '2026-09-29T10:00:00Z' };

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_return_imports') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ neq: () => ({ maybeSingle: () => Promise.resolve({ data: existingImport }) }) }) }) }) };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/returns/dry-run', {
                method: 'POST',
                body: JSON.stringify({
                    batch_id: '11111111-1111-1111-1111-111111111111',
                    file_name: 'retorno.csv',
                    file_type: 'CSV',
                    file_content: sampleCsv
                })
            });

            const res = await postDryRun(req);
            const body = await res.json();

            expect(res.status).toBe(409);
            expect(body.code).toBe('DUPLICATE_RETURN_FILE');
        });

        test('R2-03: confirm deve atualizar guias, lote para RETURNED e gravar auditoria atomicamente', async () => {
            const batchData = { id: 'batch-100', batch_number: 'LOTE-RET-100', status: 'SENT' };
            const existingBatchGuides = [
                { id: '11111111-1111-1111-1111-111111111111', guide_number: 'GUIA-PAGA', total_value: 150.00, status: 'SENT' }
            ];

            let importInsertPayload: any = null;
            let batchUpdatePayload: any = null;

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_return_imports') {
                    return {
                        select: () => ({ eq: () => ({ eq: () => ({ neq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }) }),
                        insert: (payload: any) => {
                            importInsertPayload = payload;
                            return Promise.resolve({ error: null });
                        }
                    };
                }
                if (table === 'tiss_batches') {
                    return {
                        select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: batchData }) }) }) }),
                        update: (payload: any) => {
                            batchUpdatePayload = payload;
                            return { eq: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: { ...batchData, ...payload } }) }) }) }) };
                        }
                    };
                }
                if (table === 'tiss_guides') {
                    return {
                        select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: existingBatchGuides }) }) }),
                        update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) })
                    };
                }
                if (table === 'tiss_glosas') {
                    return { insert: () => Promise.resolve({ error: null }) };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/returns/confirm', {
                method: 'POST',
                body: JSON.stringify({
                    batch_id: '11111111-1111-1111-1111-111111111111',
                    dry_run_token: 'token-dry-run-valido-1234567890',
                    file_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                    file_name: 'retorno.csv',
                    file_type: 'CSV',
                    records: [{
                        numero_guia: 'GUIA-PAGA',
                        status: 'APROVADO',
                        valor_apresentado: 150.00,
                        valor_pago: 150.00,
                        valor_glosado: 0.00
                    }]
                })
            });

            const res = await postConfirmReturn(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(batchUpdatePayload.status).toBe('RETURNED');
            expect(importInsertPayload.status).toBe('COMPLETED');
            expect(importInsertPayload.total_matched).toBe(1);
        });
    });

    describe('R3: Lançamento Manual de Glosa e Desfazer', () => {
        test('R3-01: manual deve bloquear com HTTP 422 se valor glosado exceder saldo disponível da guia', async () => {
            const guideData = {
                id: '11111111-1111-1111-1111-111111111111',
                guide_number: 'GUIA-VALOR',
                total_value: 200.00,
                status: 'SENT'
            };
            const existingGlosas = [
                { id: 'gl-1', glosa_value: 150.00 } // Saldo restante = 50.00
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_guides') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: guideData }) }) }) }) };
                }
                if (table === 'tiss_glosas') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ neq: () => Promise.resolve({ data: existingGlosas }) }) }) }) }) };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/glosas/manual', {
                method: 'POST',
                body: JSON.stringify({
                    guide_id: '11111111-1111-1111-1111-111111111111',
                    item_code: '10101012',
                    glosa_code: '1409',
                    glosa_description: 'Quantidade executada excede a autorizacao',
                    glosa_type: 'ADMINISTRATIVA',
                    glosa_value: 80.00 // Invalido: 80 > 50 (saldo restante)
                })
            });

            const res = await postManualGlosa(req);
            const body = await res.json();

            expect(res.status).toBe(422);
            expect(body.code).toBe('GLOSA_VALUE_EXCEEDS_BALANCE');
            expect(body.saldo_disponivel).toBe(50.00);
        });

        test('R3-02: manual deve lançar glosa com sucesso e atualizar financeiro quando valor for válido', async () => {
            const guideData = {
                id: '11111111-1111-1111-1111-111111111111',
                guide_number: 'GUIA-VALOR',
                total_value: 200.00,
                status: 'SENT'
            };

            let insertedGlosa: any = null;
            let updatedGuidePayload: any = null;

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_guides') {
                    return {
                        select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: guideData }) }) }) }),
                        update: (payload: any) => {
                            updatedGuidePayload = payload;
                            return { eq: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: { ...guideData, ...payload } }) }) }) }) };
                        }
                    };
                }
                if (table === 'tiss_glosas') {
                    return {
                        select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ neq: () => Promise.resolve({ data: [] }) }) }) }) }),
                        insert: (payload: any) => {
                            insertedGlosa = payload;
                            return { select: () => ({ single: () => Promise.resolve({ data: { id: 'gl-new-001', ...payload } }) }) };
                        }
                    };
                }
                if (table === 'financial_entries') {
                    return { insert: () => Promise.resolve({ error: null }) };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/glosas/manual', {
                method: 'POST',
                body: JSON.stringify({
                    guide_id: '11111111-1111-1111-1111-111111111111',
                    item_code: '10101012',
                    glosa_code: '1409',
                    glosa_description: 'Quantidade executada excede a autorizacao',
                    glosa_type: 'ADMINISTRATIVA',
                    glosa_value: 60.00
                })
            });

            const res = await postManualGlosa(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(insertedGlosa.glosa_value).toBe(60.00);
            expect(updatedGuidePayload.glosa_value).toBe(60.00);
            expect(updatedGuidePayload.paid_value).toBe(140.00);
            expect(updatedGuidePayload.status).toBe('PARTIALLY_GLOSED');
        });

        test('R3-03: desfazer glosa deve bloquear com HTTP 409 se houver recurso de glosa ativo', async () => {
            const glosaData = {
                id: 'gl-com-recurso',
                guide_id: '11111111-1111-1111-1111-111111111111',
                status: 'GLOSADA',
                glosa_value: 100.00
            };
            const appealItem = { id: 'app-item-01', appeal_id: 'app-01', status: 'IN_PREPARATION' };

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_glosas') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: glosaData }) }) }) }) };
                }
                if (table === 'tiss_appeal_items') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: appealItem }) }) }) }) };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/glosas/gl-com-recurso', { method: 'DELETE' });
            const res = await deleteGlosa(req, { params: Promise.resolve({ id: 'gl-com-recurso' }) });
            const body = await res.json();

            expect(res.status).toBe(409);
            expect(body.code).toBe('APPEAL_EXISTS_FOR_GLOSA');
        });

        test('R3-04: desfazer glosa sem recurso deve cancelar glosa e restaurar saldo da guia com sucesso', async () => {
            const glosaData = {
                id: 'gl-sem-recurso',
                guide_id: '11111111-1111-1111-1111-111111111111',
                status: 'GLOSADA',
                glosa_value: 100.00
            };
            const guideData = {
                id: '11111111-1111-1111-1111-111111111111',
                total_value: 200.00,
                batch_id: 'batch-01'
            };

            let updatedGuidePayload: any = null;

            let tissGlosaSelectCount = 0;
            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_glosas') {
                    return {
                        select: () => {
                            tissGlosaSelectCount++;
                            if (tissGlosaSelectCount === 1) {
                                return {
                                    eq: () => ({
                                        eq: () => ({ single: () => Promise.resolve({ data: glosaData }) })
                                    })
                                };
                            }
                            return {
                                eq: () => ({
                                    eq: () => ({
                                        is: () => ({
                                            neq: () => Promise.resolve({ data: [] })
                                        })
                                    })
                                })
                            };
                        },
                        update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) })
                    };
                }
                if (table === 'tiss_appeal_items') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }) };
                }
                if (table === 'tiss_glosa_contests') {
                    return { select: () => ({ eq: () => ({ neq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }) };
                }
                if (table === 'tiss_guides') {
                    return {
                        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: guideData }) }) }),
                        update: (payload: any) => {
                            updatedGuidePayload = payload;
                            return { eq: () => Promise.resolve({ error: null }) };
                        }
                    };
                }
                if (table === 'financial_entries') {
                    return { update: () => ({ eq: () => ({ eq: () => ({ ilike: () => ({ eq: () => Promise.resolve({ error: null }) }) }) }) }) };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/glosas/gl-sem-recurso', { method: 'DELETE' });
            const res = await deleteGlosa(req, { params: Promise.resolve({ id: 'gl-sem-recurso' }) });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(updatedGuidePayload.glosa_value).toBe(0);
            expect(updatedGuidePayload.paid_value).toBe(200.00);
            expect(updatedGuidePayload.status).toBe('PAID');
        });
    });
});
