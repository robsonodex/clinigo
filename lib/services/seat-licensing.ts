/**
 * Seat Licensing Service - CliniGo
 * Padrão SaaS médico corporativo premium internacional (nível Stripe/Linear/Notion)
 * 
 * Regras:
 * - Limite flexível: sistema nunca bloqueia expansão, apenas exige confirmação e cobra acima do limite.
 * - Silêncio até o limite: modal só aparece ao tentar criar o usuário (limite + 1).
 * - Fonte da verdade imutável para contabilidade de assentos e preços.
 * - Dinheiro exclusivamente em centavos inteiros.
 * - Assinatura criptográfica HMAC-SHA256 para cotações (anti-tampering).
 * - Idempotência e prova de aceite com compensação (VOIDED).
 */

import crypto from 'crypto'
import {
    PLAN_LICENSES,
    PLAN_PRICES,
    SEAT_EXTRA_PRICE_CENTS,
    type PlanType,
} from '@/lib/constants/plans'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// =============================================================================
// Tipos e Constantes
// =============================================================================

export const SEAT_COUNTED_ROLES = [
    'CLINIC_ADMIN',
    'DOCTOR',
    'RECEPTIONIST',
    'FINANCIAL',
    'READONLY',
] as const

export type SeatCountedRole = typeof SEAT_COUNTED_ROLES[number]

export type SeatBillingMode = 'off' | 'shadow' | 'enforce'

export interface CheaperPlanRecommendation {
    recommended_plan: PlanType
    monthly_cents: number
    savings_cents: number
    included_seats: number | null
    explanation: string
}

export interface SeatStatus {
    clinic_id: string
    plan: string
    included_seats: number | null
    active_seats: number
    extra_seats: number
    unit_price_cents: number
    base_monthly_cents: number
    extra_monthly_cents: number
    total_monthly_cents: number
    seat_billing_mode: SeatBillingMode
    seat_price_override_cents: number | null
    seat_overage_waived: boolean
    is_waived: boolean
    cheaper_plan: CheaperPlanRecommendation | null
    requires_regularization: boolean
}

export interface SeatQuote {
    quote_id: string
    clinic_id: string
    plan: string
    included_seats: number | null
    active_seats: number
    seats_after: number
    extra_seats_after: number
    unit_price_cents: number
    monthly_before_cents: number
    monthly_after_cents: number
    delta_cents: number
    cheaper_plan: CheaperPlanRecommendation | null
    expires_at: number
    signature: string
}

export interface VerifyQuoteResult {
    valid: boolean
    reason?: 'QUOTE_STALE' | 'INVALID_SIGNATURE' | 'QUOTE_EXPIRED' | 'CLINIC_MISMATCH'
    code?: string
    current_active_seats?: number
}

export interface SeatBillingEvent {
    id?: string
    clinic_id: string
    actor_user_id: string
    target_user_id?: string | null
    plan: string
    included_seats: number | null
    seats_before: number
    seats_after: number
    extra_seats_before: number
    extra_seats_after: number
    unit_price_cents: number
    monthly_before_cents: number
    monthly_after_cents: number
    quote_id: string
    idempotency_key: string
    ip_address?: string | null
    user_agent?: string | null
    status: 'COMMITTED' | 'VOIDED'
    void_reason?: string | null
    voided_at?: string | null
    created_at?: string
}

// =============================================================================
// Funções Puras de Domínio (Testáveis sem I/O)
// =============================================================================

/**
 * Normaliza o nome do plano para a chave correspondente em PLAN_LICENSES / PLAN_PRICES
 */
export function normalizePlanType(plan?: string | null): string {
    if (!plan) return 'BASICO'
    const clean = plan.trim().toUpperCase()
    if (clean === 'STARTER' || clean === 'BASIC') return 'BASICO'
    if (clean === 'PRO') return 'PROFESSIONAL'
    if (clean === 'NETWORK') return 'ENTERPRISE'
    return clean
}

