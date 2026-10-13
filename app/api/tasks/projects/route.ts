import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TasksService } from '@/lib/services/tasks-service'

async function getAuthContext(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'Não autorizado', status: 401 }
    }

    const headerClinicId = request.headers.get('x-clinic-id')
    const headerUserRole = request.headers.get('x-user-role')

    let clinicId = headerClinicId
    let userRole = headerUserRole

    if (!clinicId || !userRole) {
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        clinicId = (userData as any)?.clinic_id
        userRole = (userData as any)?.role
    }

    if (!clinicId) {
        return { error: 'Clínica não encontrada', status: 400 }
    }

    return { user, clinicId, userRole }
}

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const projects = await TasksService.getProjects(auth.clinicId)
        return NextResponse.json({ data: projects })
    } catch (error: any) {
        console.error('[API Task Projects] Erro ao listar projetos:', error)
        return NextResponse.json({ error: 'Erro interno ao listar projetos' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const body = await request.json()
        if (!body.name || !body.name.trim()) {
            return NextResponse.json({ error: 'O nome do projeto é obrigatório' }, { status: 400 })
        }

        const project = await TasksService.createProject(
            auth.clinicId,
            body.name.trim(),
            body.color || '#10b981',
            body.description,
            auth.user.id
        )

        return NextResponse.json({ data: project }, { status: 201 })
    } catch (error: any) {
        console.error('[API Task Projects] Erro ao criar projeto:', error)
        return NextResponse.json({ error: 'Erro interno ao criar projeto' }, { status: 500 })
    }
}
