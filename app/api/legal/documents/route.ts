import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List legal documents
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

        const { data: docs, error } = await supabase
            .from('legal_documents')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching legal documents:', error)
            return NextResponse.json({ error: 'Erro ao buscar documentos' }, { status: 500 })
        }

        return NextResponse.json({ documents: docs })

    } catch (error) {
        console.error('Legal docs error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Create or Update legal document
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

        const body = await request.json()
        const { id, type, title, description, content, status, is_required } = body

        if (!type || !title) {
            return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
        }

        // Check if document exists for this type and clinic
        const checkQuery = supabase
            .from('legal_documents')
            .select('*')
            .eq('clinic_id', clinicId)
            .eq('type', type)

        // If ID provided, ensure we match it (update)
        // If not, maybe we are creating simpler logic here: one doc per type?
        // Let's assume one active doc per type, but keeping history? 
        // For simplicity now: strict UPSERT based on type might be easier if we only want one current version
        // BUT the user might want multiple drafts.
        // Let's stick to simple insert/update by ID if provided.

        let result
        if (id) {
            result = await supabase
                .from('legal_documents')
                .update({
                    title,
                    description,
                    content,
                    status,
                    is_required,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('clinic_id', clinicId)
                .select()
                .single()
        } else {
            result = await supabase
                .from('legal_documents')
                .insert({
                    clinic_id: clinicId,
                    type,
                    title,
                    description,
                    content,
                    status: status || 'draft',
                    is_required: is_required || false
                })
                .select()
                .single()
        }

        if (result.error) {
            console.error('Error saving legal document:', result.error)
            return NextResponse.json({ error: 'Erro ao salvar documento' }, { status: 500 })
        }

        return NextResponse.json({ document: result.data })

    } catch (error) {
        console.error('Legal docs POST error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
