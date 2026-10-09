import {
    PLAN_LICENSES,
    PLAN_PRICES,
    SEAT_EXTRA_PRICE_CENTS,
} from '@/lib/constants/plans'
import {
    computeMonthlyTotalCents,
    recommendCheapestPlan,
    buildSeatQuote,
    verifyQuote,
    SEAT_COUNTED_ROLES,
    formatBRLFromCents,
} from '@/lib/services/seat-licensing'

describe('Licenciamento por Assento - Precificação e Domínio', () => {
    describe('1. Limites por plano e constantes canônicas', () => {
        it('deve ter as capacidades incluídas corretas em PLAN_LICENSES', () => {
            expect(PLAN_LICENSES.BASICO).toBe(1)
            expect(PLAN_LICENSES.AVANCADO).toBe(5)
            expect(PLAN_LICENSES.PROFESSIONAL).toBe(30)
            expect(PLAN_LICENSES.ENTERPRISE).toBeNull()
        })

        it('deve ter o preço extra padrão de R$ 49,90 (4990 centavos)', () => {
            expect(SEAT_EXTRA_PRICE_CENTS).toBe(4990)
        })

        it('deve ter os preços base de mensalidade em PLAN_PRICES', () => {
            expect(PLAN_PRICES.BASICO).toBe(149)
            expect(PLAN_PRICES.AVANCADO).toBe(249)
            expect(PLAN_PRICES.PROFESSIONAL).toBe(449)
            expect(PLAN_PRICES.ENTERPRISE).toBe(699)
        })
    })

    describe('2. Matemática de centavos e fronteira exata', () => {
        it('dentro do limite exato (30 de 30 no Professional), não há cobrança adicional', () => {
            const calc = computeMonthlyTotalCents('PROFESSIONAL', null, 30)
            expect(calc.includedSeats).toBe(30)
            expect(calc.activeSeats).toBe(30)
            expect(calc.extraSeats).toBe(0)
            expect(calc.baseMonthlyCents).toBe(44900)
            expect(calc.extraMonthlyCents).toBe(0)
            expect(calc.totalMonthlyCents).toBe(44900)
            expect(formatBRLFromCents(calc.totalMonthlyCents)).toBe('R$\u00a0449,00')
        })

        it('limite + 1 (31 no Professional) adiciona exatamente 1 assento: 449,00 + 49,90 = 498,90', () => {
            const calc = computeMonthlyTotalCents('PROFESSIONAL', null, 31)
            expect(calc.includedSeats).toBe(30)
            expect(calc.activeSeats).toBe(31)
            expect(calc.extraSeats).toBe(1)
            expect(calc.baseMonthlyCents).toBe(44900)
            expect(calc.extraMonthlyCents).toBe(4990)
            expect(calc.totalMonthlyCents).toBe(49890)
            expect(formatBRLFromCents(calc.totalMonthlyCents)).toBe('R$\u00a0498,90')
        })

        it('5 extras no Avançado: 249,00 + 5 x 49,90 = R$ 498,50 (49850 centavos)', () => {
            // Avançado inclui 5 assentos; 10 ativos = 5 extras
            const calc = computeMonthlyTotalCents('AVANCADO', null, 10)
            expect(calc.includedSeats).toBe(5)
            expect(calc.activeSeats).toBe(10)
            expect(calc.extraSeats).toBe(5)
            expect(calc.baseMonthlyCents).toBe(24900)
            expect(calc.extraMonthlyCents).toBe(5 * 4990) // 24950
            expect(calc.totalMonthlyCents).toBe(24900 + 24950) // 49850
            expect(formatBRLFromCents(calc.totalMonthlyCents)).toBe('R$\u00a0498,50')
        })

        it('caso real WorldSensory: Professional com 34 usuários ativos', () => {
            // 30 incluídos + 4 extras = 44900 + (4 * 4990) = 44900 + 19960 = 64860
            const calc = computeMonthlyTotalCents('PROFESSIONAL', null, 34)
            expect(calc.includedSeats).toBe(30)
            expect(calc.activeSeats).toBe(34)
            expect(calc.extraSeats).toBe(4)
            expect(calc.baseMonthlyCents).toBe(44900)
            expect(calc.extraMonthlyCents).toBe(19960)
            expect(calc.totalMonthlyCents).toBe(64860)
            expect(formatBRLFromCents(calc.totalMonthlyCents)).toBe('R$\u00a0648,60')
        })
    })

    describe('3. Negociação Comercial, Cortesia e Preço Customizado', () => {
        it('respeita custom_price como base em centavos', () => {
            // Preço customizado de R$ 399,00 em vez de R$ 449,00
            const calc = computeMonthlyTotalCents('PROFESSIONAL', 399, 32)
            expect(calc.baseMonthlyCents).toBe(39900)
            expect(calc.extraSeats).toBe(2)
            expect(calc.extraMonthlyCents).toBe(2 * 4990)
            expect(calc.totalMonthlyCents).toBe(39900 + 9980)
        })

        it('aplica override de preço unitário por assento (seatPriceOverrideCents)', () => {
            // Tarifa negociada de R$ 35,00 por assento extra
            const calc = computeMonthlyTotalCents('PROFESSIONAL', null, 32, {
                seatPriceOverrideCents: 3500,
            })
            expect(calc.unitPriceCents).toBe(3500)
            expect(calc.extraSeats).toBe(2)
            expect(calc.extraMonthlyCents).toBe(7000)
            expect(calc.totalMonthlyCents).toBe(44900 + 7000)
        })

        it('cortesia comercial (seatOverageWaived = true) zera a cobrança extra mas calcula o excedente', () => {
            const calc = computeMonthlyTotalCents('PROFESSIONAL', null, 35, {
                seatOverageWaived: true,
            })
            expect(calc.isWaived).toBe(true)
            expect(calc.extraSeats).toBe(5)
            expect(calc.unitPriceCents).toBe(0)
            expect(calc.extraMonthlyCents).toBe(0)
            expect(calc.totalMonthlyCents).toBe(44900) // apenas a mensalidade base
        })
    })

    describe('4. Plano ENTERPRISE', () => {
        it('ENTERPRISE nunca possui limite nem cobrança extra independente da quantidade de usuários', () => {
            const calc1 = computeMonthlyTotalCents('ENTERPRISE', null, 50)
            const calc2 = computeMonthlyTotalCents('ENTERPRISE', null, 500)

            expect(calc1.includedSeats).toBeNull()
            expect(calc1.extraSeats).toBe(0)
            expect(calc1.extraMonthlyCents).toBe(0)
            expect(calc1.totalMonthlyCents).toBe(69900)

            expect(calc2.includedSeats).toBeNull()
            expect(calc2.extraSeats).toBe(0)
            expect(calc2.extraMonthlyCents).toBe(0)
            expect(calc2.totalMonthlyCents).toBe(69900)
        })
    })

    describe('10. Papéis Contabilizados (SEAT_COUNTED_ROLES)', () => {
        it('deve conter papéis internos da equipe e NÃO conter SUPER_ADMIN nem PATIENT', () => {
            expect(SEAT_COUNTED_ROLES).toContain('CLINIC_ADMIN')
            expect(SEAT_COUNTED_ROLES).toContain('DOCTOR')
            expect(SEAT_COUNTED_ROLES).toContain('RECEPTIONIST')
            expect(SEAT_COUNTED_ROLES).toContain('FINANCIAL')
            expect(SEAT_COUNTED_ROLES).toContain('READONLY')

            expect(SEAT_COUNTED_ROLES).not.toContain('SUPER_ADMIN')
            expect(SEAT_COUNTED_ROLES).not.toContain('PATIENT')
        })
    })

    describe('14. Assessor de Plano Mais Econômico (recommendCheapestPlan)', () => {
        it('recomenda Professional para 10 usuários no plano Avançado (P4)', () => {
            // No Avançado: 5 incluídos + 5 extras = R$ 498,50/mês
            // No Professional: 30 incluídos por R$ 449,00/mês
            // Economia: R$ 49,50/mês
            const rec = recommendCheapestPlan(10, 'AVANCADO')
            expect(rec).not.toBeNull()
            expect(rec?.plan).toBe('PROFESSIONAL')
            expect(rec?.monthly_cents).toBe(44900)
            expect(rec?.savings_cents).toBe(4950)
        })

        it('recomenda Enterprise para 36 usuários no plano Professional (P4)', () => {
            // No Professional: 30 incluídos + 6 extras (6 * 49,90 = 299,40) = R$ 748,40/mês
            // No Enterprise: ilimitado por R$ 699,00/mês
            // Economia: R$ 49,40/mês
            const rec = recommendCheapestPlan(36, 'PROFESSIONAL')
            expect(rec).not.toBeNull()
            expect(rec?.plan).toBe('ENTERPRISE')
            expect(rec?.monthly_cents).toBe(69900)
            expect(rec?.savings_cents).toBe(4940)
        })

        it('não recomenda nada se o plano atual for mais barato ou já for Enterprise', () => {
            // 20 usuários no Professional: R$ 449,00. Enterprise é R$ 699,00. Nenhuma recomendação.
            const rec1 = recommendCheapestPlan(20, 'PROFESSIONAL')
            expect(rec1).toBeNull()

            // Enterprise nunca recebe recomendação
            const rec2 = recommendCheapestPlan(100, 'ENTERPRISE')
            expect(rec2).toBeNull()
        })
    })
})
