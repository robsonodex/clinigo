/**
 * Motor CliniGo IA — Arquitetura Híbrida Custo Zero com Escudo LGPD Nativo
 *
 * Princípios invioláveis:
 * 1. Escudo LGPD obrigatório antes de qualquer chamada externa: nenhum nome de paciente,
 *    CPF, telefone, e-mail, carteirinha ou endereço sai do servidor.
 * 2. Roteamento inteligente em cascata gratuita:
 *    - Tarefas pesadas (high): Groq 120B -> Groq Qwen 27B -> Groq 20B -> OpenRouter Gemma 4 26B -> Cloudflare Workers AI -> OpenRouter Free -> Fallback Determinístico Local.
 *    - Tarefas rápidas (fast): Groq 20B -> Groq Qwen 27B -> Groq 120B -> Cloudflare Workers AI -> OpenRouter Gemma 4 26B -> OpenRouter Free -> Fallback Determinístico Local.
 * 3. Zero erro 500 ao usuário final: o fallback determinístico local garante 100% de disponibilidade.
 * 4. Cache por hash SHA-256 + proteção de cota diária por clínica + auditoria anonimizada.
 */

import crypto from 'crypto'
import { logAiAInteraction, type AiAInteractionType } from '@/lib/services/aia-audit'

export type AiTaskTier = 'high' | 'fast'

export interface LgpdShieldEntities {
    patientName?: string | null
    clinicName?: string | null
    guardianName?: string | null
    cpf?: string | null
    phone?: string | null
    email?: string | null
    cardNumber?: string | null
}

export interface ShieldResult {
    sanitizedText: string
    restoreMap: Array<{ token: string; value: string }>
    piiRemovedCount: number
}

export interface ClinigoAiTaskParams {
    clinicId: string
    userId: string
    patientId?: string
    consultationId?: string
    taskKey: string
    interactionType: AiAInteractionType
    tier: AiTaskTier
    systemPrompt: string
    userPrompt: string
    entities?: LgpdShieldEntities
    maxTokens?: number
    temperature?: number
    expectJson?: boolean
    buildLocalFallback: () => string
}

export interface ClinigoAiTaskResult {
    text: string
    provider: 'groq' | 'cloudflare' | 'openrouter' | 'local-fallback'
    model: string
    fromCache: boolean
    lgpdShielded: boolean
    piiRemovedCount: number
    latencyMs: number
    disclaimer: string
}

const DEFAULT_DISCLAIMER =
    'Conteúdo gerado por assistência tecnológica (CliniGo IA) com anonimização LGPD prévia. A revisão, validação clínica/técnica e responsabilidade final são exclusivas do profissional habilitado.'

const EMOJI_STRIP_REGEX = /[\p{Extended_Pictographic}]/gu

// Cache em memória (TTL 15 min, máximo 250 entradas)
const responseCache = new Map<
    string,
    { expiresAt: number; result: Omit<ClinigoAiTaskResult, 'fromCache' | 'latencyMs'> }
>()

// Controle de cota diária protetiva por clínica (evita abuso acidental em free tier)
const clinicDailyQuota = new Map<string, { dayKey: string; count: number }>()

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getTodayKey(): string {
    return new Date().toISOString().slice(0, 10)
}

function checkAndIncrementClinicQuota(clinicId: string): boolean {
    const limit = Number(process.env.CLINIGO_AI_DAILY_LIMIT_PER_CLINIC || 80)
    const today = getTodayKey()
    const current = clinicDailyQuota.get(clinicId)
    if (!current || current.dayKey !== today) {
        clinicDailyQuota.set(clinicId, { dayKey: today, count: 1 })
        return true
    }
    if (current.count >= limit) {
        return false
    }
    current.count += 1
    return true
}

/**
 * Escudo LGPD: substitui identificadores conhecidos por tokens neutros e remove padrões
 * de CPF, CNPJ, telefone, e-mail, CEP, endereço e carteirinha de qualquer texto livre.
 */
