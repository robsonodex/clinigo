import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/middlewares/auth'

export const dynamic = 'force-dynamic'

/**
 * SECURITY HELPER: Verifica se um DOCTOR não-coordenador tem acesso
 * ao paciente dono do documento (via appointments).
 * Retorna true se permitido, false se bloqueado.
 */
async function isDoctorAllowedForDocument(
    supabase: any,
    userId: string,
    patientId: string
): Promise<boolean> {
    // Verificar se é coordenador
    const { data: userFull } = await supabase
        .from('users')
        .select('is_coordinator')
        .eq('id', userId)
        .single()

    if ((userFull as any)?.is_coordinator) {
        return true // Coordenador tem acesso total na clínica
    }

    // Não-coordenador: verificar se tem appointment com este paciente
    const { data: doctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', userId)
        .single()

    if (!doctor) return false

    const { data: appointment } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', doctor.id)
        .eq('patient_id', patientId)
        .limit(1)
        .single()

    return !!appointment
}

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
        
        const user = authResult.user!
        const role = user.role
        const supabase = await createClient()

        const { id: documentId } = await props.params

        // Get document info first (include patient_id for security check)
        const { data: document } = await supabase
            .from('patient_documents')
            .select('file_url, uploaded_by, patient_id')
            .eq('id', documentId)
            .single() as { data: { file_url: string; uploaded_by: string; patient_id: string } | null }

        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        // Check permission (Admins can delete anything, others only their own)
        if (role !== 'CLINIC_ADMIN' && role !== 'SUPER_ADMIN' && document.uploaded_by !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // SECURITY: DOCTOR não-coordenador só pode deletar documentos dos seus pacientes
        if (role === 'DOCTOR') {
            const allowed = await isDoctorAllowedForDocument(supabase, user.id, document.patient_id)
            if (!allowed) {
                return NextResponse.json({ error: 'Acesso negado - documento não pertence aos seus pacientes' }, { status: 403 })
            }
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

        const user = authResult.user!
        const role = user.role
        const supabase = await createClient()
        const { id: documentId } = await props.params

        // SECURITY: Buscar o documento primeiro para verificar acesso
        const { data: existingDoc } = await supabase
            .from('patient_documents')
            .select('patient_id')
            .eq('id', documentId)
            .single() as { data: { patient_id: string } | null }

        if (!existingDoc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        // SECURITY: DOCTOR não-coordenador só pode editar documentos dos seus pacientes
        if (role === 'DOCTOR') {
            const allowed = await isDoctorAllowedForDocument(supabase, user!.id, existingDoc.patient_id)
            if (!allowed) {
                return NextResponse.json({ error: 'Acesso negado - documento não pertence aos seus pacientes' }, { status: 403 })
            }
        }

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
            .update(updates as any)
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
