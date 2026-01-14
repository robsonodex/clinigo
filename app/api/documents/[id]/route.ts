import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// DELETE /api/documents/:id
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const documentId = params.id

        // Get document info first
        const { data: document } = await supabase
            .from('patient_documents')
            .select('file_url, uploaded_by')
            .eq('id', documentId)
            .single()

        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        // Check permission
        if (document.uploaded_by !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Delete from storage
        if (document.file_url) {
            const filePath = document.file_url.split('/').pop()
            if (filePath) {
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
