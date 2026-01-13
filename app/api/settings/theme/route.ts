import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, UnauthorizedError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { ClinicTheme } from '@/types/clinic-theme'

/**
 * GET /api/settings/theme
 * Get the current clinic's theme settings
 */
export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId) {
            throw new UnauthorizedError('Não autorizado')
        }

        const supabase = await createClient()

        // Get user's clinic_id
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single()

        let clinicId = (user as any)?.clinic_id as string

        // Fallback for Super Admin: Use first active clinic if none associated
        if (!clinicId && ['SUPER_ADMIN'].includes(userRole || '')) {
            const { data: firstClinic } = await (supabase as any)
                .from('clinics')
                .select('id')
                .eq('is_active', true)
                .limit(1)
                .single()

            if (firstClinic) {
                clinicId = firstClinic.id
                console.log('[API Theme] Super Admin fallback: Using clinic', clinicId)
            }
        }

        if (!clinicId) {
            console.error('[API Theme] Auth Check Failed: No clinic associated', { userId })
            throw new UnauthorizedError('Usuário sem clínica associada')
        }

        console.log('[API Theme] Fetching for clinic:', clinicId)

        // Get clinic theme
        const { data: clinic, error } = await (supabase as any)
            .from('clinics')
            .select('id, name, theme, slug, plan_type')
            .eq('id', clinicId)
            .single()

        if (error || !clinic) {
            console.error('[API Theme] Clinic not found:', { clinicId, error })
            throw new Error('Clínica não encontrada')
        }

        // Auto-fix: Generate slug if missing
        if (!clinic.slug && clinic.name) {
            try {
                const baseSlug = clinic.name
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '') // Remove accents
                    .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric with hyphens
                    .replace(/(^-|-$)+/g, '')        // Remove leading/trailing hyphens
                    || 'clinica'

                // Add short random suffix to ensure uniqueness
                const randomSuffix = Math.floor(Math.random() * 10000).toString()
                const newSlug = `${baseSlug}-${randomSuffix}`

                console.log('[API Theme] Auto-generating slug:', newSlug)

                const { error: updateError } = await (supabase as any)
                    .from('clinics')
                    .update({ slug: newSlug })
                    .eq('id', clinicId)

                if (!updateError) {
                    clinic.slug = newSlug
                } else {
                    console.error('[API Theme] Failed to save auto-generated slug:', updateError)
                }
            } catch (err) {
                console.error('[API Theme] Error auto-generating slug:', err)
            }
        }

        return successResponse({
            theme: clinic.theme || {},
            slug: clinic.slug,
            plan_type: clinic.plan_type,
        })
    } catch (error) {
        console.error('[API Theme Error] falha ao buscar tema:', error)
        return handleApiError(error)
    }
}

/**
 * PUT /api/settings/theme
 * Update the current clinic's theme settings
 */
export async function PUT(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId) {
            throw new UnauthorizedError('Não autorizado')
        }

        // Check if user has permission to edit settings
        if (!['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
            throw new ForbiddenError('Sem permissão para editar configurações')
        }

        const supabase = await createClient()

        // Get user's clinic_id
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single()

        if (userError || !user?.clinic_id) {
            throw new UnauthorizedError('Usuário sem clínica associada')
        }

        const clinicId = (user as any).clinic_id as string

        const body = await request.json()
        const { theme } = body as { theme: Partial<ClinicTheme> }

        if (!theme || typeof theme !== 'object') {
            return NextResponse.json(
                { error: 'Tema inválido' },
                { status: 400 }
            )
        }

        const { error } = await (supabase as any)
            .from('clinics')
            .update({
                theme,
                updated_at: new Date().toISOString()
            })
            .eq('id', clinicId)

        if (error) {
            console.error('Error updating theme:', error)
            return NextResponse.json(
                { error: 'Erro ao salvar tema' },
                { status: 500 }
            )
        }

        return successResponse({ success: true })
    } catch (error) {
        return handleApiError(error)
    }
}
