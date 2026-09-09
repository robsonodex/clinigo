// app/api/reception/pins/route.ts
// Gestão de PINs da Recepção para Administradores da Clínica

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

/**
 * GET /api/reception/pins - Lista PINs cadastrados da clínica (sem expor o hash)
 */
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const adminDb = createServiceRoleClient()
        const { data: currentUser } = await (adminDb as any)
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!currentUser?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não vinculada' }, { status: 403 })
        }

        const { data: pins, error } = await (adminDb as any)
            .from('reception_pins')
            .select('id, label, status, created_at')
            .eq('clinic_id', currentUser.clinic_id)
            .order('created_at', { ascending: false })

        if (error) {
            return NextResponse.json({ error: 'Erro ao listar PINs' }, { status: 500 })
        }

        return NextResponse.json({ pins: pins || [] })
    } catch (error: any) {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

/**
 * POST /api/reception/pins - Cria ou redefine um novo PIN para a recepção
 * Body: { pin: string, label: string }
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const adminDb = createServiceRoleClient()
        const { data: currentUser } = await (adminDb as any)
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!currentUser?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não vinculada' }, { status: 403 })
        }

        const isAdmin = currentUser.role === 'CLINIC_ADMIN' || currentUser.role === 'SUPER_ADMIN'
        if (!isAdmin) {
            return NextResponse.json({ error: 'Apenas administradores podem gerenciar PINs de recepção' }, { status: 403 })
        }

        const body = await request.json()
        const { pin, label = 'Recepção' } = body

        if (!pin || typeof pin !== 'string' || pin.trim().length < 4) {
            return NextResponse.json({ error: 'PIN deve conter ao menos 4 caracteres numéricos' }, { status: 400 })
        }

        const pinHash = await bcrypt.hash(pin.trim(), 10)

        // Inativar PINs anteriores para que apenas o novo vigore
        await (adminDb as any)
            .from('reception_pins')
            .update({ status: 'inactive' })
            .eq('clinic_id', currentUser.clinic_id)
            .eq('status', 'active')

        const { data: newPin, error: insertError } = await (adminDb as any)
            .from('reception_pins')
            .insert({
                clinic_id: currentUser.clinic_id,
                pin_hash: pinHash,
                label: label.trim(),
                status: 'active',
                created_by: user.id,
            })
            .select('id, label, status, created_at')
            .single()

        if (insertError) {
            return NextResponse.json({ error: 'Erro ao cadastrar PIN' }, { status: 500 })
        }

        return NextResponse.json({ success: true, pin: newPin })
    } catch (error: any) {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
