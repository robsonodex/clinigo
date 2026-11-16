/**
 * Teste unitário da rota GET /api/medical-records
 * Garante busca server-side por nome do paciente (?search=) sem ficar limitada aos últimos 100 registros da clínica
 * e retorno do campo patient_id.
 */

jest.mock('next-axiom', () => ({
    withAxiomRouteHandler: (handler: any) => handler,
}));

jest.mock('next/server', () => ({
    NextRequest: class {},
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

import { GET } from '@/app/api/medical-records/route';

function createBuilder(result: { data: any; error: any }, spies?: { ilikeSpy?: jest.Mock; inSpy?: jest.Mock; limitSpy?: jest.Mock }) {
    const builder: any = {
        select: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        ilike: jest.fn((col: string, val: string) => {
            if (spies?.ilikeSpy) spies.ilikeSpy(col, val);
            return builder;
        }),
        in: jest.fn((col: string, vals: any[]) => {
            if (spies?.inSpy) spies.inSpy(col, vals);
            return builder;
        }),
        order: jest.fn(() => builder),
        limit: jest.fn((n: number) => {
            if (spies?.limitSpy) spies.limitSpy(n);
            return builder;
        }),
        maybeSingle: jest.fn(() => Promise.resolve(result)),
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
    };
    return builder;
}

function makeRequest(url: string) {
    return {
        url,
        headers: {
            get: () => null,
        },
        log: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
    } as any;
}

describe('GET /api/medical-records', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: 'user-admin' } },
        });
    });

    it('filtra prontuários pelo nome do paciente (?search=) no servidor e retorna patient_id', async () => {
        const ilikeSpy = jest.fn();
        const inSpy = jest.fn();
        const limitSpy = jest.fn();

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return createBuilder({ data: { clinic_id: 'cli-1', role: 'CLINIC_ADMIN' }, error: null });
            }
            if (table === 'patients') {
                return createBuilder({ data: [{ id: 'pat-1' }], error: null }, { ilikeSpy });
            }
            if (table === 'medical_records') {
                return createBuilder(
                    {
                        data: [
                            {
                                id: 'mr-1',
                                patient_id: 'pat-1',
                                created_at: '2026-10-14T23:01:57Z',
                                chief_complaint: 'Sessão de psicologia',
                                signed_by_patient: false,
                                signed_at: null,
                                signature_url: null,
                                patient: { id: 'pat-1', full_name: 'Paciente Teste' },
                                doctor: { id: 'doc-1', specialty: 'Psicologia', user: { full_name: 'Dra. Teste' } },
                                appointment: { id: 'apt-1', appointment_date: '2026-10-14', appointment_time: '10:00' },
                            },
                        ],
                        error: null,
                    },
                    { inSpy, limitSpy }
                );
            }
            return createBuilder({ data: [], error: null });
        });

        const res = await GET(makeRequest('http://localhost:3000/api/medical-records?search=Paciente'));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(ilikeSpy).toHaveBeenCalledWith('full_name', '%Paciente%');
        expect(inSpy).toHaveBeenCalledWith('patient_id', ['pat-1']);
        expect(limitSpy).toHaveBeenCalledWith(200);
        expect(body.success).toBe(true);
        expect(body.data.records).toHaveLength(1);
        expect(body.data.records[0].patient_id).toBe('pat-1');
    });

    it('retorna lista vazia quando search não encontra paciente', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return createBuilder({ data: { clinic_id: 'cli-1', role: 'CLINIC_ADMIN' }, error: null });
            }
            if (table === 'patients') {
                return createBuilder({ data: [], error: null });
            }
            return createBuilder({ data: [], error: null });
        });

        const res = await GET(makeRequest('http://localhost:3000/api/medical-records?search=NaoExiste'));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.records).toEqual([]);
        expect(body.data.total).toBe(0);
    });
});
