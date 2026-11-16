/**
 * Testes unitários das rotas /api/reports/retention, /api/reports/modality-revenue
 * e /api/patients/evasion-risk após correção do erro 22P02 (enum appointment_status)
 * e remoção de colunas inexistentes.
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

const mockSupabase = {
    auth: {
        getUser: jest.fn(),
    },
    from: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}));

import { GET as getRetention } from '@/app/api/reports/retention/route';
import { GET as getModalityRevenue } from '@/app/api/reports/modality-revenue/route';
import { GET as getEvasionRisk } from '@/app/api/patients/evasion-risk/route';

function createBuilder(result: { data: any; error: any }, spies?: { inSpy?: jest.Mock; selectSpy?: jest.Mock }) {
    const builder: any = {
        select: jest.fn((cols: string) => {
            if (spies?.selectSpy) spies.selectSpy(cols);
            return builder;
        }),
        eq: jest.fn(() => builder),
        in: jest.fn((col: string, vals: any[]) => {
            if (spies?.inSpy) spies.inSpy(col, vals);
            return builder;
        }),
        gte: jest.fn(() => builder),
        lte: jest.fn(() => builder),
        order: jest.fn(() => builder),
        single: jest.fn(() => Promise.resolve(result)),
        maybeSingle: jest.fn(() => Promise.resolve(result)),
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
    };
    return builder;
}

function makeRequest(url: string) {
    return {
        url,
        log: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
    } as any;
}

describe('Correção enum appointment_status (22P02) em relatórios e evasão', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: 'user-1' } },
        });
    });

    it('GET /api/reports/retention usa apenas COMPLETED/CONFIRMED e calcula funil corretamente', async () => {
        const inSpy = jest.fn();
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return createBuilder({ data: { clinic_id: 'cli-1', role: 'DOCTOR' }, error: null });
            }
            if (table === 'appointments') {
                return createBuilder(
                    {
                        data: [
                            { patient_id: 'p1', status: 'COMPLETED', appointment_date: '2026-11-01' },
                            { patient_id: 'p2', status: 'COMPLETED', appointment_date: '2026-11-01' },
                            { patient_id: 'p2', status: 'CONFIRMED', appointment_date: '2026-11-05' },
                        ],
                        error: null,
                    },
                    { inSpy }
                );
            }
            return createBuilder({ data: [], error: null });
        });

        const res = await getRetention(
            makeRequest('http://localhost:3000/api/reports/retention?start_date=2026-11-01&end_date=2026-11-30')
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(inSpy).toHaveBeenCalledWith('status', ['COMPLETED', 'CONFIRMED']);
        expect(body.summary.total_patients).toBe(2);
        expect(body.summary.total_sessions).toBe(3);
        expect(body.summary.churned_patients).toBe(1);
    });

    it('GET /api/reports/retention registra error.message (não [object Object]) em erro PostgREST', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return createBuilder({ data: { clinic_id: 'cli-1', role: 'DOCTOR' }, error: null });
            }
            return createBuilder({
                data: null,
                error: { code: '22P02', message: 'invalid input value for enum appointment_status' },
            });
        });

        const req = makeRequest('http://localhost:3000/api/reports/retention');
        const res = await getRetention(req);
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body.error).toBe('invalid input value for enum appointment_status');
        expect(req.log.error).toHaveBeenCalledWith('reports/retention', {
            error: 'invalid input value for enum appointment_status',
        });
    });

    it('GET /api/reports/modality-revenue usa status em maiúsculo, financial_entries real e doctors.consultation_price', async () => {
        const inSpy = jest.fn();
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return createBuilder({ data: { clinic_id: 'cli-1' }, error: null });
            }
            if (table === 'appointments') {
                return createBuilder(
                    {
                        data: [
                            {
                                id: 'apt-1',
                                therapy_modality: 'individual',
                                session_format: 'presencial',
                                appointment_date: '2026-11-10',
                                doctor_id: 'doc-1',
                                patient_id: 'pat-1',
                            },
                            {
                                id: 'apt-2',
                                therapy_modality: 'casal',
                                session_format: 'online',
                                appointment_date: '2026-11-11',
                                doctor_id: 'doc-1',
                                patient_id: 'pat-2',
                            },
                        ],
                        error: null,
                    },
                    { inSpy }
                );
            }
            if (table === 'financial_entries') {
                return createBuilder({
                    data: [{ appointment_id: 'apt-1', amount: 250 }],
                    error: null,
                });
            }
            if (table === 'doctors') {
                return createBuilder({
                    data: [{ id: 'doc-1', consultation_price: 180 }],
                    error: null,
                });
            }
            return createBuilder({ data: [], error: null });
        });

        const res = await getModalityRevenue(
            makeRequest('http://localhost:3000/api/reports/modality-revenue?start_date=2026-11-01&end_date=2026-11-30')
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(inSpy).toHaveBeenCalledWith('status', ['COMPLETED', 'CONFIRMED']);
        expect(body.summary.total_sessions).toBe(2);
        expect(body.summary.total_revenue).toBe(430);
    });

    it('GET /api/patients/evasion-risk usa status válidos e full_name de pacientes/profissionais', async () => {
        const inSpy = jest.fn();
        const oldDate = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return createBuilder({ data: { clinic_id: 'cli-1', role: 'CLINIC_ADMIN' }, error: null });
            }
            if (table === 'appointments') {
                return createBuilder(
                    {
                        data: [
                            {
                                patient_id: 'pat-1',
                                appointment_date: oldDate,
                                doctor_id: 'doc-1',
                                status: 'COMPLETED',
                                patients: { id: 'pat-1', full_name: 'Paciente Fictício', phone: null, email: null },
                                doctors: { id: 'doc-1', user: { full_name: 'Profissional Fictício' } },
                            },
                        ],
                        error: null,
                    },
                    { inSpy }
                );
            }
            return createBuilder({ data: [], error: null });
        });

        const res = await getEvasionRisk(makeRequest('http://localhost:3000/api/patients/evasion-risk'));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(inSpy).toHaveBeenCalledWith('status', ['COMPLETED', 'CONFIRMED']);
        expect(body.summary.high_risk).toBe(1);
        expect(body.patients[0].patient_name).toBe('Paciente Fictício');
        expect(body.patients[0].doctor_name).toBe('Profissional Fictício');
    });
});

