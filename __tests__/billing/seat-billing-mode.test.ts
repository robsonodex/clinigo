import { getSeatBillingMode } from '@/lib/services/seat-licensing'

describe('Licenciamento por Assento - Modo de cobrança (fail-closed)', () => {
    const originalEnv = process.env.SEAT_BILLING_MODE

    afterEach(() => {
        if (originalEnv === undefined) delete process.env.SEAT_BILLING_MODE
        else process.env.SEAT_BILLING_MODE = originalEnv
    })

    it('assume enforce quando a variável de ambiente não existe', () => {
        delete process.env.SEAT_BILLING_MODE
        expect(getSeatBillingMode(null)).toBe('enforce')
    })

    it('assume enforce quando a variável tem valor inválido', () => {
        process.env.SEAT_BILLING_MODE = 'valor-invalido'
        expect(getSeatBillingMode({})).toBe('enforce')
    })

    it('respeita enforce com espaços e maiúsculas', () => {
        process.env.SEAT_BILLING_MODE = ' ENFORCE '
        expect(getSeatBillingMode(undefined)).toBe('enforce')
    })

    it('respeita shadow quando configurado explicitamente', () => {
        process.env.SEAT_BILLING_MODE = 'shadow'
        expect(getSeatBillingMode(null)).toBe('shadow')
    })

    it('override por clínica tem prioridade sobre a variável', () => {
        process.env.SEAT_BILLING_MODE = 'shadow'
        expect(getSeatBillingMode({ seat_billing_mode: 'enforce' })).toBe('enforce')
    })
})