/**
 * Retorna as licenças incluídas para um plano.
 * null = ilimitado (ex: ENTERPRISE).
 */
export function getIncludedSeatsForPlan(plan?: string | null): number | null {
    const norm = normalizePlanType(plan)
    if (norm === 'ENTERPRISE') return null
    return PLAN_LICENSES[norm] ?? 1
}

/**
 * Formata centavos em BRL (R$ 0,00) de acordo com o padrão pt-BR
 */
export function formatBRLFromCents(cents: number): string {
    const value = (cents || 0) / 100
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value)
}

/**
 * Calcula os totais mensais em centavos a partir do plano, preço customizado,
 * assentos ativos e eventuais overrides comerciais.
 */
export function computeMonthlyTotalCents(
    plan: string,
    customPriceCents: number | null | undefined,
    activeSeats: number,
    overrides?: {
        seatPriceOverrideCents?: number | null
        seatOverageWaived?: boolean
    }
): {
    baseMonthlyCents: number
    includedSeats: number | null
    activeSeats: number
    extraSeats: number
    unitPriceCents: number
    extraMonthlyCents: number
    totalMonthlyCents: number
    isWaived: boolean
} {
    const normPlan = normalizePlanType(plan)
    const includedSeats = getIncludedSeatsForPlan(normPlan)

    // Preço base do plano em centavos: custom_price tem prioridade sobre tabela
    const baseMonthlyCents =
        customPriceCents !== null && customPriceCents !== undefined
            ? Math.round(Number(customPriceCents))
            : (PLAN_PRICES[normPlan] ?? 149) * 100

    // Plano Enterprise / ilimitado nunca possui extras nem cobrança adicional
    if (includedSeats === null) {
        return {
            baseMonthlyCents,
            includedSeats: null,
            activeSeats,
            extraSeats: 0,
            unitPriceCents: 0,
            extraMonthlyCents: 0,
            totalMonthlyCents: baseMonthlyCents,
            isWaived: false,
        }
    }

    const extraSeats = Math.max(0, activeSeats - includedSeats)
    const isWaived = Boolean(overrides?.seatOverageWaived)

    const unitPriceCents =
        overrides?.seatPriceOverrideCents !== null &&
        overrides?.seatPriceOverrideCents !== undefined
            ? Math.round(Number(overrides.seatPriceOverrideCents))
            : SEAT_EXTRA_PRICE_CENTS

    const extraMonthlyCents = isWaived ? 0 : extraSeats * unitPriceCents
    const totalMonthlyCents = baseMonthlyCents + extraMonthlyCents

    return {
        baseMonthlyCents,
        includedSeats,
        activeSeats,
        extraSeats,
        unitPriceCents,
        extraMonthlyCents,
        totalMonthlyCents,
        isWaived,
    }
}

/**
 * P4. Assessor de Plano Mais Econômico
 * Calcula dinamicamente, sem nenhum hardcode, se migrar para outro plano
 * seria mais vantajoso financeiramente para a quantidade de usuários pós-adição.
 */
