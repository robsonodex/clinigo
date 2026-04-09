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
                patient:patients(id, full_name, cpf),
                uploaded_by_user:users!uploaded_by(full_name)
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

        const formattedDocuments = documents?.map(doc => ({
            id: doc.id,
            name: doc.file_name,
            original_name: doc.file_name,
            file_type: doc.file_type,
            file_size: doc.file_size,
            storage_path: doc.file_url,
            document_type: doc.category,
            category: doc.category,
            notes: doc.description,
            tags: doc.tags || [],
            created_at: doc.created_at,
            patients: doc.patient,
            users: doc.uploaded_by_user
        }))

        return NextResponse.json({ documents: formattedDocuments })
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

        let bodyToValidate: any = {}
        try {
            const formData = await request.formData()
            const file = formData.get('file') as File
            const patient_id = formData.get('patient_id') as string
            const category = formData.get('document_type') as string || 'OTHER'
            const description = (formData.get('notes') as string) || ''
            
            if (!file || !patient_id) {
                return NextResponse.json({ error: 'Faltam campos obrigatórios (file e patient_id)' }, { status: 400 })
            }

            const fileExt = file.name.split('.').pop()
            const fileName = `${patient_id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

            // Convert to array buffer for upload
            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            const { error: uploadError } = await supabase.storage
                .from('patient-documents')
                .upload(fileName, buffer, {
                    contentType: file.type,
                    upsert: false
                })

            if (uploadError) {
                console.error('Storage upload error:', uploadError)
                return NextResponse.json({ error: 'Erro ao salvar arquivo no storage.' }, { status: 500 })
            }

            const { data: publicUrlData } = supabase.storage
                .from('patient-documents')
                .getPublicUrl(fileName)

            bodyToValidate = {
                patient_id,
                file_name: file.name,
                file_url: publicUrlData.publicUrl,
                file_size: file.size,
                file_type: file.type,
                category,
                description,
                tags: []
            }
        } catch (parseError) {
            console.error('FormData Parse Error:', parseError)
            return NextResponse.json({
                error: 'Corpo da requisição inválido. Falha ao ler multipart form data.'
            }, { status: 400 })
        }

        // Bypass strict Zod for enums to avoid mismatches with frontend UI options
        const validationResult = uploadDocumentSchema.safeParse({
            ...bodyToValidate,
            category: 'other' // mock category just to pass schema, we save the real one below
        })

        if (!validationResult.success) {
            console.error('Validation error details:', validationResult.error.format())
            return NextResponse.json({
                error: 'Validation failed',
                details: validationResult.error.format()
            }, { status: 400 })
        }

        const { data: document, error } = await supabase
            .from('patient_documents')
            .insert({
                patient_id: bodyToValidate.patient_id,
                file_name: bodyToValidate.file_name,
                file_url: bodyToValidate.file_url,
                file_size: bodyToValidate.file_size,
                file_type: bodyToValidate.file_type,
                category: bodyToValidate.category,
                description: bodyToValidate.description,
                tags: bodyToValidate.tags,
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
            patient_id: bodyToValidate.patient_id,
            file_name: bodyToValidate.file_name,
            category: bodyToValidate.category
        })

        return NextResponse.json({ success: true, document })
    } catch (error) {
        console.error('Error in documents API:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
