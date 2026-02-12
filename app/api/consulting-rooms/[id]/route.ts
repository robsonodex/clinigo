import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/consulting-rooms/:id
 * Updates a consulting room (name, display_name, show_on_tv, doctor_id)
 */
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: currentUser } = await (supabase as any)
            .from('users').select('clinic_id').eq('id', user.id).single()
        if (!currentUser?.clinic_id) return NextResponse.json({ error: 'Clinic not found' }, { status: 403 })

        const body = await request.json()
        const { name, display_name, show_on_tv, doctor_id, room_number } = body

        const updateData: any = { updated_at: new Date().toISOString() }
        if (name !== undefined) updateData.name = name
        if (display_name !== undefined) updateData.display_name = display_name
        if (show_on_tv !== undefined) updateData.show_on_tv = show_on_tv
        if (doctor_id !== undefined) updateData.doctor_id = doctor_id
        if (room_number !== undefined) updateData.room_number = room_number

        const { data: room, error } = await (supabase as any)
            .from('consulting_rooms')
            .update(updateData)
            .eq('id', id)
            .eq('clinic_id', currentUser.clinic_id)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ success: true, room })
    } catch (error) {
        console.error('[Consulting Room] PATCH error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

/**
 * DELETE /api/consulting-rooms/:id
 * Soft-deletes a consulting room (sets is_active = false)
 */
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: currentUser } = await (supabase as any)
            .from('users').select('clinic_id').eq('id', user.id).single()
        if (!currentUser?.clinic_id) return NextResponse.json({ error: 'Clinic not found' }, { status: 403 })

        const { error } = await (supabase as any)
            .from('consulting_rooms')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('clinic_id', currentUser.clinic_id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Consulting Room] DELETE error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
