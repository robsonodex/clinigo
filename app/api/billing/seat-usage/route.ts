import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { resolveClinicId } from '@/lib/utils/resolve-clinic-id'
import { getSeatStatus, buildSeatQuote, verifyQuote, commitSeatConsent } from '@/lib/services/seat-licensing'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        // 1. Autenticacao
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // 2. Perfil do usuario
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
        }

        const userRole = profile.role || request.headers.get('x-user-role') || ''
        const searchParams = request.nextUrl.searchParams
        const queryClinicId = searchParams.get('clinic_id')

        // 3. Resolucao da clinica (com suporte a impersonacao)
        let targetClinicId: string | null = null

        if (userRole === 'SUPER_ADMIN') {
            const { clinicId: impClinicId } = await resolveClinicId({
                profileClinicId: profile.clinic_id,
                profileRole: userRole,
            })
            targetClinicId = queryClinicId || impClinicId || profile.clinic_id
        } else {
            const { clinicId: resolvedId } = await resolveClinicId({
                profileClinicId: profile.clinic_id,
                profileRole: userRole,
            })
            targetClinicId = resolvedId

            // Apenas CLINIC_ADMIN, RECEPTIONIST e SUPER_ADMIN podem visualizar assentos da clinica
            const allowedViewRoles = ['CLINIC_ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN']
            if (!allowedViewRoles.includes(userRole)) {
                return NextResponse.json({
                    error: 'Acesso restrito à administração da clínica.',
                    code: 'SEAT_VIEW_FORBIDDEN'
                }, { status: 403 })
            }
        }

        if (!targetClinicId) {
            return NextResponse.json({ error: 'Identificador da clínica não informado' }, { status: 400 })
        }

        // 4. Obter status do servico centralizado de licenciamento
        const seatStatus = await getSeatStatus(targetClinicId)

        // 5. Obter historico recente de eventos probatorios
        const serviceSupabase = createServiceRoleClient()
        const { data: events } = await (serviceSupabase
            .from('seat_billing_events') as any)
            .select('id, plan, included_seats, seats_before, seats_after, extra_seats_before, extra_seats_after, unit_price_cents, monthly_before_cents, monthly_after_cents, status, created_at')
            .eq('clinic_id', targetClinicId)
            .order('created_at', { ascending: false })
            .limit(10)

        return NextResponse.json({
            success: true,
            data: {
                ...seatStatus,
                recent_events: events || [],
            },
        })
    } catch (error: any) {
        console.error('[GET /api/billing/seat-usage] Erro:', error)
        return NextResponse.json({
            error: error.message || 'Erro ao consultar licenças por assento'
        }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
        }

        const userRole = profile.role || ''
        if (userRole !== 'CLINIC_ADMIN' && userRole !== 'SUPER_ADMIN') {
            return NextResponse.json({
                error: 'Apenas administradores podem regularizar licenças.',
                code: 'SEAT_REGULARIZE_FORBIDDEN',
            }, { status: 403 })
        }

        const { clinicId: targetClinicId } = await resolveClinicId({
            profileClinicId: profile.clinic_id,
            profileRole: userRole,
        })

        if (!targetClinicId) {
            return NextResponse.json({ error: 'Identificador da clínica não informado' }, { status: 400 })
        }

        const body = await request.json().catch(() => ({}))
        const { action, quote_id } = body
        const seatStatus = await getSeatStatus(targetClinicId)

        if (action === 'get_regularization_quote') {
            const quote = buildSeatQuote({
                clinicId: targetClinicId,
                plan: seatStatus.plan,
                customPriceCents: seatStatus.base_monthly_cents,
                activeSeats: seatStatus.active_seats,
                overrides: {
                    seatPriceOverrideCents: seatStatus.seat_price_override_cents,
                    seatOverageWaived: seatStatus.seat_overage_waived,
                },
            })

            return NextResponse.json({
                success: true,
                data: {
                    quote,
                    seatStatus,
                },
            })
        }

        if (action === 'accept_regularization') {
            if (!quote_id) {
                return NextResponse.json({ error: 'quote_id é obrigatório para regularização' }, { status: 400 })
            }

            const verifyResult = verifyQuote(quote_id, seatStatus.active_seats)
            if (!verifyResult.valid) {
                if (verifyResult.reason === 'QUOTE_STALE') {
                    const freshQuote = buildSeatQuote({
                        clinicId: targetClinicId,
                        plan: seatStatus.plan,
                        customPriceCents: seatStatus.base_monthly_cents,
                        activeSeats: seatStatus.active_seats,
                        overrides: {
                            seatPriceOverrideCents: seatStatus.seat_price_override_cents,
                            seatOverageWaived: seatStatus.seat_overage_waived,
                        },
                    })
                    return NextResponse.json({
                        error: 'Cotação desatualizada',
                        code: 'QUOTE_STALE',
                        quote: freshQuote,
                    }, { status: 409 })
                }
                return NextResponse.json({
                    error: 'Cotação inválida ou expirada',
                    code: 'INVALID_QUOTE',
                }, { status: 400 })
            }

            const quote = verifyResult.quote!
            const idempotencyKey = request.headers.get('idempotency-key') || `reg-${targetClinicId}-${Date.now()}`
            const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
            const userAgent = request.headers.get('user-agent')

            await commitSeatConsent({
                clinicId: targetClinicId,
                actorUserId: user.id,
                quote,
                idempotencyKey,
                ipAddress,
                userAgent,
            })

            // Notificar o dono da plataforma
            try {
                const { notifyOwnerSeatAdded } = await import('@/lib/services/notifications/owner-payment-notification')
                await notifyOwnerSeatAdded({
                    clinicId: targetClinicId,
                    clinicName: seatStatus.plan,
                    plan: seatStatus.plan,
                    activeSeats: quote.seats_after,
                    extraSeats: quote.extra_seats_after,
                    monthlyTotalCents: quote.monthly_after_cents,
                    deltaCents: quote.delta_cents,
                    actorUserId: user.id,
                })
            } catch (notifErr) {
                console.error('[SeatUsage] Erro ao notificar dono sobre regularização:', notifErr)
            }

            return NextResponse.json({
                success: true,
                message: 'Licenças regularizadas e confirmadas com sucesso.',
            })
        }

        return NextResponse.json({ error: 'Ação não suportada' }, { status: 400 })
    } catch (error: any) {
        console.error('[POST /api/billing/seat-usage] Erro:', error)
        return NextResponse.json({
            error: error.message || 'Erro ao processar regularização de licenças'
        }, { status: 500 })
    }
}
