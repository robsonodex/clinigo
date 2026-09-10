import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { studentSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

interface RouteParams {
    params: Promise<{ id: string }>
}

/**
 * GET /api/students/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 })
        }

        const { data, error } = await supabase
            .from('students')
            .select(`
                id,
                full_name,
                contact_phone,
                contact_email,
                program,
                status,
                created_at,
                supervising_doctor_id,
                supervising_doctor:doctors!students_supervising_doctor_id_fkey(
                    id,
                    specialty,
                    user:users(full_name)
                )
            `)
            .eq('id', id)
            .eq('clinic_id', profile.clinic_id)
            .single()

        if (error || !data) {
            return NextResponse.json({ error: 'Aluna não encontrada' }, { status: 404 })
        }

        return NextResponse.json({ data })
    } catch (err: any) {
        console.error('[API /api/students/[id] GET] Unexpected error:', err)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

/**
 * PATCH /api/students/[id]
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 })
        }

        const body = await request.json()
        const partialSchema = studentSchema.partial()
        const validated = partialSchema.parse(body)

        const updatePayload: Record<string, any> = {}
        if (validated.full_name !== undefined) updatePayload.full_name = validated.full_name.trim()
        if (validated.contact_phone !== undefined) updatePayload.contact_phone = validated.contact_phone ? validated.contact_phone.replace(/\D/g, '') : null
        if (validated.contact_email !== undefined) updatePayload.contact_email = validated.contact_email ? validated.contact_email.trim().toLowerCase() : null
        if (validated.program !== undefined) updatePayload.program = validated.program?.trim() || null
        if (validated.supervising_doctor_id !== undefined) updatePayload.supervising_doctor_id = validated.supervising_doctor_id || null
        if (validated.status !== undefined) updatePayload.status = validated.status

        const { data, error } = await supabase
            .from('students')
            .update(updatePayload)
            .eq('id', id)
            .eq('clinic_id', profile.clinic_id)
            .select()
            .single()

        if (error || !data) {
            console.error('[API /api/students/[id] PATCH] Error:', error)
            return NextResponse.json({ error: 'Erro ao atualizar aluna' }, { status: 500 })
        }

        return NextResponse.json({ data })
    } catch (err: any) {
        if (err.name === 'ZodError') {
            return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
        }
        console.error('[API /api/students/[id] PATCH] Unexpected error:', err)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

/**
 * DELETE /api/students/[id]
 * Soft-delete: archives the student (preserves historical appointments)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 })
        }

        const { data, error } = await supabase
            .from('students')
            .update({ status: 'archived' })
            .eq('id', id)
            .eq('clinic_id', profile.clinic_id)
            .select('id, status')
            .single()

        if (error || !data) {
            console.error('[API /api/students/[id] DELETE] Error:', error)
            return NextResponse.json({ error: 'Erro ao arquivar aluna' }, { status: 500 })
        }

        return NextResponse.json({ message: 'Aluna arquivada com sucesso', data })
    } catch (err: any) {
        console.error('[API /api/students/[id] DELETE] Unexpected error:', err)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
