/**
 * @jest-environment node
 */

jest.mock('next-axiom', () => ({
    withAxiomRouteHandler: (handler: any) => handler,
}))

jest.mock('next/server', () => {
    class MockNextResponse {
        status: number
        headers: Map<string, string>
        private body: unknown

        constructor(body: unknown, init?: { status?: number }) {
            this.body = body
            this.status = init?.status || 200
            this.headers = new Map()
        }

        async json() {
            return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
        }

        static json(body: unknown, init?: { status?: number }) {
            return new MockNextResponse(body, init)
        }
    }

    return {
        NextRequest: class {},
        NextResponse: MockNextResponse,
    }
})

const mockCookieFrom = jest.fn()
const mockAdminFrom = jest.fn()
const mockAdminRpc = jest.fn()
const mockRawAdminFrom = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() =>
        Promise.resolve({
            from: mockCookieFrom,
        })
    ),
    createServiceRoleClient: jest.fn(() => ({
        from: mockAdminFrom,
        rpc: mockAdminRpc,
    })),
}))

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        from: mockRawAdminFrom,
    })),
}))

const mockSendCancellationEmail = jest.fn()
jest.mock('@/lib/services/email', () => ({
    sendCancellationNoticeEmail: (...args: any[]) => mockSendCancellationEmail(...args),
    sendConfirmationEmail: jest.fn(),
    isEmailConfigured: jest.fn(() => true),
}))

jest.mock('@/lib/services/mail-service', () => ({
    sendMail: jest.fn(() => Promise.resolve()),
}))

jest.mock('@/lib/services/mercadopago', () => ({
    createRefund: jest.fn(),
    getPaymentStatus: jest.fn(),
    validateWebhookSignature: jest.fn(() => true),
    mapPaymentStatus: jest.fn(),
    mapPaymentMethod: jest.fn(),
}))

const mockIsMasterAdmin = jest.fn(() => Promise.resolve(true))
jest.mock('@/lib/super-admin-middleware', () => ({
    isMasterAdmin: (...args: any[]) => mockIsMasterAdmin(...args),
}))

import {
    recordAppointmentPatientQueue,
    updateQueueEmailDeliveryStatus,
} from '@/lib/services/appointment-notifications'
import { POST as cancelAppointmentV1 } from '@/app/api/appointments/[id]/cancel/route'
import { POST as cancelAppointmentV2 } from '@/app/api-v2/appointments/[id]/cancel/route'
import { POST as auditLogsPOST } from '@/app/api/audit-logs/route'
import { GET as analyticsGET } from '@/app/api/super-admin/analytics/route'
import { PlanNotificationService } from '@/lib/services/plan-notification'

function createChain(result: { data?: any; error?: any; count?: number | null }) {
    const chain: any = {
        select: jest.fn(() => chain),
        insert: jest.fn(() => chain),
        update: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        in: jest.fn(() => chain),
        gte: jest.fn(() => chain),
        lte: jest.fn(() => chain),
        lt: jest.fn(() => chain),
        order: jest.fn(() => chain),
        limit: jest.fn(() => chain),
        single: jest.fn(() => Promise.resolve(result)),
        maybeSingle: jest.fn(() => Promise.resolve(result)),
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
    }
    return chain
}

