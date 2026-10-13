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

        const { searchParams } = new URL(request.url)
        const viewMode = searchParams.get('view_mode') || undefined

        const summary = await TasksService.getSummary(
            auth.clinicId,
            auth.user.id,
            auth.userRole || 'STAFF',
            viewMode
        )

        return NextResponse.json({ data: summary })
    } catch (error: any) {
        console.error('[API Tasks Summary] Erro ao obter resumo:', error)
        return NextResponse.json({ error: 'Erro interno ao obter métricas' }, { status: 500 })
    }
}
