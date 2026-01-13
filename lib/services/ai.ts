import { logAiAInteraction, AiAInteractionType } from './aia-audit'

/**
 * OpenRouter AI Service
 * Uses Xiaomi Mimo v2 Flash (Free) via OpenRouter
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL_NAME = 'xiaomi/mimo-v2-flash:free'

interface OpenRouterMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
    reasoning_details?: any
}

interface GenerateOptions {
    clinicId: string
    doctorId: string
    patientId?: string
    consultationId?: string
    interactionType: AiAInteractionType
    systemPrompt?: string
    temperature?: number
    reasoning?: boolean
}

export async function generateAIResponse(
    prompt: string,
    options: GenerateOptions,
    previousMessages: OpenRouterMessage[] = []
): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY not configured')
    }

    const messages: OpenRouterMessage[] = []

    if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt })
    }

    // Add previous history
    messages.push(...previousMessages)

    // Add current prompt
    messages.push({ role: 'user', content: prompt })

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app', // Required by OpenRouter
                'X-Title': 'CliniGo' // Required by OpenRouter
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: messages,
                temperature: options.temperature || 0.7,
                reasoning: options.reasoning ? { enabled: true } : undefined
            })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(`OpenRouter API Error: ${error.error?.message || response.statusText}`)
        }

        const result = await response.json()
        const choice = result.choices[0]
        const content = choice.message.content
        const reasoningDetails = choice.message.reasoning_details

        // Log for audit
        await logAiAInteraction({
            clinicId: options.clinicId,
            doctorId: options.doctorId,
            patientId: options.patientId,
            consultationId: options.consultationId,
            type: options.interactionType,
            prompt: prompt,
            response: content,
            model: MODEL_NAME,
            tokensUsed: {
                input: result.usage?.prompt_tokens || 0,
                output: result.usage?.completion_tokens || 0,
                total: result.usage?.total_tokens || 0
            },
            estimatedCostBRL: 0, // It's free model
            metadata: {
                reasoning_details: reasoningDetails
            }
        })

        return content

    } catch (error) {
        console.error('AI Generation Error:', error)
        throw error
    }
}

/**
 * Helper for multi-turn conversations preserving reasoning
 */
export async function continueConversation(
    messages: OpenRouterMessage[],
    options: GenerateOptions
): Promise<{ content: string; messages: OpenRouterMessage[] }> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY not configured')
    }

    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app',
            'X-Title': 'CliniGo'
        },
        body: JSON.stringify({
            model: MODEL_NAME,
            messages: messages,
            reasoning: { enabled: true }
        })
    })

    const result = await response.json()
    const choice = result.choices[0]

    // Create message object to preserve (including reasoning_details)
    const assistantMessage: OpenRouterMessage = {
        role: 'assistant',
        content: choice.message.content,
        reasoning_details: choice.message.reasoning_details // Preserve this!
    }

    // Log audit
    await logAiAInteraction({
        clinicId: options.clinicId,
        doctorId: options.doctorId,
        type: options.interactionType,
        prompt: messages[messages.length - 1].content,
        response: assistantMessage.content,
        model: MODEL_NAME,
        tokensUsed: {
            input: result.usage?.prompt_tokens || 0,
            output: result.usage?.completion_tokens || 0,
            total: result.usage?.total_tokens || 0
        },
        estimatedCostBRL: 0
    })

    return {
        content: assistantMessage.content,
        messages: [...messages, assistantMessage]
    }
}
