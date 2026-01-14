/**
 * Testes da API de Documentos
 * Testa upload e listagem de documentos
 */

import { POST, GET } from '@/app/api/documents/route'
import { log } from '@/lib/logger'

describe('API /api/documents', () => {
    describe('POST - Upload Document', () => {
        beforeEach(() => {
            jest.clearAllMocks()
        })

        it('deve fazer upload de documento com dados válidos', async () => {
            const mockRequest = new Request('http://localhost:3000/api/documents', {
                method: 'POST',
                body: JSON.stringify({
                    patient_id: '123e4567-e89b-12d3-a456-426614174000',
                    file_name: 'exame_sangue.pdf',
                    file_url: 'https://storage.supabase.co/documents/test.pdf',
                    file_size: 2048000, // 2MB
                    file_type: 'application/pdf',
                    category: 'exam',
                    description: 'Exame de sangue completo'
                })
            })

            const response = await POST(mockRequest)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(log.audit).toHaveBeenCalledWith(
                'test-user-id',
                'upload_document',
                expect.objectContaining({
                    file_name: 'exame_sangue.pdf'
                })
            )
        })

        it('deve rejeitar arquivo muito grande (>50MB)', async () => {
            const mockRequest = new Request('http://localhost:3000/api/documents', {
                method: 'POST',
                body: JSON.stringify({
                    patient_id: '123e4567-e89b-12d3-a456-426614174000',
                    file_name: 'arquivo_grande.pdf',
                    file_url: 'https://storage.supabase.co/documents/test.pdf',
                    file_size: 60 * 1024 * 1024, // 60MB - excede limite
                    file_type: 'application/pdf',
                    category: 'exam'
                })
            })

            const response = await POST(mockRequest)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Validation failed')
        })

        it('deve rejeitar file_type inválido', async () => {
            const mockRequest = new Request('http://localhost:3000/api/documents', {
                method: 'POST',
                body: JSON.stringify({
                    patient_id: '123e4567-e89b-12d3-a456-426614174000',
                    file_name: 'video.mp4',
                    file_url: 'https://storage.supabase.co/documents/test.mp4',
                    file_size: 1024000,
                    file_type: 'video/mp4', // Tipo não permitido
                    category: 'exam'
                })
            })

            const response = await POST(mockRequest)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Validation failed')
        })
    })

    describe('GET - List Documents', () => {
        it('deve listar documentos com filtro de patient_id', async () => {
            const mockRequest = new Request(
                'http://localhost:3000/api/documents?patient_id=123e4567-e89b-12d3-a456-426614174000'
            )

            const response = await GET(mockRequest)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.documents).toBeDefined()
        })

        it('deve validar query parameters', async () => {
            const mockRequest = new Request(
                'http://localhost:3000/api/documents?limit=150' // Excede limite de 100
            )

            const response = await GET(mockRequest)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.error).toBe('Validation failed')
        })
    })
})