export function recommendCheapestPlan(
    activeSeats: number,
    currentPlan: string,
    currentCustomPriceCents?: number | null,
    overrides?: {
        seatPriceOverrideCents?: number | null
        seatOverageWaived?: boolean
    }
): CheaperPlanRecommendation | null {
    const normCurrent = normalizePlanType(currentPlan)

    // Se já é ENTERPRISE, não há upgrade mais econômico
    if (normCurrent === 'ENTERPRISE') return null

    // Custo atual com a nova quantidade de assentos
    const currentCost = computeMonthlyTotalCents(
        normCurrent,
        currentCustomPriceCents,
        activeSeats,
        overrides
    ).totalMonthlyCents

    // Planos elegíveis de upgrade
    const standardTiers: PlanType[] = ['AVANCADO', 'PROFESSIONAL', 'ENTERPRISE']
    let bestRecommendation: CheaperPlanRecommendation | null = null

    for (const candidate of standardTiers) {
        if (candidate === normCurrent) continue

        // Apenas avalia se o candidato for um plano de patamar superior ou igual
        const candidateCost = computeMonthlyTotalCents(
            candidate,
            null, // migração assume tabela oficial do novo plano
            activeSeats
        ).totalMonthlyCents

        if (candidateCost < currentCost) {
            const savings = currentCost - candidateCost

            if (!bestRecommendation || candidateCost < bestRecommendation.monthly_cents) {
                const candidateIncluded = getIncludedSeatsForPlan(candidate)
                const candidateName =
                    candidate === 'ENTERPRISE'
                        ? 'CliniGo Enterprise'
                        : candidate === 'PROFESSIONAL'
                        ? 'CliniGo Professional'
                        : 'CliniGo Avançado'

                const explanation =
                    candidateIncluded === null
                        ? `O plano ${candidateName} oferece licenças ilimitadas por ${formatBRLFromCents(
                              candidateCost
                          )}/mês, economizando ${formatBRLFromCents(savings)} por mês.`
                        : `O plano ${candidateName} inclui ${candidateIncluded} licenças por ${formatBRLFromCents(
                              candidateCost
                          )}/mês, economizando ${formatBRLFromCents(savings)} por mês.`

                bestRecommendation = {
                    recommended_plan: candidate,
                    monthly_cents: candidateCost,
                    savings_cents: savings,
                    included_seats: candidateIncluded,
                    explanation,
                }
            }
        }
    }

    return bestRecommendation
}

// =============================================================================
// Criptografia e Cotações Assinadas (HMAC-SHA256)
// =============================================================================

export function getQuoteSecret(): string {
    return (
        process.env.SEAT_QUOTE_SECRET ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXTAUTH_SECRET ||
        'clinigo-seat-quote-internal-salt-v1-production'
    )
}

function buildQuotePayloadString(params: {
    quoteId: string
    clinicId: string
    plan: string
    includedSeats: number | null
    activeSeats: number
    seatsAfter: number
    extraSeatsAfter: number
    unitPriceCents: number
    monthlyBeforeCents: number
    monthlyAfterCents: number
    deltaCents: number
    expiresAt: number
}): string {
    const includedStr = params.includedSeats === null ? 'UNLIMITED' : params.includedSeats.toString()
    return [
        params.quoteId,
        params.clinicId,
        params.plan,
        includedStr,
        params.activeSeats,
        params.seatsAfter,
        params.extraSeatsAfter,
        params.unitPriceCents,
        params.monthlyBeforeCents,
        params.monthlyAfterCents,
        params.deltaCents,
        params.expiresAt,
    ].join(':')
}

/**
 * Cria cotação assinada com HMAC-SHA256 válida por 10 minutos
 */
export function buildSeatQuote(params: {
    clinicId: string
    plan: string
    customPriceCents?: number | null
    activeSeats: number
    overrides?: {
        seatPriceOverrideCents?: number | null
        seatOverageWaived?: boolean
    }
    secret?: string
}): SeatQuote {
    const { clinicId, plan, customPriceCents, activeSeats, overrides } = params
    const secret = params.secret || getQuoteSecret()

    const normPlan = normalizePlanType(plan)
    const seatsAfter = activeSeats + 1

    const before = computeMonthlyTotalCents(normPlan, customPriceCents, activeSeats, overrides)
    const after = computeMonthlyTotalCents(normPlan, customPriceCents, seatsAfter, overrides)
    const deltaCents = after.totalMonthlyCents - before.totalMonthlyCents

    const cheaperPlan = recommendCheapestPlan(seatsAfter, normPlan, customPriceCents, overrides)

    const quoteId = crypto.randomUUID()
    const expiresAt = Math.floor(Date.now() / 1000) + 600 // 10 minutos (600s)

    const payload = buildQuotePayloadString({
        quoteId,
        clinicId,
        plan: normPlan,
        includedSeats: before.includedSeats,
        activeSeats,
        seatsAfter,
        extraSeatsAfter: after.extraSeats,
        unitPriceCents: after.unitPriceCents,
        monthlyBeforeCents: before.totalMonthlyCents,
        monthlyAfterCents: after.totalMonthlyCents,
        deltaCents,
        expiresAt,
    })

    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')

    return {
        quote_id: quoteId,
        clinic_id: clinicId,
        plan: normPlan,
        included_seats: before.includedSeats,
        active_seats: activeSeats,
        seats_after: seatsAfter,
        extra_seats_after: after.extraSeats,
        unit_price_cents: after.unitPriceCents,
        monthly_before_cents: before.totalMonthlyCents,
        monthly_after_cents: after.totalMonthlyCents,
        delta_cents: deltaCents,
        cheaper_plan: cheaperPlan,
        expires_at: expiresAt,
        signature,
    }
}

