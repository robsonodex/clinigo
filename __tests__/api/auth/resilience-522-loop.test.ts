/**
 * @jest-environment node
 */

jest.mock('next-axiom', () => ({
    Logger: class MockLogger {
        error = jest.fn()
        warn = jest.fn()
        info = jest.fn()
        flush = jest.fn().mockResolvedValue(undefined)
    },
    withAxiomRouteHandler: (handler: any) => handler,
}))

const mockSignInWithPassword = jest.fn()
const mockCookieStore = {
    getAll: jest.fn(() => []),
    set: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
}

jest.mock('next/headers', () => ({
    cookies: jest.fn(async () => mockCookieStore),
}))

jest.mock('@supabase/ssr', () => ({
    createServerClient: jest.fn(() => ({
        auth: {
            signInWithPassword: mockSignInWithPassword,
            signOut: jest.fn(),
        },
        from: jest.fn(),
    })),
}))

jest.mock('@/lib/services/single-session', () => ({
    registerSingleSession: jest.fn().mockResolvedValue({ sessionToken: 'tok-1' }),
    SESSION_COOKIE_NAME: 'clinigo_session',
    SESSION_COOKIE_OPTIONS: {},
}))

import { loggingFetch } from '@/lib/supabase-fetch'
import { POST as loginPOST } from '@/app/api/auth/login/route'

describe('Resiliência contra 522/HTML do Supabase e falha em /api/auth/login', () => {
    const originalFetch = global.fetch

    beforeEach(() => {
        jest.clearAllMocks()
    })

    afterEach(() => {
        global.fetch = originalFetch
    })

    it('loggingFetch converte resposta Cloudflare 522 HTML (<!DOCTYPE) em JSON válido', async () => {
        global.fetch = jest.fn().mockResolvedValue(
            new Response('<!DOCTYPE html><html><title>522: Connection timed out</title></html>', {
                status: 522,
                statusText: 'Connection Timed Out',
                headers: { 'content-type': 'text/html; charset=UTF-8' },
            })
        ) as any

        const res = await loggingFetch('https://dlxakeejmyzhzdxzjgne.supabase.co/auth/v1/user')
        expect(res.status).toBe(522)
        expect(res.headers.get('content-type')).toContain('application/json')

        const body = await res.json()
        expect(body.code).toBe('supabase_gateway_timeout')
        expect(body.status).toBe(522)
    })

    it('loggingFetch converte HeadersTimeoutError em Response 504 JSON sem crashar', async () => {
        const timeoutErr: any = new TypeError('fetch failed')
        timeoutErr.cause = { code: 'UND_ERR_HEADERS_TIMEOUT' }
        global.fetch = jest.fn().mockRejectedValue(timeoutErr) as any

        const res = await loggingFetch('https://dlxakeejmyzhzdxzjgne.supabase.co/auth/v1/user')
        expect(res.status).toBe(504)
        const body = await res.json()
        expect(body.code).toBe('supabase_gateway_timeout')
    })

    it('POST /api/auth/login retorna 503 DATABASE_UNAVAILABLE quando Supabase retorna AuthUnknownError/522', async () => {
        mockSignInWithPassword.mockResolvedValue({
            data: { user: null, session: null },
            error: {
                name: 'AuthUnknownError',
                message: 'Unexpected token \'<\', "<!DOCTYPE "... is not valid JSON',
                status: undefined,
                __isAuthError: true,
            },
        })

        const req = new Request('https://clinigo.app/api/auth/login', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: 'admin@clinica.com', password: 'SecretPassword123' }),
        }) as any

        const res = await loginPOST(req)
        const json = await res.json()

        expect(res.status).toBe(503)
        expect(json.success).toBe(false)
        expect(json.error.code).toBe('DATABASE_UNAVAILABLE')
    })

    it('POST /api/auth/login mantém 401 INVALID_CREDENTIALS quando senha está realmente errada', async () => {
        mockSignInWithPassword.mockResolvedValue({
            data: { user: null, session: null },
            error: {
                name: 'AuthApiError',
                code: 'invalid_credentials',
                message: 'Invalid login credentials',
                status: 400,
            },
        })

        const req = new Request('https://clinigo.app/api/auth/login', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: 'admin@clinica.com', password: 'WrongPassword' }),
        }) as any

        const res = await loginPOST(req)
        const json = await res.json()

        expect(res.status).toBe(401)
        expect(json.error.code).toBe('INVALID_CREDENTIALS')
    })

    it('POST /api/auth/login retorna 400 INVALID_JSON (e não 500) quando o body JSON é inválido', async () => {
        const req = new Request('https://clinigo.app/api/auth/login', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{invalid json',
        }) as any

        const res = await loginPOST(req)
        const json = await res.json()

        expect(res.status).toBe(400)
        expect(json.success).toBe(false)
        expect(json.error.code).toBe('INVALID_JSON')
    })
})

