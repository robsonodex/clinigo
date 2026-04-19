/**
 * Prescription Sign API — POST
 * 
 * Re-autentica o médico com senha e assina a prescrição
 * DRAFT → SIGNED
 */

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { guardFeature, createPlanError } from '@/lib/middlewares/plan-guard'
import { z } from 'zod'

const SignSchema = z.object({
    password: z.string().min(1, 'Senha obrigatória'),
})

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params

    try {
        const supabase = await createClient()
        const supabaseAdmin = createServiceRoleClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user || !user.email) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('clinic_id, role, full_name')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // Plan guard
        const validation = await guardFeature(profile.clinic_id, 'prescricao_digital')
        if (!validation.allowed) {
            return createPlanError(validation.planType, 'Prescrição Digital', 'PROFESSIONAL')
        }

        // Parse body
        const body = await request.json()
        const parsed = SignSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({
                error: 'Dados inválidos',
                details: parsed.error.flatten().fieldErrors,
            }, { status: 400 })
        }

        // Re-authenticate with password
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: parsed.data.password,
        })

        if (authError) {
            return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
        }

        // Verify prescription exists and belongs to this doctor
        const { data: prescription } = await supabaseAdmin
            .from('prescriptions')
            .select('id, status, doctor_id')
            .eq('id', params.id)
            .eq('clinic_id', profile.clinic_id)
            .single()

        if (!prescription) {
            return NextResponse.json({ error: 'Prescrição não encontrada' }, { status: 404 })
        }

        if ((prescription as any).doctor_id !== user.id && profile.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Apenas o médico que criou pode assinar' }, { status: 403 })
        }

        if ((prescription as any).status !== 'DRAFT') {
            return NextResponse.json({ error: 'Prescrição já assinada' }, { status: 409 })
        }

        // Verify prescription has items
        const { count } = await supabaseAdmin
            .from('prescription_items')
            .select('id', { count: 'exact', head: true })
            .eq('prescription_id', params.id)

        if (!count || count === 0) {
            return NextResponse.json({
                error: 'Prescrição vazia — adicione pelo menos um medicamento',
            }, { status: 400 })
        }

        // Sign the prescription
        const signedAt = new Date().toISOString()
        const { error: updateError } = await supabaseAdmin
            .from('prescriptions')
            .update({
                status: 'SIGNED',
                signed_at: signedAt,
                signed_by: user.id,
            } as Record<string, unknown>)
            .eq('id', params.id)

        if (updateError) {
            console.error('[Prescriptions] Sign error:', updateError)
            return NextResponse.json({ error: 'Erro ao assinar' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Prescrição assinada com sucesso',
            data: {
                signed_at: signedAt,
                signed_by: user.id,
                signed_by_name: (profile as any).full_name,
            },
        })
    } catch (error: any) {
        console.error('[Prescriptions] Sign error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