/**
 * Valida a autenticidade e validade temporal da cotação.
 * Se os usuários ativos mudaram no ínterim, retorna QUOTE_STALE.
 */
export function verifyQuote(
    quote: SeatQuote,
    currentActiveSeats: number,
    secret?: string
): VerifyQuoteResult {
    if (!quote || !quote.signature || !quote.quote_id || !quote.clinic_id) {
        return { valid: false, reason: 'INVALID_SIGNATURE', code: 'INVALID_QUOTE_FORMAT' }
    }

    const signingSecret = secret || getQuoteSecret()
    const nowSec = Math.floor(Date.now() / 1000)

    if (nowSec > quote.expires_at) {
        return { valid: false, reason: 'QUOTE_EXPIRED', code: 'QUOTE_EXPIRED' }
    }

    // Recria payload para validação de integridade
    const expectedPayload = buildQuotePayloadString({
        quoteId: quote.quote_id,
        clinicId: quote.clinic_id,
        plan: normalizePlanType(quote.plan),
        includedSeats: quote.included_seats,
        activeSeats: quote.active_seats,
        seatsAfter: quote.seats_after,
        extraSeatsAfter: quote.extra_seats_after,
        unitPriceCents: quote.unit_price_cents,
        monthlyBeforeCents: quote.monthly_before_cents,
        monthlyAfterCents: quote.monthly_after_cents,
        deltaCents: quote.delta_cents,
        expiresAt: quote.expires_at,
    })

    const expectedSignature = crypto.createHmac('sha256', signingSecret).update(expectedPayload).digest('hex')

    // Timing-safe comparison para prevenir timing attack
    const sigBuffer = Buffer.from(quote.signature)
    const expectedBuffer = Buffer.from(expectedSignature)

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return { valid: false, reason: 'INVALID_SIGNATURE', code: 'INVALID_SIGNATURE' }
    }

    // Se o número de usuários ativos do banco divergir da cotação, está obsoleta
    if (quote.active_seats !== currentActiveSeats) {
        return {
            valid: false,
            reason: 'QUOTE_STALE',
            code: 'QUOTE_STALE',
            current_active_seats: currentActiveSeats,
        }
    }

    return { valid: true }
}

// =============================================================================
// Modo de Rollout (off | shadow | enforce)
// =============================================================================

export function getSeatBillingMode(clinicAddons?: any): SeatBillingMode {
    if (clinicAddons?.seat_billing_mode) {
        const mode = String(clinicAddons.seat_billing_mode).toLowerCase()
        if (mode === 'off' || mode === 'shadow' || mode === 'enforce') {
            return mode as SeatBillingMode
        }
    }

    const envMode = (process.env.SEAT_BILLING_MODE || 'shadow').toLowerCase()
    if (envMode === 'off' || envMode === 'shadow' || envMode === 'enforce') {
        return envMode as SeatBillingMode
    }

    return 'shadow'
}

// =============================================================================
// Operações de Banco de Dados e Serviços
// =============================================================================

/**
 * Consulta a contagem de assentos ativos de uma clínica
 */
