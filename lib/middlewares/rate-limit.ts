/**
 * Rate Limiting Middleware
 * Uses Upstash Redis for distributed rate limiting
 * 
 * Required environment variables:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */
import { NextRequest, NextResponse } from 'next/server'

// Rate limit configuration
const RATE_LIMIT_REQUESTS = 10 // requests allowed
const RATE_LIMIT_WINDOW = 60 // seconds

interface RateLimitResult {
    success: boolean
    limit: number
    remaining: number
    reset: number
}

/**
 * Simple in-memory rate limiter fallback (for when Redis is unavailable)
 */
const inMemoryStore = new Map<string, { count: number; resetAt: number }>()

function inMemoryRateLimit(identifier: string): RateLimitResult {
    const now = Date.now()
    const record = inMemoryStore.get(identifier)

    if (!record || now > record.resetAt) {
        // Create new window
        inMemoryStore.set(identifier, {
            count: 1,
            resetAt: now + RATE_LIMIT_WINDOW * 1000,
        })
        return {
            success: true,
            limit: RATE_LIMIT_REQUESTS,
            remaining: RATE_LIMIT_REQUESTS - 1,
            reset: Math.floor((now + RATE_LIMIT_WINDOW * 1000) / 1000),
        }
    }

    record.count++

    if (record.count > RATE_LIMIT_REQUESTS) {
        return {
            success: false,
            limit: RATE_LIMIT_REQUESTS,
            remaining: 0,
            reset: Math.floor(record.resetAt / 1000),
        }
    }

    return {
        success: true,
        limit: RATE_LIMIT_REQUESTS,
        remaining: RATE_LIMIT_REQUESTS - record.count,
        reset: Math.floor(record.resetAt / 1000),
    }
}

/**
 * Upstash Redis rate limiter
 */
async function upstashRateLimit(identifier: string): Promise<RateLimitResult> {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
        // Fall back to in-memory if Upstash not configured
        console.warn('[RateLimit] Upstash not configured, using in-memory fallback')
        return inMemoryRateLimit(identifier)
    }

    const key = `rate_limit:${identifier}`
    const now = Date.now()
    const windowStart = now - RATE_LIMIT_WINDOW * 1000

    try {
        // Use sliding window with sorted set
        // 1. Remove old entries
        // 2. Add current request
        // 3. Count entries in window
        const pipeline = [
            ['ZREMRANGEBYSCORE', key, '0', String(windowStart)],
            ['ZADD', key, String(now), `${now}-${Math.random()}`],
            ['ZCARD', key],
            ['EXPIRE', key, String(RATE_LIMIT_WINDOW * 2)],
        ]

        const response = await fetch(`${url}/pipeline`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pipeline),
        })

        if (!response.ok) {
            console.error('[RateLimit] Upstash request failed:', response.status)
            return inMemoryRateLimit(identifier)
        }

        const results = await response.json()
        const count = results[2]?.result || 0

        const success = count <= RATE_LIMIT_REQUESTS

        return {
            success,
            limit: RATE_LIMIT_REQUESTS,
            remaining: Math.max(0, RATE_LIMIT_REQUESTS - count),
            reset: Math.floor((now + RATE_LIMIT_WINDOW * 1000) / 1000),
        }
    } catch (error) {
        console.error('[RateLimit] Error:', error)
        // Fail open - allow request if Redis fails
        return inMemoryRateLimit(identifier)
    }
}

/**
 * Get client identifier from request
 */
function getClientIdentifier(request: NextRequest): string {
    // Try to get real IP from headers
    const forwardedFor = request.headers.get('x-forwarded-for')
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim()
    }

    const realIp = request.headers.get('x-real-ip')
    if (realIp) {
        return realIp
    }

    // Fallback to a fingerprint based on user-agent
    const userAgent = request.headers.get('user-agent') || 'unknown'
    return `ua:${userAgent.substring(0, 50)}`
}

/**
 * Rate limiting function for use in middleware or API routes
 */
export async function rateLimit(request: NextRequest): Promise<RateLimitResult> {
    const identifier = getClientIdentifier(request)
    const path = request.nextUrl.pathname

    // Create a unique key combining IP and endpoint
    const key = `${identifier}:${path}`

    return await upstashRateLimit(key)
}

/**
 * Create rate limit response with proper headers
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: {
                message: 'Muitas requisições. Tente novamente em alguns segundos.',
                code: 'RATE_LIMIT_EXCEEDED',
            },
        },
        {
            status: 429,
            headers: {
                'X-RateLimit-Limit': String(result.limit),
                'X-RateLimit-Remaining': String(result.remaining),
                'X-RateLimit-Reset': String(result.reset),
                'Retry-After': String(Math.max(0, result.reset - Math.floor(Date.now() / 1000))),
            },
        }
    )
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
    response: NextResponse,
    result: RateLimitResult
): NextResponse {
    response.headers.set('X-RateLimit-Limit', String(result.limit))
    response.headers.set('X-RateLimit-Remaining', String(result.remaining))
    response.headers.set('X-RateLimit-Reset', String(result.reset))
    return response
}

