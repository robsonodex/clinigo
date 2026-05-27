import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
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

        // 2. Buscar usuários administradores e suas respectivas clínicas
        const { data: admins, error } = await supabaseAdmin
            .from('users')
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

        if (error) {
            console.error('[SUPER_ADMIN admins] Erro ao buscar admins:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // 3. Filtrar e Formatar dados de retorno
        const filteredAdmins = admins?.filter((admin: any) => {
            // Excluir se for a clínica de demonstração ou se o email for de demo
            const isDemoClinic = admin.clinics?.is_demo === true || admin.clinic_id === 'de000000-0000-0000-0000-000000000001'
            const isDemoEmail = admin.email?.endsWith('@demo.clinigo.internal')
            return !isDemoClinic && !isDemoEmail
        }) || []

        const formattedAdmins = filteredAdmins
            .map((admin: any) => {
                // Fallback de telefone: prioriza o telefone do usuário, senão usa o da clínica
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
            // Filtrar apenas administradores que de fato possuem algum telefone resolvido
            .filter((admin) => admin.phone !== null)

        // Ordenar os admins por nome da clínica, e depois por nome do administrador
        formattedAdmins.sort((a, b) => {
            const clinicCompare = a.clinicName.localeCompare(b.clinicName)
            if (clinicCompare !== 0) return clinicCompare
            return a.name.localeCompare(b.name)
        })

        return NextResponse.json({
            success: true,
            data: formattedAdmins
        })
    } catch (error) {
        console.error('[SUPER_ADMIN admins] Erro inesperado:', error)
        return NextResponse.json(
            { error: 'Erro interno no servidor' },
            { status: 500 }
        )
    }
}
