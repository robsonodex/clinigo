import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/middlewares/auth'

export const dynamic = 'force-dynamic'

// DELETE /api/documents/:id
export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await requireRole(['DOCTOR', 'RECEPTIONIST', 'CLINIC_ADMIN', 'SUPER_ADMIN'])
        if (!authResult.authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        
        const { user, role } = authResult
        const supabase = await createClient()

        const { id: documentId } = await props.params

        // Get document info first
        const { data: document } = await supabase
            .from('patient_documents')
            .select('file_url, uploaded_by')
            .eq('id', documentId)
            .single()

        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        // Check permission (Admins can delete anything, others only their own)
        if (role !== 'CLINIC_ADMIN' && role !== 'SUPER_ADMIN' && document.uploaded_by !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Delete from storage
        if (document.file_url) {
            const fileNameMatch = document.file_url.match(/patient-documents\/(.*?)$/)
            if (fileNameMatch && fileNameMatch[1]) {
                const filePath = fileNameMatch[1]
                await supabase.storage.from('patient-documents').remove([filePath])
            }
        }

        // Delete from database
        const { error } = await supabase
            .from('patient_documents')
            .delete()
            .eq('id', documentId)

        if (error) {
            console.error('Error deleting document:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in delete document API:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// PATCH /api/documents/:id - Edit document
export async function PATCH(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await requireRole(['DOCTOR', 'RECEPTIONIST', 'CLINIC_ADMIN', 'SUPER_ADMIN'])
        if (!authResult.authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createClient()
        const { id: documentId } = await props.params
        const body = await request.json()

        const { name, category, document_type, description, tags, notes } = body

        const updates: any = {}
        if (name !== undefined) updates.file_name = name
        if (category !== undefined) updates.category = category
        if (document_type !== undefined) updates.file_type = document_type
        if (description !== undefined) updates.description = description
        if (tags !== undefined) updates.tags = tags
        if (notes !== undefined) updates.notes = notes

        const { data, error } = await supabase
            .from('patient_documents')
            .update(updates)
            .eq('id', documentId)
            .select()
            .single()

        if (error) {
            console.error('Error updating document:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, document: data })
    } catch (error) {
        console.error('Error in update document API:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
