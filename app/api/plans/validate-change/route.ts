/**
 * API: Validate Plan Change
 * POST /api/plans/validate-change
 */
import { type NextRequest } from 'next/server'
import { successResponse, handleApiError, BadRequestError } from '@/lib/utils/responses'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const validateSchema = z.object({
    new_plan: z.enum(['STARTER', 'BASICO', 'AVANCADO', 'ENTERPRISE']),
})

const PLAN_LIMITS = {
    STARTER: { max_doctors: 1, max_units: 1 },
    BASICO: { max_doctors: 3, max_units: 1 },
    AVANCADO: { max_doctors: 10, max_units: 3 },
    ENTERPRISE: { max_doctors: 999999, max_units: 999999 },
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            throw new BadRequestError('Not authenticated')
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!userData?.clinic_id) {
            throw new BadRequestError('User not associated with clinic')
        }

        const body = await request.json()
        const validatedData = validateSchema.parse(body)

        // Buscar uso atual
        const { count: doctorsCount } = await supabase
            .from('doctors')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', userData.clinic_id)

        const { count: unitsCount } = await supabase
            .from('clinic_units')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', userData.clinic_id)

        const newPlanLimits = PLAN_LIMITS[validatedData.new_plan]
        const errors: string[] = []

        // Validar limites
        if ((doctorsCount || 0) > newPlanLimits.max_doctors) {
            errors.push(
                `Você tem ${doctorsCount} médicos cadastrados, mas o plano ${validatedData.new_plan} permite apenas ${newPlanLimits.max_doctors}`
            )
        }

        if ((unitsCount || 0) > newPlanLimits.max_units) {
            errors.push(
                `Você tem ${unitsCount} unidades cadastradas, mas o plano ${validatedData.new_plan} permite apenas ${newPlanLimits.max_units}`
            )
        }

        const isValid = errors.length === 0

        return successResponse({
            valid: isValid,
            errors,
            current_usage: {
                doctors: doctorsCount || 0,
                units: unitsCount || 0,
            },
            new_plan_limits: newPlanLimits,
        })
    } catch (error) {
        return handleApiError(error)
    }
}
