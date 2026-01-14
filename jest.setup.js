import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter() {
        return {
            push: jest.fn(),
            replace: jest.fn(),
            prefetch: jest.fn(),
        }
    },
    useSearchParams() {
        return new URLSearchParams()
    },
    usePathname() {
        return '/'
    },
}))

// Mock Supabase with complete auth and query builders
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => ({
        auth: {
            getUser: jest.fn(() => Promise.resolve({
                data: { user: { id: 'test-user-id', email: 'test@test.com' } },
                error: null
            }))
        },
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    single: jest.fn(() => Promise.resolve({
                        data: { role: 'CLINIC_ADMIN', clinic_id: 'test-clinic-id' },
                        error: null
                    }))
                }))
            })),
            insert: jest.fn(() => ({
                select: jest.fn(() => ({
                    single: jest.fn(() => Promise.resolve({
                        data: { id: 'test-id' },
                        error: null
                    }))
                }))
            }))
        }))
    }))
}))

// Mock logger with complete interface
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
    log: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        audit: jest.fn(),
    }
}))

// Mock rate limiting (always allow in tests)
jest.mock('@/lib/rate-limit', () => ({
    withRateLimit: jest.fn(() => Promise.resolve(null)),
    checkRateLimit: jest.fn(() => Promise.resolve({ success: true, remaining: 100, reset: 0 }))
}))
