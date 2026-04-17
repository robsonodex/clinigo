import { POST, GET, PUT } from '@/app/api/tiss/glosas/[id]/contest/route'
import { createClient } from '@/lib/supabase/server'

jest.mock('next/server', () => ({
    NextRequest: class {
        _body: any;
        constructor() { this._body = {}; }
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

// Helper
function createChain(resolveValue: any = { data: null }) {
    const obj: any = {}
    obj.select = jest.fn().mockReturnValue(obj)
    obj.eq = jest.fn().mockReturnValue(obj)
    obj.in = jest.fn().mockReturnValue(obj)
    obj.order = jest.fn().mockReturnValue(obj)
    obj.limit = jest.fn().mockReturnValue(obj)
    obj.single = jest.fn().mockResolvedValue(resolveValue)
    obj.update = jest.fn().mockReturnValue(obj)
    obj.insert = jest.fn().mockReturnValue(obj)
    obj.delete = jest.fn().mockReturnValue(obj)
    return obj
}

describe('TISS 1.6 API - Glosa Contest (Recurso)', () => {
    const mockUser = { id: 'user-1' }
    const mockProfile = { clinic_id: 'clinic-1', role: 'CLINIC_ADMIN' }
    const mockGlosa = { id: 'glosa-1', clinic_id: 'clinic-1', glosa_value: 500, can_appeal: true, guide_id: 'guide-1' }

    function buildSupabase(overrides: Record<string, any> = {}) {
        const defaults: Record<string, any> = {
            users: { data: mockProfile },
            tiss_glosas: { data: mockGlosa },
            tiss_glosa_contests: { data: null },
            tiss_guides: { data: { total_value: 1000, glosa_value: 500 } },
            audit_logs: { data: null },
            ...overrides,
        }

        return {
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser } }) },
            from: jest.fn((table: string) => {
                const chain = createChain(defaults[table] || { data: null })

                // Special: contests listing returns empty array by default
                if (table === 'tiss_glosa_contests' && !overrides['tiss_glosa_contests']) {
                    chain.limit = jest.fn().mockResolvedValue({ data: [] })
                    chain.single.mockResolvedValue({ data: null })
                }

                return chain
            }),
        }
    }

    beforeEach(() => jest.clearAllMocks())

    // ============================
    // POST - Criar recurso
    // ============================

    it('POST: should return 401 if not authenticated', async () => {
        const supabase = buildSupabase()
        supabase.auth.getUser.mockResolvedValue({ data: { user: null } })
        ;(createClient as jest.Mock).mockResolvedValue(supabase)

        const req: any = { json: async () => ({ contest_reason: 'Motivo teste longo o suficiente' }) }
        const response = await POST(req, { params: Promise.resolve({ id: 'g1' }) })
        expect(response.status).toBe(401)
    })

    it('POST: should return 403 for RECEPTIONIST role', async () => {
        const supabase = buildSupabase({ users: { data: { clinic_id: 'c1', role: 'RECEPTIONIST' } } })
        ;(createClient as jest.Mock).mockResolvedValue(supabase)

        const req: any = { json: async () => ({ contest_reason: 'Motivo teste longo o suficiente' }) }
        const response = await POST(req, { params: Promise.resolve({ id: 'g1' }) })
        expect(response.status).toBe(403)
    })

    it('POST: should create contest successfully', async () => {
        const contestResult = { id: 'contest-1', glosa_id: 'glosa-1', contest_status: 'PENDING' }
        const supabase = buildSupabase()

        // Override from to return contest on insert
        const origFrom = supabase.from
        supabase.from = jest.fn((table: string) => {
            const chain = origFrom(table)
            if (table === 'tiss_glosa_contests') {
                chain.insert = jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: contestResult, error: null })
                    })
                })
                chain.limit = jest.fn().mockResolvedValue({ data: [] })
            }
            return chain
        })

        ;(createClient as jest.Mock).mockResolvedValue(supabase)

        const req: any = { json: async () => ({ contest_reason: 'Glosa indevida pois o procedimento foi autorizado previamente' }) }
        const response = await POST(req, { params: Promise.resolve({ id: 'glosa-1' }) })
        const json = await response.json()

        expect(response.status).toBe(201)
        expect(json.success).toBe(true)
        expect(json.data.contest_status).toBe('PENDING')
    })

    it('POST: should reject if glosa cannot be appealed', async () => {
        const supabase = buildSupabase({ tiss_glosas: { data: { ...mockGlosa, can_appeal: false } } })
        ;(createClient as jest.Mock).mockResolvedValue(supabase)

        const req: any = { json: async () => ({ contest_reason: 'Tentativa de recurso em glosa sem permissão' }) }
        const response = await POST(req, { params: Promise.resolve({ id: 'glosa-1' }) })
        const json = await response.json()

        expect(response.status).toBe(400)
        expect(json.error).toContain('não permite recurso')
    })

    // ============================
    // PUT - Atualizar (reversão)
    // ============================

    it('PUT: should reverse glosa and update guide financials', async () => {
        const activeContest = { id: 'contest-1', glosa_id: 'glosa-1', contest_status: 'IN_REVIEW' }
        const updatedContest = { ...activeContest, contest_status: 'REVERSED', reversed_value: 500 }

        const supabase = buildSupabase()
        supabase.from = jest.fn((table: string) => {
            const chain = createChain({ data: null })

            if (table === 'users') {
                chain.single.mockResolvedValue({ data: mockProfile })
            }

            if (table === 'tiss_glosa_contests') {
                // Lookup chain: select->eq->eq->in->order->limit->single
                chain.single.mockResolvedValue({ data: activeContest })
                // Update chain: update->eq->select->single
                chain.update.mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: updatedContest, error: null })
                        })
                    })
                })
            }

            if (table === 'tiss_glosas') {
                chain.single.mockResolvedValue({ data: mockGlosa })
            }

            if (table === 'tiss_guides') {
                chain.single.mockResolvedValue({ data: { total_value: 1000, glosa_value: 500 } })
            }

            return chain
        })

        ;(createClient as jest.Mock).mockResolvedValue(supabase)

        const req: any = { json: async () => ({ contest_status: 'REVERSED', approved_value: 500, response_text: 'Glosa revertida pela operadora' }) }
        const response = await PUT(req, { params: Promise.resolve({ id: 'glosa-1' }) })
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.data.contest_status).toBe('REVERSED')
    })
})
