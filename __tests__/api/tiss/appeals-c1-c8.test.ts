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

import { POST as postCreateAppeal, GET as getAppeals } from '@/app/api/tiss/appeals/route';
import { POST as postAttachment } from '@/app/api/tiss/appeals/[id]/attachments/route';
import { POST as postReleaseAppeal } from '@/app/api/tiss/appeals/[id]/release/route';
import { POST as postSubmitAppeal } from '@/app/api/tiss/appeals/[id]/submit/route';
import { POST as postLossAppeal } from '@/app/api/tiss/appeals/[id]/loss/route';
import { POST as postResultAppeal } from '@/app/api/tiss/appeals/[id]/result/route';
import { NextRequest } from 'next/server';

describe('Suíte Nominal de Testes C1 a C8 - Gestão Completa de Recursos de Glosa', () => {
    const mockUser = { id: 'usr-fin-001', email: 'faturamento@clinica.com' };
    const mockProfile = { clinic_id: 'cli-001', role: 'FINANCIAL' };

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    });

    describe('C1, C2, C3, C5: Criação do Recurso e Travas de Valor/Prazo', () => {
        const validInsuranceId = '22222222-2222-2222-2222-222222222222';

        test('C1-C2: deve rejeitar com HTTP 422 se o valor contestado for maior que o valor da glosa', async () => {
            const insurance = { id: validInsuranceId, name: 'Bradesco Saúde', appeal_deadline_days: 30 };
            const glosaDb = [
                {
                    id: '11111111-1111-1111-1111-111111111111',
                    glosa_value: 100.00,
                    glosa_code: '1409',
                    guide_id: 'g-1',
                    created_at: '2026-09-01T10:00:00Z',
                    guide: { id: 'g-1', guide_number: 'GUIA-1', health_insurance_id: validInsuranceId }
                }
            ];

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'health_insurances') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: insurance }) }) }) }) };
                }
                if (table === 'tiss_glosas') {
                    return { select: () => ({ in: () => ({ eq: () => ({ is: () => ({ neq: () => Promise.resolve({ data: glosaDb }) }) }) }) }) };
                }
                if (table === 'tiss_appeal_items') {
                    return { select: () => ({ in: () => ({ eq: () => ({ neq: () => Promise.resolve({ data: [] }) }) }) }) };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/appeals', {
                method: 'POST',
                body: JSON.stringify({
                    health_insurance_id: validInsuranceId,
                    general_reason: 'Justificativa técnica com mais de 10 caracteres',
                    items: [{
                        glosa_id: '11111111-1111-1111-1111-111111111111',
                        contested_value: 150.00 // Invalido: 150 > 100
                    }]
                })
            });

            const res = await postCreateAppeal(req);
            const body = await res.json();

            expect(res.status).toBe(422);
            expect(body.code).toBe('CONTESTED_VALUE_EXCEEDS_GLOSA');
        });

        test('C1-C3: deve criar recurso agrupando glosas da mesma operadora com prazo dinamico calculado', async () => {
            const insurance = { id: validInsuranceId, name: 'Bradesco Saúde', appeal_deadline_days: 45 };
            const glosasDb = [
                {
                    id: '11111111-1111-1111-1111-111111111111',
                    glosa_value: 80.00,
                    glosa_code: '1409',
                    guide_id: 'g-1',
                    created_at: '2026-09-10T10:00:00Z',
                    guide: { id: 'g-1', guide_number: 'GUIA-1', health_insurance_id: validInsuranceId }
                },
                {
                    id: '22222222-2222-2222-2222-222222222222',
                    glosa_value: 120.00,
                    glosa_code: '1001',
                    guide_id: 'g-2',
                    created_at: '2026-09-15T10:00:00Z',
                    guide: { id: 'g-2', guide_number: 'GUIA-2', health_insurance_id: validInsuranceId }
                }
            ];

            let appealInsertPayload: any = null;
            let itemsInsertPayload: any = null;

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'health_insurances') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: insurance }) }) }) }) };
                }
                if (table === 'tiss_glosas') {
                    return { select: () => ({ in: () => ({ eq: () => ({ is: () => ({ neq: () => Promise.resolve({ data: glosasDb }) }) }) }) }) };
                }
                if (table === 'tiss_appeal_items') {
                    return {
                        select: () => ({ in: () => ({ eq: () => ({ neq: () => Promise.resolve({ data: [] }) }) }) }),
                        insert: (payload: any) => {
                            itemsInsertPayload = payload;
                            return { select: () => Promise.resolve({ data: payload }) };
                        }
                    };
                }
                if (table === 'tiss_appeals') {
                    return {
                        insert: (payload: any) => {
                            appealInsertPayload = payload;
                            return { select: () => ({ single: () => Promise.resolve({ data: { id: 'app-new-001', ...payload } }) }) };
                        }
                    };
                }
                if (table === 'tiss_guides') {
                    return { update: () => ({ in: () => ({ eq: () => Promise.resolve({ error: null }) }) }) };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/appeals', {
                method: 'POST',
                body: JSON.stringify({
                    health_insurance_id: validInsuranceId,
                    general_reason: 'Justificativa geral com embasamento técnico e prontuário',
                    items: [
                        { glosa_id: '11111111-1111-1111-1111-111111111111', contested_value: 80.00, item_reason: 'Justificativa item 1' },
                        { glosa_id: '22222222-2222-2222-2222-222222222222', contested_value: 100.00, item_reason: 'Justificativa item 2' },
                    ]
                })
            });

            const res = await postCreateAppeal(req);
            const body = await res.json();

            expect(res.status).toBe(201);
            expect(body.success).toBe(true);
            expect(appealInsertPayload.total_glosa_value).toBe(200.00); // 80 + 120
            expect(appealInsertPayload.total_contested_value).toBe(180.00); // 80 + 100
            expect(appealInsertPayload.status).toBe('IN_PREPARATION');
            expect(itemsInsertPayload.length).toBe(2);
        });
    });

    describe('C4: Anexos com Bucket Privado e Prontuário Auditados', () => {
        test('C4-01: deve anexar documento do prontuário gerando link assinado temporário', async () => {
            const appealData = { id: 'app-001', appeal_number: 'REC-2026-001', status: 'IN_PREPARATION' };

            let attachPayload: any = null;

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_appeals') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: appealData }) }) }) }) };
                }
                if (table === 'tiss_appeal_attachments') {
                    return {
                        insert: (payload: any) => {
                            attachPayload = payload;
                            return { select: () => ({ single: () => Promise.resolve({ data: { id: 'att-1', ...payload } }) }) };
                        }
                    };
                }
                return {};
            });

            mockSupabase.storage.from.mockReturnValue({
                createSignedUrl: jest.fn().mockResolvedValue({
                    data: { signedUrl: 'https://storage.supabase.co/documents/prontuario.pdf?token=short60s' },
                    error: null
                })
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/appeals/app-001/attachments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_document_id: 'doc-prontuario-123',
                    file_name: 'Evolucao_Clinica.pdf',
                    storage_path: 'cli-001/prontuarios/doc-123.pdf',
                    file_size: 204800
                })
            });

            const res = await postAttachment(req, { params: Promise.resolve({ id: 'app-001' }) });
            const body = await res.json();

            expect(res.status).toBe(201);
            expect(body.success).toBe(true);
            expect(attachPayload.source_type).toBe('PRONTUARIO');
            expect(body.data.signed_url).toContain('token=short60s');
        });
    });

    describe('C5, C6, C7: Prazo Vencido, Liberação e Envio Formal', () => {
        test('C5-01: release deve bloquear com HTTP 422 se o prazo legal de recurso tiver expirado', async () => {
            const expiredAppeal = {
                id: 'app-expired',
                appeal_number: 'REC-EXPIRED',
                status: 'IN_PREPARATION',
                deadline_at: '2026-08-01' // Data no passado
            };

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_appeals') {
                    return { select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: expiredAppeal }) }) }) }) };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/appeals/app-expired/release', { method: 'POST' });
            const res = await postReleaseAppeal(req, { params: Promise.resolve({ id: 'app-expired' }) });
            const body = await res.json();

            expect(res.status).toBe(422);
            expect(body.code).toBe('APPEAL_DEADLINE_EXPIRED');
            expect(body.can_register_loss).toBe(true);
        });

        test('C5-02: registrar perda (loss) deve encerrar recurso como FINISHED e guias como DEFINITIVE_LOSS', async () => {
            const expiredAppeal = {
                id: 'app-expired',
                appeal_number: 'REC-EXPIRED',
                status: 'IN_PREPARATION',
                total_glosa_value: 500.00
            };

            let appealUpdatePayload: any = null;

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_appeals') {
                    return {
                        select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: expiredAppeal }) }) }) }),
                        update: (payload: any) => {
                            appealUpdatePayload = payload;
                            return { eq: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: { ...expiredAppeal, ...payload } }) }) }) }) };
                        }
                    };
                }
                if (table === 'tiss_appeal_items') {
                    return {
                        update: () => ({ eq: () => ({ eq: () => ({ select: () => Promise.resolve({ data: [{ guide_id: 'g-1' }] }) }) }) })
                    };
                }
                if (table === 'tiss_guides') {
                    return { update: () => ({ in: () => ({ eq: () => Promise.resolve({ error: null }) }) }) };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/appeals/app-expired/loss', {
                method: 'POST',
                body: JSON.stringify({
                    loss_reason: 'Prazo expirado pela operadora sem resposta do prestador dentro dos 30 dias regulamentares'
                })
            });

            const res = await postLossAppeal(req, { params: Promise.resolve({ id: 'app-expired' }) });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(appealUpdatePayload.is_loss_registered).toBe(true);
            expect(appealUpdatePayload.status).toBe('FINISHED');
        });

        test('C6-C7: release e submit devem transitar status para RELEASED e depois SENT com protocolo', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 20);
            const deadlineFuture = futureDate.toISOString().split('T')[0];

            const appealInPrep = {
                id: 'app-valid',
                appeal_number: 'REC-VALID',
                status: 'IN_PREPARATION',
                deadline_at: deadlineFuture
            };

            let appealStatusAfterRelease: any = null;

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_appeals') {
                    return {
                        select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: appealInPrep }) }) }) }),
                        update: (payload: any) => {
                            appealStatusAfterRelease = payload;
                            return { eq: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: { ...appealInPrep, ...payload } }) }) }) }) };
                        }
                    };
                }
                if (table === 'tiss_appeal_items') {
                    return { update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }) };
                }
                return {};
            });

            // 1. Release
            const reqRelease = new NextRequest('http://localhost:3000/api/tiss/appeals/app-valid/release', { method: 'POST' });
            const resRelease = await postReleaseAppeal(reqRelease, { params: Promise.resolve({ id: 'app-valid' }) });
            expect(resRelease.status).toBe(200);
            expect(appealStatusAfterRelease.status).toBe('RELEASED');

            // 2. Submit
            appealInPrep.status = 'RELEASED'; // Simula estado liberado
            let submitPayload: any = null;
            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'tiss_appeals') {
                    return {
                        select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: appealInPrep }) }) }) }),
                        update: (payload: any) => {
                            submitPayload = payload;
                            return { eq: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: { ...appealInPrep, ...payload } }) }) }) }) };
                        }
                    };
                }
                if (table === 'tiss_appeal_items') {
                    return { update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }) };
                }
                return {};
            });

            const reqSubmit = new NextRequest('http://localhost:3000/api/tiss/appeals/app-valid/submit', {
                method: 'POST',
                body: JSON.stringify({
                    protocol_number: 'PROT-REC-2026-888',
                    submission_channel: 'PORTAL',
                    submission_date: '2026-09-30'
                })
            });

            const resSubmit = await postSubmitAppeal(reqSubmit, { params: Promise.resolve({ id: 'app-valid' }) });
            const bodySubmit = await resSubmit.json();

            expect(resSubmit.status).toBe(200);
            expect(bodySubmit.success).toBe(true);
            expect(submitPayload.status).toBe('SENT');
            expect(submitPayload.protocol_number).toBe('PROT-REC-2026-888');
        });
    });

    describe('C8: Registrar Resultado por Item e Lançamento Financeiro sem Duplicar', () => {
        test('C8-01: deve registrar resultado do item, atualizar guia e gerar entrada financeira única', async () => {
            const appealSent = {
                id: 'app-sent',
                appeal_number: 'REC-RESULT-01',
                status: 'SENT',
                total_contested_value: 300.00
            };

            const appealItems = [
                {
                    id: '11111111-1111-1111-1111-111111111111',
                    contested_value: 200.00,
                    guide_id: 'g-10',
                    item_code: '10101012',
                    financial_entry_id: null // Ainda não liquidado
                }
            ];

            const guide = {
                id: 'g-10',
                total_value: 200.00,
                paid_value: 0,
                glosa_value: 200.00
            };

            let financialEntryPayload: any = null;
            let updatedAppealPayload: any = null;

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
                }
                if (table === 'clinics') {
                    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { glosa_policy: 'DESCONTA_PROFISSIONAL' } }) }) }) };
                }
                if (table === 'tiss_appeals') {
                    return {
                        select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: appealSent }) }) }) }),
                        update: (payload: any) => {
                            updatedAppealPayload = payload;
                            return { eq: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: { ...appealSent, ...payload } }) }) }) }) };
                        }
                    };
                }
                if (table === 'tiss_appeal_items') {
                    return {
                        select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: appealItems, error: null }) }) }),
                        update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) })
                    };
                }
                if (table === 'tiss_guides') {
                    return {
                        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: guide }) }) }),
                        update: () => ({ eq: () => Promise.resolve({ error: null }) })
                    };
                }
                if (table === 'financial_entries') {
                    return {
                        insert: (payload: any) => {
                            financialEntryPayload = payload;
                            return { select: () => ({ single: () => Promise.resolve({ data: { id: 'fin-entry-001' } }) }) };
                        }
                    };
                }
                return {};
            });

            const req = new NextRequest('http://localhost:3000/api/tiss/appeals/app-sent/result', {
                method: 'POST',
                body: JSON.stringify({
                    items: [{
                        item_id: '11111111-1111-1111-1111-111111111111',
                        result_status: 'ACCEPTED'
                    }]
                })
            });

            const res = await postResultAppeal(req, { params: Promise.resolve({ id: 'app-sent' }) });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(financialEntryPayload.amount).toBe(200.00);
            expect(financialEntryPayload.category).toBe('RECUPERACAO_GLOSA');
            expect(updatedAppealPayload.status).toBe('ACCEPTED');
            expect(updatedAppealPayload.total_recovered_value).toBe(200.00);
        });
    });
});
