import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicBackupOverview } from '@/lib/services/clinic-backup-service'

interface Props {
    params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

/**
 * GET /api/super-admin/clinics/[id]/backup/overview
 * Retorna o Raio-X dos dados da clínica (DB + R2) antes de compilar o pacote
 * Restrito estritamente a SUPER_ADMIN
 */
export async function GET(request: NextRequest, { params }: Props) {
    try {
        const { id: clinicId } = await params

        // 1. Validar autenticação e perfil SUPER_ADMIN
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userData || userData.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Acesso negado: Requer privilégios de Super Admin' }, { status: 403 })
        }

        // 2. Buscar Raio-X
        const overview = await getClinicBackupOverview(clinicId)

        return NextResponse.json({
            success: true,
            overview
        })
    } catch (error: any) {
        console.error('[SUPER_ADMIN_BACKUP_OVERVIEW_ERROR]', error)
        return NextResponse.json(
            { error: error?.message || 'Erro ao consultar volumetria da clínica' },
            { status: 500 }
        )
    }
}
