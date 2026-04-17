/** @jest-environment node */
/**
 * Testes da API de Pagamentos
 * Testa autorização, validação e criação de pagamentos
 */

// Mock dependencies BEFORE imports
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn()
}))

jest.mock('@/lib/middlewares/auth', () => ({
    requireRole: jest.fn(),
    forbiddenResponse: jest.fn((msg: string) =>
        new Response(JSON.stringify({ error: msg }), { status: 403, headers: { 'content-type': 'application/json' } })
    ),
    unauthorizedResponse: jest.fn((msg: string) =>
        new Response(JSON.stringify({ error: msg }), { status: 401, headers: { 'content-type': 'application/json' } })
    )
}))

jest.mock('@/lib/logger', () => ({
    log: {
        info: jest.fn(),
        error: jest.fn(),
        audit: jest.fn()
    }
}))

jest.mock('@/lib/rate-limit', () => ({
    withRateLimit: jest.fn().mockResolvedValue(null)
}))

import { POST, GET } from '@/app/api/financial/payments/route'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/middlewares/auth'
import { log } from '@/lib/logger'

describe('API /api/financial/payments', () => {
    let mockSupabase: any

    beforeEach(() => {
        jest.clearAllMocks()

        // Default: authorized CLINIC_ADMIN
        ;(requireRole as jest.Mock).mockResolvedValue({
            authorized: true,
            user: { id: 'test-user-id', clinic_id: 'clinic-1', role: 'CLINIC_ADMIN' }
        })

        // Chainable supabase mock
        const chain: any = {}
        chain.select = jest.fn().mockReturnValue(chain)
        chain.eq = jest.fn().mockReturnValue(chain)
        chain.gte = jest.fn().mockReturnValue(chain)
        chain.lte = jest.fn().mockReturnValue(chain)
        chain.order = jest.fn().mockReturnValue(chain)
        chain.limit = jest.fn().mockReturnValue(chain)
        chain.single = jest.fn().mockResolvedValue({ data: { id: 'payment-1' }, error: null })
        chain.insert = jest.fn().mockReturnValue(chain)
        chain.then = (resolve: any) => resolve({ data: [], error: null })

        mockSupabase = {
            from: jest.fn().mockReturnValue(chain)
        }

        ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
    })

    describe('POST - Create Payment', () => {
        it('deve criar pagamento com dados válidos', async () => {
            const mockRequest = new Request('http://localhost:3000/api/financial/payments', {
                method: 'POST',
                body: JSON.stringify({
                    patient_id: '123e4567-e89b-12d3-a456-426614174000',
                    amount: 150.00,
                    payment_method: 'pix',
                    category: 'consultation',
                    description: 'Consulta médica'
                })
            })

            const response = await POST(mockRequest)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(log.audit).toHaveBeenCalledWith(
                'test-user-id',
                'create_payment',
                expect.objectContaining({
                    amount: 150.00,
                    payment_method: 'pix'
                })
            )
        })

        it('deve rejeitar pagamento com amount inválido', async () => {
            const mockRequest = new Request('http://localhost:3000/api/financial/payments', {
                method: 'POST',
                body: JSON.stringify({
                    patient_id: '123e4567-e89b-12d3-a456-426614174000',
                    amount: -50,
                    payment_method: 'pix',
                    category: 'consultation'
                })
            })

            const response = await POST(mockRequest)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Validation failed')
        })

        it('deve rejeitar pagamento sem patient_id', async () => {
            const mockRequest = new Request('http://localhost:3000/api/financial/payments', {
                method: 'POST',
                body: JSON.stringify({
                    amount: 150.00,
                    payment_method: 'pix',
                    category: 'consultation'
                })
            })

            const response = await POST(mockRequest)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Validation failed')
        })

        it('deve rejeitar payment_method inválido', async () => {
            const mockRequest = new Request('http://localhost:3000/api/financial/payments', {
                method: 'POST',
                body: JSON.stringify({
                    patient_id: '123e4567-e89b-12d3-a456-426614174000',
                    amount: 150.00,
                    payment_method: 'bitcoin',
                    category: 'consultation'
                })
            })

            const response = await POST(mockRequest)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Validation failed')
        })
    })

    describe('GET - List Payments', () => {
        it('deve listar pagamentos com filtros', async () => {
            const mockRequest = new Request(
                'http://localhost:3000/api/financial/payments?payment_method=pix&category=consultation'
            )

            const response = await GET(mockRequest)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.payments).toBeDefined()
        })
    })
})
