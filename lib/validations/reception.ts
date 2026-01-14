/**
 * Reception API Validation Schemas
 * Zod schemas for validating reception operations
 */

import { z } from 'zod'

// Urgency Level Enum
export const UrgencyLevelEnum = z.enum(['normal', 'priority', 'urgent'])

// Check-in Status Enum
export const CheckInStatusEnum = z.enum([
    'waiting',
    'triage',
    'in_service',
    'completed',
    'cancelled'
])

// Walk-in Registration Schema
export const walkInPatientSchema = z.object({
    patient_id: z.string().uuid('Invalid patient ID format'),
    doctor_id: z.string().uuid('Invalid doctor ID format').optional(),
    urgency_level: UrgencyLevelEnum.default('normal'),
    reason: z.string()
        .min(5, 'Reason must be at least 5 characters')
        .max(500, 'Reason too long')
        .optional(),
    notes: z.string().max(1000, 'Notes too long').optional()
})

export type WalkInPatientInput = z.infer<typeof walkInPatientSchema>

// Check-in Schema
export const checkInSchema = z.object({
    appointment_id: z.string().uuid('Invalid appointment ID format'),
    priority_level: z.number()
        .int('Priority level must be integer')
        .min(0, 'Priority level cannot be negative')
        .max(2, 'Priority level maximum is 2')
        .default(0),
    waiting_room_notes: z.string().max(500, 'Notes too long').optional(),
    ticket_number: z.string()
        .max(20, 'Ticket number too long')
        .optional()
})

export type CheckInInput = z.infer<typeof checkInSchema>

// Update Walk-in Status Schema
export const updateWalkInStatusSchema = z.object({
    walk_in_id: z.string().uuid('Invalid walk-in ID format'),
    status: CheckInStatusEnum,
    notes: z.string().max(1000, 'Notes too long').optional()
})

export type UpdateWalkInStatusInput = z.infer<typeof updateWalkInStatusSchema>

// Set Priority Schema
export const setPrioritySchema = z.object({
    appointment_id: z.string().uuid('Invalid appointment ID format'),
    priority_level: z.number()
        .int('Priority level must be integer')
        .min(0, 'Priority level cannot be negative')
        .max(2, 'Priority level: 0=Normal, 1=Priority, 2=Urgent'),
    reason: z.string()
        .min(5, 'Priority reason required')
        .max(200, 'Reason too long')
})

export type SetPriorityInput = z.infer<typeof setPrioritySchema>

// Reception Queue Query Schema
export const receptionQueueQuerySchema = z.object({
    status: CheckInStatusEnum.optional(),
    date: z.string().date().optional(),
    doctor_id: z.string().uuid('Invalid doctor ID format').optional()
})

export type ReceptionQueueQuery = z.infer<typeof receptionQueueQuerySchema>