export function shieldPiiForAi(rawText: string, entities?: LgpdShieldEntities): ShieldResult {
    if (!rawText) {
        return { sanitizedText: '', restoreMap: [], piiRemovedCount: 0 }
    }

    let text = rawText
    let removed = 0
    const restoreMap: Array<{ token: string; value: string }> = []

    const replaceLiteral = (
        value: string | null | undefined,
        token: string,
        allowRestore: boolean,
        wholeWord = false
    ) => {
        const clean = (value || '').trim()
        if (clean.length < 2) return
        const pattern = wholeWord ? `\\b${escapeRegex(clean)}\\b` : escapeRegex(clean)
        const re = new RegExp(pattern, 'gi')
        if (re.test(text)) {
            text = text.replace(re, token)
            removed += 1
        }
        if (allowRestore) {
            restoreMap.push({ token, value: clean })
        }
    }

    const replaceNameParts = (value: string | null | undefined, token: string) => {
        const clean = (value || '').trim()
        if (!clean || !clean.includes(' ')) return
        const parts = clean.split(/\s+/).filter((p) => p.length >= 3)
        for (const part of parts) {
            const partRe = new RegExp(`\\b${escapeRegex(part)}\\b`, 'gi')
            if (partRe.test(text)) {
                text = text.replace(partRe, token)
                removed += 1
            }
        }
    }

    if (entities) {
        // 1. Nomes completos primeiro (evita que sobrenome compartilhado entre paciente e responsável quebre o match completo)
        replaceLiteral(entities.patientName, '[PACIENTE]', true)
        replaceLiteral(entities.guardianName, '[RESPONSAVEL]', true)
        replaceLiteral(entities.clinicName, '[CLINICA]', true)

        // 2. Partes isoladas (primeiro nome / sobrenomes >= 3 letras) para paciente e responsável
        replaceNameParts(entities.patientName, '[PACIENTE]')
        replaceNameParts(entities.guardianName, '[RESPONSAVEL]')

        // 3. Identificadores mais longos antes de sequências menores
        replaceLiteral(entities.cardNumber, '[CARTEIRINHA_PROTEGIDA]', false)
        replaceLiteral(entities.email, '[EMAIL_PROTEGIDO]', false)
        replaceLiteral(entities.phone, '[TELEFONE_PROTEGIDO]', false)
        replaceLiteral(entities.cpf, '[CPF_PROTEGIDO]', false)
        if (entities.cpf) {
            const digits = entities.cpf.replace(/\D/g, '')
            if (digits.length >= 9) replaceLiteral(digits, '[CPF_PROTEGIDO]', false, true)
        }
    }

    const regexRules: Array<[RegExp, string]> = [
        // Carteirinha numérica longa (12+ dígitos) antes do CPF para evitar match parcial
        [/\b\d{12,20}\b/g, '[CARTEIRINHA_PROTEGIDA]'],
        // CNPJ
        [/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[CNPJ_PROTEGIDO]'],
        // CPF formatado ou 11 dígitos isolados
        [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF_PROTEGIDO]'],
        // E-mail
        [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_PROTEGIDO]'],
        // Telefone BR
        [/(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}/g, '[TELEFONE_PROTEGIDO]'],
        // CEP
        [/\b\d{5}-\d{3}\b/g, '[CEP_PROTEGIDO]'],
        // Endereço em texto livre
        [/\b(?:rua|av\.?|avenida|alameda|travessa)\s+[A-Za-zÀ-ú0-9\s,.-]{4,60}/gi, '[ENDERECO_PROTEGIDO]'],
    ]

    for (const [pattern, replacement] of regexRules) {
        const matches = text.match(pattern)
        if (matches && matches.length > 0) {
            removed += matches.length
            text = text.replace(pattern, replacement)
        }
    }

    return { sanitizedText: text, restoreMap, piiRemovedCount: removed }
}

/**
 * Restaura apenas os tokens seguros ([PACIENTE], [CLINICA], [RESPONSAVEL]) localmente no servidor
 * e higieniza eventuais blocos de pensamento (<think>) ou emojis.
 */
export function restoreShieldedPii(
    rawOutput: string,
    restoreMap: Array<{ token: string; value: string }>,
    options?: { firstNameOnlyForPatient?: boolean }
): string {
    let output = (rawOutput || '')
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(EMOJI_STRIP_REGEX, '')
        .trim()

    for (const { token, value } of restoreMap) {
        const finalVal =
            token === '[PACIENTE]' && options?.firstNameOnlyForPatient
                ? value.split(/\s+/)[0] || value
                : value
        output = output.replace(new RegExp(escapeRegex(token), 'g'), finalVal)
    }

    return output.trim()
}

export function extractJsonFromAiText<T = Record<string, unknown>>(text: string): T | null {
    if (!text) return null
    const cleaned = text
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/```json\s*/gi, '')
        .replace(/```/g, '')
        .trim()

    try {
        return JSON.parse(cleaned) as T
    } catch {
        const start = cleaned.indexOf('{')
        const end = cleaned.lastIndexOf('}')
        if (start >= 0 && end > start) {
            try {
                return JSON.parse(cleaned.slice(start, end + 1)) as T
            } catch {
                return null
            }
        }
        return null
    }
}

