import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
    extractClinicalModulesFromTheme,
    normalizeClinicClinicalModules,
} from '@/lib/utils/clinic-clinical-modules'

export const dynamic = 'force-dynamic'

async function resolveAuthenticatedClinicContext() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    const adminClient = createServiceRoleClient() as any
    const { data: profile } = await adminClient
        .from('users')
        .select('clinic_id, role')
        .eq('id', user.id)
        .single()

    if (!profile) {
        return { error: NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 }) }
    }

    let clinicId: string | null = profile.clinic_id || null
    const role: string = profile.role || ''

    if (role === 'SUPER_ADMIN') {
        const cookieStore = await cookies()
        const impActive = cookieStore.get('impersonation_active')?.value === 'true'
        const impClinicId =
            cookieStore.get('impersonation_clinic_id')?.value ||
            cookieStore.get('clinic_id')?.value
        if (impActive && impClinicId) {
            clinicId = impClinicId
        } else if (!clinicId && impClinicId) {
            clinicId = impClinicId
        }
    }

    if (!clinicId) {
        return { error: NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 }) }
    }

    return { adminClient, clinicId, role }
}

/**
 * GET /api/clinics/clinical-modules
 * Retorna os módulos clínicos e operacionais configurados para a clínica do usuário autenticado.
 */
export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const ctx = await resolveAuthenticatedClinicContext()
        if ('error' in ctx) return ctx.error

        const { data: clinic, error } = await ctx.adminClient
            .from('clinics')
            .select('id, name, theme')
            .eq('id', ctx.clinicId)
            .single()

        if (error || !clinic) {
            request.log.error('clinics/clinical-modules', { error: error?.message || 'not_found' })
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const modules = extractClinicalModulesFromTheme(clinic.theme, clinic.id)

        return NextResponse.json(
            {
                clinicId: clinic.id,
                clinicName: clinic.name || '',
                modules,
            },
            {
                headers: {
                    'Cache-Control': 'private, no-store',
                },
            }
        )
    } catch (error) {
        request.log.error('clinics/clinical-modules', {
            error: error instanceof Error ? error.message : String(error),
        })
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
})

/**
 * PATCH /api/clinics/clinical-modules
 * Atualiza os módulos clínicos/operacionais da clínica em clinics.theme.clinical_modules
 * e sincroniza clinica_modulos (para manter RLS de Psicomotricidade e Planos de Sessão alinhados).
 * Restrito a CLINIC_ADMIN e SUPER_ADMIN com isolamento estrito por clinic_id.
 */
export const PATCH = withAxiom(async (request: AxiomRequest) => {
    try {
        const ctx = await resolveAuthenticatedClinicContext()
        if ('error' in ctx) return ctx.error

        if (!['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(ctx.role)) {
            return NextResponse.json(
                { error: 'Apenas administradores podem alterar os módulos da clínica.' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const rawInput = body?.modules ?? body

        if (!rawInput || typeof rawInput !== 'object') {
            return NextResponse.json({ error: 'Configuração de módulos inválida' }, { status: 400 })
        }

        const { data: currentClinic, error: fetchError } = await ctx.adminClient
            .from('clinics')
            .select('theme')
            .eq('id', ctx.clinicId)
            .single()

        if (fetchError || !currentClinic) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const currentModules = extractClinicalModulesFromTheme(currentClinic.theme, ctx.clinicId)
        const nextModules = normalizeClinicClinicalModules(
            {
                ...currentModules,
                ...rawInput,
            },
            ctx.clinicId
        )

        const updatedTheme = {
            ...(currentClinic.theme || {}),
            clinical_modules: nextModules,
        }

        const { error: updateError } = await ctx.adminClient
            .from('clinics')
            .update({ theme: updatedTheme })
            .eq('id', ctx.clinicId)

        if (updateError) {
            request.log.error('clinics/clinical-modules', { error: updateError.message })
            return NextResponse.json({ error: 'Erro ao salvar módulos da clínica' }, { status: 500 })
        }

        // Sincroniza clinica_modulos para manter políticas RLS de Psicomotricidade e Evolução Estruturada 100% alinhadas
        const psicoEnabled =
            nextModules.sessionPlansEnabled &&
            nextModules.sessionPlanSpecialties.includes('psicomotricidade')

        const enabledSessionSpecs = nextModules.sessionPlansEnabled
            ? nextModules.sessionPlanSpecialties
            : []

        const nowIso = new Date().toISOString()

        await Promise.all([
            ctx.adminClient.from('clinica_modulos').upsert(
                {
                    clinica_id: ctx.clinicId,
                    modulo_id: 'psicomotricidade_sensory',
                    ativo: psicoEnabled,
                    modulos_planos_sessao_habilitados: enabledSessionSpecs,
                    updated_at: nowIso,
                },
                { onConflict: 'clinica_id,modulo_id' }
            ),
            ctx.adminClient.from('clinica_modulos').upsert(
                {
                    clinica_id: ctx.clinicId,
                    modulo_id: 'evolucao_world_sensory',
                    ativo: nextModules.structuredEvolutionDefault,
                    updated_at: nowIso,
                },
                { onConflict: 'clinica_id,modulo_id' }
            ),
        ])

        return NextResponse.json({
            success: true,
            modules: nextModules,
        })
    } catch (error) {
        request.log.error('clinics/clinical-modules', {
            error: error instanceof Error ? error.message : String(error),
        })
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
})
