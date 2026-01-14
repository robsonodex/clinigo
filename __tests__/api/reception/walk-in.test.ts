/**
 * Testes da API de Walk-in (Recepção)
 * Testa registro de pacientes walk-in
 */

import { POST } from '@/app/api/reception/walk-in/route'
import { log } from '@/lib/logger'

describe('API /api/reception/walk-in', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('deve registrar walk-in com dados válidos', async () => {
        const mockRequest = new Request('http://localhost:3000/api/reception/walk-in', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: '123e4567-e89b-12d3-a456-426614174000',
                urgency_level: 'normal',
                reason: 'Dor de cabeça persistente'
            })
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(log.audit).toHaveBeenCalledWith(
            'test-user-id',
            'create_walk_in',
            expect.objectContaining({
                patient_id: '123e4567-e89b-12d3-a456-426614174000'
            })
        )
    })

    it('deve usar urgency_level default quando não fornecido', async () => {
        const mockRequest = new Request('http://localhost:3000/api/reception/walk-in', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: '123e4567-e89b-12d3-a456-426614174000'
            })
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
    })

    it('deve rejeitar walk-in sem patient_id', async () => {
        const mockRequest = new Request('http://localhost:3000/api/reception/walk-in', {
            method: 'POST',
            body: JSON.stringify({
                urgency_level: 'urgent'
            })
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Validation failed')
    })

    it('deve rejeitar urgency_level inválido', async () => {
        const mockRequest = new Request('http://localhost:3000/api/reception/walk-in', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: '123e4567-e89b-12d3-a456-426614174000',
                urgency_level: 'critical' // Não é um valor válido
            })
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Validation failed')
    })

    it('deve rejeitar reason muito curto', async () => {
        const mockRequest = new Request('http://localhost:3000/api/reception/walk-in', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: '123e4567-e89b-12d3-a456-426614174000',
                reason: 'Dor' // Menos de 5 caracteres
            })
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Validation failed')
    })
})
