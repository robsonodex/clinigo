/**
 * Cache Service - CliniGo v3.0
 * 
 * Uses Upstash Redis for caching expensive queries
 * Fallback to in-memory if Redis not configured
 */

// Simple in-memory fallback cache
const memoryCache = new Map<string, { value: any; expires: number }>()

interface CacheOptions {
    ttl?: number  // Time to live in seconds
}

/**
 * Get Redis client or null if not configured
 */
function getRedisClient() {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
        return null
    }

    return {
        url,
        token,
        async get<T>(key: string): Promise<T | null> {
            try {
                const response = await fetch(`${url}/get/${key}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const data = await response.json()
                return data.result ? JSON.parse(data.result) : null
            } catch {
                return null
            }
        },
        async set(key: string, value: any, options?: { ex?: number }): Promise<void> {
            try {
                const body = options?.ex
                    ? ['SET', key, JSON.stringify(value), 'EX', options.ex.toString()]
                    : ['SET', key, JSON.stringify(value)]

                await fetch(url, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                })
            } catch (error) {
                console.error('[CACHE] Redis set error:', error)
            }
        },
        async del(key: string): Promise<void> {
            try {
                await fetch(`${url}/del/${key}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                })
            } catch (error) {
                console.error('[CACHE] Redis del error:', error)
            }
        }
    }
}

/**
 * Get from cache (Redis or memory fallback)
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
    const redis = getRedisClient()

    if (redis) {
        return redis.get<T>(key)
    }

    // Memory fallback
    const cached = memoryCache.get(key)
    if (cached) {
        if (cached.expires > Date.now()) {
            return cached.value as T
        }
        memoryCache.delete(key)
    }
    return null
}

/**
 * Set in cache (Redis or memory fallback)
 */
export async function cacheSet(
    key: string,
    value: any,
    options: CacheOptions = {}
): Promise<void> {
    const ttl = options.ttl || 300 // 5 minutes default
    const redis = getRedisClient()

    if (redis) {
        await redis.set(key, value, { ex: ttl })
        return
    }

    // Memory fallback
    memoryCache.set(key, {
        value,
        expires: Date.now() + ttl * 1000
    })
}

/**
 * Delete from cache
 */
export async function cacheDel(key: string): Promise<void> {
    const redis = getRedisClient()

    if (redis) {
        await redis.del(key)
        return
    }

    memoryCache.delete(key)
}

/**
 * Clear all cache with prefix
 */
export async function cacheClear(prefix: string): Promise<void> {
    // Memory cache
    for (const key of memoryCache.keys()) {
        if (key.startsWith(prefix)) {
            memoryCache.delete(key)
        }
    }
    // Note: Redis would require SCAN + DEL pattern
}

/**
 * Cached function wrapper
 */
export async function cached<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
): Promise<T> {
    const cachedValue = await cacheGet<T>(key)

    if (cachedValue !== null) {
        console.log(`[CACHE HIT] ${key}`)
        return cachedValue
    }

    console.log(`[CACHE MISS] ${key}`)
    const fresh = await fetcher()

    await cacheSet(key, fresh, options)

    return fresh
}

// Common cache key generators
export const CacheKeys = {
    slots: (doctorId: string, date: string) => `slots:${doctorId}:${date}`,
    doctor: (doctorId: string) => `doctor:${doctorId}`,
    clinic: (clinicId: string) => `clinic:${clinicId}`,
    dashboardStats: (clinicId: string) => `dashboard:${clinicId}`,
    patientHistory: (patientId: string) => `patient:${patientId}:history`
}

// Default TTLs in seconds
export const CacheTTL = {
    slots: 300,         // 5 minutes
    doctor: 3600,       // 1 hour
    clinic: 3600,       // 1 hour
    dashboardStats: 300, // 5 minutes
    patientHistory: 600  // 10 minutes
}