describe('PGRST204 Fix: notification_queue em vez de notifications para agendamentos', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('recordAppointmentPatientQueue insere apenas em notification_queue com constraints válidas', async () => {
        const insertSpy = jest.fn()
        const supabaseMock = {
            from: jest.fn((table: string) => {
                expect(table).toBe('notification_queue')
                return {
                    insert: (rows: any[]) => {
                        insertSpy(rows)
                        return {
                            select: () =>
                                Promise.resolve({
                                    data: [{ id: 'q-email-1', channel: 'email' }],
                                    error: null,
                                }),
                        }
                    },
                }
            }),
        }

        const { emailQueueId } = await recordAppointmentPatientQueue(supabaseMock, {
            clinicId: 'cli-1',
            appointmentId: 'apt-1',
            patientId: 'pat-1',
            patientName: 'Paciente Teste',
            patientEmail: 'paciente@exemplo.com',
            patientPhone: '5511999999999',
            eventType: 'CANCELLATION',
            subject: 'Consulta Cancelada',
            templateId: 'APPOINTMENT_CANCELLED',
        })

        expect(emailQueueId).toBe('q-email-1')
        expect(insertSpy).toHaveBeenCalledTimes(1)
        const insertedRows = insertSpy.mock.calls[0][0]
        expect(insertedRows).toHaveLength(2)

        const emailRow = insertedRows.find((r: any) => r.channel === 'email')
        const whatsappRow = insertedRows.find((r: any) => r.channel === 'whatsapp')

        expect(emailRow).toMatchObject({
            clinic_id: 'cli-1',
            appointment_id: 'apt-1',
            patient_id: 'pat-1',
            type: 'CANCELLATION',
            channel: 'email',
            status: 'PENDING',
            template_id: 'APPOINTMENT_CANCELLED',
        })
        expect(whatsappRow).toMatchObject({
            clinic_id: 'cli-1',
            appointment_id: 'apt-1',
            patient_id: 'pat-1',
            type: 'CANCELLATION',
            channel: 'whatsapp',
            status: 'CANCELLED',
            metadata: { manual_share: true },
        })
    })

    it('updateQueueEmailDeliveryStatus atualiza notification_queue por id para SENT/FAILED', async () => {
        const updateSpy = jest.fn()
        const eqSpy = jest.fn(() => Promise.resolve({ error: null }))
        const supabaseMock = {
            from: jest.fn((table: string) => {
                expect(table).toBe('notification_queue')
                return {
                    update: (payload: unknown) => {
                        updateSpy(payload)
                        return { eq: eqSpy }
                    },
                }
            }),
        }

        await updateQueueEmailDeliveryStatus(supabaseMock, 'q-email-1', true)
        expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'SENT' }))
        expect(eqSpy).toHaveBeenCalledWith('id', 'q-email-1')
    })

    it.each([
        ['v1', cancelAppointmentV1],
        ['v2', cancelAppointmentV2],
    ])('POST cancel (%s) nunca escreve em notifications e registra cancelamento em notification_queue', async (_label, handler) => {
        const touchedTables: string[] = []
        const queueUpdateSpy = jest.fn()

        mockCookieFrom.mockImplementation(() => createChain({ data: { clinic_id: 'cli-1' }, error: null }))
        mockAdminRpc.mockResolvedValue({ data: [{ can_cancel: true, eligible_for_refund: false }], error: null })
        mockSendCancellationEmail.mockResolvedValue(undefined)

        mockAdminFrom.mockImplementation((table: string) => {
            touchedTables.push(table)
            if (table === 'appointments') {
                return createChain({
                    data: {
                        id: 'apt-123',
                        clinic_id: 'cli-1',
                        patient_id: 'pat-123',
                        status: 'CONFIRMED',
                        appointment_date: '2026-11-20',
                        appointment_time: '10:00:00',
                        patient: {
                            id: 'pat-123',
                            full_name: 'Paciente Exemplo',
                            email: 'pac@exemplo.com',
                            phone: '11999990000',
                        },
                        doctor: { id: 'doc-1', clinic_id: 'cli-1', user: { id: 'u-doc', full_name: 'Dr. Modelo' } },
                        clinic: { id: 'cli-1', name: 'Clínica Exemplo', mercadopago_access_token: null },
                        payment: null,
                    },
                    error: null,
                })
            }
            if (table === 'notification_queue') {
                const chain = createChain({ data: [{ id: 'q-999', channel: 'email' }], error: null })
                chain.update = jest.fn((payload: unknown) => {
                    queueUpdateSpy(payload)
                    return chain
                })
                return chain
            }
            return createChain({ data: null, error: null })
        })

        const req = {
            json: async () => ({ cancellation_reason: 'Imprevisto do paciente' }),
            headers: { get: (h: string) => (h === 'x-user-id' ? 'u-admin' : h === 'x-user-role' ? 'CLINIC_ADMIN' : null) },
            log: { error: jest.fn() },
        } as any

        const res = await handler(req, { params: Promise.resolve({ id: 'apt-123' }) })
        expect(res.status).toBe(200)
        expect(touchedTables).not.toContain('notifications')
        expect(touchedTables).toContain('notification_queue')
        expect(queueUpdateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'SENT' }))
    })
})

