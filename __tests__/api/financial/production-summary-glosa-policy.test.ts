/**
 * CLINIGO - Teste de Integração Nominal: Efeito do Resultado de Recurso C8 no Repasse Real
 * Rota: GET /api/financial/production-summary
 */

jest.mock('next/server', () => {
    class MockNextRequest {
        url: string;
        method: string;
        private _headers: Map<string, string>;

        constructor(url: string, init?: any) {
            this.url = url;
            this.method = init?.method || 'GET';
            this._headers = new Map();
            if (init?.headers) {
                Object.entries(init.headers).forEach(([k, v]) => this._headers.set(k.toLowerCase(), v as string));
            }
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
};

const mockSupabaseAdmin = {
    from: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve(mockSupabase)),
    createServiceRoleClient: jest.fn(() => mockSupabaseAdmin),
}));

jest.mock('@/lib/utils/resolve-clinic-id', () => ({
    resolveClinicId: jest.fn(() => Promise.resolve({ clinicId: 'cli-001' })),
}));

import { GET } from '@/app/api/financial/production-summary/route';
import { NextRequest } from 'next/server';

describe('C8: Integração Nominal do Resultado de Recurso ao Repasse Real (Rota production-summary)', () => {
    const mockUser = { id: 'usr-fin-001', email: 'financeiro@clinica.com' };
    const mockProfile = { id: 'usr-fin-001', clinic_id: 'cli-001', role: 'FINANCIAL' };

    const mockDoctor = {
        id: 'doc-001',
        specialty: 'Fisioterapia',
        crm: '12345-SP',
        consultation_price: 200.0,
        user: {
            id: 'usr-doc-001',
            full_name: 'Dra. Ana Paula',
            email: 'ana@clinica.com',
            phone: '11999998888',
        },
    };

    const mockContract = {
        id: 'ctr-001',
        doctor_id: 'doc-001',
        percentage: 60, // 60% de repasse
        percentage_private: 60,
        percentage_insurance: 60,
        is_active: true,
    };

    const mockAppointments = [
        {
            id: 'appt-001',
            appointment_date: '2026-09-15',
            appointment_time: '14:00:00',
            status: 'concluido',
            session_status: 'Presente',
            appointment_type: 'Sessão TISS',
            therapy_modality: 'Fisioterapia',
            payment_type: 'CONVENIO',
            health_insurance_id: 'ins-001',
            patient_id: 'pat-001',
            no_show: false,
            patient: {
                id: 'pat-001',
                full_name: 'Carlos Silva',
                cpf: '111.222.333-44',
                billing_type: 'CONVENIO',
            },
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    });

    const setupMocks = (glosaPolicy: 'CLINICA_ABSORVE' | 'DESCONTA_PROFISSIONAL' | 'DESCONTA_SE_MANTIDA', guideData: any) => {
        mockSupabaseAdmin.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockProfile }) }) }) };
            }
            if (table === 'doctors') {
                return { select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockDoctor }) }) }) }) };
            }
            if (table === 'appointments') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                gte: () => ({
                                    lte: () => ({
                                        order: () => ({
                                            order: () => Promise.resolve({ data: mockAppointments, error: null }),
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                };
            }
            if (table === 'doctor_patient_rates') {
                return { select: () => ({ eq: () => Promise.resolve({ data: [] }) }) };
            }
            if (table === 'doctor_contracts') {
                return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: mockContract }) }) }) }) };
            }
            if (table === 'patient_reimbursement_rules') {
                return { select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [] }) }) }) };
            }
            if (table === 'financial_entries') {
                return { select: () => ({ in: () => ({ eq: () => Promise.resolve({ data: [{ appointment_id: 'appt-001', amount: 200.0 }] }) }) }) };
            }
            if (table === 'clinics') {
                return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { repasse_regime: 'PRODUCAO', glosa_policy: glosaPolicy } }) }) }) };
            }
            if (table === 'tiss_guides') {
                return { select: () => ({ in: () => ({ eq: () => Promise.resolve({ data: [guideData] }) }) }) };
            }
            return { select: () => ({ eq: () => Promise.resolve({ data: [] }) }) };
        });
    };

    test('C8-01: CLINICA_ABSORVE mantém repasse integral de 60% (R$ 120) mesmo com glosa ou recurso negado', async () => {
        // Guia com glosa total de R$ 200 e recurso negado
        setupMocks('CLINICA_ABSORVE', {
            id: 'guide-001',
            appointment_id: 'appt-001',
            status: 'DENIED',
            total_value: 200.0,
            paid_value: 0.0,
            glosa_value: 200.0,
            appeal_status: 'REJECTED',
        });

        const req = new NextRequest('http://localhost:3000/api/financial/production-summary?doctor_id=doc-001&month_reference=2026-09');
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.summary.glosa_policy).toBe('CLINICA_ABSORVE');
        expect(body.summary.total_gross).toBe(200.0);
        expect(body.summary.total_net_repasse).toBe(120.0); // 60% de R$ 200 mantido
        expect(body.summary.total_discounts_glosa).toBe(0.0);
        expect(body.items[0].repasse_amount).toBe(120.0);
    });

    test('C8-02: DESCONTA_PROFISSIONAL com recurso C8 ACATADO restaura o repasse integral (R$ 120)', async () => {
        // Resultado C8 acatado: valor recuperado integralmente, glosa zerada, appeal_status ACCEPTED
        setupMocks('DESCONTA_PROFISSIONAL', {
            id: 'guide-001',
            appointment_id: 'appt-001',
            status: 'APPROVED',
            total_value: 200.0,
            paid_value: 200.0,
            glosa_value: 0.0, // Zerado pelo C8 acatado
            appeal_status: 'ACCEPTED',
        });

        const req = new NextRequest('http://localhost:3000/api/financial/production-summary?doctor_id=doc-001&month_reference=2026-09');
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.summary.glosa_policy).toBe('DESCONTA_PROFISSIONAL');
        expect(body.summary.total_net_repasse).toBe(120.0);
        expect(body.summary.total_discounts_glosa).toBe(0.0); // Sem desconto pois recurso foi acatado
        expect(body.items[0].discount_amount).toBe(0.0);
    });

    test('C8-03: DESCONTA_PROFISSIONAL com recurso C8 NEGADO desconta a glosa do médico (repasse R$ 0)', async () => {
        // Recurso negado: glosa de R$ 200 mantida, desconta 60% da glosa (R$ 120)
        setupMocks('DESCONTA_PROFISSIONAL', {
            id: 'guide-001',
            appointment_id: 'appt-001',
            status: 'DENIED',
            total_value: 200.0,
            paid_value: 0.0,
            glosa_value: 200.0,
            appeal_status: 'REJECTED',
        });

        const req = new NextRequest('http://localhost:3000/api/financial/production-summary?doctor_id=doc-001&month_reference=2026-09');
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.summary.total_net_repasse).toBe(0.0); // R$ 120 - R$ 120
        expect(body.summary.total_discounts_glosa).toBe(120.0);
        expect(body.items[0].discount_reason).toBe('Estorno de glosa da operadora');
    });

    test('C8-04: DESCONTA_SE_MANTIDA NÃO desconta em andamento (IN_REVIEW), e desconta após recurso NEGADO', async () => {
        // Cenário A: Recurso em andamento (IN_REVIEW) -> glosaMaintained = false -> Sem desconto
        setupMocks('DESCONTA_SE_MANTIDA', {
            id: 'guide-001',
            appointment_id: 'appt-001',
            status: 'PARTIAL',
            total_value: 200.0,
            paid_value: 0.0,
            glosa_value: 200.0,
            appeal_status: 'IN_REVIEW',
        });

        const reqA = new NextRequest('http://localhost:3000/api/financial/production-summary?doctor_id=doc-001&month_reference=2026-09');
        const resA = await GET(reqA);
        const bodyA = await resA.json();

        expect(bodyA.summary.total_net_repasse).toBe(120.0);
        expect(bodyA.summary.total_discounts_glosa).toBe(0.0); // Protege o médico enquanto o recurso tramita

        // Cenário B: Recurso encerrado com glosa mantida (REJECTED) -> glosaMaintained = true -> Desconta
        setupMocks('DESCONTA_SE_MANTIDA', {
            id: 'guide-001',
            appointment_id: 'appt-001',
            status: 'DENIED',
            total_value: 200.0,
            paid_value: 0.0,
            glosa_value: 200.0,
            appeal_status: 'REJECTED',
        });

        const reqB = new NextRequest('http://localhost:3000/api/financial/production-summary?doctor_id=doc-001&month_reference=2026-09');
        const resB = await GET(reqB);
        const bodyB = await resB.json();

        expect(bodyB.summary.total_net_repasse).toBe(0.0);
        expect(bodyB.summary.total_discounts_glosa).toBe(120.0);
        expect(bodyB.items[0].discount_reason).toBe('Estorno de glosa mantida após recurso da operadora');
    });

    test('C8-05: DESCONTA_SE_MANTIDA com recurso C8 PARCIAL desconta apenas a fração mantida da glosa', async () => {
        // Recurso parcial: R$ 100 recuperados, R$ 100 de glosa mantida (glosa_value = 100)
        setupMocks('DESCONTA_SE_MANTIDA', {
            id: 'guide-001',
            appointment_id: 'appt-001',
            status: 'PARTIAL',
            total_value: 200.0,
            paid_value: 100.0,
            glosa_value: 100.0, // Fracção mantida
            appeal_status: 'PARTIAL',
        });

        const req = new NextRequest('http://localhost:3000/api/financial/production-summary?doctor_id=doc-001&month_reference=2026-09');
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        // Original: R$ 120. Desconto: 60% de R$ 100 mantidos = R$ 60. Líquido: R$ 60
        expect(body.summary.total_net_repasse).toBe(60.0);
        expect(body.summary.total_discounts_glosa).toBe(60.0);
        expect(body.items[0].repasse_amount).toBe(60.0);
    });
});
