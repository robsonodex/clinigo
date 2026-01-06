/**
 * Zod Validation Schemas for Doctors
 */
import { z } from 'zod'

const BRAZILIAN_STATES = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

/**
 * Create doctor schema
 */
export const createDoctorSchema = z.object({
    email: z
        .string()
        .email('Email inválido'),
    password: z
        .string()
        .min(8, 'Senha deve ter pelo menos 8 caracteres')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Senha deve conter letras maiúsculas, minúsculas e números'
        ),
    full_name: z
        .string()
        .min(3, 'Nome deve ter pelo menos 3 caracteres')
        .max(100, 'Nome muito longo'),
    crm: z
        .string()
        .min(4, 'CRM deve ter pelo menos 4 caracteres')
        .max(15, 'CRM muito longo'),
    crm_state: z
        .enum(BRAZILIAN_STATES, {
            errorMap: () => ({ message: 'Estado do CRM inválido' }),
        }),
    specialty: z
        .string()
        .min(3, 'Especialidade deve ter pelo menos 3 caracteres')
        .max(50, 'Especialidade muito longa'),
    consultation_price: z
        .number()
        .positive('Preço da consulta deve ser positivo')
        .max(10000, 'Preço muito alto'),
    bio: z
        .string()
        .max(1000, 'Biografia muito longa')
        .optional(),
})

/**
 * Update doctor schema
 */
export const updateDoctorSchema = z.object({
    full_name: z
        .string()
        .min(3)
        .max(100)
        .optional(),
    specialty: z
        .string()
        .min(3)
        .max(50)
        .optional(),
    consultation_price: z
        .number()
        .positive()
        .max(10000)
        .optional(),
    bio: z
        .string()
        .max(1000)
        .optional()
        .nullable(),
    is_accepting_appointments: z
        .boolean()
        .optional(),
    avatar_url: z
        .string()
        .url()
        .optional()
        .nullable(),
    phone: z
        .string()
        .regex(/^\d{10,11}$/)
        .optional()
        .nullable(),
})

/**
 * Single schedule entry schema
 */
export const scheduleEntrySchema = z.object({
    day_of_week: z
        .number()
        .int()
        .min(0, 'Dia da semana deve ser entre 0 (Domingo) e 6 (Sábado)')
        .max(6, 'Dia da semana deve ser entre 0 (Domingo) e 6 (Sábado)'),
    start_time: z
        .string()
        .regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM'),
    end_time: z
        .string()
        .regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM'),
    slot_duration_minutes: z
        .number()
        .int()
        .refine(
            (val) => [15, 30, 45, 60].includes(val),
            { message: 'Duração do slot deve ser 15, 30, 45 ou 60 minutos' }
        ),
})

/**
 * Update schedules schema (bulk update)
 */
export const updateSchedulesSchema = z
    .object({
        schedules: z
            .array(scheduleEntrySchema)
            .max(21, 'Máximo de 21 blocos de horário permitidos'), // 3 per day max
    })
    .refine(
        (data) => {
            // Validate that start_time < end_time for each schedule
            return data.schedules.every((schedule) => {
                const [startHours, startMinutes] = schedule.start_time.split(':').map(Number)
                const [endHours, endMinutes] = schedule.end_time.split(':').map(Number)
                const startTotal = startHours * 60 + startMinutes
                const endTotal = endHours * 60 + endMinutes
                return startTotal < endTotal
            })
        },
        {
            message: 'Hora de início deve ser anterior à hora de término',
            path: ['schedules'],
        }
    )
    .refine(
        (data) => {
            // Check for overlapping schedules on the same day
            const byDay: Record<number, Array<{ start: number; end: number }>> = {}

            for (const schedule of data.schedules) {
                const [startHours, startMinutes] = schedule.start_time.split(':').map(Number)
                const [endHours, endMinutes] = schedule.end_time.split(':').map(Number)
                const startTotal = startHours * 60 + startMinutes
                const endTotal = endHours * 60 + endMinutes

                if (!byDay[schedule.day_of_week]) {
                    byDay[schedule.day_of_week] = []
                }

                // Check for overlap with existing schedules on this day
                for (const existing of byDay[schedule.day_of_week]) {
                    if (startTotal < existing.end && endTotal > existing.start) {
                        return false
                    }
                }

                byDay[schedule.day_of_week].push({ start: startTotal, end: endTotal })
            }

            return true
        },
        {
            message: 'Horários não podem se sobrepor no mesmo dia',
            path: ['schedules'],
        }
    )

/**
 * List doctors query schema
 */
export const listDoctorsQuerySchema = z.object({
    clinic_slug: z.string().optional(),
    clinic_id: z.string().uuid().optional(),
    specialty: z.string().optional(),
    is_accepting: z
        .string()
        .transform((val) => val === 'true')
        .optional(),
    page: z
        .string()
        .regex(/^\d+$/)
        .transform(Number)
        .optional(),
    pageSize: z
        .string()
        .regex(/^\d+$/)
        .transform(Number)
        .optional(),
})

// Type exports
export type CreateDoctorInput = z.infer<typeof createDoctorSchema>
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>
export type ScheduleEntry = z.infer<typeof scheduleEntrySchema>
export type UpdateSchedulesInput = z.infer<typeof updateSchedulesSchema>
export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>
