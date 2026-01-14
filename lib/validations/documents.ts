/**
 * Documents API Validation Schemas
 * Zod schemas for validating document operations
 */

import { z } from 'zod'

// Document Category Enum
export const DocumentCategoryEnum = z.enum([
    'exam',
    'report',
    'prescription',
    'certificate',
    'imaging',
    'lab_result',
    'other'
])

// File Type Enum (common medical document types)
export const FileTypeEnum = z.enum([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/dicom',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])

// Upload Document Schema
export const uploadDocumentSchema = z.object({
    patient_id: z.string().uuid('Invalid patient ID format'),
    file_name: z.string()
        .min(1, 'File name required')
        .max(255, 'File name too long'),
    file_url: z.string().url('Invalid file URL'),
    file_size: z.number()
        .int('File size must be integer')
        .positive('File size must be positive')
        .max(50 * 1024 * 1024, 'File size cannot exceed 50MB'),
    file_type: FileTypeEnum,
    category: DocumentCategoryEnum,
    description: z.string()
        .max(1000, 'Description too long')
        .optional(),
    tags: z.array(z.string().max(50, 'Tag too long'))
        .max(10, 'Maximum 10 tags allowed')
        .optional()
})

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>

// List Documents Query Schema
export const listDocumentsQuerySchema = z.object({
    patient_id: z.string().uuid('Invalid patient ID format').optional(),
    category: DocumentCategoryEnum.optional(),
    search: z.string()
        .max(100, 'Search term too long')
        .optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string()
        .regex(/^\d+$/)
        .transform(Number)
        .refine(val => val <= 100, 'Limit cannot exceed 100')
        .optional()
})

export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>

// Delete Document Schema
export const deleteDocumentSchema = z.object({
    document_id: z.string().uuid('Invalid document ID format'),
    reason: z.string()
        .min(10, 'Deletion reason must be at least 10 characters')
        .max(500, 'Deletion reason too long')
        .optional()
})

export type DeleteDocumentInput = z.infer<typeof deleteDocumentSchema>

// Update Document Schema
export const updateDocumentSchema = z.object({
    document_id: z.string().uuid('Invalid document ID format'),
    category: DocumentCategoryEnum.optional(),
    description: z.string().max(1000, 'Description too long').optional(),
    tags: z.array(z.string().max(50, 'Tag too long'))
        .max(10, 'Maximum 10 tags allowed')
        .optional()
})

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>
