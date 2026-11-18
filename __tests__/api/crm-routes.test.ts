/**
 * Suíte Unitária das Rotas CRM CliniGo (notes, automations, pipelines, pipeline-cards)
 * Valida isolamento multi-tenant (clinic_id), deduplicação de cards no funil e validações de entrada.
 * 100% determinística via mocks — zero gravação em banco real.
 */

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}

jest.mock('next-axiom', () => ({
    withAxiomRouteHandler: (handler: any) => (req: any, ctx: any) => {
        req.log = mockLogger
        return handler(req, ctx)
    },
    AxiomRequest: class {},
}))

jest.mock('next/server', () => {
    class MockNextRequest {
        url: string
        method: string
        private _bodyRaw: string
        private _headers: Map<string, string>
        nextUrl: URL

        constructor(url: string, init?: any) {
            this.url = url
            this.method = init?.method || 'GET'
            this._bodyRaw = typeof init?.body === 'string' ? init.body : JSON.stringify(init?.body || {})
            this._headers = new Map()
            this.nextUrl = new URL(url)
            if (init?.headers) {
                Object.entries(init.headers).forEach(([k, v]) => this._headers.set(k.toLowerCase(), String(v)))
            }
        }

        async json() {
            return this._bodyRaw ? JSON.parse(this._bodyRaw) : {}
        }

        get headers() {
            return {
                get: (name: string) => this._headers.get(name.toLowerCase()) || null,
            }
        }
    }

    return {
        NextRequest: MockNextRequest,
        NextResponse: {
            json: jest.fn().mockImplementation((body, init) => ({
                status: init?.status || 200,
                json: async () => body,
            })),
        },
        after: jest.fn(),
    }
})

let mockUserSupabase: any
let mockServiceSupabase: any

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(async () => mockUserSupabase),
    createServiceRoleClient: jest.fn(() => mockServiceSupabase),
}))

import { NextRequest } from 'next/server'
import {
    GET as getNotes,
    POST as createNote,
    PATCH as updateNote,
    DELETE as deleteNote,
} from '@/app/api/crm/notes/route'
import {
    PATCH as updateAutomation,
    DELETE as deleteAutomation,
} from '@/app/api/crm/automations/route'
import { GET as getPipelineDetail } from '@/app/api/crm/pipelines/[id]/route'
import { PATCH as moveCard } from '@/app/api/crm/pipeline-cards/[cardId]/move/route'
import { POST as createCard, DELETE as deleteCard } from '@/app/api/crm/pipeline-cards/route'

function createChain(resolvedValue: any) {
    const calls: Array<{ method: string; args: any[] }> = []
    const chain: any = {
        __calls: calls,
        select: jest.fn((...args) => { calls.push({ method: 'select', args }); return chain }),
        insert: jest.fn((...args) => { calls.push({ method: 'insert', args }); return chain }),
        update: jest.fn((...args) => { calls.push({ method: 'update', args }); return chain }),
        delete: jest.fn((...args) => { calls.push({ method: 'delete', args }); return chain }),
        eq: jest.fn((...args) => { calls.push({ method: 'eq', args }); return chain }),
        in: jest.fn((...args) => { calls.push({ method: 'in', args }); return chain }),
        is: jest.fn((...args) => { calls.push({ method: 'is', args }); return chain }),
        not: jest.fn((...args) => { calls.push({ method: 'not', args }); return chain }),
        order: jest.fn((...args) => { calls.push({ method: 'order', args }); return chain }),
        limit: jest.fn((...args) => { calls.push({ method: 'limit', args }); return chain }),
        single: jest.fn(async () => resolvedValue),
        maybeSingle: jest.fn(async () => resolvedValue),
        then: (resolve: any, reject: any) => Promise.resolve(resolvedValue).then(resolve, reject),
    }
    return chain
}

