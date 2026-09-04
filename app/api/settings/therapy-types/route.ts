/**
 * GET /api/settings/therapy-types
 * PUT /api/settings/therapy-types
 * 
 * Gerencia os tipos de terapia configuráveis por clínica
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveClinicId } from '@/lib/utils/resolve-clinic-id'

const DEFAULT_THERAPY_TYPES = [
    'Psicologia ABA',
    'Psicologia TCC',
    'Fonoaudiologia',
    'Terapia Ocupacional',
    'Psicomotricidade',
    'Psicopedagogia',
    'Musicoterapia',
    'Nutrição',
    'AT Escolar',
    'AT Domiciliar',
    'Estagiária',
    'Outros',
]

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        const { clinicId: resolvedClinicId } = await resolveClinicId({
            profileClinicId: (profile as any)?.clinic_id,
            profileRole: (profile as any)?.role || '',
        })

        if (!resolvedClinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const { data: settings } = await (supabase as any)
            .from('clinic_settings')
            .select('therapy_types')
            .eq('clinic_id', resolvedClinicId)
            .single()

        const therapyTypes = settings?.therapy_types || DEFAULT_THERAPY_TYPES

        return NextResponse.json({ data: therapyTypes })
    } catch (error) {
        console.error('Therapy types GET error:', error)
        return NextResponse.json({ data: DEFAULT_THERAPY_TYPES })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        const { clinicId: resolvedClinicId } = await resolveClinicId({
            profileClinicId: (profile as any)?.clinic_id,
            profileRole: (profile as any)?.role || '',
        })

        if (!resolvedClinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        if (!['CLINIC_ADMIN', 'SUPER_ADMIN'].includes((profile as any)?.role || '')) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
        }

        const body = await request.json()
        const { therapy_types } = body

        if (!Array.isArray(therapy_types) || therapy_types.length === 0) {
            return NextResponse.json({ error: 'É necessário pelo menos um tipo de terapia' }, { status: 400 })
        }

        // Upsert na clinic_settings
        const { error } = await (supabase as any)
            .from('clinic_settings')
            .upsert(
                {
                    clinic_id: resolvedClinicId,
                    therapy_types,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'clinic_id', ignoreDuplicates: false }
            )

        if (error) throw error

        return NextResponse.json({ data: therapy_types, message: 'Terapias atualizadas com sucesso' })
    } catch (error) {
        console.error('Therapy types PUT error:', error)
        return NextResponse.json({ error: 'Erro ao salvar terapias' }, { status: 500 })
    }
}
