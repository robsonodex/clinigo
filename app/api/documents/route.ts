import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { processDocument } from '@/lib/services/ocr-service'

// GET: List documents
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const searchParams = request.nextUrl.searchParams
        const patientId = searchParams.get('patient_id')
        const documentType = searchParams.get('type')
        const search = searchParams.get('search')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = (page - 1) * limit

        let query = supabase
            .from('patient_documents')
            .select(`
        *,
        patients(full_name, cpf),
        users!uploaded_by(full_name)
      `, { count: 'exact' })
            .eq('clinic_id', clinicId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (patientId) {
            query = query.eq('patient_id', patientId)
        }

        if (documentType) {
            query = query.eq('document_type', documentType)
        }

        if (search) {
            // Use full-text search if available
            query = query.or(`name.ilike.%${search}%,ocr_text.ilike.%${search}%`)
        }

        const { data: documents, error, count } = await query

        if (error) {
            console.error('Documents fetch error:', error)
            return NextResponse.json({ error: 'Erro ao buscar documentos' }, { status: 500 })
        }

        return NextResponse.json({
            documents,
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        })
    } catch (error) {
        console.error('Documents error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Upload document
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File
        const patientId = formData.get('patient_id') as string
        const appointmentId = formData.get('appointment_id') as string | null
        const documentType = formData.get('document_type') as string | null
        const notes = formData.get('notes') as string | null
        const runOcr = formData.get('run_ocr') === 'true'

        if (!file) {
            return NextResponse.json({ error: 'Arquivo é obrigatório' }, { status: 400 })
        }

        if (!patientId) {
            return NextResponse.json({ error: 'Paciente é obrigatório' }, { status: 400 })
        }

        // Validate patient belongs to clinic
        const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('id', patientId)
            .eq('clinic_id', clinicId)
            .single()

        if (!patient) {
            return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
        }

        // Generate unique file path
        const fileExt = file.name.split('.').pop()
        const fileName = `${clinicId}/${patientId}/${Date.now()}.${fileExt}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('patient-documents')
            .upload(fileName, file, {
                contentType: file.type,
                upsert: false
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 })
        }

        // Process OCR if requested and file is an image
        let ocrResult = null
        let classification = documentType || 'other'

        if (runOcr && file.type.startsWith('image/')) {
            const arrayBuffer = await file.arrayBuffer()
            const base64 = Buffer.from(arrayBuffer).toString('base64')

            const result = await processDocument(base64, file.type)
            ocrResult = result

            if (result.ocr.success) {
                classification = result.classification
            }
        }

        // Insert document record
        const { data: document, error: insertError } = await supabase
            .from('patient_documents')
            .insert({
                clinic_id: clinicId,
                patient_id: patientId,
                appointment_id: appointmentId || null,
                name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
                original_name: file.name,
                file_type: file.type,
                file_size: file.size,
                storage_path: uploadData.path,
                storage_bucket: 'patient-documents',
                document_type: classification,
                notes: notes,
                ocr_status: runOcr ? (ocrResult?.ocr.success ? 'completed' : 'failed') : 'pending',
                ocr_text: ocrResult?.ocr.text || null,
                ocr_processed_at: runOcr ? new Date().toISOString() : null,
                ocr_provider: runOcr ? 'nvidia' : null,
                ocr_confidence: ocrResult?.ocr.confidence || null,
                icd_codes: ocrResult?.extractedData?.icdCodes || [],
                uploaded_by: user.id
            })
            .select()
            .single()

        if (insertError) {
            console.error('Insert error:', insertError)
            // Try to delete uploaded file
            await supabase.storage.from('patient-documents').remove([uploadData.path])
            return NextResponse.json({ error: 'Erro ao salvar documento' }, { status: 500 })
        }

        // Log access
        await supabase.from('document_access_log').insert({
            document_id: document.id,
            clinic_id: clinicId,
            user_id: user.id,
            action: 'UPLOAD',
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            user_agent: request.headers.get('user-agent')
        })

        return NextResponse.json({
            document,
            ocr: ocrResult?.ocr,
            extractedData: ocrResult?.extractedData
        })
    } catch (error) {
        console.error('Document upload error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
