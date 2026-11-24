import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
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

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const projects = await TasksService.getProjects(auth.clinicId)
        return NextResponse.json({ data: projects })
    } catch (error: any) {
        request.log.error('tasks/projects', { error: error instanceof Error ? error.message : String(error) })
        console.error('[API Task Projects] Erro ao listar projetos:', error)
        return NextResponse.json({ error: 'Erro interno ao listar projetos' }, { status: 500 })
    }
})

const MANAGER_ROLES = new Set(['CLINIC_ADMIN', 'SUPER_ADMIN', 'COORDINATOR'])

export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        if (!MANAGER_ROLES.has(String(auth.userRole || '').toUpperCase())) {
            return NextResponse.json({ error: 'Apenas gestores podem criar projetos' }, { status: 403 })
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
        request.log.error('tasks/projects', { error: error instanceof Error ? error.message : String(error) })
        console.error('[API Task Projects] Erro ao criar projeto:', error)
        return NextResponse.json({ error: 'Erro interno ao criar projeto' }, { status: 500 })
    }
})

export const PATCH = withAxiom(async (request: AxiomRequest) => {
    try {
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        if (!MANAGER_ROLES.has(String(auth.userRole || '').toUpperCase())) {
            return NextResponse.json({ error: 'Apenas gestores podem editar projetos' }, { status: 403 })
        }

        const body = await request.json()
        if (!body.id || !body.name || !String(body.name).trim()) {
            return NextResponse.json({ error: 'ID e nome do projeto são obrigatórios' }, { status: 400 })
        }

        const updated = await TasksService.updateProject(auth.clinicId, String(body.id), {
            name: String(body.name).trim(),
            color: body.color || undefined,
            description: body.description !== undefined ? body.description : undefined,
        })

        if (!updated) {
            return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
        }

        return NextResponse.json({ data: updated })
    } catch (error: any) {
        request.log.error('tasks/projects', { error: error instanceof Error ? error.message : String(error) })
        console.error('[API Task Projects] Erro ao atualizar projeto:', error)
        return NextResponse.json({ error: 'Erro interno ao atualizar projeto' }, { status: 500 })
    }
})

export const DELETE = withAxiom(async (request: AxiomRequest) => {
    try {
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        if (!MANAGER_ROLES.has(String(auth.userRole || '').toUpperCase())) {
            return NextResponse.json({ error: 'Apenas gestores podem arquivar projetos' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) {
            return NextResponse.json({ error: 'ID do projeto é obrigatório' }, { status: 400 })
        }

        const ok = await TasksService.archiveProject(auth.clinicId, id)
        if (!ok) {
            return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        request.log.error('tasks/projects', { error: error instanceof Error ? error.message : String(error) })
        console.error('[API Task Projects] Erro ao arquivar projeto:', error)
        return NextResponse.json({ error: 'Erro interno ao arquivar projeto' }, { status: 500 })
    }
})
