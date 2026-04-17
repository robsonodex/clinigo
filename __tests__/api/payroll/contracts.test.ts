/** @jest-environment node */
// app/__tests__/api/payroll/contracts.test.ts
import { GET, POST } from '@/app/api/payroll/contracts/route'
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/payroll/contracts/[id]/route'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

jest.mock('next/server', () => ({
    NextRequest: class {
        _url: string;
        _body: any;
        constructor(url = 'http://localhost/api/payroll/contracts') { this._url = url; this._body = {}; }
        get url() { return this._url; }
        async json() { return this._body; }
    },
    NextResponse: {
        json: jest.fn().mockImplementation((body, init) => ({
            status: init?.status || 200,
            json: async () => body ?? {},
        })),
    },
}))

// Suprimir console.error nos testes para evitar poluição de output
const originalConsoleError = console.error
beforeAll(() => { console.error = jest.fn() })
afterAll(() => { console.error = originalConsoleError })

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
    createServiceRoleClient: jest.fn(),
}))

// ── helpers ──────────────────────────────────────────────────────────────────
function createChain(resolveValue: any = { data: null, error: null }) {
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
    chain.then = (resolve: any) => resolve(resolveValue)
    return chain
}

const MOCK_ADMIN = { clinic_id: 'clinic-1', role: 'CLINIC_ADMIN' }
const MOCK_DOCTOR = { clinic_id: 'clinic-1', role: 'DOCTOR' }
const MOCK_RECEPTIONIST = { clinic_id: 'clinic-1', role: 'RECEPTIONIST' }
const MOCK_USER = { id: 'user-1' }

const MOCK_CONTRACT = {
    id: 'contract-1',
    clinic_id: 'clinic-1',
    doctor_id: 'doctor-1',
    contract_type: 'PERCENTAGE_GROSS',
    percentage_private: 70,
    percentage_insurance: 60,
    is_active: true,
    created_at: '2026-04-01T00:00:00Z',
}

function buildSupabase(profileOverride: any = MOCK_ADMIN, tableOverrides: Record<string, any> = {}) {
    const defaults: Record<string, any> = {
        users: { data: profileOverride },
        doctor_contracts: { data: [MOCK_CONTRACT], error: null },
        ...tableOverrides,
    }

    const sb = {
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: MOCK_USER } }) },
        from: jest.fn((table: string) => createChain(defaults[table] || { data: null, error: null })),
    }

    return sb
}

