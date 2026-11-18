import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ALLOWED_NOTE_TYPES = new Set(['general', 'clinical', 'financial', 'follow_up', 'task'])
const ALLOWED_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent'])
const ALLOWED_PATCH_FIELDS = new Set([
    'content',
    'note_type',
    'is_task',
    'task_due_date',
    'task_assigned_to',
    'task_completed_at',
    'priority',
    'is_pinned',
    'complete_task',
])

const NOTE_SELECT = `
    *,
    patient:patients(id, full_name),
    created_by_user:users!patient_notes_created_by_fkey(full_name),
    assigned_to_user:users!patient_notes_task_assigned_to_fkey(full_name)
`

async function getClinicContext() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Não autorizado', status: 401 as const }
    }

    const { data: userData } = await supabase
        .from('users')
        .select('clinic_id')
        .eq('id', user.id)
        .single()

    const clinicId = (userData as any)?.clinic_id as string | undefined
    if (!clinicId) {
        return { error: 'Clínica não encontrada', status: 400 as const }
    }

    return { supabase, user, clinicId }
}

function normalizeDueDate(value: unknown): string | null | undefined {
    if (value === undefined) return undefined
    if (value === null || value === '') return null
    const str = String(value).trim()
    if (!str) return null
    const parsed = new Date(str)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed.toISOString()
}

// GET: List patient notes & CRM tasks
export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const ctx = await getClinicContext()
        if ('error' in ctx) {
            return NextResponse.json({ error: ctx.error }, { status: ctx.status })
        }

        const { supabase, clinicId } = ctx
        const searchParams = request.nextUrl.searchParams
        const patientId = searchParams.get('patient_id')
        const type = searchParams.get('type')
        const tasksOnly = searchParams.get('tasks_only') === 'true'
        const pendingOnly = searchParams.get('pending_only') === 'true'
        const completedOnly = searchParams.get('completed_only') === 'true'

        let query = (supabase as any)
            .from('patient_notes')
            .select(NOTE_SELECT)
            .eq('clinic_id', clinicId)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })

        if (patientId) query = query.eq('patient_id', patientId)
        if (type) query = query.eq('note_type', type)
        if (tasksOnly) query = query.eq('is_task', true)
        if (pendingOnly) query = query.is('task_completed_at', null)
        if (completedOnly) query = query.not('task_completed_at', 'is', null)

        const { data: notes, error } = await query.limit(100)

        if (error) {
            request.log.error('crm/notes/get', { error: error.message })
            console.error('[GET /api/crm/notes] Erro:', error.message)
            return NextResponse.json({ error: 'Erro ao buscar notas e tarefas' }, { status: 500 })
        }

        return NextResponse.json({ notes: notes || [] })
    } catch (error) {
        request.log.error('crm/notes', { error: error instanceof Error ? error.message : String(error) })
        console.error('[GET /api/crm/notes] Erro interno:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
})

// POST: Create patient note or CRM task
export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
        const ctx = await getClinicContext()
        if ('error' in ctx) {
            return NextResponse.json({ error: ctx.error }, { status: ctx.status })
        }

        const { supabase, user, clinicId } = ctx
        const body = await request.json()
        const {
            patient_id,
            content,
            note_type = 'general',
            is_task = false,
            task_due_date,
            task_assigned_to,
            priority = 'normal',
            is_pinned = false,
        } = body

        const trimmedContent = typeof content === 'string' ? content.trim() : ''
        if (!trimmedContent) {
            return NextResponse.json({ error: 'Campo obrigatório: content' }, { status: 400 })
        }

        const resolvedPatientId = typeof patient_id === 'string' && patient_id.trim() ? patient_id.trim() : null
        if (resolvedPatientId) {
            const { data: patient } = await supabase
                .from('patients')
                .select('id')
                .eq('id', resolvedPatientId)
                .eq('clinic_id', clinicId)
                .maybeSingle()

            if (!patient) {
                return NextResponse.json({ error: 'Paciente não encontrado nesta clínica' }, { status: 404 })
            }
        }

        const resolvedAssignedTo = typeof task_assigned_to === 'string' && task_assigned_to.trim()
            ? task_assigned_to.trim()
            : null

        if (resolvedAssignedTo) {
            const { data: assignee } = await supabase
                .from('users')
                .select('id')
                .eq('id', resolvedAssignedTo)
                .eq('clinic_id', clinicId)
                .maybeSingle()

            if (!assignee) {
                return NextResponse.json({ error: 'Responsável não encontrado nesta clínica' }, { status: 404 })
            }
        }

        const safeNoteType = ALLOWED_NOTE_TYPES.has(String(note_type)) ? String(note_type) : 'general'
        const safePriority = ALLOWED_PRIORITIES.has(String(priority)) ? String(priority) : 'normal'
        const normalizedDueDate = normalizeDueDate(task_due_date) ?? null

        const { data: note, error } = await (supabase as any)
            .from('patient_notes')
            .insert({
                clinic_id: clinicId,
                patient_id: resolvedPatientId,
                content: trimmedContent,
                note_type: safeNoteType,
                is_task: Boolean(is_task),
                task_due_date: normalizedDueDate,
                task_assigned_to: resolvedAssignedTo,
                priority: safePriority,
                is_pinned: Boolean(is_pinned),
                created_by: user.id,
            })
            .select(NOTE_SELECT)
            .single()

        if (error) {
            request.log.error('crm/notes/post', { error: error.message })
            console.error('[POST /api/crm/notes] Erro:', error.message)
            return NextResponse.json({ error: 'Erro ao criar nota ou tarefa' }, { status: 500 })
        }

        return NextResponse.json({ note }, { status: 201 })
    } catch (error) {
        request.log.error('crm/notes', { error: error instanceof Error ? error.message : String(error) })
        console.error('[POST /api/crm/notes] Erro interno:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
})

