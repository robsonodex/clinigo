/**
 * Teste unitário da rota GET /api/financial/my-producao
 * Garante uso das colunas reais de doctor_contracts (sem coluna inexistente `percentage`)
 * e cálculo correto de repasse para PERCENTAGE_GROSS, FIXED_VALUE, FIXED_HOURS e sem contrato.
 */

jest.mock('next-axiom', () => ({
    withAxiomRouteHandler: (handler: any) => handler,
}));

jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn().mockImplementation((body, init) => ({
            status: init?.status || 200,
            json: async () => body,
        })),
    },
}));

const mockAuthClient = {
    auth: {
        getUser: jest.fn(),
    },
};

const mockAdminClient = {
    from: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve(mockAuthClient)),
    createServiceRoleClient: jest.fn(() => mockAdminClient),
}));

import { GET } from '@/app/api/financial/my-producao/route';

function createBuilder(result: { data: any; error: any }, selectSpy?: jest.Mock) {
    const builder: any = {
        select: jest.fn((cols: string) => {
            if (selectSpy) selectSpy(cols);
            return builder;
        }),
        eq: jest.fn(() => builder),
        not: jest.fn(() => builder),
        gte: jest.fn(() => builder),
        lte: jest.fn(() => builder),
        order: jest.fn(() => builder),
        limit: jest.fn(() => builder),
        maybeSingle: jest.fn(() => Promise.resolve(result)),
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
    };
    return builder;
}

function makeRequest(url = 'http://localhost:3000/api/financial/my-producao?period_start=2026-11-01&period_end=2026-11-30') {
    return {
        url,
        log: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
    } as any;
}

describe('GET /api/financial/my-producao', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthClient.auth.getUser.mockResolvedValue({
            data: { user: { id: 'user-1' } },
        });
    });

    function setupMockDb(contractData: any, contractSelectSpy: jest.Mock) {
        let appointmentsCall = 0;
        mockAdminClient.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return createBuilder({
                    data: { clinic_id: 'clinic-1', role: 'DOCTOR', full_name: 'Dra. Teste' },
                    error: null,
                });
            }
            if (table === 'doctors') {
                return createBuilder({
                    data: { id: 'doc-1', specialty: 'Fonoaudiologia', user: { full_name: 'Dra. Teste' } },
                    error: null,
                });
            }
            if (table === 'patient_reimbursement_rules') {
                return createBuilder({ data: [], error: null });
            }
            if (table === 'financial_entries') {
                return createBuilder({
                    data: [
                        { appointment_id: 'apt-1', amount: 200 },
                        { appointment_id: 'apt-2', amount: 100 },
                    ],
                    error: null,
                });
            }
            if (table === 'appointments') {
                appointmentsCall += 1;
                if (appointmentsCall === 1) {
                    return createBuilder({
                        data: [
                            {
                                id: 'apt-1',
                                status: 'COMPLETED',
                                patient_id: 'pat-1',
                                appointment_type: 'CONSULTA',
                                health_insurance_plan_id: null,
                                appointment_date: '2026-11-05',
                            },
                            {
                                id: 'apt-2',
                                status: 'COMPLETED',
                                patient_id: 'pat-2',
                                appointment_type: 'CONSULTA',
                                health_insurance_plan_id: 'plan-1',
                                appointment_date: '2026-11-06',
                            },
                        ],
                        error: null,
                    });
                }
                return createBuilder({ data: [], error: null });
            }
            if (table === 'doctor_contracts') {
                return createBuilder({ data: contractData, error: null }, contractSelectSpy);
            }
            return createBuilder({ data: [], error: null });
        });
    }

    it('consulta colunas reais de doctor_contracts e calcula PERCENTAGE_GROSS (particular + convênio)', async () => {
        const contractSelectSpy = jest.fn();
        setupMockDb(
            {
                contract_type: 'PERCENTAGE_GROSS',
                percentage_private: 70,
                percentage_insurance: 60,
                fixed_value_private: 0,
                fixed_value_insurance: 0,
                fixed_salary: null,
            },
            contractSelectSpy
        );

        const res = await GET(makeRequest());
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(contractSelectSpy).toHaveBeenCalledWith(
            'contract_type, percentage_private, percentage_insurance, fixed_value_private, fixed_value_insurance, fixed_salary'
        );
        // 200 * 70% + 100 * 60% = 140 + 60 = 200 sobre 300 -> 66.7%
        expect(json.data.receita_total).toBe(300);
        expect(json.data.repasse_calculado).toBe(200);
        expect(json.data.percentage).toBe(66.7);
    });

    it('calcula repasse corretamente para contrato FIXED_VALUE', async () => {
        const contractSelectSpy = jest.fn();
        setupMockDb(
            {
                contract_type: 'FIXED_VALUE',
                percentage_private: 70,
                percentage_insurance: 60,
                fixed_value_private: 80,
                fixed_value_insurance: 50,
                fixed_salary: 0,
            },
            contractSelectSpy
        );

        const res = await GET(makeRequest());
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.data.repasse_calculado).toBe(130);
        expect(json.data.percentage).toBe(43.3);
    });

    it('calcula repasse corretamente para contrato FIXED_HOURS', async () => {
        const contractSelectSpy = jest.fn();
        setupMockDb(
            {
                contract_type: 'FIXED_HOURS',
                percentage_private: 70,
                percentage_insurance: 60,
                fixed_value_private: 0,
                fixed_value_insurance: 0,
                fixed_salary: 2500,
            },
            contractSelectSpy
        );

        const res = await GET(makeRequest());
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.data.repasse_calculado).toBe(2500);
    });

    it('retorna repasse 0 e percentage 0 quando não há contrato ativo', async () => {
        const contractSelectSpy = jest.fn();
        setupMockDb(null, contractSelectSpy);

        const res = await GET(makeRequest());
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.data.repasse_calculado).toBe(0);
        expect(json.data.percentage).toBe(0);
    });
});

