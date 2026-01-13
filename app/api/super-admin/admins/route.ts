import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createSuperAdminSchema = z.object({
    email: z.string().email('Email inválido'),
    full_name: z.string().min(3, 'Nome é obrigatório'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const supabaseAdmin = createServiceRoleClient() as any

        // Verify current user is super admin
        const { data: currentUser } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (currentUser?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        // List all super admins
        const { data: admins, error } = await supabaseAdmin
            .from('users')
            .select('id, email, full_name, created_at, is_active')
            .eq('role', 'SUPER_ADMIN')
            .order('created_at', { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, admins })
    } catch (error) {
        console.error('[SuperAdmin] Error listing:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const data = createSuperAdminSchema.parse(body)

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const supabaseAdmin = createServiceRoleClient() as any

        // Verify current user is super admin
        const { data: currentUser } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (currentUser?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        // Check if email already exists
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', data.email.toLowerCase())
            .maybeSingle()

        if (existingUser) {
            return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 400 })
        }

        // Create user in Supabase Auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email.toLowerCase(),
            password: data.password,
            email_confirm: true,
        })

        if (authError) {
            console.error('[SuperAdmin] Auth error:', authError)
            return NextResponse.json({ error: 'Erro ao criar usuário: ' + authError.message }, { status: 400 })
        }

        // Create user record
        const { error: userError } = await supabaseAdmin
            .from('users')
            .insert({
                id: authUser.user.id,
                email: data.email.toLowerCase(),
                full_name: data.full_name,
                role: 'SUPER_ADMIN',
                is_active: true,
                activation_status: 'active',
            })

        if (userError) {
            // Rollback auth user
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
            console.error('[SuperAdmin] User error:', userError)
            return NextResponse.json({ error: 'Erro ao criar registro: ' + userError.message }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            message: `Super Admin ${data.email} criado com sucesso!`,
            userId: authUser.user.id,
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
        }
        console.error('[SuperAdmin] Error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const adminId = searchParams.get('id')

        if (!adminId) {
            return NextResponse.json({ error: 'ID não informado' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        // Cannot delete yourself
        if (user.id === adminId) {
            return NextResponse.json({ error: 'Você não pode remover a si mesmo' }, { status: 400 })
        }

        const supabaseAdmin = createServiceRoleClient() as any

        // Verify current user is super admin
        const { data: currentUser } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (currentUser?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        // Delete from users table
        await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', adminId)

        // Delete from auth
        await supabaseAdmin.auth.admin.deleteUser(adminId)

        return NextResponse.json({ success: true, message: 'Admin removido' })

    } catch (error) {
        console.error('[SuperAdmin] Delete error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
