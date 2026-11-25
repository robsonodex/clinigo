/**
 * CLINIGO — Motor Monetário Determinístico em Inteiros (Centavos)
 *
 * Elimina aritmética IEEE-754 float (IDE-03 #1 / FIN-04 / FIN-03):
 * - Todas as somas, subtrações e rateios financeiros operam exclusivamente em inteiros (centavos).
 * - Rateio proporcional com distribuição determinística de resíduo de centavos (soma exata 100%).
 */

/**
 * Converte valor monetário (number | string | null) para centavos inteiros.
 */
export function toCents(value: number | string | null | undefined): number {
    if (value === null || value === undefined || value === '') return 0
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return 0
        return Math.round((value + Number.EPSILON) * 100)
    }
    const normalized = String(value).trim().replace(/\s+/g, '')
    // Suporta formato pt-BR "1.234,56" e ISO "1234.56"
    const hasComma = normalized.includes(',')
    const clean = hasComma
        ? normalized.replace(/\./g, '').replace(',', '.')
        : normalized
    const num = Number(clean)
    if (!Number.isFinite(num)) return 0
    return Math.round((num + Number.EPSILON) * 100)
}

/**
 * Converte centavos inteiros para número decimal com 2 casas exatas (ex.: 15050 -> 150.5).
 */
export function fromCents(cents: number): number {
    if (!Number.isFinite(cents)) return 0
    return Math.round(cents) / 100
}

/**
 * Formata centavos para string decimal fixa TISS/ANS ("150.50").
 */
export function formatCentsTiss(cents: number): string {
    return fromCents(cents).toFixed(2)
}

/**
 * Soma lista de valores em centavos inteiros sem erro de ponto flutuante.
 */
export function sumCents(values: Array<number | string | null | undefined>): number {
    let total = 0
    for (const v of values) {
        total += toCents(v)
    }
    return total
}

/**
 * Soma lista de valores retornando decimal exato de 2 casas.
 */
export function sumCurrency(values: Array<number | string | null | undefined>): number {
    return fromCents(sumCents(values))
}

/**
 * Subtração monetária segura (a - b) com piso opcional em zero.
 */
export function subtractCurrency(
    a: number | string | null | undefined,
    b: number | string | null | undefined,
    clampZero = false
): number {
    const diff = toCents(a) - toCents(b)
    return fromCents(clampZero ? Math.max(0, diff) : diff)
}

/**
 * Multiplicação segura de quantidade × valor unitário em centavos.
 */
export function multiplyQtyUnitCents(quantity: number, unitValue: number | string | null | undefined): number {
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty === 0) return 0
    return Math.round(qty * toCents(unitValue))
}

/**
 * Rateio proporcional determinístico (Método dos Maiores Restos — Hamilton / FIN-03 / QA-38).
 * Garante que a soma dos itens rateados seja SEMPRE matematicamente igual a `totalCents` (0 centavos perdidos).
 */
export function allocateProportionalCents(totalCents: number, weights: number[]): number[] {
    const safeTotal = Math.round(totalCents)
    if (weights.length === 0) return []
    const safeWeights = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0))
    const weightSum = safeWeights.reduce((acc, w) => acc + w, 0)

    if (weightSum <= 0 || safeTotal === 0) {
        return weights.map(() => 0)
    }

    const sign = safeTotal < 0 ? -1 : 1
    const absTotal = Math.abs(safeTotal)

    const rawShares = safeWeights.map((w, idx) => {
        const exact = (absTotal * w) / weightSum
        const floor = Math.floor(exact)
        return { idx, floor, remainder: exact - floor }
    })

    let remainderCents = absTotal - rawShares.reduce((acc, s) => acc + s.floor, 0)

    // Ordena por maior fração residual (desempate determinístico por índice crescente)
    const sorted = [...rawShares].sort((a, b) =>
        b.remainder !== a.remainder ? b.remainder - a.remainder : a.idx - b.idx
    )

    for (let i = 0; i < sorted.length && remainderCents > 0; i++) {
        sorted[i].floor += 1
        remainderCents -= 1
    }

    const result = new Array<number>(weights.length).fill(0)
    for (const item of sorted) {
        result[item.idx] = sign * item.floor
    }
    return result
}