export async function countActiveSeatsForClinic(clinicId: string): Promise<number> {
    const supabase = createServiceRoleClient()

    const { data: users, error } = await (supabase
        .from('users') as any)
        .select('id, role, email')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)

    if (error) {
        console.error('[SeatLicensing] Erro ao contar assentos ativos:', error)
        throw new Error(`Erro ao contar assentos: ${error.message}`)
    }

    const counted = (users || []).filter((u: any) => {
        if (!u.role || u.role === 'SUPER_ADMIN' || u.role === 'PATIENT') return false
        if (u.email && u.email.toLowerCase().startsWith('inativo-')) return false
        return SEAT_COUNTED_ROLES.includes(u.role)
    })

    return counted.length
}

/**
 * Obtém o status completo de assentos e cobrança de uma clínica
 */
export async function getSeatStatus(clinicId: string): Promise<SeatStatus> {
    const supabase = createServiceRoleClient()

    const { data: clinic, error: clinicError } = await (supabase
        .from('clinics') as any)
        .select('id, name, plan_type, custom_price, addons, seat_price_override_cents, seat_overage_waived')
        .eq('id', clinicId)
        .single()

    if (clinicError || !clinic) {
        throw new Error('Clínica não encontrada')
    }

    const activeSeats = await countActiveSeatsForClinic(clinicId)
    const plan = normalizePlanType(clinic.plan_type)
    const customPriceCents =
        clinic.custom_price !== null && clinic.custom_price !== undefined
            ? Math.round(Number(clinic.custom_price) * 100)
            : null

    const overrides = {
        seatPriceOverrideCents: clinic.seat_price_override_cents,
        seatOverageWaived: clinic.seat_overage_waived,
    }

    const totals = computeMonthlyTotalCents(plan, customPriceCents, activeSeats, overrides)
    const cheaperPlan = recommendCheapestPlan(activeSeats, plan, customPriceCents, overrides)
    const mode = getSeatBillingMode(clinic.addons)

    // Clínicas já excedidas sem aceite prévio ficam em regularização (P7)
    const requiresRegularization = totals.extraSeats > 0 && !clinic.seat_overage_waived

    return {
        clinic_id: clinicId,
        plan,
        included_seats: totals.includedSeats,
        active_seats: activeSeats,
        extra_seats: totals.extraSeats,
        unit_price_cents: totals.unitPriceCents,
        base_monthly_cents: totals.baseMonthlyCents,
        extra_monthly_cents: totals.extraMonthlyCents,
        total_monthly_cents: totals.totalMonthlyCents,
        seat_billing_mode: mode,
        seat_price_override_cents: clinic.seat_price_override_cents ?? null,
        seat_overage_waived: Boolean(clinic.seat_overage_waived),
        is_waived: totals.isWaived,
        cheaper_plan: cheaperPlan,
        requires_regularization: requiresRegularization,
    }
}

/**
 * Avalia se a adição de 1 assento é permitida imediatamente ou se exige confirmação.
 */
