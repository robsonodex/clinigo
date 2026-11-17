/**
 * @jest-environment node
 */

/**
 * Teste unitário da rota GET /api/super-admin/dashboard
 * Garante o uso de count: 'estimated' nas contagens globais (evitando full-scan 500 em appointments).
 */

jest.mock('next-axiom', () => ({
    withAxiomRouteHandler: (handler: any) => handler,
}))

const mockUserClient = {
    auth: {
        getUser: jest.fn(),
    },
}

const mockAdminClient = {
    from: jest.fn(),
}

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve(mockUserClient)),
    createServiceRoleClient: jest.fn(() => mockAdminClient),
}))

import { GET } from '@/app/api/super-admin/dashboard/route'

function createTableBuilder(result: any, onSelect?: (cols: any, opts: any) => void) {
    const builder: any = {
        select: jest.fn((cols: any, opts: any) => {
            if (onSelect) onSelect(cols, opts)
            return builder
        }),
        eq: jest.fn(() => builder),
        in: jest.fn(() => builder),
        order: jest.fn(() => builder),
        limit: jest.fn(() => builder),
        insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
        single: jest.fn(() => Promise.resolve(result)),
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
    }
    return builder
}

function makeRequest(url: string) {
    return {
        url,
        headers: {
            get: () => null,
        },
        log: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
    } as any
}

describe('GET /api/super-admin/dashboard - Contagem estimada em tabelas grandes', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('usa { count: "estimated", head: true } para doctors, patients e appointments', async () => {
        const selectCalls: Array<{ table: string; cols: any; opts: any }> = []

        mockUserClient.auth.getUser.mockResolvedValue({
            data: { user: { id: 'sa-1', email: 'contato@clinigo.app' } },
        })

        mockAdminClient.from.mockImplementation((table: string) => {
            if (table === 'users') {
                const builder = createTableBuilder({ data: [], error: null })
                builder.single = jest.fn(() =>
                    Promise.resolve({
                        data: { role: 'SUPER_ADMIN', email: 'contato@clinigo.app' },
                        error: null,
                    })
                )
                return builder
            }
            if (table === 'clinics') {
                return createTableBuilder({ data: [], error: null })
            }
            if (table === 'doctors') {
                return createTableBuilder(
                    { count: 42, error: null },
                    (cols, opts) => selectCalls.push({ table, cols, opts })
                )
            }
            if (table === 'patients') {
                return createTableBuilder(
                    { count: 1500, error: null },
                    (cols, opts) => selectCalls.push({ table, cols, opts })
                )
            }
            if (table === 'appointments') {
                return createTableBuilder(
                    { count: 73230, error: null },
                    (cols, opts) => selectCalls.push({ table, cols, opts })
                )
            }
            return createTableBuilder({ data: [], error: null })
        })

        const res = await GET(makeRequest('http://localhost:3000/api/super-admin/dashboard'))
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.success).toBe(true)
        expect(body.data.metrics.totalDoctors).toBe(42)
        expect(body.data.metrics.totalPatients).toBe(1500)
        expect(body.data.metrics.totalAppointments).toBe(73230)
        expect(body.data.metrics.totalConsultations).toBe(73230)

        expect(selectCalls).toEqual([
            { table: 'doctors', cols: 'id', opts: { count: 'estimated', head: true } },
            { table: 'patients', cols: 'id', opts: { count: 'estimated', head: true } },
            { table: 'appointments', cols: 'id', opts: { count: 'estimated', head: true } },
        ])
    })
})
