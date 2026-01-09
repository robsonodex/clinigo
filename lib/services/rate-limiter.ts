/**
 * Rate Limiter Service (Upstash Redis)
 * Protects AI API from abuse and unlimited costs
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Create Redis client
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null

// AI Analysis Rate Limiter: 5 requests per minute per clinic
export const aiAnalysisLimiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 m'),
        analytics: true,
        prefix: 'ratelimit:ai',
    })
    : null

// Fallback in-memory limiter for development
const inMemoryLimiter = new Map<string, { count: number; resetAt: number }>()

export async function checkRateLimit(
    identifier: string,
    limit: number = 5,
    windowMs: number = 60000
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    // Use Upstash if available
    if (aiAnalysisLimiter) {
        const result = await aiAnalysisLimiter.limit(identifier)
        return {
            success: result.success,
            limit: result.limit,
            remaining: result.remaining,
            reset: result.reset,
        }
    }

    // Fallback to in-memory (development only)
    const now = Date.now()
    const record = inMemoryLimiter.get(identifier)

    if (!record || record.resetAt < now) {
        inMemoryLimiter.set(identifier, {
            count: 1,
            resetAt: now + windowMs,
        })
        return {
            success: true,
            limit,
            remaining: limit - 1,
            reset: now + windowMs,
        }
    }

    if (record.count >= limit) {
        return {
            success: false,
            limit,
            remaining: 0,
            reset: record.resetAt,
        }
    }

    record.count++
    return {
        success: true,
        limit,
        remaining: limit - record.count,
        reset: record.resetAt,
    }
}

