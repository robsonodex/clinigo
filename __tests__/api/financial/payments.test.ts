/**
 * Testes da API de Pagamentos
 * Testa autorização, validação e criação de pagamentos
 */

import { POST, GET } from '@/app/api/financial/payments/route'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

// Mock helpers já estão configurados no jest.setup.js

describe('API /api/financial/payments', () => {
    describe('POST - Create Payment', () => {
        beforeEach(() => {
            jest.clearAllMocks()
        })

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
                    amount: -50, // Negativo - inválido
                    payment_method: 'pix',
                    category: 'consultation'
                })
            })

            const response = await POST(mockRequest)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Validation failed')
            expect(data.details).toBeDefined()
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
                    payment_method: 'bitcoin', // Método não suportado
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
