import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireRole, forbiddenResponse, unauthorizedResponse } from '@/lib/middlewares/auth'
import { log } from '@/lib/logger'
import { uploadDocumentSchema, listDocumentsQuerySchema } from '@/lib/validations/documents'
import { withRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/documents - List documents with filters
export async function GET(request: Request) {
    try {
        // Authorization: All medical staff can view documents
        const authResult = await requireRole(['DOCTOR', 'RECEPTIONIST', 'CLINIC_ADMIN', 'SUPER_ADMIN'])

        if (!authResult.authorized) {
            if (authResult.error?.includes('No valid session')) {
                return unauthorizedResponse(authResult.error)
            }
            return forbiddenResponse(authResult.error)
        }

        const { user } = authResult
        const supabase = await createClient()

        const { searchParams } = new URL(request.url)
        const queryParams = {
            patient_id: searchParams.get('patient_id') || undefined,
            category: searchParams.get('category') || undefined,
            search: searchParams.get('search') || undefined,
            page: searchParams.get('page') || undefined,
            limit: searchParams.get('limit') || undefined
        }

        // Validate query parameters with Zod
        const validationResult = listDocumentsQuerySchema.safeParse(queryParams)

        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Validation failed',
                details: validationResult.error.format()
            }, { status: 400 })
        }

        const { patient_id: patientId, category, search } = validationResult.data

        let query = supabase
            .from('patient_documents')
            .select(`
                id,
                patient_id,
                file_name,
                file_url,
                file_size,
                file_type,
                category,
                description,
                tags,
                created_at,
                patient:patients(id, full_name),
                uploaded_by_user:users!uploaded_by(name)
            `)
            .order('created_at', { ascending: false })
            .limit(50) // Limite de performance

        if (patientId) {
            query = query.eq('patient_id', patientId)
        }
        if (category) {
            query = query.eq('category', category)
        }
        if (search) {
            query = query.or(`file_name.ilike.%${search}%,description.ilike.%${search}%`)
        }

        const { data: documents, error } = await query

        if (error) {
            log.error('Error fetching documents', { error, userId: user.id })
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ documents })
    } catch (error) {
        log.error('Error in documents API', { error })
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST /api/documents - Create document record (file already uploaded to Supabase Storage)
export async function POST(request: Request) {
    try {
        // Authorization: All medical staff can upload documents
        const authResult = await requireRole(['DOCTOR', 'RECEPTIONIST', 'CLINIC_ADMIN', 'SUPER_ADMIN'])

        if (!authResult.authorized) {
            if (authResult.error?.includes('No valid session')) {
                return unauthorizedResponse(authResult.error)
            }
            return forbiddenResponse(authResult.error)
        }

        const { user } = authResult

        // Rate limiting: General API limit (100 req/min)
        const rateLimitResponse = await withRateLimit('api', user.id)
        if (rateLimitResponse) return rateLimitResponse

        const supabase = await createClient()

        const body = await request.json()

        // Validate request body with Zod
        const validationResult = uploadDocumentSchema.safeParse(body)

        if (!validationResult.success) {
            return NextResponse.json({
                error: 'Validation failed',
                details: validationResult.error.format()
            }, { status: 400 })
        }

        const {
            patient_id,
            file_name,
            file_url,
            file_size,
            file_type,
            category,
            description,
            tags
        } = validationResult.data

        const { data: document, error } = await supabase
            .from('patient_documents')
            .insert({
                patient_id,
                file_name,
                file_url,
                file_size,
                file_type,
                category,
                description,
                tags,
                uploaded_by: user.id
            } as any)
            .select()
            .single()

        if (error) {
            log.error('Error creating document', { error, userId: user.id })
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Audit log document upload
        log.audit(user.id, 'upload_document', {
            patient_id,
            file_name,
            category
        })

        return NextResponse.json({ success: true, document })
    } catch (error) {
        console.error('Error in documents API:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