export async function checkSeatAdditionAllowed(
    clinicId: string,
    options?: {
        quote?: SeatQuote
        idempotencyKey?: string
    }
): Promise<{
    allowed: boolean
    requiresConfirmation: boolean
    status: SeatStatus
    quote?: SeatQuote
    error?: string
    code?: string
}> {
    const status = await getSeatStatus(clinicId)

    // Se estiver em modo OFF ou SHADOW, não bloqueia e não exige aceite
    if (status.seat_billing_mode === 'off' || status.seat_billing_mode === 'shadow') {
        if (status.seat_billing_mode === 'shadow' && status.included_seats !== null) {
            const nextCount = status.active_seats + 1
            if (nextCount > status.included_seats) {
                // Registrar avaliação em modo sombra de forma assíncrona/silenciosa
                recordShadowEvaluation({
                    clinicId,
                    activeSeats: status.active_seats,
                    seatsAfter: nextCount,
                    plan: status.plan,
                }).catch(() => {})
            }
        }
        return { allowed: true, requiresConfirmation: false, status }
    }

    // Plano ENTERPRISE nunca tem limite nem cobrança extra
    if (status.included_seats === null) {
        return { allowed: true, requiresConfirmation: false, status }
    }

    // Dentro do limite incluído (ex: 29 de 30 tornando-se 30 de 30): silêncio e segue normalmente
    if (status.active_seats < status.included_seats) {
        return { allowed: true, requiresConfirmation: false, status }
    }

    // Ultrapassará o limite incluído (ex: 30 de 30 querendo ser 31):
    // Se nenhuma cotação foi enviada pelo cliente, exige confirmação (409)
    if (!options?.quote) {
        const freshQuote = buildSeatQuote({
            clinicId,
            plan: status.plan,
            customPriceCents: status.base_monthly_cents,
            activeSeats: status.active_seats,
            overrides: {
                seatPriceOverrideCents: status.seat_price_override_cents,
                seatOverageWaived: status.seat_overage_waived,
            },
        })

        return {
            allowed: false,
            requiresConfirmation: true,
            status,
            quote: freshQuote,
            code: 'SEAT_LIMIT_CONFIRMATION_REQUIRED',
            error: 'Confirmação de licença adicional necessária.',
        }
    }

    // Se cotação foi enviada, valida a cotação
    const verifyResult = verifyQuote(options.quote, status.active_seats)
    if (!verifyResult.valid) {
        if (verifyResult.reason === 'QUOTE_STALE') {
            const freshQuote = buildSeatQuote({
                clinicId,
                plan: status.plan,
                customPriceCents: status.base_monthly_cents,
                activeSeats: status.active_seats,
                overrides: {
                    seatPriceOverrideCents: status.seat_price_override_cents,
                    seatOverageWaived: status.seat_overage_waived,
                },
            })

            return {
                allowed: false,
                requiresConfirmation: true,
                status,
                quote: freshQuote,
                code: 'QUOTE_STALE',
                error: 'O número de usuários ativos foi alterado. Por favor, confirme a nova cotação.',
            }
        }

        return {
            allowed: false,
            requiresConfirmation: true,
            status,
            code: verifyResult.code || 'INVALID_QUOTE',
            error: 'Cotação de licença adicional inválida ou expirada.',
        }
    }

    // Cotação válida!
    return { allowed: true, requiresConfirmation: false, status, quote: options.quote }
}

/**
 * Grava o evento imutável de aceite em `seat_billing_events` (P3 Prova de Aceite).
 * Trata idempotência estrita via idempotency_key UNIQUE.
 */
