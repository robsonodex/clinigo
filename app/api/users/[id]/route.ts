import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import {
    checkSeatAdditionAllowed,
    commitSeatConsent,
    voidSeatEvent,
} from '@/lib/services/seat-licensing'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    let idempotencyKey = request.headers.get('Idempotency-Key') || ''
    let seatQuoteCommitted = false

    try {
        const { id } = await context.params
        const body = await request.json()
        const { name, role, is_active } = body

        const supabaseClient = await createClient()
        const { data: { user: currentUser }, error: authError } = await supabaseClient.auth.getUser()

        if (!currentUser || authError) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const adminClient = createServiceRoleClient() as any
        const { data: reqUser } = await adminClient.from('users').select('clinic_id, role').eq('id', currentUser.id).single()
        if (!reqUser) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
        }

        const userRole = reqUser.role || request.headers.get('x-user-role')
        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        // Fetch target user data
        const { data: targetUser, error: targetUserError } = await adminClient
            .from('users')
            .select('id, clinic_id, is_active, role, full_name')
            .eq('id', id)
            .single()

        if (targetUserError || !targetUser) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
        }

        // Check clinic match if not super admin
        if (userRole === 'CLINIC_ADMIN' && reqUser.clinic_id !== targetUser.clinic_id) {
            return NextResponse.json({ error: 'Usuário não pertence à sua clínica' }, { status: 403 })
        }

        const targetClinicId = targetUser.clinic_id || reqUser.clinic_id

        // ============================================
        // REATIVACAO: VERIFICAR LICENCIAMENTO POR ASSENTO
        // ============================================
        let seatCheckQuote: any = null
        if (is_active === true && targetUser.is_active === false) {
            if (!idempotencyKey) {
                idempotencyKey = body.quote?.quote_id
                    ? `reactivate_${body.quote.quote_id}`
                    : `reactivate_${targetClinicId}_${id}_${Date.now()}`
            }

            const seatCheck = await checkSeatAdditionAllowed(targetClinicId, {
                quote: body.quote,
                idempotencyKey,
            })

            if (!seatCheck.allowed) {
                if (userRole !== 'CLINIC_ADMIN' && userRole !== 'SUPER_ADMIN') {
                    return NextResponse.json({
                        error: 'Apenas administradores podem autorizar a inclusão de licenças adicionais para reativação.',
                        code: 'SEAT_LIMIT_ADMIN_ONLY'
                    }, { status: 403 })
                }

                return NextResponse.json({
                    code: seatCheck.code || 'SEAT_LIMIT_CONFIRMATION_REQUIRED',
                    error: seatCheck.error || 'Confirmação de licença adicional necessária para reativação.',
                    quote: seatCheck.quote,
                }, { status: 409 })
            }

            if (seatCheck.quote) {
                seatCheckQuote = seatCheck.quote
            }
        }

        const updatePayload: Record<string, any> = {}
        if (name !== undefined) updatePayload.full_name = name
        if (role !== undefined) updatePayload.role = role
        if (is_active !== undefined) updatePayload.is_active = is_active

        const { error: updateError } = await adminClient
            .from('users')
            .update(updatePayload)
            .eq('id', id)

        if (updateError) throw updateError

        // Se reativou com aceite formal de licenca adicional, registrar evento COMMITTED
        if (seatCheckQuote) {
            try {
                const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
                const ua = request.headers.get('user-agent')
                await commitSeatConsent({
                    clinicId: targetClinicId,
                    actorUserId: currentUser.id,
                    targetUserId: id,
                    quote: seatCheckQuote,
                    idempotencyKey,
                    ipAddress: ip,
                    userAgent: ua,
                })
                seatQuoteCommitted = true
            } catch (consentError: any) {
                console.error('[PATCH /api/users/[id]] Erro ao gravar consentimento de assento:', consentError)
            }
        }

        return NextResponse.json({ success: true, is_active: is_active ?? targetUser.is_active })
    } catch (error: any) {
        if (seatQuoteCommitted) {
            await voidSeatEvent(idempotencyKey, error?.message || 'Falha na atualização do usuário')
        }
        return NextResponse.json({ error: error.message || 'Erro ao atualizar usuário' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params

        const supabaseClient = await createClient()
        const { data: { user: currentUser }, error: authError } = await supabaseClient.auth.getUser()

        if (!currentUser || authError) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        if (currentUser.id === id) {
            return NextResponse.json({ error: 'Você não pode excluir sua própria conta' }, { status: 400 })
        }

        const adminClient = createServiceRoleClient() as any
        const { data: reqUser } = await adminClient.from('users').select('clinic_id, role').eq('id', currentUser.id).single()
        if (!reqUser) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
        }

        const userRole = reqUser.role || request.headers.get('x-user-role')
        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        // Check clinic match if not super admin
        if (userRole === 'CLINIC_ADMIN') {
            const { data: targetUser } = await adminClient.from('users').select('clinic_id').eq('id', id).single()

            if (!targetUser) {
                return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
            }

            if (reqUser.clinic_id !== targetUser.clinic_id) {
                return NextResponse.json({ error: 'Usuário não pertence à sua clínica' }, { status: 403 })
            }
        }

        const { permanentlyDeleteUser } = await import('@/lib/services/user-cleanup')
        const result = await permanentlyDeleteUser(adminClient, id)

        if (!result.success) {
            return NextResponse.json({ error: result.error || 'Erro ao excluir usuário em definitivo' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Usuário excluído em definitivo com sucesso' })
    } catch (error: any) {
        console.error('[DELETE /api/users/[id]] Erro:', error)
        return NextResponse.json({ error: error.message || 'Erro interno ao excluir usuário' }, { status: 500 })
    }
}