interface ProviderAttempt {
    provider: 'groq' | 'cloudflare' | 'openrouter'
    model: string
}

export function getCascadePlan(tier: AiTaskTier): ProviderAttempt[] {
    if (tier === 'high') {
        return [
            { provider: 'groq', model: 'openai/gpt-oss-120b' },
            { provider: 'groq', model: 'qwen/qwen3.8-27b' },
            { provider: 'groq', model: 'openai/gpt-oss-20b' },
            { provider: 'openrouter', model: 'google/gemma-4-26b-a4b-it:free' },
            { provider: 'cloudflare', model: '@cf/meta/llama-3.1-8b-instruct-fast' },
            { provider: 'openrouter', model: 'openrouter/free' },
        ]
    }
    return [
        { provider: 'groq', model: 'openai/gpt-oss-20b' },
        { provider: 'groq', model: 'qwen/qwen3.8-27b' },
        { provider: 'groq', model: 'openai/gpt-oss-120b' },
        { provider: 'cloudflare', model: '@cf/meta/llama-3.1-8b-instruct-fast' },
        { provider: 'openrouter', model: 'google/gemma-4-26b-a4b-it:free' },
        { provider: 'openrouter', model: 'openrouter/free' },
    ]
}

async function callSingleProvider(
    attempt: ProviderAttempt,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
    temperature: number
): Promise<{ text: string; inputTokens: number; outputTokens: number; resolvedModel: string } | null> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 14_000)

    try {
        if (attempt.provider === 'groq') {
            const apiKey = process.env.GROQ_API_KEY?.trim()
            if (!apiKey) return null

            const body: Record<string, unknown> = {
                model: attempt.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                max_tokens: maxTokens,
                temperature,
            }
            if (attempt.model.startsWith('openai/gpt-oss')) {
                body.reasoning_effort = 'low'
            }

            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            })

            if (!res.ok) return null
            const data = await res.json()
            const content = String(data?.choices?.[0]?.message?.content || '')
                .replace(/<think>[\s\S]*?<\/think>/gi, '')
                .trim()
            if (!content) return null

            return {
                text: content,
                inputTokens: Number(data?.usage?.prompt_tokens || 0),
                outputTokens: Number(data?.usage?.completion_tokens || 0),
                resolvedModel: String(data?.model || attempt.model),
            }
        }

        if (attempt.provider === 'cloudflare') {
            const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim()
            const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
            if (!apiToken || !accountId) return null

            const res = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${attempt.model}`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${apiToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt },
                        ],
                        max_tokens: maxTokens,
                        temperature,
                    }),
                    signal: controller.signal,
                }
            )

            if (!res.ok) return null
            const data = await res.json()
            const content = String(data?.result?.response || '')
                .replace(/<think>[\s\S]*?<\/think>/gi, '')
                .trim()
            if (!content) return null

            return {
                text: content,
                inputTokens: 0,
                outputTokens: 0,
                resolvedModel: attempt.model,
            }
        }

        if (attempt.provider === 'openrouter') {
            const apiKey = process.env.OPENROUTER_API_KEY?.trim()
            if (!apiKey) return null

            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app',
                    'X-Title': 'CliniGo',
                },
                body: JSON.stringify({
                    model: attempt.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    max_tokens: maxTokens,
                    temperature,
                }),
                signal: controller.signal,
            })

            if (!res.ok) return null
            const data = await res.json()
            const content = String(data?.choices?.[0]?.message?.content || '')
                .replace(/<think>[\s\S]*?<\/think>/gi, '')
                .trim()
            if (!content) return null

            return {
                text: content,
                inputTokens: Number(data?.usage?.prompt_tokens || 0),
                outputTokens: Number(data?.usage?.completion_tokens || 0),
                resolvedModel: String(data?.model || attempt.model),
            }
        }

        return null
    } catch {
        return null
    } finally {
        clearTimeout(timeout)
    }
}

/**
 * Executa uma tarefa de IA do CliniGo com Escudo LGPD, cache, cascata gratuita
 * e fallback determinístico local garantido.
 */
export async function runClinigoAiTask(params: ClinigoAiTaskParams): Promise<ClinigoAiTaskResult> {
    const t0 = Date.now()
    const maxTokens = params.maxTokens ?? 900
    const temperature = params.temperature ?? 0.3

    // 1. Escudo LGPD obrigatório
    const shielded = shieldPiiForAi(params.userPrompt, params.entities)

    // 2. Checagem de cache determinístico (0 tokens gastos em cliques repetidos)
    const cacheKey = crypto
        .createHash('sha256')
        .update(`${params.clinicId}|${params.taskKey}|${params.tier}|${params.systemPrompt}|${shielded.sanitizedText}`)
        .digest('hex')

    const cached = responseCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
        return {
            ...cached.result,
            fromCache: true,
            latencyMs: Date.now() - t0,
        }
    }

    // 3. Cascata de provedores gratuitos (respeitando cota protetiva por clínica)
    const withinQuota = checkAndIncrementClinicQuota(params.clinicId)
    let resolvedProvider: ClinigoAiTaskResult['provider'] = 'local-fallback'
    let resolvedModel = 'clinigo-deterministic-v1'
    let rawOutput = ''
    let inputTokens = 0
    let outputTokens = 0

    if (withinQuota) {
        const plan = getCascadePlan(params.tier)
        for (const attempt of plan) {
            const res = await callSingleProvider(
                attempt,
                params.systemPrompt,
                shielded.sanitizedText,
                maxTokens,
                temperature
            )
            if (res && res.text) {
                if (params.expectJson && !extractJsonFromAiText(res.text)) {
                    continue
                }
                rawOutput = res.text
                resolvedProvider = attempt.provider
                resolvedModel = res.resolvedModel
                inputTokens = res.inputTokens
                outputTokens = res.outputTokens
                break
            }
        }
    }

    // 4. Fallback Determinístico Local (garantia de 100% de disponibilidade)
    if (!rawOutput) {
        rawOutput = params.buildLocalFallback()
        resolvedProvider = 'local-fallback'
        resolvedModel = 'clinigo-deterministic-v1'
    }

    // 5. Reidratação segura no servidor + limpeza de emojis
    const finalText = restoreShieldedPii(rawOutput, shielded.restoreMap, {
        firstNameOnlyForPatient: params.taskKey === 'family-bulletin',
    })

    const resultPayload: Omit<ClinigoAiTaskResult, 'fromCache' | 'latencyMs'> = {
        text: finalText,
        provider: resolvedProvider,
        model: resolvedModel,
        lgpdShielded: true,
        piiRemovedCount: shielded.piiRemovedCount,
        disclaimer: DEFAULT_DISCLAIMER,
    }

    // Salva em cache (máximo 250 chaves)
    if (responseCache.size >= 250) {
        const firstKey = responseCache.keys().next().value
        if (firstKey) responseCache.delete(firstKey)
    }
    responseCache.set(cacheKey, {
        expiresAt: Date.now() + 15 * 60 * 1000,
        result: resultPayload,
    })

    // 6. Auditoria assíncrona (armazena apenas conteúdo anonimizado — LGPD)
    void logAiAInteraction({
        clinicId: params.clinicId,
        doctorId: params.userId,
        patientId: params.patientId,
        consultationId: params.consultationId,
        type: params.interactionType,
        prompt: shielded.sanitizedText.slice(0, 4000),
        response: rawOutput.slice(0, 4000),
        model: `${resolvedProvider}:${resolvedModel}`,
        tokensUsed: {
            input: inputTokens,
            output: outputTokens,
            total: inputTokens + outputTokens,
        },
        estimatedCostBRL: 0,
        metadata: {
            taskKey: params.taskKey,
            tier: params.tier,
            piiRemovedCount: shielded.piiRemovedCount,
        },
    }).catch(() => {
        // Auditoria best-effort não interrompe resposta clínica
    })

    return {
        ...resultPayload,
        fromCache: false,
        latencyMs: Date.now() - t0,
    }
}

