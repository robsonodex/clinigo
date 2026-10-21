import { Redis } from '@upstash/redis'

// Singleton pattern for Redis client
let redis: Redis | null = null
let circuitBreakerUntil = 0

export function isRedisCircuitOpen(): boolean {
    return Date.now() < circuitBreakerUntil
}

export function recordRedisFailure(error?: any): void {
    const code = error?.cause?.code || error?.code || ''
    const msg = error?.message || ''
    // Abre o circuit breaker por 5 minutos para falhas de rede/DNS ou timeout
    circuitBreakerUntil = Date.now() + 5 * 60 * 1000
    console.warn(`[REDIS CIRCUIT BREAKER OPEN] Redis temporariamente desativado por 5m devido a falha: ${code || msg}. Usando fallback em memória (latência 0ms).`)
}

export function getRedisClient(): Redis {
    // Se o host for sabidamente inexistente ou o circuit breaker estiver aberto, usa fallback em memória
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token || url.includes('sound-alien-31491') || isRedisCircuitOpen()) {
        return createMockRedis()
    }

    if (!redis) {
        redis = new Redis({ url, token })
    }
    return redis
}

// Cache key generators
export const CacheKeys = {
    plan: (clinicId: string) => `plan:${clinicId}`,
    limits: (clinicId: string) => `limits:${clinicId}`,
    slots: (doctorId: string, date: string) => `slots:${doctorId}:${date}`,
    aiTokens: (clinicId: string) => `ai_tokens:${clinicId}`,
    session: (userId: string) => `session:${userId}`,
}

// TTLs in seconds
export const CacheTTL = {
    plan: 300,      // 5 minutes
    limits: 60,     // 1 minute  
    slots: 600,     // 10 minutes
    aiTokens: 3600, // 1 hour
    session: 1800,  // 30 minutes
}

// In-memory fallback for development
function createMockRedis(): Redis {
    const store = new Map<string, { value: unknown; expiry: number | null }>()

    return {
        get: async <T>(key: string): Promise<T | null> => {
            const item = store.get(key)
            if (!item) return null
            if (item.expiry && Date.now() > item.expiry) {
                store.delete(key)
                return null
            }
            return item.value as T
        },
        set: async (key: string, value: unknown, opts?: { ex?: number }) => {
            const expiry = opts?.ex ? Date.now() + opts.ex * 1000 : null
            store.set(key, { value, expiry })
            return 'OK'
        },
        del: async (...keys: string[]) => {
            keys.forEach(key => store.delete(key))
            return keys.length
        },
        incr: async (key: string) => {
            const current = (store.get(key)?.value as number) || 0
            store.set(key, { value: current + 1, expiry: null })
            return current + 1
        },
        expire: async (key: string, seconds: number) => {
            const item = store.get(key)
            if (item) {
                item.expiry = Date.now() + seconds * 1000
                return 1
            }
            return 0
        },
    } as unknown as Redis
}

export { redis }
