/**
 * API Route para confirmar email de usuário manualmente
 * Acesse: http://localhost:3000/api/super-admin/confirm-email?email=robsonfenriz@hotmail.com
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const email = searchParams.get('email')

        if (!email) {
            return NextResponse.json(
                { error: 'Email é obrigatório' },
                { status: 400 }
            )
        }

        console.log(`[CONFIRM EMAIL] Confirmando email: ${email}`)

        const supabase = createServiceRoleClient()

        // 1. Buscar usuário no auth
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

        if (listError) {
            console.error('[CONFIRM EMAIL] Erro ao listar usuários:', listError)
            return NextResponse.json(
                { error: 'Erro ao buscar usuário', details: listError.message },
                { status: 500 }
            )
        }

        const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

        if (!user) {
            return NextResponse.json(
                { error: `Usuário não encontrado: ${email}` },
                { status: 404 }
            )
        }

        console.log(`[CONFIRM EMAIL] Usuário encontrado: ${user.id}`)
        console.log(`[CONFIRM EMAIL] Email já confirmado: ${!!user.email_confirmed_at}`)

        // 2. Confirmar email se ainda não estiver
        if (!user.email_confirmed_at) {
            const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
                email_confirm: true
            })

            if (error) {
                console.error('[CONFIRM EMAIL] Erro ao confirmar:', error)
                return NextResponse.json(
                    { error: 'Erro ao confirmar email', details: error.message },
                    { status: 500 }
                )
            }

            console.log(`[CONFIRM EMAIL] ✅ Email confirmado com sucesso!`)
        } else {
            console.log(`[CONFIRM EMAIL] ✅ Email já estava confirmado`)
        }

        // 3. Buscar dados completos do usuário
        const { data: publicUser, error: publicError } = await supabase
            .from('users')
            .select('*, clinics(name, is_active, approval_status, plan_type)')
            .eq('id', user.id)
            .single()

        if (publicError) {
            console.error('[CONFIRM EMAIL] Erro ao buscar dados públicos:', publicError)
        }

        return NextResponse.json({
            success: true,
            message: `Email ${email} confirmado com sucesso! Usuário pode fazer login agora.`,
            user: {
                id: user.id,
                email: user.email,
                email_confirmed: true,
                full_name: publicUser?.full_name,
                role: publicUser?.role,
                is_active: publicUser?.is_active,
                clinic: publicUser?.clinics
            }
        })

    } catch (error) {
        console.error('[CONFIRM EMAIL] Erro inesperado:', error)
        return NextResponse.json(
            { error: 'Erro interno', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}
