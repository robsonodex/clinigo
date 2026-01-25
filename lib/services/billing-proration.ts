/**
 * Billing Proration Service
 * Calcula valores proporcionais para upgrade/downgrade
 */

export interface PlanPricing {
    STARTER: 149
    BASICO: 299
    AVANCADO: 549
    ENTERPRISE: 799
}

export interface ProrationResult {
    proratedAmount: number
    daysRemaining: number
    totalDays: number
    explanation: string
    currentPlanPrice: number
    newPlanPrice: number
}

export class BillingProrationService {
    private pricing: PlanPricing = {
        STARTER: 149,
        BASICO: 299,
        AVANCADO: 549,
        ENTERPRISE: 799,
    }

    /**
     * Calcula valor proporcional ao fazer upgrade/downgrade no meio do mês
     */
    calculateProration(
        currentPlan: keyof PlanPricing,
        newPlan: keyof PlanPricing,
        billingCycleStart: Date,
        billingCycleEnd: Date,
        today: Date = new Date()
    ): ProrationResult {
        const currentPrice = this.pricing[currentPlan]
        const newPrice = this.pricing[newPlan]

        const totalDays = this.daysBetween(billingCycleStart, billingCycleEnd)
        const daysUsed = this.daysBetween(billingCycleStart, today)
        const daysRemaining = totalDays - daysUsed

        // Valor já pago proporcionalmente
        const amountPaidForRemainingDays = (currentPrice / totalDays) * daysRemaining

        // Valor a pagar pelo novo plano
        const amountDueForRemainingDays = (newPrice / totalDays) * daysRemaining

        // Diferença (pode ser positivo ou negativo)
        const proratedAmount = amountDueForRemainingDays - amountPaidForRemainingDays

        const explanation = this.generateExplanation(
            currentPlan,
            newPlan,
            currentPrice,
            newPrice,
            daysRemaining,
            totalDays,
            proratedAmount
        )

        return {
            proratedAmount: Math.max(0, proratedAmount), // Nunca negativo
            daysRemaining,
            totalDays,
            explanation,
            currentPlanPrice: currentPrice,
            newPlanPrice: newPrice,
        }
    }

    /**
     * Calcula próxima data de billing
     */
    getNextBillingDate(currentBillingDate: Date): Date {
        const next = new Date(currentBillingDate)
        next.setMonth(next.getMonth() + 1)
        return next
    }

    /**
     * Verifica se mudança é upgrade ou downgrade
     */
    getChangeType(
        currentPlan: keyof PlanPricing,
        newPlan: keyof PlanPricing
    ): 'UPGRADE' | 'DOWNGRADE' | 'SAME' {
        const currentPrice = this.pricing[currentPlan]
        const newPrice = this.pricing[newPlan]

        if (newPrice > currentPrice) return 'UPGRADE'
        if (newPrice < currentPrice) return 'DOWNGRADE'
        return 'SAME'
    }

    private daysBetween(start: Date, end: Date): number {
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    }

    private generateExplanation(
        currentPlan: string,
        newPlan: string,
        currentPrice: number,
        newPrice: number,
        daysRemaining: number,
        totalDays: number,
        proratedAmount: number
    ): string {
        const changeType = newPrice > currentPrice ? 'Upgrade' : 'Downgrade'

        return `
${changeType} de ${currentPlan} (R$ ${currentPrice}/mês) para ${newPlan} (R$ ${newPrice}/mês).
Restam ${daysRemaining} de ${totalDays} dias no ciclo atual.
Valor proporcional a pagar: R$ ${Math.max(0, proratedAmount).toFixed(2)}
    `.trim()
    }

    /**
     * Obtém preço de um plano
     */
    getPlanPrice(plan: keyof PlanPricing): number {
        return this.pricing[plan]
    }
}
