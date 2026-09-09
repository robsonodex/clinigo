// app/api/clinic-devices/[id]/route.ts
// Modificacao, revogacao e regeneracao de token de dispositivos

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/clinic-devices/:id
 * Body: { room_label?: string, status?: 'active' | 'revoked', action?: 'regenerate' }
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: deviceId } = await params
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
        }

        const { data: currentUser } = await (supabase as any)
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!currentUser?.clinic_id) {
            return NextResponse.json({ error: 'Clinica nao vinculada' }, { status: 403 })
        }

        const allowedRoles = ['CLINIC_ADMIN', 'SUPER_ADMIN']
        if (!allowedRoles.includes(currentUser.role)) {
            return NextResponse.json({ error: 'Acesso restrito a administradores da clinica' }, { status: 403 })
        }

        const body = await request.json()
        const adminDb = createServiceRoleClient()

        // Garantir que o dispositivo pertence a clinica do usuario
        const { data: existingDevice, error: fetchError } = await (adminDb as any)
            .from('clinic_devices')
            .select('id, clinic_id, status')
            .eq('id', deviceId)
            .eq('clinic_id', currentUser.clinic_id)
            .single()

        if (fetchError || !existingDevice) {
            return NextResponse.json({ error: 'Dispositivo nao encontrado nesta clinica' }, { status: 404 })
        }

        const updates: Record<string, any> = {}

        if (body.room_label && typeof body.room_label === 'string') {
            const trimmed = body.room_label.trim()
            if (trimmed.length < 2) {
                return NextResponse.json({ error: 'Nome da sala invalido' }, { status: 400 })
            }
            updates.room_label = trimmed
        }

        if (body.status && ['active', 'revoked'].includes(body.status)) {
            updates.status = body.status
        }

        let newDeviceToken: string | null = null
        if (body.action === 'regenerate') {
            newDeviceToken = crypto.randomBytes(24).toString('hex')
            updates.device_token = newDeviceToken
            updates.status = 'active'
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'Nenhuma alteracao informada' }, { status: 400 })
        }

        const { data: updatedDevice, error: updateError } = await (adminDb as any)
            .from('clinic_devices')
            .update(updates)
            .eq('id', deviceId)
            .eq('clinic_id', currentUser.clinic_id)
            .select('id, room_label, status, last_seen_at, created_at')
            .single()

        if (updateError) {
            console.error('[Clinic Devices PATCH] Erro ao atualizar:', updateError)
            return NextResponse.json({ error: 'Erro ao atualizar dispositivo' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            device: {
                ...updatedDevice,
                ...(newDeviceToken ? { device_token: newDeviceToken } : {})
            },
            message: newDeviceToken
                ? 'Novo codigo gerado com sucesso. Atualize o tablet.'
                : 'Dispositivo atualizado com sucesso.'
        })
    } catch (error: any) {
        console.error('[Clinic Devices PATCH] Erro interno:', error)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
    }
}

/**
 * DELETE /api/clinic-devices/:id
 * Remove permanentemente o dispositivo da clinica
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: deviceId } = await params
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
        }

        const { data: currentUser } = await (supabase as any)
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!currentUser?.clinic_id) {
            return NextResponse.json({ error: 'Clinica nao vinculada' }, { status: 403 })
        }

        const allowedRoles = ['CLINIC_ADMIN', 'SUPER_ADMIN']
        if (!allowedRoles.includes(currentUser.role)) {
            return NextResponse.json({ error: 'Acesso restrito a administradores da clinica' }, { status: 403 })
        }

        const adminDb = createServiceRoleClient()
        const { error } = await (adminDb as any)
            .from('clinic_devices')
            .delete()
            .eq('id', deviceId)
            .eq('clinic_id', currentUser.clinic_id)

        if (error) {
            console.error('[Clinic Devices DELETE] Erro:', error)
            return NextResponse.json({ error: 'Erro ao remover dispositivo' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Dispositivo desvinculado com sucesso' })
    } catch (error: any) {
        console.error('[Clinic Devices DELETE] Erro interno:', error)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
    }
}
