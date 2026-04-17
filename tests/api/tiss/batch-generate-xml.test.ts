import { POST } from '@/app/api/tiss/batches/[id]/generate-xml/route'
import { createClient } from '@/lib/supabase/server'
import { getTISSXSDValidator } from '@/lib/services/tiss/tiss-xsd-validator'
import { createTissGenerator } from '@/lib/services/tiss/tiss-xml-generator-v2'

jest.mock('next/server', () => ({
    NextRequest: class { url = ''; method = 'POST' },
    NextResponse: {
        json: jest.fn().mockImplementation((body, init) => ({
            status: init?.status || 200,
            json: async () => body,
        })),
    },
}))

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/services/tiss/tiss-xsd-validator', () => ({ getTISSXSDValidator: jest.fn() }))
jest.mock('@/lib/services/tiss/tiss-xml-generator-v2', () => ({ createTissGenerator: jest.fn() }))

// Helper to create a fluent mock chain without circular reference issues
function createChain(resolveValue: any = { data: null }) {
    const obj: any = {}
    obj.select = jest.fn().mockReturnValue(obj)
    obj.eq = jest.fn().mockReturnValue(obj)
    obj.in = jest.fn().mockReturnValue(obj)
    obj.order = jest.fn().mockReturnValue(obj)
    obj.single = jest.fn().mockResolvedValue(resolveValue)
    obj.update = jest.fn().mockReturnValue(obj)
    obj.insert = jest.fn().mockResolvedValue({ data: null })
    obj.delete = jest.fn().mockReturnValue(obj)
    return obj
}

describe('TISS 1.3 API - Batch XML Generation', () => {
    let mockValidator: any
    let mockGenerator: any

    const mockUser = { id: 'user-1' }
    const mockProfile = { clinic_id: 'clinic-1', role: 'CLINIC_ADMIN' }
    const mockBatch = { id: 'batch-1', batch_number: '202604001', status: 'DRAFT', insurance_company_id: 'ins-1' }
    const mockGuides = [{
        id: 'guide-1',
        guide_number: '202604001001',
        guide_type: 'CONSULTATION',
        execution_date: '2026-04-15',
        total_value: 150,
        procedure_code: '10101012',
        procedure_name: 'Consulta',
        patient: { full_name: 'Patient A', cpf: '12345678900' },
        procedures: [],
    }]

    function buildSupabase(overrides: Record<string, any> = {}) {
        const storageMock = {
            from: jest.fn().mockReturnValue({
                upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
                getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://storage.example.com/file.xml' } }),
            }),
        }

        const defaultTables: Record<string, any> = {
            users: { data: mockProfile },
            tiss_batches: { data: mockBatch },
            clinics: { data: { corporate_name: 'Clínica Teste', cnpj: '12345678000100', cnes_code: '1234567' } },
            health_insurances: { data: { name: 'Unimed', code: '123456', ans_code: '123456' } },
            audit_logs: { data: null },
            tiss_validation_errors: { data: null },
            ...overrides,
        }

        const supabase: any = {
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser } }) },
            storage: storageMock,
            from: jest.fn((table: string) => {
                const chain = createChain(defaultTables[table] || { data: null })

                // tiss_guides needs special handling: .order() returns the list, not .single()
                if (table === 'tiss_guides') {
                    const guidesOverride = defaultTables['tiss_guides']
                    if (guidesOverride) {
                        chain.order = jest.fn().mockResolvedValue(guidesOverride)
                    } else {
                        chain.order = jest.fn().mockResolvedValue({ data: mockGuides })
                    }
                }

                return chain
            }),
        }

        return supabase
    }

    beforeEach(() => {
        jest.clearAllMocks()

        mockValidator = { validateXML: jest.fn().mockResolvedValue({ valid: true, errors: [] }) }
        ;(getTISSXSDValidator as jest.Mock).mockReturnValue(mockValidator)

        mockGenerator = {
            getVersion: jest.fn().mockReturnValue('4.01.00'),
            generateBatchXML: jest.fn().mockResolvedValue('<ans:mensagemTISS>batch</ans:mensagemTISS>'),
        }
        ;(createTissGenerator as jest.Mock).mockReturnValue(mockGenerator)
    })

    it('should return 401 if not authenticated', async () => {
        // Arrange
        const supabase = buildSupabase()
        supabase.auth.getUser.mockResolvedValue({ data: { user: null } })
        ;(createClient as jest.Mock).mockResolvedValue(supabase)

        // Act
        const response = await POST({} as any, { params: Promise.resolve({ id: 'b1' }) })
        const json = await response.json()

        // Assert
        expect(response.status).toBe(401)
        expect(json.error).toBe('Não autenticado')
    })

    it('should return 403 for non-admin users', async () => {
        // Arrange
        const supabase = buildSupabase({ users: { data: { clinic_id: 'c1', role: 'RECEPTIONIST' } } })
        ;(createClient as jest.Mock).mockResolvedValue(supabase)

        // Act
        const response = await POST({} as any, { params: Promise.resolve({ id: 'b1' }) })
        const json = await response.json()

        // Assert
        expect(response.status).toBe(403)
        expect(json.error).toBe('Sem permissão para gerar XML')
    })

    it('should generate batch XML and mark status as VALID', async () => {
        // Arrange
        const supabase = buildSupabase()
        ;(createClient as jest.Mock).mockResolvedValue(supabase)

        // Act
        const response = await POST({} as any, { params: Promise.resolve({ id: 'b1' }) })
        const json = await response.json()

        // Assert
        expect(response.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.data.status).toBe('VALID')
        expect(json.data.guide_count).toBe(1)
        expect(json.data.xml_url).toBe('https://storage.example.com/file.xml')
        expect(mockGenerator.generateBatchXML).toHaveBeenCalledTimes(1)
        expect(mockValidator.validateXML).toHaveBeenCalledTimes(1)
    })

    it('should mark batch as INVALID when XSD validation fails', async () => {
        // Arrange
        mockValidator.validateXML.mockResolvedValue({
            valid: false,
            errors: [{ code: 'MISSING_ROOT', field: 'mensagemTISS', message: 'Missing root' }],
        })
        const supabase = buildSupabase()
        ;(createClient as jest.Mock).mockResolvedValue(supabase)

        // Act
        const response = await POST({} as any, { params: Promise.resolve({ id: 'b1' }) })
        const json = await response.json()

        // Assert
        expect(response.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.data.status).toBe('INVALID')
        expect(json.data.validation.errors.length).toBe(1)
    })

    it('should reject if batch has already been SENT', async () => {
        // Arrange
        const supabase = buildSupabase({ tiss_batches: { data: { ...mockBatch, status: 'SENT' } } })
        ;(createClient as jest.Mock).mockResolvedValue(supabase)

        // Act
        const response = await POST({} as any, { params: Promise.resolve({ id: 'b1' }) })
        const json = await response.json()

        // Assert
        expect(response.status).toBe(400)
        expect(json.error).toContain('já foi enviado')
    })
})