describe('CRM Routes - Segurança, Multi-Tenant e Deduplicação', () => {
    const CLINIC_ID = 'clinic-1111-2222-3333-444444444444'
    const USER_ID = 'user-aaaa-bbbb-cccc-dddddddddddd'

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('/api/crm/notes', () => {
        it('GET lista notas/tarefas filtradas por clinic_id sem fallback warning', async () => {
            const notesChain = createChain({
                data: [{ id: 'n1', content: 'Ligar para paciente', is_task: true, clinic_id: CLINIC_ID }],
                error: null,
            })
            const usersChain = createChain({ data: { clinic_id: CLINIC_ID }, error: null })

            mockUserSupabase = {
                auth: { getUser: jest.fn(async () => ({ data: { user: { id: USER_ID } }, error: null })) },
                from: jest.fn((table: string) => (table === 'users' ? usersChain : notesChain)),
            }

            const req = new NextRequest('http://localhost/api/crm/notes?tasks_only=true') as any
            const res = await getNotes(req)
            const body = await res.json()

            expect(res.status).toBe(200)
            expect(body.notes).toHaveLength(1)
            expect(notesChain.eq).toHaveBeenCalledWith('clinic_id', CLINIC_ID)
            expect(notesChain.eq).toHaveBeenCalledWith('is_task', true)
        })

        it('POST aceita tarefa geral sem patient_id e rejeita content vazio', async () => {
            const insertChain = createChain({
                data: { id: 'n2', content: 'Revisar retornos da semana', is_task: true, patient_id: null },
                error: null,
            })
            const usersChain = createChain({ data: { clinic_id: CLINIC_ID }, error: null })

            mockUserSupabase = {
                auth: { getUser: jest.fn(async () => ({ data: { user: { id: USER_ID } }, error: null })) },
                from: jest.fn((table: string) => (table === 'users' ? usersChain : insertChain)),
            }

            const emptyReq = new NextRequest('http://localhost/api/crm/notes', {
                method: 'POST',
                body: { content: '   ', is_task: true },
            }) as any
            const emptyRes = await createNote(emptyReq)
            expect(emptyRes.status).toBe(400)

            const validReq = new NextRequest('http://localhost/api/crm/notes', {
                method: 'POST',
                body: { content: 'Revisar retornos da semana', is_task: true, task_due_date: '' },
            }) as any
            const validRes = await createNote(validReq)
            const validBody = await validRes.json()

            expect(validRes.status).toBe(201)
            expect(validBody.note.id).toBe('n2')
            expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
                clinic_id: CLINIC_ID,
                patient_id: null,
                task_due_date: null,
                is_task: true,
            }))
        })

        it('PATCH impõe clinic_id estrito e converte complete_task em task_completed_at', async () => {
            const updateChain = createChain({
                data: { id: 'n1', task_completed_at: '2026-11-18T19:00:00.000Z' },
                error: null,
            })
            const usersChain = createChain({ data: { clinic_id: CLINIC_ID }, error: null })

            mockUserSupabase = {
                auth: { getUser: jest.fn(async () => ({ data: { user: { id: USER_ID } }, error: null })) },
                from: jest.fn((table: string) => (table === 'users' ? usersChain : updateChain)),
            }

            const req = new NextRequest('http://localhost/api/crm/notes', {
                method: 'PATCH',
                body: { id: 'n1', complete_task: true, clinic_id: 'outra-clinica-ataque' },
            }) as any
            const res = await updateNote(req)
            expect(res.status).toBe(200)
            expect(updateChain.eq).toHaveBeenCalledWith('id', 'n1')
            expect(updateChain.eq).toHaveBeenCalledWith('clinic_id', CLINIC_ID)
            const updatePayload = updateChain.update.mock.calls[0][0]
            expect(updatePayload.clinic_id).toBeUndefined()
            expect(updatePayload.task_completed_at).toBeTruthy()
        })

        it('DELETE exclui nota/tarefa com isolamento clinic_id', async () => {
            const deleteChain = createChain({ data: { id: 'n1' }, error: null })
            const usersChain = createChain({ data: { clinic_id: CLINIC_ID }, error: null })

            mockUserSupabase = {
                auth: { getUser: jest.fn(async () => ({ data: { user: { id: USER_ID } }, error: null })) },
                from: jest.fn((table: string) => (table === 'users' ? usersChain : deleteChain)),
            }

            const req = new NextRequest('http://localhost/api/crm/notes?id=n1', { method: 'DELETE' }) as any
            const res = await deleteNote(req)
            expect(res.status).toBe(200)
            expect(deleteChain.eq).toHaveBeenCalledWith('id', 'n1')
            expect(deleteChain.eq).toHaveBeenCalledWith('clinic_id', CLINIC_ID)
        })
    })

    describe('/api/crm/automations', () => {
        it('PATCH alterna is_active com filtro clinic_id e DELETE remove regra', async () => {
            const ruleChain = createChain({ data: { id: 'auto-1', is_active: false }, error: null })
            const usersChain = createChain({ data: { clinic_id: CLINIC_ID }, error: null })

            mockUserSupabase = {
                auth: { getUser: jest.fn(async () => ({ data: { user: { id: USER_ID } }, error: null })) },
                from: jest.fn((table: string) => (table === 'users' ? usersChain : ruleChain)),
            }

            const patchReq = new NextRequest('http://localhost/api/crm/automations', {
                method: 'PATCH',
                body: { id: 'auto-1', is_active: false },
            }) as any
            const patchRes = await updateAutomation(patchReq)
            expect(patchRes.status).toBe(200)
            expect(ruleChain.eq).toHaveBeenCalledWith('clinic_id', CLINIC_ID)

            const delReq = new NextRequest('http://localhost/api/crm/automations?id=auto-1', { method: 'DELETE' }) as any
            const delRes = await deleteAutomation(delReq)
            expect(delRes.status).toBe(200)
        })
    })

    describe('/api/crm/pipelines/[id] - Deduplicação e LTV via RPC', () => {
        it('não duplica paciente já persistido em crm_pipeline_cards e calcula LTV via RPC', async () => {
            mockUserSupabase = {
                auth: { getUser: jest.fn(async () => ({ data: { user: { id: USER_ID } }, error: null })) },
                from: jest.fn(() => createChain({ data: { clinic_id: CLINIC_ID, role: 'CLINIC_ADMIN' }, error: null })),
            }

            const pipeChain = createChain({
                data: { id: 'pipe-1', clinic_id: CLINIC_ID, name: 'Funil Padrão', is_default: true },
                error: null,
            })
            const stagesChain = createChain({
                data: [
                    { id: 'st-leads', pipeline_id: 'pipe-1', name: 'Leads', position: 0, color: '#94a3b8', is_won_stage: false, is_lost_stage: false },
                    { id: 'st-comp', pipeline_id: 'pipe-1', name: 'Compareceu', position: 2, color: '#34d399', is_won_stage: false, is_lost_stage: false },
                ],
                error: null,
            })
            const cardsChain = createChain({
                data: [
                    {
                        id: 'card-p1',
                        clinic_id: CLINIC_ID,
                        pipeline_id: 'pipe-1',
                        stage_id: 'st-comp',
                        patient_id: 'pat-1',
                        title: 'Paciente Fictício A',
                        value: 0,
                    },
                ],
                error: null,
            })

            mockServiceSupabase = {
                from: jest.fn((table: string) => {
                    if (table === 'crm_pipelines') return pipeChain
                    if (table === 'crm_pipeline_stages') return stagesChain
                    if (table === 'crm_pipeline_cards') return cardsChain
                    return createChain({ data: [], error: null })
                }),
                rpc: jest.fn(async () => ({
                    data: [
                        {
                            patient_id: 'pat-1',
                            full_name: 'Paciente Fictício A',
                            phone: null,
                            email: null,
                            completed_count: 0,
                            total_appointments: 0,
                            last_appointment: null,
                            doctor_name: 'Dr. Exemplo',
                            ltv: 450.5,
                        },
                        {
                            patient_id: 'pat-2',
                            full_name: 'Paciente Fictício B',
                            phone: null,
                            email: null,
                            completed_count: 1,
                            total_appointments: 1,
                            last_appointment: '2026-11-10',
                            doctor_name: 'Dra. Exemplo',
                            ltv: 300,
                        },
                    ],
                    error: null,
                })),
            }

            const req = new NextRequest('http://localhost/api/crm/pipelines/pipe-1', {
                headers: { 'x-clinic-id': CLINIC_ID, 'x-user-role': 'CLINIC_ADMIN' },
            }) as any
            const res = await getPipelineDetail(req, { params: Promise.resolve({ id: 'pipe-1' }) })
            const body = await res.json()

            expect(res.status).toBe(200)
            expect(mockServiceSupabase.rpc).toHaveBeenCalledWith('get_crm_patient_metrics', {
                p_clinic_id: CLINIC_ID,
                p_doctor_id: null,
            })
            // pat-1 foi movido para Compareceu e NÃO pode reaparecer em Leads
            const leadsStage = body.pipeline.stages.find((s: any) => s.id === 'st-leads')
            const compStage = body.pipeline.stages.find((s: any) => s.id === 'st-comp')
            expect(leadsStage.cards).toHaveLength(0)
            expect(compStage.cards).toHaveLength(2)
            expect(body.pipeline.total_cards).toBe(2)
            const pat1Card = compStage.cards.find((c: any) => c.patient_id === 'pat-1')
            expect(pat1Card.value).toBe(450.5)
        })
    })

    describe('/api/crm/pipeline-cards & move', () => {
        it('rejeita movimentação para etapa fora da clínica com 404', async () => {
            mockUserSupabase = {
                auth: { getUser: jest.fn(async () => ({ data: { user: { id: USER_ID } }, error: null })) },
                from: jest.fn(() => createChain({ data: { clinic_id: CLINIC_ID, role: 'CLINIC_ADMIN' }, error: null })),
            }
            mockServiceSupabase = {
                from: jest.fn(() => createChain({ data: null, error: null })),
            }

            const req = new NextRequest('http://localhost/api/crm/pipeline-cards/card-1/move', {
                method: 'PATCH',
                headers: { 'x-clinic-id': CLINIC_ID, 'x-user-role': 'CLINIC_ADMIN' },
                body: { stage_id: 'stage-outra-clinica' },
            }) as any
            const res = await moveCard(req, { params: Promise.resolve({ cardId: 'card-1' }) })
            expect(res.status).toBe(404)
        })

        it('POST cria cartão customizado validando etapa da clínica e DELETE exclui com clinic_id', async () => {
            mockUserSupabase = {
                auth: { getUser: jest.fn(async () => ({ data: { user: { id: USER_ID } }, error: null })) },
                from: jest.fn(() => createChain({ data: { clinic_id: CLINIC_ID, role: 'CLINIC_ADMIN' }, error: null })),
            }

            const stageChain = createChain({
                data: { id: 'st-1', pipeline_id: 'pipe-2', is_won_stage: false, is_lost_stage: false },
                error: null,
            })
            const cardChain = createChain({
                data: { id: 'card-new', title: 'Lead Fictício', clinic_id: CLINIC_ID, pipeline_id: 'pipe-2', stage_id: 'st-1' },
                error: null,
            })

            mockServiceSupabase = {
                from: jest.fn((table: string) => (table === 'crm_pipeline_stages' ? stageChain : cardChain)),
            }

            const postReq = new NextRequest('http://localhost/api/crm/pipeline-cards', {
                method: 'POST',
                headers: { 'x-clinic-id': CLINIC_ID, 'x-user-role': 'CLINIC_ADMIN' },
                body: { pipeline_id: 'pipe-2', stage_id: 'st-1', title: 'Lead Fictício', value: 1200 },
            }) as any
            const postRes = await createCard(postReq)
            expect(postRes.status).toBe(201)

            const delReq = new NextRequest('http://localhost/api/crm/pipeline-cards?id=card-new', {
                method: 'DELETE',
                headers: { 'x-clinic-id': CLINIC_ID, 'x-user-role': 'CLINIC_ADMIN' },
            }) as any
            const delRes = await deleteCard(delReq)
            expect(delRes.status).toBe(200)
        })
    })
})

