import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getClinicBackupOverview } from '@/lib/services/clinic-backup-service'

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: clinicId } = await context.params
        if (!clinicId) {
            return NextResponse.json({ error: 'ID da clínica não fornecido.' }, { status: 400 })
        }

        // 1. Validar autenticação e autorização de Super Admin
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
        }

        const supabaseAdmin = createServiceRoleClient()
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('role, email')
            .eq('id', user.id)
            .single()

        const isSuperAdmin = userData?.role === 'SUPER_ADMIN' || user.email === 'contato@clinigo.app'
        if (!isSuperAdmin) {
            return NextResponse.json({ error: 'Acesso restrito a Super Administradores.' }, { status: 403 })
        }

        // 2. Executar levantamento de visão geral (Raio-X)
        const overview = await getClinicBackupOverview(clinicId)

        return NextResponse.json(overview)
    } catch (error: any) {
        console.error('[API_CLINIC_BACKUP_OVERVIEW_ERROR]:', error)
        return NextResponse.json(
            { error: error?.message || 'Erro ao processar visão geral do backup.' },
            { status: 500 }
        )
    }
}