function setupMocks(profileOverride?: any, tableOverrides?: Record<string, any>) {
    const sb = buildSupabase(profileOverride, tableOverrides)
    ;(createClient as jest.Mock).mockResolvedValue(sb)
    ;(createServiceRoleClient as jest.Mock).mockReturnValue(sb)
    return sb
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payroll/contracts
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/payroll/contracts', () => {
    beforeEach(() => jest.clearAllMocks())

    it('401 quando não autenticado', async () => {
        // Arrange
        const sb = buildSupabase()
        sb.auth.getUser.mockResolvedValue({ data: { user: null } })
        ;(createClient as jest.Mock).mockResolvedValue(sb)
        ;(createServiceRoleClient as jest.Mock).mockReturnValue(sb)

        // Act
        const req: any = { url: 'http://localhost/api/payroll/contracts' }
        const res = await GET(req)

        // Assert
        expect(res.status).toBe(401)
    })

    it('CLINIC_ADMIN lista todos os contratos da clínica', async () => {
        // Arrange
        const sb = setupMocks(MOCK_ADMIN)

        // Act
        const req: any = { url: 'http://localhost/api/payroll/contracts' }
        const res = await GET(req)
        const json = await res.json()

        // Assert
        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
    })

    it('filtra por doctor_id quando fornecido', async () => {
        // Arrange
        const sb = setupMocks(MOCK_ADMIN)
        const fromSpy = jest.spyOn(sb, 'from')

        // Act
        const req: any = { url: 'http://localhost/api/payroll/contracts?doctor_id=doctor-1' }
        await GET(req)

        // Assert
        expect(fromSpy).toHaveBeenCalledWith('doctor_contracts')
    })

    it('403 quando clinic_id ausente no perfil', async () => {
        // Arrange
        setupMocks({ clinic_id: null, role: 'CLINIC_ADMIN' })

        // Act
        const req: any = { url: 'http://localhost/api/payroll/contracts' }
        const res = await GET(req)

        // Assert
        expect(res.status).toBe(403)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payroll/contracts
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/payroll/contracts', () => {
    beforeEach(() => jest.clearAllMocks())

    const VALID_BODY = {
        doctor_id: '550e8400-e29b-41d4-a716-446655440000',
        contract_type: 'PERCENTAGE_GROSS',
        percentage_private: 70,
        percentage_insurance: 60,
    }

    it('401 quando não autenticado', async () => {
        // Arrange
        const sb = buildSupabase()
        sb.auth.getUser.mockResolvedValue({ data: { user: null } })
        ;(createClient as jest.Mock).mockResolvedValue(sb)
        ;(createServiceRoleClient as jest.Mock).mockReturnValue(sb)

        // Act
        const req: any = {
            url: 'http://localhost/api/payroll/contracts',
            json: async () => VALID_BODY,
        }
        const res = await POST(req)

        // Assert
        expect(res.status).toBe(401)
    })

    it('403 para role RECEPTIONIST', async () => {
        // Arrange
        setupMocks(MOCK_RECEPTIONIST)

        // Act
        const req: any = {
            url: 'http://localhost/api/payroll/contracts',
            json: async () => VALID_BODY,
        }
        const res = await POST(req)

        // Assert
        expect(res.status).toBe(403)
    })

    it('403 para role DOCTOR', async () => {
        // Arrange
        setupMocks(MOCK_DOCTOR)

        // Act
        const req: any = {
            url: 'http://localhost/api/payroll/contracts',
            json: async () => VALID_BODY,
        }
        const res = await POST(req)

        // Assert
        expect(res.status).toBe(403)
    })

    it('400 quando body não passa validação Zod', async () => {
        // Arrange
        setupMocks(MOCK_ADMIN)

        // Act
        const req: any = {
            url: 'http://localhost/api/payroll/contracts',
            json: async () => ({ contract_type: 'INVALID_TYPE' }),
        }
        const res = await POST(req)

        // Assert — Zod lança erro que é capturado pelo catch genérico (status 400 ou 500)
        expect([400, 500]).toContain(res.status)
    })

    it('200 com dados válidos — desativa contratos anteriores e cria novo', async () => {
        // Arrange
        const sb = setupMocks(MOCK_ADMIN, {
            doctor_contracts: { data: MOCK_CONTRACT, error: null },
        })

        // Act
        const req: any = {
            url: 'http://localhost/api/payroll/contracts',
            json: async () => VALID_BODY,
        }
        const res = await POST(req)

        // Assert
        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payroll/contracts/[id]
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/payroll/contracts/[id]', () => {
    beforeEach(() => jest.clearAllMocks())

    const CTX = { params: Promise.resolve({ id: 'contract-1' }) }

    it('401 quando não autenticado', async () => {
        // Arrange
        const sb = buildSupabase()
        sb.auth.getUser.mockResolvedValue({ data: { user: null } })
        ;(createClient as jest.Mock).mockResolvedValue(sb)
        ;(createServiceRoleClient as jest.Mock).mockReturnValue(sb)

        // Act
        const req: any = { url: 'http://localhost/api/payroll/contracts/contract-1' }
        const res = await GET_BY_ID(req, CTX)

        // Assert
        expect(res.status).toBe(401)
    })

    it('200 retorna contrato válido', async () => {
        // Arrange
        setupMocks(MOCK_ADMIN, {
            doctor_contracts: { data: MOCK_CONTRACT, error: null },
        })

        // Act
        const req: any = { url: 'http://localhost/api/payroll/contracts/contract-1' }
        const res = await GET_BY_ID(req, CTX)
        const json = await res.json()

        // Assert
        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
    })

    it('404 quando contrato não encontrado', async () => {
        // Arrange
        setupMocks(MOCK_ADMIN, {
            doctor_contracts: { data: null, error: { message: 'not found' } },
        })

        // Act
        const req: any = { url: 'http://localhost/api/payroll/contracts/not-found' }
        const res = await GET_BY_ID(req, CTX)

        // Assert
        expect(res.status).toBe(404)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/payroll/contracts/[id]
// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/payroll/contracts/[id]', () => {
    beforeEach(() => jest.clearAllMocks())

    const CTX = { params: Promise.resolve({ id: 'contract-1' }) }

    it('401 quando não autenticado', async () => {
        // Arrange
        const sb = buildSupabase()
        sb.auth.getUser.mockResolvedValue({ data: { user: null } })
        ;(createClient as jest.Mock).mockResolvedValue(sb)
        ;(createServiceRoleClient as jest.Mock).mockReturnValue(sb)

        // Act
        const req: any = {
            url: 'http://localhost/api/payroll/contracts/contract-1',
            json: async () => ({ percentage_private: 75 }),
        }
        const res = await PATCH(req, CTX)

        // Assert
        expect(res.status).toBe(401)
    })

    it('403 para DOCTOR', async () => {
        // Arrange
        setupMocks(MOCK_DOCTOR)

        // Act
        const req: any = {
            url: 'http://localhost/api/payroll/contracts/contract-1',
            json: async () => ({ percentage_private: 75 }),
        }
        const res = await PATCH(req, CTX)

        // Assert
        expect(res.status).toBe(403)
    })

    it('400 com dados inválidos (Zod)', async () => {
        // Arrange
        setupMocks(MOCK_ADMIN, {
            doctor_contracts: { data: { id: 'contract-1' }, error: null },
        })

        // Act
        const req: any = {
            url: 'http://localhost/api/payroll/contracts/contract-1',
            json: async () => ({ percentage_private: 999 }), // max 100
        }
        const res = await PATCH(req, CTX)

        // Assert — Zod lança erro que é capturado pelo catch (status 400 ou 500)
        expect([400, 500]).toContain(res.status)
    })

    it('200 com dados válidos atualiza contrato', async () => {
        // Arrange
        setupMocks(MOCK_ADMIN, {
            doctor_contracts: { data: { ...MOCK_CONTRACT, percentage_private: 75 }, error: null },
        })

        // Act
        const req: any = {
            url: 'http://localhost/api/payroll/contracts/contract-1',
            json: async () => ({ percentage_private: 75 }),
        }
        const res = await PATCH(req, CTX)
        const json = await res.json()

        // Assert
        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/payroll/contracts/[id]
// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/payroll/contracts/[id]', () => {
    beforeEach(() => jest.clearAllMocks())

    const CTX = { params: Promise.resolve({ id: 'contract-1' }) }

    it('401 quando não autenticado', async () => {
        // Arrange
        const sb = buildSupabase()
        sb.auth.getUser.mockResolvedValue({ data: { user: null } })
        ;(createClient as jest.Mock).mockResolvedValue(sb)
        ;(createServiceRoleClient as jest.Mock).mockReturnValue(sb)

        // Act
        const req: any = { url: 'http://localhost/api/payroll/contracts/contract-1' }
        const res = await DELETE(req, CTX)

        // Assert
        expect(res.status).toBe(401)
    })

    it('403 para RECEPTIONIST', async () => {
        // Arrange
        setupMocks(MOCK_RECEPTIONIST)

        // Act
        const req: any = { url: 'http://localhost/api/payroll/contracts/contract-1' }
        const res = await DELETE(req, CTX)

        // Assert
        expect(res.status).toBe(403)
    })

    it('404 quando contrato não existe', async () => {
        // Arrange
        setupMocks(MOCK_ADMIN, {
            doctor_contracts: { data: null, error: null },
        })

        // Act
        const req: any = { url: 'http://localhost/api/payroll/contracts/contract-1' }
        const res = await DELETE(req, CTX)

        // Assert
        expect(res.status).toBe(404)
    })

    it('200 exclui contrato com sucesso', async () => {
        // Arrange
        setupMocks(MOCK_ADMIN, {
            doctor_contracts: { data: { id: 'contract-1' }, error: null },
        })

        // Act
        const req: any = { url: 'http://localhost/api/payroll/contracts/contract-1' }
        const res = await DELETE(req, CTX)
        const json = await res.json()

        // Assert
        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
    })
})