// PATCH: Update note/task (strict multi-tenant clinic_id isolation + allowlist)
export const PATCH = withAxiom(async (request: AxiomRequest) => {
    try {
        const ctx = await getClinicContext()
        if ('error' in ctx) {
            return NextResponse.json({ error: ctx.error }, { status: ctx.status })
        }

        const { supabase, clinicId } = ctx
        const body = await request.json()
        const { id, ...rawUpdates } = body

        if (!id || typeof id !== 'string') {
            return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
        }

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        }

        for (const [key, value] of Object.entries(rawUpdates)) {
            if (!ALLOWED_PATCH_FIELDS.has(key)) continue
            if (key === 'complete_task') {
                updates.task_completed_at = value ? new Date().toISOString() : null
            } else if (key === 'content') {
                const trimmed = typeof value === 'string' ? value.trim() : ''
                if (!trimmed) {
                    return NextResponse.json({ error: 'Conteúdo não pode ser vazio' }, { status: 400 })
                }
                updates.content = trimmed
            } else if (key === 'note_type') {
                if (ALLOWED_NOTE_TYPES.has(String(value))) updates.note_type = String(value)
            } else if (key === 'priority') {
                if (ALLOWED_PRIORITIES.has(String(value))) updates.priority = String(value)
            } else if (key === 'task_due_date') {
                updates.task_due_date = normalizeDueDate(value) ?? null
            } else if (key === 'task_completed_at') {
                updates.task_completed_at = normalizeDueDate(value) ?? null
            } else if (key === 'is_task' || key === 'is_pinned') {
                updates[key] = Boolean(value)
            } else if (key === 'task_assigned_to') {
                updates.task_assigned_to = typeof value === 'string' && value.trim() ? value.trim() : null
            }
        }

        const { data: note, error } = await (supabase as any)
            .from('patient_notes')
            .update(updates)
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .select(NOTE_SELECT)
            .maybeSingle()

        if (error) {
            request.log.error('crm/notes/patch', { error: error.message })
            console.error('[PATCH /api/crm/notes] Erro:', error.message)
            return NextResponse.json({ error: 'Erro ao atualizar tarefa' }, { status: 500 })
        }

        if (!note) {
            return NextResponse.json({ error: 'Nota ou tarefa não encontrada' }, { status: 404 })
        }

        return NextResponse.json({ note })
    } catch (error) {
        request.log.error('crm/notes', { error: error instanceof Error ? error.message : String(error) })
        console.error('[PATCH /api/crm/notes] Erro interno:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
})

// DELETE: Remove note/task (strict clinic_id isolation)
export const DELETE = withAxiom(async (request: AxiomRequest) => {
    try {
        const ctx = await getClinicContext()
        if ('error' in ctx) {
            return NextResponse.json({ error: ctx.error }, { status: ctx.status })
        }

        const { supabase, clinicId } = ctx
        let noteId = request.nextUrl.searchParams.get('id')

        if (!noteId) {
            try {
                const body = await request.json()
                noteId = body?.id
            } catch {
                // empty body allowed when id is missing
            }
        }

        if (!noteId || typeof noteId !== 'string') {
            return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
        }

        const { data: deleted, error } = await (supabase as any)
            .from('patient_notes')
            .delete()
            .eq('id', noteId)
            .eq('clinic_id', clinicId)
            .select('id')
            .maybeSingle()

        if (error) {
            request.log.error('crm/notes/delete', { error: error.message })
            console.error('[DELETE /api/crm/notes] Erro:', error.message)
            return NextResponse.json({ error: 'Erro ao excluir tarefa' }, { status: 500 })
        }

        if (!deleted) {
            return NextResponse.json({ error: 'Nota ou tarefa não encontrada' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        request.log.error('crm/notes', { error: error instanceof Error ? error.message : String(error) })
        console.error('[DELETE /api/crm/notes] Erro interno:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
})
