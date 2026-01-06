import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Get group info and stats
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const groupId = searchParams.get('group_id')

        if (groupId) {
            // Get specific group with clinics
            const { data: group, error } = await supabase
                .from('clinic_groups')
                .select(`
          *,
          clinics(id, name, is_headquarters, branch_code, is_active)
        `)
                .eq('id', groupId)
                .single()

            if (error || !group) {
                return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })
            }

            // Get stats
            const { data: stats } = await supabase.rpc('get_group_stats', { p_group_id: groupId })

            return NextResponse.json({ group, stats: stats?.[0] })
        }

        // Get user's groups
        const { data: groupUsers } = await supabase
            .from('group_users')
            .select(`
        *,
        group:clinic_groups(*)
      `)
            .eq('user_id', user.id)
            .eq('is_active', true)

        const groups = (groupUsers || []).map((gu: any) => ({
            ...gu.group,
            user_role: gu.role,
            permissions: {
                can_manage_clinics: gu.can_manage_clinics,
                can_view_all_reports: gu.can_view_all_reports,
                can_manage_users: gu.can_manage_users,
                can_manage_billing: gu.can_manage_billing
            }
        }))

        return NextResponse.json({ groups })
    } catch (error) {
        console.error('Groups error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Create clinic group
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Check if user is SUPER_ADMIN or CLINIC_ADMIN
        const { data: userData } = await supabase
            .from('users')
            .select('role, clinic_id')
            .eq('id', user.id)
            .single()

        if (!['SUPER_ADMIN', 'CLINIC_ADMIN'].includes((userData as any)?.role)) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
        }

        const body = await request.json()
        const {
            name,
            trade_name,
            cnpj,
            email,
            phone,
            website,
            logo_url,
            primary_color,
            centralized_billing = true,
            shared_patients = true,
            shared_doctors = false,
            shared_inventory = false
        } = body

        if (!name) {
            return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
        }

        // Create group
        const { data: group, error } = await supabase
            .from('clinic_groups')
            .insert({
                name,
                trade_name,
                cnpj,
                email,
                phone,
                website,
                logo_url,
                primary_color,
                centralized_billing,
                shared_patients,
                shared_doctors,
                shared_inventory
            })
            .select()
            .single()

        if (error) {
            console.error('Create group error:', error)
            return NextResponse.json({ error: 'Erro ao criar grupo' }, { status: 500 })
        }

        // Add current user as GROUP_ADMIN
        await supabase.from('group_users').insert({
            group_id: group.id,
            user_id: user.id,
            role: 'GROUP_ADMIN',
            can_manage_clinics: true,
            can_view_all_reports: true,
            can_manage_users: true,
            can_manage_billing: true
        })

        // If user has a clinic, add it to the group as headquarters
        if ((userData as any)?.clinic_id) {
            await supabase
                .from('clinics')
                .update({
                    group_id: group.id,
                    is_headquarters: true,
                    branch_code: 'HQ'
                })
                .eq('id', (userData as any).clinic_id)
        }

        return NextResponse.json({ group })
    } catch (error) {
        console.error('Create group error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// PATCH: Update group settings
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
        }

        // Check permission
        const { data: groupUser } = await supabase
            .from('group_users')
            .select('role')
            .eq('group_id', id)
            .eq('user_id', user.id)
            .single()

        if ((groupUser as any)?.role !== 'GROUP_ADMIN') {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
        }

        const { data: group, error } = await supabase
            .from('clinic_groups')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Update group error:', error)
            return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
        }

        return NextResponse.json({ group })
    } catch (error) {
        console.error('Update group error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
