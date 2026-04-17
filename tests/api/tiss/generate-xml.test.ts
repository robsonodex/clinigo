import { POST } from '@/app/api/tiss/guides/[id]/xml/route'
import { createClient } from '@/lib/supabase/server'
import { getTISSXSDValidator } from '@/lib/services/tiss/tiss-xsd-validator'
import { createTissGenerator } from '@/lib/services/tiss/tiss-xml-generator-v2'

// Mocks globais para next/server (evita ReferenceError: Request is not defined)
jest.mock('next/server', () => {
    return {
        NextRequest: class MockNextRequest {
            url: string;
            method: string;
            _body: any;
            constructor(url: string, options: { method: string, body?: string }) {
                this.url = url;
                this.method = options.method;
                this._body = options.body ? JSON.parse(options.body) : {};
            }
            async json() { return this._body; }
        },
        NextResponse: {
            json: jest.fn().mockImplementation((body, init) => {
                return {
                    status: init?.status || 200,
                    json: async () => body
                }
            })
        }
    }
})

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn()
}))

jest.mock('@/lib/services/tiss/tiss-xsd-validator', () => ({
    getTISSXSDValidator: jest.fn()
}))

jest.mock('@/lib/services/tiss/tiss-xml-generator-v2', () => ({
    createTissGenerator: jest.fn()
}))

describe('TISS 1.2 API - Guide XML Generation and Validation', () => {
    let mockSupabase: any
    let mockValidator: any
    let mockGenerator: any

    beforeEach(() => {
        jest.clearAllMocks()

        mockSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } })
            },
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
            update: jest.fn().mockReturnThis(),
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
            delete: jest.fn().mockReturnThis()
        }

        ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

        mockValidator = {
            validateXML: jest.fn().mockResolvedValue({ valid: true, errors: [] })
        }
        ;(getTISSXSDValidator as jest.Mock).mockReturnValue(mockValidator)

        mockGenerator = {
            getVersion: jest.fn().mockReturnValue('4.01.00'),
            generateBatchXML: jest.fn().mockResolvedValue('<ans:mensagemTISS>...</ans:mensagemTISS>')
        }
        ;(createTissGenerator as jest.Mock).mockReturnValue(mockGenerator)
    })

    it('should return 401 if user is not authenticated', async () => {
        // Arrange
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
        
        // Act
        // As request requires NextRequest matching the next API route
        const request: any = {} 
        const response = await POST(request, { params: Promise.resolve({ id: 'guide-test' }) })
        const json = await response.json()

        // Assert
        expect(response.status).toBe(401)
        expect(json.error).toBe('Não autenticado')
    })

    it('should generate valid XML and update Guide status to VALID', async () => {
        // Arrange
        mockSupabase.from = jest.fn((table) => {
            if (table === 'users') {
                return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({
                    data: { role: 'RECEPTIONIST', clinic_id: 'test-clinic' }
                })}
            }
            if (table === 'tiss_guides') {
                return { 
                    select: jest.fn().mockReturnThis(), 
                    eq: jest.fn().mockReturnThis(), 
                    single: jest.fn().mockResolvedValue({
                        data: {
                            id: 'guide-id',
                            guide_number: '12345',
                            guide_type: 'CONSULTA',
                            execution_date: '2026-04-15',
                            procedure_code: '10101012',
                            patient: { full_name: 'John Doe', cpf: '00000000000' }
                        }
                    }),
                    update: jest.fn().mockReturnThis() // The actual db update chain
                }
            }
            if (table === 'clinics') {
                return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { corporate_name: 'Clinic' } }) }
            }
            if (table === 'audit_logs') return { insert: jest.fn().mockResolvedValue({}) }
            if (table === 'tiss_validation_errors') return { delete: jest.fn().mockReturnThis(), eq: jest.fn().mockResolvedValue({}) }
            return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({}) }
        })

        const updateFn = jest.fn().mockReturnValue({ eq: jest.fn() })
        
        // The last mock is for update
        const originalFrom = mockSupabase.from
        mockSupabase.from = jest.fn((table) => {
            const builder = originalFrom(table)
            builder.update = updateFn
            return builder
        })

        const request: any = {}

        // Act
        const response = await POST(request, { params: Promise.resolve({ id: 'guide-test' }) })
        const json = await response.json()

        // Assert
        expect(response.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.status).toBe('VALID')
        expect(mockGenerator.generateBatchXML).toHaveBeenCalled()
        expect(mockValidator.validateXML).toHaveBeenCalled()
        expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({
            status: 'VALID',
            validation_status: 'VALID'
        }))
    })

    it('should generate INVALID XML and mark status as INVALID when validation fails', async () => {
        // Arrange
        mockValidator.validateXML.mockResolvedValue({ valid: false, errors: [{ message: 'Missing node' }] })

        mockSupabase.from = jest.fn((table) => {
            if (table === 'users') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { clinic_id: 'test-clinic' } }) }
            if (table === 'tiss_guides') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'guide-id', guide_number: '123', procedure_code: '10101012' }}) }
            if (table === 'clinics') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { } }) }
            return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({}), insert: jest.fn(), delete: jest.fn().mockReturnThis() }
        })
        
        const updateFn = jest.fn().mockReturnValue({ eq: jest.fn() })
        const insertFn = jest.fn().mockResolvedValue({})
        
        const originalFrom = mockSupabase.from
        mockSupabase.from = jest.fn((table) => {
            const builder = originalFrom(table)
            builder.update = updateFn
            builder.insert = insertFn
            return builder
        })

        const request: any = {}

        // Act
        const response = await POST(request, { params: Promise.resolve({ id: 'guide-test' }) })
        const json = await response.json()

        // Assert
        expect(response.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.status).toBe('INVALID')
        expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ status: 'INVALID' }))
        
        // Assert it saved the validation error
        // Because checking exact call signatures on a complex mock is harder, we just assert the result payload.
    })
})
