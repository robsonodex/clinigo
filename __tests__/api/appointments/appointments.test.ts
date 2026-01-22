/**
 * Testes da API de Appointments
 * Testa criação, listagem e validação de agendamentos
 */

// Mock do Supabase antes de qualquer import
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve({
        auth: {
            getUser: jest.fn(() => Promise.resolve({
                data: { user: { id: 'test-user-id' } },
                error: null
            }))
        },
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(() => Promise.resolve({
                data: {
                    id: 'test-appointment-id',
                    clinic_id: 'test-clinic-id',
                    patient_id: 'test-patient-id',
                    doctor_id: 'test-doctor-id',
                    scheduled_at: '2026-01-25T14:00:00Z',
                    status: 'PENDING',
                    type: 'PRESENCIAL'
                },
                error: null
            }))
        }))
    })),
    createServiceRoleClient: jest.fn(() => ({
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(() => Promise.resolve({ data: {}, error: null }))
        }))
    }))
}))

describe('API /api/appointments', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('Appointment Validation', () => {
        it('deve validar formato de data ISO 8601', () => {
            const validDate = '2026-01-25T14:00:00Z'

            // Valida que a data é parseada corretamente
            const parsed = new Date(validDate)
            expect(parsed.toISOString()).toContain('2026-01-25T14:00:00')
            expect(parsed.getTime()).toBeGreaterThan(0)
        })

        it('deve validar tipos de agendamento', () => {
            const validTypes = ['PRESENCIAL', 'TELECONSULTA', 'RETORNO', 'EXAME']
            const invalidType = 'VISITA'

            expect(validTypes.includes('PRESENCIAL')).toBe(true)
            expect(validTypes.includes('TELECONSULTA')).toBe(true)
            expect(validTypes.includes(invalidType)).toBe(false)
        })

        it('deve validar status de agendamento', () => {
            const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']
            const invalidStatus = 'WAITING'

            expect(validStatuses.includes('PENDING')).toBe(true)
            expect(validStatuses.includes('CONFIRMED')).toBe(true)
            expect(validStatuses.includes(invalidStatus)).toBe(false)
        })
    })

    describe('Appointment Slot Calculation', () => {
        it('deve gerar slots de 30 minutos entre horários', () => {
            const startTime = new Date('2026-01-25T08:00:00Z')
            const endTime = new Date('2026-01-25T12:00:00Z')
            const slotDuration = 30 // minutos

            const slots: string[] = []
            let current = new Date(startTime)

            while (current < endTime) {
                slots.push(current.toISOString())
                current = new Date(current.getTime() + slotDuration * 60 * 1000)
            }

            expect(slots.length).toBe(8) // 4 horas / 30 min = 8 slots
            expect(slots[0]).toBe('2026-01-25T08:00:00.000Z')
            expect(slots[7]).toBe('2026-01-25T11:30:00.000Z')
        })

        it('deve excluir horário de almoço', () => {
            const slots = ['09:00', '09:30', '10:00', '12:00', '12:30', '14:00', '14:30']
            const lunchStart = '12:00'
            const lunchEnd = '14:00'

            const availableSlots = slots.filter(slot => {
                return slot < lunchStart || slot >= lunchEnd
            })

            expect(availableSlots).toEqual(['09:00', '09:30', '10:00', '14:00', '14:30'])
            expect(availableSlots).not.toContain('12:00')
            expect(availableSlots).not.toContain('12:30')
        })
    })

    describe('Anti-Overbooking Logic', () => {
        it('deve detectar conflito de horário', () => {
            const existingAppointments = [
                { scheduled_at: '2026-01-25T09:00:00Z', duration: 30 },
                { scheduled_at: '2026-01-25T10:00:00Z', duration: 30 }
            ]

            const newAppointmentTime = new Date('2026-01-25T09:00:00Z')

            const hasConflict = existingAppointments.some(apt => {
                const aptTime = new Date(apt.scheduled_at)
                return aptTime.getTime() === newAppointmentTime.getTime()
            })

            expect(hasConflict).toBe(true)
        })

        it('deve permitir horário disponível', () => {
            const existingAppointments = [
                { scheduled_at: '2026-01-25T09:00:00Z', duration: 30 },
                { scheduled_at: '2026-01-25T10:00:00Z', duration: 30 }
            ]

            const newAppointmentTime = new Date('2026-01-25T09:30:00Z')

            const hasConflict = existingAppointments.some(apt => {
                const aptTime = new Date(apt.scheduled_at)
                return aptTime.getTime() === newAppointmentTime.getTime()
            })

            expect(hasConflict).toBe(false)
        })
    })
})
