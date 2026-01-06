import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List patient notes
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
        const type = searchParams.get('type')
        const tasksOnly = searchParams.get('tasks_only') === 'true'
        const pendingOnly = searchParams.get('pending_only') === 'true'

        let query = supabase
            .from('patient_notes')
            .select(`
        *,
        patient:patients(id, full_name),
        created_by_user:users!created_by(full_name),
        assigned_to_user:users!task_assigned_to(full_name)
      `)
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })

        if (patientId) query = query.eq('patient_id', patientId)
        if (type) query = query.eq('note_type', type)
        if (tasksOnly) query = query.eq('is_task', true)
        if (pendingOnly) query = query.is('task_completed_at', null)

        const { data: notes, error } = await query.limit(100)

        if (error) {
            console.error('Notes fetch error:', error)
            return NextResponse.json({ error: 'Erro ao buscar notas' }, { status: 500 })
        }

        return NextResponse.json({ notes })
    } catch (error) {
        console.error('Notes error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Create patient note
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
        const {
            patient_id,
            content,
            note_type = 'general',
            is_task = false,
            task_due_date,
            task_assigned_to,
            priority = 'normal',
            is_pinned = false
        } = body

        if (!patient_id || !content) {
            return NextResponse.json({
                error: 'Campos obrigatórios: patient_id, content'
            }, { status: 400 })
        }

        const { data: note, error } = await supabase
            .from('patient_notes')
            .insert({
                clinic_id: clinicId,
                patient_id,
                content,
                note_type,
                is_task,
                task_due_date,
                task_assigned_to,
                priority,
                is_pinned,
                created_by: user.id
            })
            .select(`
        *,
        patient:patients(id, full_name),
        created_by_user:users!created_by(full_name)
      `)
            .single()

        if (error) {
            console.error('Create note error:', error)
            return NextResponse.json({ error: 'Erro ao criar nota' }, { status: 500 })
        }

        return NextResponse.json({ note })
    } catch (error) {
        console.error('Create note error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// PATCH: Update note (complete task, etc)
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
        }

        // Handle task completion
        if (updates.complete_task) {
            updates.task_completed_at = new Date().toISOString()
            delete updates.complete_task
        }

        const { data: note, error } = await supabase
            .from('patient_notes')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Update note error:', error)
            return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
        }

        return NextResponse.json({ note })
    } catch (error) {
        console.error('Update note error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
