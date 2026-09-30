/** @jest-environment node */
import { GET } from '@/app/api/tiss/pricing/lookup/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}));

describe('GET /api/tiss/pricing/lookup - Consulta Pontual de Preço por Papel', () => {
    let mockSupabase: any;
    const testInsuranceId = '11111111-1111-4111-8111-111111111111';
    const testPlanId = '22222222-2222-4222-8222-222222222222';
    const testTussCode = '10101012';

    beforeEach(() => {
        jest.clearAllMocks();

        mockSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: 'usr-123' } },
                    error: null,
                }),
            },
            from: jest.fn((table: string) => {
                if (table === 'users') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({
                            data: { clinic_id: 'cli-test', role: 'RECEPTIONIST' },
                            error: null,
                        }),
                    };
                }
                if (table === 'health_insurance_price_tables') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        or: jest.fn().mockReturnThis(),
                        then: jest.fn().mockImplementation((resolve) =>
                            resolve({
                                data: [
                                    {
                                        tuss_code: testTussCode,
                                        procedure_name: 'Consulta Médica em Consultório',
                                        price: 150.00,
                                        copay_amount: 20.00,
                                        requires_authorization: false,
                                        max_sessions_per_year: 12,
                                        health_insurance_plan_id: null,
                                    },
                                ],
                                error: null,
                            })
                        ),
                    };
                }
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                };
            }),
        };

        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    test('RECEPTIONIST deve conseguir consultar o valor de um procedimento (200)', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({
                        data: { clinic_id: 'cli-test', role: 'RECEPTIONIST' },
                        error: null,
                    }),
                };
            }
            if (table === 'health_insurance_price_tables') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    or: jest.fn().mockReturnThis(),
                    then: (resolve: any) =>
                        resolve({
                            data: [
                                {
                                    tuss_code: testTussCode,
                                    procedure_name: 'Consulta em Consultório',
                                    price: 120.50,
                                    copay_amount: 0,
                                    requires_authorization: false,
                                    max_sessions_per_year: null,
                                    health_insurance_plan_id: null,
                                },
                            ],
                            error: null,
                        }),
                };
            }
            return {};
        });

        const req = new NextRequest(
            `http://localhost/api/tiss/pricing/lookup?health_insurance_id=${testInsuranceId}&tuss_code=${testTussCode}`
        );

        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.data.price).toBe(120.50);
        expect(json.data.tuss_code).toBe(testTussCode);
    });

    test('DOCTOR deve ser bloqueado com 403 Forbidden', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({
                        data: { clinic_id: 'cli-test', role: 'DOCTOR' },
                        error: null,
                    }),
                };
            }
            return {};
        });

        const req = new NextRequest(
            `http://localhost/api/tiss/pricing/lookup?health_insurance_id=${testInsuranceId}&tuss_code=${testTussCode}`
        );

        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(403);
        expect(json.success).toBe(false);
    });

    test('FINANCIAL deve ter acesso liberado com 200', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({
                        data: { clinic_id: 'cli-test', role: 'FINANCIAL' },
                        error: null,
                    }),
                };
            }
            if (table === 'health_insurance_price_tables') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    or: jest.fn().mockReturnThis(),
                    then: (resolve: any) =>
                        resolve({
                            data: [
                                {
                                    tuss_code: testTussCode,
                                    procedure_name: 'Consulta',
                                    price: 200.00,
                                    copay_amount: 0,
                                    requires_authorization: false,
                                    max_sessions_per_year: null,
                                },
                            ],
                            error: null,
                        }),
                };
            }
            return {};
        });

        const req = new NextRequest(
            `http://localhost/api/tiss/pricing/lookup?health_insurance_id=${testInsuranceId}&tuss_code=${testTussCode}`
        );

        const res = await GET(req);
        expect(res.status).toBe(200);
    });

    test('READONLY deve ter acesso de leitura liberado com 200', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({
                        data: { clinic_id: 'cli-test', role: 'READONLY' },
                        error: null,
                    }),
                };
            }
            if (table === 'health_insurance_price_tables') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    or: jest.fn().mockReturnThis(),
                    then: (resolve: any) =>
                        resolve({
                            data: [
                                {
                                    tuss_code: testTussCode,
                                    procedure_name: 'Consulta',
                                    price: 100.00,
                                    copay_amount: 0,
                                    requires_authorization: false,
                                    max_sessions_per_year: null,
                                },
                            ],
                            error: null,
                        }),
                };
            }
            return {};
        });

        const req = new NextRequest(
            `http://localhost/api/tiss/pricing/lookup?health_insurance_id=${testInsuranceId}&tuss_code=${testTussCode}`
        );

        const res = await GET(req);
        expect(res.status).toBe(200);
    });

    test('Deve retornar 404 quando o procedimento nao estiver cadastrado na operadora', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({
                        data: { clinic_id: 'cli-test', role: 'RECEPTIONIST' },
                        error: null,
                    }),
                };
            }
            if (table === 'health_insurance_price_tables') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    or: jest.fn().mockReturnThis(),
                    then: (resolve: any) => resolve({ data: [], error: null }),
                };
            }
            return {};
        });

        const req = new NextRequest(
            `http://localhost/api/tiss/pricing/lookup?health_insurance_id=${testInsuranceId}&tuss_code=99999999`
        );

        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(404);
        expect(json.success).toBe(false);
        expect(json.error).toContain('não encontrado');
    });

    test('Deve retornar 400 se faltar health_insurance_id ou tuss_code', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({
                        data: { clinic_id: 'cli-test', role: 'RECEPTIONIST' },
                        error: null,
                    }),
                };
            }
            return {};
        });

        const req = new NextRequest('http://localhost/api/tiss/pricing/lookup');
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.success).toBe(false);
    });
});
