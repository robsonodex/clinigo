import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createSuperAdminSchema = z.object({
    email: z.string().email('Email inválido'),
    full_name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export async function GET(_request: NextRequest) {
    try {
        const supabase = await createClient()
        const supabaseAdmin = createServiceRoleClient()

        // 1. Verificar se o usuário está logado e é SUPER_ADMIN
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (userData?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Apenas Super Administradores podem acessar esta rota' }, { status: 403 })
        }

        // 2. Buscar Super Administradores cadastrados na plataforma (para a tela /dashboard/super/admins)
        const { data: superAdmins, error: superAdminsError } = await (supabaseAdmin
            .from('users') as any)
            .select('id, email, full_name, created_at, is_active')
            .eq('role', 'SUPER_ADMIN')
            .order('created_at', { ascending: false })

        if (superAdminsError) {
            console.error('[SUPER_ADMIN admins] Erro ao buscar super admins:', superAdminsError)
        }

        // 3. Buscar administradores de clínicas (para a tela /system-master-hub/clin-whatsapp)
        const { data: clinicAdmins, error: clinicAdminsError } = await (supabaseAdmin
            .from('users') as any)
            .select(`
                id,
                email,
                full_name,
                role,
                phone,
                clinic_id,
                clinics!users_clinic_id_fkey (
                    name,
                    phone,
                    is_demo
                )
            `)
            .in('role', ['CLINIC_ADMIN', 'SUPER_ADMIN'])

        if (clinicAdminsError) {
            console.error('[SUPER_ADMIN admins] Erro ao buscar clinic admins:', clinicAdminsError)
        }

        // 4. Filtrar e formatar para WhatsApp broadcast
        const filteredAdmins = (clinicAdmins as any[])?.filter((admin: any) => {
            const isDemoClinic = admin.clinics?.is_demo === true || admin.clinic_id === 'de000000-0000-0000-0000-000000000001'
            const isDemoEmail = admin.email?.endsWith('@demo.clinigo.internal')
            return !isDemoClinic && !isDemoEmail
        }) || []

        const formattedAdmins = filteredAdmins
            .map((admin: any) => {
                const phone = admin.phone || admin.clinics?.phone || null
                return {
                    id: admin.id,
                    name: (admin.full_name || 'Sem Nome').trim(),
                    email: admin.email || '-',
                    phone: phone,
                    role: admin.role || 'USER',
                    clinicName: admin.clinics?.name || 'CliniGo',
                    clinicId: admin.clinic_id
                }
            })
            .filter((admin) => admin.phone !== null)

        formattedAdmins.sort((a, b) => {
            const clinicCompare = a.clinicName.localeCompare(b.clinicName)
            if (clinicCompare !== 0) return clinicCompare
            return a.name.localeCompare(b.name)
        })

        // Retorna tanto 'admins' quanto 'data' para compatibilidade total entre páginas
        return NextResponse.json({
            success: true,
            admins: superAdmins || [],
            data: formattedAdmins || []
        })
    } catch (error) {
        console.error('[SUPER_ADMIN admins] Erro inesperado:', error)
        return NextResponse.json(
            { error: 'Erro interno no servidor' },
            { status: 500 }
        )
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

        // Verificar se usuário atual é super admin
        const { data: currentUser } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (currentUser?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        const normalizedEmail = data.email.trim().toLowerCase()

        // Verificar se e-mail já existe
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', normalizedEmail)
            .maybeSingle()

        if (existingUser) {
            return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 400 })
        }

        // Criar usuário no Supabase Auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password: data.password,
            email_confirm: true,
        })

        if (authError) {
            console.error('[SUPER_ADMIN admins] Auth error:', authError)
            return NextResponse.json({ error: 'Erro ao criar usuário: ' + authError.message }, { status: 400 })
        }

        // Criar registro na tabela users
        const { error: userError } = await supabaseAdmin
            .from('users')
            .insert({
                id: authUser.user.id,
                email: normalizedEmail,
                full_name: data.full_name.trim(),
                role: 'SUPER_ADMIN',
                is_active: true,
                activation_status: 'active',
            })

        if (userError) {
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
            console.error('[SUPER_ADMIN admins] User error:', userError)
            return NextResponse.json({ error: 'Erro ao criar registro: ' + userError.message }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            message: `Super Administrador ${normalizedEmail} cadastrado com sucesso`,
            userId: authUser.user.id,
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors[0]?.message || 'Dados inválidos' }, { status: 400 })
        }
        console.error('[SUPER_ADMIN admins] Error in POST:', error)
        return NextResponse.json({ error: 'Erro interno ao criar administrador' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const adminId = searchParams.get('id')

        if (!adminId) {
            return NextResponse.json({ error: 'ID do administrador não informado' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        // Impedir auto-exclusão
        if (user.id === adminId) {
            return NextResponse.json({ error: 'Você não pode remover a si próprio' }, { status: 400 })
        }

        const supabaseAdmin = createServiceRoleClient() as any

        // Verificar se usuário atual é super admin
        const { data: currentUser } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (currentUser?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        // Deletar da tabela users
        const { error: deleteUserError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', adminId)

        if (deleteUserError) {
            console.error('[SUPER_ADMIN admins] Erro ao deletar da tabela users:', deleteUserError)
        }

        // Deletar do Supabase Auth
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(adminId)
        if (deleteAuthError) {
            console.error('[SUPER_ADMIN admins] Erro ao deletar do auth:', deleteAuthError)
        }

        return NextResponse.json({ success: true, message: 'Administrador removido com sucesso' })
    } catch (error) {
        console.error('[SUPER_ADMIN admins] Delete error:', error)
        return NextResponse.json({ error: 'Erro interno ao remover administrador' }, { status: 500 })
    }
}
