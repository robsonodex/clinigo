import { resolveQrCodeImage } from '@/lib/services/qr-image'

describe('resolveQrCodeImage - Leitura Dupla de QR Code', () => {
    const mockBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const sampleCheckinUrl = 'https://www.clinigo.app/checkin/test-appointment-123'
    const samplePreRegUrl = 'https://www.clinigo.app/pre-cadastro/token-xyz'

    test('Cenário 1: Com imagem salva (qrCodeImage) deve retornar a imagem existente sem regerar', async () => {
        const payload = {
            appointmentId: 'appt-1',
            checkinUrl: sampleCheckinUrl,
            qrCodeImage: mockBase64Image
        }

        const result = await resolveQrCodeImage(payload)
        expect(result).toBe(mockBase64Image)
    })

    test('Cenário 1b: Com imagem salva em formato snake_case (qr_code_image) deve retornar existente', async () => {
        const payload = {
            appointmentId: 'appt-2',
            checkin_url: sampleCheckinUrl,
            qr_code_image: mockBase64Image
        }

        const result = await resolveQrCodeImage(payload)
        expect(result).toBe(mockBase64Image)
    })

    test('Cenário 2: Sem imagem salva, deve gerar dataUrl dinamicamente a partir de checkinUrl', async () => {
        const payload = {
            appointmentId: 'appt-3',
            checkinUrl: sampleCheckinUrl,
            qrCodeImage: null
        }

        const result = await resolveQrCodeImage(payload)
        expect(result).toBeDefined()
        expect(typeof result).toBe('string')
        expect(result).toMatch(/^data:image\/png;base64,/)
    })

    test('Cenário 2b: Sem imagem salva e payload stringificado, gera a partir de preRegistrationUrl', async () => {
        const payloadString = JSON.stringify({
            preRegistrationUrl: samplePreRegUrl
        })

        const result = await resolveQrCodeImage(payloadString)
        expect(result).toBeDefined()
        expect(typeof result).toBe('string')
        expect(result).toMatch(/^data:image\/png;base64,/)
    })

    test('Cenário 2c: Sem payload, mas com fallbackUrl, gera a partir do fallback', async () => {
        const result = await resolveQrCodeImage(null, sampleCheckinUrl)
        expect(result).toBeDefined()
        expect(typeof result).toBe('string')
        expect(result).toMatch(/^data:image\/png;base64,/)
    })

    test('Cenário 3: Sem dados e sem URL, retorna null sem lançar erro', async () => {
        const result = await resolveQrCodeImage(null, null)
        expect(result).toBeNull()
    })
})
