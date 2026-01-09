import { Ratelimit } from '@upstash/ratelimit'
import { getRedisClient } from './cache/redis-client'

// Rate limiters for different API categories
export const rateLimiters = {
    // General API: 100 requests per minute
    api: () => new Ratelimit({
        redis: getRedisClient(),
        limiter: Ratelimit.slidingWindow(100, '1 m'),
        analytics: true,
        prefix: 'ratelimit:api',
    }),

    // AI endpoints: 10 requests per minute (expensive)
    ai: () => new Ratelimit({
        redis: getRedisClient(),
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        analytics: true,
        prefix: 'ratelimit:ai',
    }),

    // Payment endpoints: 20 requests per minute
    payments: () => new Ratelimit({
        redis: getRedisClient(),
        limiter: Ratelimit.slidingWindow(20, '1 m'),
        analytics: true,
        prefix: 'ratelimit:payments',
    }),

    // Auth endpoints: 5 requests per minute (prevent brute force)
    auth: () => new Ratelimit({
        redis: getRedisClient(),
        limiter: Ratelimit.slidingWindow(5, '1 m'),
        analytics: true,
        prefix: 'ratelimit:auth',
    }),

    // Super Admin: 200 requests per minute (power user)
    superAdmin: () => new Ratelimit({
        redis: getRedisClient(),
        limiter: Ratelimit.slidingWindow(200, '1 m'),
        analytics: true,
        prefix: 'ratelimit:super',
    }),
}

export interface RateLimitResult {
    success: boolean
    remaining: number
    reset: number
    retryAfter?: number
}

/**
 * Check rate limit for a specific category
 * @param category - The rate limiter category
 * @param identifier - Unique identifier (user ID, IP, clinic ID)
 */
export async function checkRateLimit(
    category: keyof typeof rateLimiters,
    identifier: string
): Promise<RateLimitResult> {
    try {
        const limiter = rateLimiters[category]()
        const { success, remaining, reset } = await limiter.limit(identifier)

        if (!success) {
            const retryAfter = Math.ceil((reset - Date.now()) / 1000)
            console.warn(`🚫 Rate limit exceeded for ${category}:${identifier}`)
            return { success: false, remaining: 0, reset, retryAfter }
        }

        return { success: true, remaining, reset }
    } catch (error) {
        // If Redis fails, allow the request (fail-open)
        console.error('Rate limit check failed:', error)
        return { success: true, remaining: -1, reset: 0 }
    }
}

/**
 * Rate limit middleware helper for API routes
 */
export async function withRateLimit(
    category: keyof typeof rateLimiters,
    identifier: string
): Promise<Response | null> {
    const result = await checkRateLimit(category, identifier)

    if (!result.success) {
        return new Response(
            JSON.stringify({
                error: 'RATE_LIMIT_EXCEEDED',
                message: `Limite de requisições atingido. Tente novamente em ${result.retryAfter} segundos.`,
                retryAfter: result.retryAfter,
            }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': String(result.retryAfter),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(result.reset),
                },
            }
        )
    }

    return null // No rate limit hit, proceed with request
}
