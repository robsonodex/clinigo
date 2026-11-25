/**
 * @jest-environment node
 *
 * CLINIGO — Teste de Regressão: Resiliência de Evoluções e Perfil (Incidente Espaço Incluir)
 * Valida:
 * 1. POST /api/session-evolutions grava finalized_at e finalized_by quando finalize = true (Assinatura Simples)
 * 2. POST /api/session-evolutions preserva rascunho (sem finalized_at) quando finalize = false
 * 3. GET /api/profile usa getVerifiedUser (JWT local primeiro) sem falhar em oscilações de auth.getUser()
 */

jest.mock('next/server', () => {
    class MockNextRequest {
        url: string
        method: string
        private _body: string | null
        private _headers: Map<string, string>
        cookies = { getAll: () => [] }

        constructor(url: string, init?: any) {
            this.url = url
            this.method = init?.method || 'GET'
            this._body = init?.body || null
            this._headers = new Map()
            if (init?.headers) {
                Object.entries(init.headers).forEach(([k, v]) => this._headers.set(k.toLowerCase(), String(v)))
            }
        }

        get headers() {
            return { get: (k: string) => this._headers.get(k.toLowerCase()) || null }
        }

        async json() {
            return this._body ? JSON.parse(this._body) : {}
        }
    }

    return {
        NextRequest: MockNextRequest,
        NextResponse: {
            json: jest.fn((body: any, init?: any) => ({
                status: init?.status || 200,
                json: async () => body,
            })),
        },
    }
})

const mockGetVerifiedUser = jest.fn()
jest.mock('@/lib/auth/verify-token', () => ({
    getVerifiedUser: (...args: any[]) => mockGetVerifiedUser(...args),
}))

const mockSupabase = {
    auth: {
        getUser: jest.fn(),
    },
    from: jest.fn(),
}

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve(mockSupabase)),
    createServiceRoleClient: jest.fn(() => mockSupabase),
}))

import { NextRequest } from 'next/server'
import { POST as postSessionEvolution } from '@/app/api/session-evolutions/route'
import { GET as getProfile } from '@/app/api/profile/route'

describe('Resiliência de Salvamento de Evoluções e Carregamento de Perfil', () => {
    const therapistUser = {
        id: 'therapist-user-1',
        email: 'terapeuta@clinica.com.br',
        user_metadata: { role: 'DOCTOR', clinic_id: 'clinic-1' },
    }

    beforeEach(() => {
        jest.clearAllMocks()
        mockGetVerifiedUser.mockResolvedValue({ user: therapistUser, isLocal: true })
    })

    it('POST /api/session-evolutions grava finalized_at e finalized_by quando finalize = true', async () => {
        let insertedPayload: any = null

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: () => Promise.resolve({ data: { clinic_id: 'clinic-1' }, error: null }),
                        }),
                    }),
                }
            }
            if (table === 'session_evolutions') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                eq: () => ({
                                    eq: () => ({
                                        limit: () => Promise.resolve({ data: [], error: null }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                    insert: (payload: any) => {
                        insertedPayload = payload
                        return {
                            select: () => ({
                                single: () => Promise.resolve({ data: { id: 'ev-001', ...payload }, error: null }),
                            }),
                        }
                    },
                }
            }
            return {}
        })

        const req = new NextRequest('http://localhost:3000/api/session-evolutions', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: 'pat-1',
                doctor_id: 'doc-1',
                evolution_date: '2026-11-25',
                template_type: 'soap',
                subjective: 'Paciente participativo durante toda a sessão.',
                finalize: true,
            }),
        })

        const res = await postSessionEvolution(req as any)
        const body = await res.json()

        expect(res.status).toBe(201)
        expect(body.data.id).toBe('ev-001')
        expect(insertedPayload.finalized_by).toBe(therapistUser.id)
        expect(typeof insertedPayload.finalized_at).toBe('string')
        expect(insertedPayload.finalize).toBeUndefined()
    })

    it('POST /api/session-evolutions mantém rascunho sem finalized_at quando finalize = false', async () => {
        let insertedPayload: any = null

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: () => Promise.resolve({ data: { clinic_id: 'clinic-1' }, error: null }),
                        }),
                    }),
                }
            }
            if (table === 'session_evolutions') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                eq: () => ({
                                    eq: () => ({
                                        limit: () => Promise.resolve({ data: [], error: null }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                    insert: (payload: any) => {
                        insertedPayload = payload
                        return {
                            select: () => ({
                                single: () => Promise.resolve({ data: { id: 'ev-002', ...payload }, error: null }),
                            }),
                        }
                    },
                }
            }
            return {}
        })

        const req = new NextRequest('http://localhost:3000/api/session-evolutions', {
            method: 'POST',
            body: JSON.stringify({
                patient_id: 'pat-1',
                doctor_id: 'doc-1',
                evolution_date: '2026-11-25',
                template_type: 'soap',
                subjective: 'Rascunho inicial.',
                finalize: false,
            }),
        })

        const res = await postSessionEvolution(req as any)
        expect(res.status).toBe(201)
        expect(insertedPayload.finalized_at).toBeUndefined()
        expect(insertedPayload.finalized_by).toBeUndefined()
    })

    it('GET /api/profile resolve o perfil via getVerifiedUser local sem depender de auth.getUser()', async () => {
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: () =>
                                Promise.resolve({
                                    data: {
                                        id: therapistUser.id,
                                        email: therapistUser.email,
                                        full_name: 'Profissional Exemplo',
                                        role: 'DOCTOR',
                                        clinic_id: 'clinic-1',
                                        clinic: { id: 'clinic-1', name: 'Clínica Exemplo' },
                                        doctor: [{ crm: '12345', crm_state: 'SP', specialty: 'Nutricionista' }],
                                    },
                                    error: null,
                                }),
                        }),
                    }),
                }
            }
            return {}
        })

        const req = new NextRequest('http://localhost:3000/api/profile', { method: 'GET' })
        const res = await getProfile(req as any)
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.user.role).toBe('DOCTOR')
        expect(body.user.clinic.id).toBe('clinic-1')
        expect(mockSupabase.auth.getUser).not.toHaveBeenCalled()
    })
})