describe('audit_logs_severity_check e PlanNotificationService metadata', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('POST /api/audit-logs normaliza severity para valores aceitos em minúsculas', async () => {
        const inserted: any[] = []
        mockCookieFrom.mockImplementation((table: string) => {
            expect(table).toBe('audit_logs')
            return {
                insert: (payload: unknown) => {
                    inserted.push(payload)
                    return Promise.resolve({ error: null })
                },
            }
        })

        for (const sev of ['low', 'INFO', 'CRITICAL', 'unknown_val']) {
            const req = {
                json: async () => ({ action: 'TEST', severity: sev }),
                log: { error: jest.fn() },
            } as any
            const res = await auditLogsPOST(req)
            expect(res.status).toBe(200)
        }

        expect(inserted.map((p) => p.severity)).toEqual(['info', 'info', 'critical', 'info'])
    })

    it('PlanNotificationService usa coluna metadata (não data) ao inserir em notifications', async () => {
        const notifInsertSpy = jest.fn(() => Promise.resolve({ error: null }))
        mockAdminFrom.mockImplementation((table: string) => {
            if (table === 'clinics') {
                return createChain({ data: { name: 'Clínica A', email: 'contato@clinica.com' }, error: null })
            }
            if (table === 'users') {
                return createChain({ data: { id: 'admin-1', email: 'admin@clinica.com', full_name: 'Admin' }, error: null })
            }
            if (table === 'notifications') {
                return { insert: notifInsertSpy }
            }
            return createChain({ data: null, error: null })
        })

        const svc = new PlanNotificationService()
        await svc.notifyPlanChange('cli-1', 'BASICO', 'PRO', 'UPGRADE')

        expect(notifInsertSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'admin-1',
                clinic_id: 'cli-1',
                metadata: expect.objectContaining({ previous_plan: 'BASICO', new_plan: 'PRO' }),
            })
        )
        const payload = notifInsertSpy.mock.calls[0][0]
        expect(payload).not.toHaveProperty('data')
    })
})

describe('GET /api/super-admin/analytics sem N+1 e usando estimated em consultations', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('consulta clinics e consultation_ai_analyses apenas 1 vez para 6 meses e usa count estimated', async () => {
        const tableCalls: Record<string, number> = {}
        const consultationCountModes: string[] = []

        mockRawAdminFrom.mockImplementation((table: string) => {
            tableCalls[table] = (tableCalls[table] || 0) + 1
            if (table === 'clinics') {
                return createChain({
                    data: [
                        {
                            id: 'c-1',
                            name: 'Clínica Alpha',
                            plan_type: 'PRO',
                            custom_price: null,
                            is_demo: false,
                            is_active: true,
                            created_at: '2026-01-10T00:00:00Z',
                        },
                    ],
                    error: null,
                })
            }
            if (table === 'consultation_ai_analyses') {
                return createChain({ data: [{ tokens_used: 1000, created_at: new Date().toISOString() }], error: null })
            }
            if (table === 'consultations') {
                return {
                    select: (_cols: string, opts?: { count?: string }) => {
                        if (opts?.count) consultationCountModes.push(opts.count)
                        const c = createChain({ data: null, count: 12, error: null })
                        return c
                    },
                }
            }
            return createChain({ data: null, error: null })
        })

        const req = {
            url: 'http://localhost:3000/api/super-admin/analytics?months=6',
            headers: { get: () => null },
            log: { error: jest.fn() },
        } as any

        const res = await analyticsGET(req)
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.monthly).toHaveLength(6)
        expect(tableCalls.clinics).toBe(1)
        expect(tableCalls.consultation_ai_analyses).toBe(1)
        expect(tableCalls.consultations).toBe(6)
        expect(consultationCountModes.every((m) => m === 'estimated')).toBe(true)
    })
})

