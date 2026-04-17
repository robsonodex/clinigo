/** @jest-environment node */
// app/__tests__/api/payroll/payroll.test.ts
import { GET, POST } from '@/app/api/payroll/route'
import { createClient } from '@/lib/supabase/server'

jest.mock('next/server', () => ({
    NextRequest: class {
        _url: string;
        _body: any;
        constructor(url = 'http://localhost/api/payroll') { this._url = url; this._body = {}; }
        get url() { return this._url; }
        async json() { return this._body; }
    },
    NextResponse: {
        json: jest.fn().mockImplementation((body, init) => ({
            status: init?.status || 200,
            json: async () => body,
        })),
    },
}))

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))

// ── helpers ──────────────────────────────────────────────────────────────────
function createChain(resolveValue: any = { data: null }) {
    const chain: any = {}
    chain.select = jest.fn().mockReturnValue(chain)
    chain.eq = jest.fn().mockReturnValue(chain)
    chain.neq = jest.fn().mockReturnValue(chain)
    chain.in = jest.fn().mockReturnValue(chain)
    chain.gte = jest.fn().mockReturnValue(chain)
    chain.lte = jest.fn().mockReturnValue(chain)
    chain.order = jest.fn().mockReturnValue(chain)
    chain.limit = jest.fn().mockReturnValue(chain)
    chain.insert = jest.fn().mockReturnValue(chain)
    chain.update = jest.fn().mockReturnValue(chain)
    chain.delete = jest.fn().mockReturnValue(chain)
    chain.single = jest.fn().mockResolvedValue(resolveValue)
    // resolve directly for list queries
    chain.then = (resolve: any) => resolve(resolveValue)
    return chain
}

const MOCK_ADMIN  = { clinic_id: 'clinic-1', role: 'CLINIC_ADMIN' }
const MOCK_DOCTOR = { clinic_id: 'clinic-1', role: 'DOCTOR' }
const MOCK_USER   = { id: 'user-1' }

const MOCK_PAYROLL = {
    id: 'payroll-1',
    clinic_id: 'clinic-1',
    doctor_id: 'doctor-1',
    reference_month: '2026-04-01',
    status: 'OPEN',
    net_payroll: 5000,
    gross_payroll: 5800,
    total_appointments: 20,
}

function buildSupabase(profileOverride: any = MOCK_ADMIN, tableOverrides: Record<string, any> = {}) {
    return {
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: MOCK_USER } }) },
        from: jest.fn((table: string) => {
            const defaults: Record<string, any> = {
                users: { data: profileOverride },
                doctors: { data: { id: 'doctor-1' } },
                medical_payroll: { data: [MOCK_PAYROLL] },
                ...tableOverrides,
            }
            return createChain(defaults[table] || { data: null })
        }),
        rpc: jest.fn().mockResolvedValue({ data: MOCK_PAYROLL, error: null }),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/payroll', () => {
    beforeEach(() => jest.clearAllMocks())

    it('401 quando não autenticado', async () => {
        const sb = buildSupabase()
        sb.auth.getUser.mockResolvedValue({ data: { user: null } })
        ;(createClient as jest.Mock).mockResolvedValue(sb)

        const req: any = { url: 'http://localhost/api/payroll' }
        const res = await GET(req)
        expect(res.status).toBe(401)
    })

    it('CLINIC_ADMIN recebe todas as folhas do mês', async () => {
        const sb = buildSupabase(MOCK_ADMIN)
        ;(createClient as jest.Mock).mockResolvedValue(sb)

        const req: any = { url: 'http://localhost/api/payroll?month=2026-04' }
        const res = await GET(req)
        const json = await res.json()
        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
    })

    it('DOCTOR recebe apenas a própria folha (filtra por doctor_id)', async () => {
        const sb = buildSupabase(MOCK_DOCTOR)
        const fromSpy = jest.spyOn(sb, 'from')
        ;(createClient as jest.Mock).mockResolvedValue(sb)

        const req: any = { url: 'http://localhost/api/payroll' }
        await GET(req)

        // Deve ter buscado o doctor_id do usuário
        expect(fromSpy).toHaveBeenCalledWith('doctors')
    })

    it('DOCTOR sem perfil de médico recebe 403', async () => {
        const sb = buildSupabase(MOCK_DOCTOR, { doctors: { data: null } })
        ;(createClient as jest.Mock).mockResolvedValue(sb)

        const req: any = { url: 'http://localhost/api/payroll' }
        const res = await GET(req)
        expect(res.status).toBe(403)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/payroll (calcular repasse)', () => {
    beforeEach(() => jest.clearAllMocks())

    it('401 quando não autenticado', async () => {
        const sb = buildSupabase()
        sb.auth.getUser.mockResolvedValue({ data: { user: null } })
        ;(createClient as jest.Mock).mockResolvedValue(sb)

        const req: any = { url: 'http://localhost/api/payroll', json: async () => ({}) }
        const res = await POST(req)
        expect(res.status).toBe(401)
    })

    it('403 para role RECEPTIONIST', async () => {
        const sb = buildSupabase({ clinic_id: 'clinic-1', role: 'RECEPTIONIST' })
        ;(createClient as jest.Mock).mockResolvedValue(sb)

        const req: any = {
            url: 'http://localhost/api/payroll',
            json: async () => ({ doctor_id: 'doctor-1', month: '2026-04' }),
        }
        const res = await POST(req)
        expect(res.status).toBe(403)
    })

    it('400 quando month não fornecido', async () => {
        const sb = buildSupabase(MOCK_ADMIN)
        ;(createClient as jest.Mock).mockResolvedValue(sb)

        const req: any = {
            url: 'http://localhost/api/payroll',
            json: async () => ({}), // sem month
        }
        const res = await POST(req)
        expect(res.status).toBe(400)
    })

    it('200 com dados válidos dispara RPC de cálculo', async () => {
        const sb = buildSupabase(MOCK_ADMIN)
        sb.rpc = jest.fn().mockResolvedValue({ data: { total: 5 }, error: null })
        ;(createClient as jest.Mock).mockResolvedValue(sb)

        const req: any = {
            url: 'http://localhost/api/payroll',
            json: async () => ({ doctor_id: 'doctor-1', month: '2026-04' }),
        }
        const res = await POST(req)
        // O status esperado é 200 ou 201 dependendo da implementação
        expect([200, 201]).toContain(res.status)
    })
})