export async function commitSeatConsent(params: {
    clinicId: string
    actorUserId: string
    targetUserId?: string | null
    quote: SeatQuote
    idempotencyKey: string
    ipAddress?: string | null
    userAgent?: string | null
}): Promise<{ success: boolean; event: any; alreadyExisted?: boolean }> {
    const supabase = createServiceRoleClient()
    const {
        clinicId,
        actorUserId,
        targetUserId,
        quote,
        idempotencyKey,
        ipAddress,
        userAgent,
    } = params

    // 1. Verificar idempotência prévia
    const { data: existingEvent } = await (supabase
        .from('seat_billing_events') as any)
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()

    if (existingEvent) {
        return { success: true, event: existingEvent, alreadyExisted: true }
    }

    const eventRecord: SeatBillingEvent = {
        clinic_id: clinicId,
        actor_user_id: actorUserId,
        target_user_id: targetUserId || null,
        plan: quote.plan,
        included_seats: quote.included_seats,
        seats_before: quote.active_seats,
        seats_after: quote.seats_after,
        extra_seats_before: Math.max(0, quote.active_seats - (quote.included_seats ?? 0)),
        extra_seats_after: quote.extra_seats_after,
        unit_price_cents: quote.unit_price_cents,
        monthly_before_cents: quote.monthly_before_cents,
        monthly_after_cents: quote.monthly_after_cents,
        quote_id: quote.quote_id,
        idempotency_key: idempotencyKey,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        status: 'COMMITTED',
    }

    const { data: insertedEvent, error: insertError } = await (supabase
        .from('seat_billing_events') as any)
        .insert(eventRecord)
        .select('*')
        .single()

    if (insertError) {
        // Se bater concorrência na chave UNIQUE idempotency_key
        if (insertError.code === '23505') {
            const { data: retryEvent } = await (supabase
                .from('seat_billing_events') as any)
                .select('*')
                .eq('idempotency_key', idempotencyKey)
                .single()
            return { success: true, event: retryEvent, alreadyExisted: true }
        }
        console.error('[SeatLicensing] Erro ao gravar seat_billing_events:', insertError)
        throw new Error(`Falha ao registrar prova de aceite: ${insertError.message}`)
    }

    // 2. Gravar em audit_logs
    try {
        await (supabase.from('audit_logs') as any).insert({
            user_id: actorUserId,
            clinic_id: clinicId,
            action: 'SEAT_ADDITIONAL_LICENSE_COMMITTED',
            resource_type: 'SEAT_LICENSING',
            resource_id: insertedEvent.id,
            details: JSON.stringify({
                quote_id: quote.quote_id,
                seats_before: quote.active_seats,
                seats_after: quote.seats_after,
                delta_cents: quote.delta_cents,
                monthly_after_cents: quote.monthly_after_cents,
            }),
            ip_address: ipAddress || 'unknown',
            user_agent: userAgent || 'unknown',
        })
    } catch (auditErr) {
        console.warn('[SeatLicensing] Falha silenciosa ao registrar audit_log:', auditErr)
    }

    // 3. Notificar o proprietário da plataforma CliniGo (in-app + email executivo ao dono)
    try {
        const { notifyOwnerSeatAdded } = await import('@/lib/services/notifications/owner-payment-notification')
        if (typeof notifyOwnerSeatAdded === 'function') {
            await notifyOwnerSeatAdded({
                clinicId,
                actorUserId,
                quote,
            })
        }
    } catch (notifErr) {
        console.warn('[SeatLicensing] Falha silenciosa ao notificar dono:', notifErr)
    }

    return { success: true, event: insertedEvent, alreadyExisted: false }
}

/**
 * Transação compensatória: marca o evento como VOIDED se a criação do usuário falhar.
 */
export async function voidSeatEvent(
    idempotencyKeyOrEventId: string,
    reason?: string
): Promise<{ success: boolean }> {
    const supabase = createServiceRoleClient()

    const { error } = await (supabase
        .from('seat_billing_events') as any)
        .update({
            status: 'VOIDED',
            void_reason: reason || 'Rollback decorrente de falha na criacao do usuario',
            voided_at: new Date().toISOString(),
        })
        .or(`id.eq.${idempotencyKeyOrEventId},idempotency_key.eq.${idempotencyKeyOrEventId}`)

    if (error) {
        console.error('[SeatLicensing] Erro ao compensar evento VOIDED:', error)
        return { success: false }
    }

    return { success: true }
}

/**
 * Registro de avaliação em modo sombra (shadow) para inteligência e auditoria interna
 */
async function recordShadowEvaluation(params: {
    clinicId: string
    activeSeats: number
    seatsAfter: number
    plan: string
}) {
    try {
        const supabase = createServiceRoleClient()
        await (supabase.from('audit_logs') as any).insert({
            clinic_id: params.clinicId,
            action: 'SEAT_SHADOW_EVALUATION',
            resource_type: 'SEAT_LICENSING',
            resource_id: params.clinicId,
            details: JSON.stringify({
                plan: params.plan,
                active_seats: params.activeSeats,
                seats_after: params.seatsAfter,
                evaluated_at: new Date().toISOString(),
            }),
        })
    } catch {
        // Silencioso em modo sombra
    }
}
