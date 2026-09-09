// app/api/clinic-devices/route.ts
// Gestao de Tablets e Dispositivos Pareados da Clinica

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * GET /api/clinic-devices
 * Lista dispositivos pareados da clinica do usuario autenticado (CLINIC_ADMIN / SUPER_ADMIN)
 * Retorna token mascarado para seguranca.
 */
export async function GET(request: NextRequest) {
    try {
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
        const { data: devices, error } = await (adminDb as any)
            .from('clinic_devices')
            .select('id, room_label, status, last_seen_at, created_at, device_token')
            .eq('clinic_id', currentUser.clinic_id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[Clinic Devices] Erro ao listar dispositivos:', error)
            return NextResponse.json({ error: 'Erro ao consultar dispositivos' }, { status: 500 })
        }

        const sanitizedDevices = (devices || []).map((dev: any) => {
            const rawToken = dev.device_token || ''
            const last4 = rawToken.slice(-4)
            return {
                id: dev.id,
                room_label: dev.room_label,
                status: dev.status,
                last_seen_at: dev.last_seen_at,
                created_at: dev.created_at,
                token_masked: rawToken.length > 4 ? `••••••••••••••••${last4}` : '••••',
                token_last4: last4,
            }
        })

        return NextResponse.json({ devices: sanitizedDevices })
    } catch (error: any) {
        console.error('[Clinic Devices] Erro interno:', error)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
    }
}

/**
 * POST /api/clinic-devices
 * Cadastra novo dispositivo/tablet para uma sala especifica
 * Retorna o device_token em texto claro uma unica vez para exibicao/copia no painel
 */
export async function POST(request: NextRequest) {
    try {
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
        const roomLabel = (body.room_label || '').trim()

        if (!roomLabel || roomLabel.length < 2) {
            return NextResponse.json({ error: 'Identificacao da sala e obrigatoria (minimo 2 caracteres)' }, { status: 400 })
        }

        // Gera token criptografico unico de 24 bytes (48 caracteres hex)
        const deviceToken = crypto.randomBytes(24).toString('hex')

        const adminDb = createServiceRoleClient()
        const { data: newDevice, error } = await (adminDb as any)
            .from('clinic_devices')
            .insert({
                clinic_id: currentUser.clinic_id,
                room_label: roomLabel,
                device_token: deviceToken,
                status: 'active',
                created_by: user.id,
            })
            .select('id, room_label, status, last_seen_at, created_at')
            .single()

        if (error) {
            console.error('[Clinic Devices] Erro ao cadastrar dispositivo:', error)
            return NextResponse.json({ error: 'Erro ao cadastrar dispositivo' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            device: {
                ...newDevice,
                device_token: deviceToken, // Fornecido apenas no ato de criacao
            },
            message: 'Dispositivo cadastrado com sucesso. Guarde o codigo de pareamento.',
        })
    } catch (error: any) {
        console.error('[Clinic Devices] Erro interno no cadastro:', error)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
    }
}
