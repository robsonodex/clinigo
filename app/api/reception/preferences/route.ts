import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
    RECEPTION_PREFERENCES_ALLOWED_ROLES,
    normalizeReceptionModules,
} from '@/lib/utils/reception-modules'

export const dynamic = 'force-dynamic'

async function getAuthenticatedReceptionProfile() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    const adminClient = createServiceRoleClient() as any
    const { data: profile, error: profileError } = await adminClient
        .from('users')
        .select('clinic_id, role')
        .eq('id', user.id)
        .single()

    if (profileError || !profile?.clinic_id) {
        return { error: NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 }) }
    }

    if (!RECEPTION_PREFERENCES_ALLOWED_ROLES.includes(profile.role || '')) {
        return {
            error: NextResponse.json(
                { error: 'Sem permissão para gerenciar preferências da recepção.' },
                { status: 403 }
            ),
        }
    }

    return { adminClient, clinicId: profile.clinic_id as string }
}

/**
 * GET /api/reception/preferences
 * Retorna quais módulos rápidos estão visíveis na tela de Recepção da clínica.
 */
export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const auth = await getAuthenticatedReceptionProfile()
        if ('error' in auth) return auth.error

        const { data: clinic, error } = await auth.adminClient
            .from('clinics')
            .select('theme')
            .eq('id', auth.clinicId)
            .single()

        if (error || !clinic) {
            request.log.error('reception/preferences', { error: error?.message || 'clinic_not_found' })
            return NextResponse.json({ error: 'Erro ao carregar preferências da recepção' }, { status: 500 })
        }

        const modules = normalizeReceptionModules(clinic.theme?.reception_visible_modules)

        return NextResponse.json(
            { modules },
            {
                headers: {
                    'Cache-Control': 'private, no-store',
                },
            }
        )
    } catch (error) {
        request.log.error('reception/preferences', {
            error: error instanceof Error ? error.message : String(error),
        })
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
})

/**
 * PATCH /api/reception/preferences
 * Persiste os toggles de visibilidade dos módulos da Recepção em clinics.theme.reception_visible_modules.
 * Acessível à equipe de recepção e administração da própria clínica (isolamento estrito por clinic_id).
 */
export const PATCH = withAxiom(async (request: AxiomRequest) => {
    try {
        const auth = await getAuthenticatedReceptionProfile()
        if ('error' in auth) return auth.error

        const body = await request.json()
        const rawModules = body?.modules ?? body

        if (!rawModules || typeof rawModules !== 'object') {
            return NextResponse.json({ error: 'Payload de módulos inválido' }, { status: 400 })
        }

        const { data: currentClinic, error: fetchError } = await auth.adminClient
            .from('clinics')
            .select('theme')
            .eq('id', auth.clinicId)
            .single()

        if (fetchError || !currentClinic) {
            request.log.error('reception/preferences', { error: fetchError?.message || 'clinic_not_found' })
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const currentModules = normalizeReceptionModules(currentClinic.theme?.reception_visible_modules)
        const nextModules = normalizeReceptionModules({
            ...currentModules,
            ...(typeof rawModules.tvPanel === 'boolean' ? { tvPanel: rawModules.tvPanel } : {}),
            ...(typeof rawModules.totem === 'boolean' ? { totem: rawModules.totem } : {}),
            ...(typeof rawModules.faceCheckin === 'boolean' ? { faceCheckin: rawModules.faceCheckin } : {}),
            ...(typeof rawModules.qrScanner === 'boolean' ? { qrScanner: rawModules.qrScanner } : {}),
        })

        const updatedTheme = {
            ...(currentClinic.theme || {}),
            reception_visible_modules: nextModules,
        }

        const { error: updateError } = await auth.adminClient
            .from('clinics')
            .update({ theme: updatedTheme })
            .eq('id', auth.clinicId)

        if (updateError) {
            request.log.error('reception/preferences', { error: updateError.message })
            return NextResponse.json({ error: 'Erro ao salvar preferências da recepção' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            modules: nextModules,
        })
    } catch (error) {
        request.log.error('reception/preferences', {
            error: error instanceof Error ? error.message : String(error),
        })
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
})
