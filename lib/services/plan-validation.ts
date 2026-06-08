/**
 * Plan Validation Service
 * Valida se mudança de plano é possível
 */
import { createServiceRoleClient } from '@/lib/supabase/server'

interface ValidationResult {
    valid: boolean
    errors: string[]
    warnings: string[]
}

interface PlanLimits {
    max_doctors: number
    max_units: number
    has_tiss: boolean
    has_multi_unit: boolean
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
    STARTER: {
        max_doctors: 1,
        max_units: 1,
        has_tiss: false,
        has_multi_unit: false,
    },
    BASICO: {
        max_doctors: 3,
        max_units: 1,
        has_tiss: false,
        has_multi_unit: false,
    },
    AVANCADO: {
        max_doctors: 10,
        max_units: 3,
        has_tiss: true,
        has_multi_unit: true,
    },
    ENTERPRISE: {
        max_doctors: 999999,
        max_units: 999999,
        has_tiss: true,
        has_multi_unit: true,
    },
}

export class PlanValidationService {
    private supabase = createServiceRoleClient()

    /**
     * Valida se downgrade é possível
     */
    async validateDowngrade(
        clinicId: string,
        newPlan: string
    ): Promise<ValidationResult> {
        const errors: string[] = []
        const warnings: string[] = []

        const newPlanLimits = PLAN_LIMITS[newPlan]

        if (!newPlanLimits) {
            errors.push('Plano inválido')
            return { valid: false, errors, warnings }
        }

        // Verificar número de médicos
        const { count: doctorsCount } = await this.supabase
            .from('doctors')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .eq('is_active', true)

        if ((doctorsCount || 0) > newPlanLimits.max_doctors) {
            errors.push(
                `Você tem ${doctorsCount} profissionais ativos, mas o plano ${newPlan} permite apenas ${newPlanLimits.max_doctors}. ` +
                `Desative ${(doctorsCount || 0) - newPlanLimits.max_doctors} profissional(is) antes de fazer downgrade.`
            )
        }

        // Verificar número de unidades
        const { count: unitsCount } = await this.supabase
            .from('clinic_units')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .eq('is_active', true)

        if ((unitsCount || 0) > newPlanLimits.max_units) {
            errors.push(
                `Você tem ${unitsCount} unidades ativas, mas o plano ${newPlan} permite apenas ${newPlanLimits.max_units}. ` +
                `Desative ${(unitsCount || 0) - newPlanLimits.max_units} unidade(s) antes de fazer downgrade.`
            )
        }

        // Verificar TISS ativo
        if (!newPlanLimits.has_tiss) {
            const { count: tissGuidesCount } = await this.supabase
                .from('tiss_guides')
                .select('*', { count: 'exact', head: true })
                .eq('clinic_id', clinicId)
                .in('status', ['PENDING', 'IN_PROGRESS'])

            if ((tissGuidesCount || 0) > 0) {
                errors.push(
                    `Você possui ${tissGuidesCount} guias TISS pendentes. ` +
                    `Finalize ou cancele todas as guias antes de fazer downgrade.`
                )
            }

            // Warning sobre perda de acesso
            warnings.push(
                'Você perderá acesso ao módulo TISS. Todo histórico será mantido, mas não será possível criar novas guias.'
            )
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        }
    }

    /**
     * Obtém uso atual da clínica
     */
    async getClinicUsage(clinicId: string) {
        const { count: doctorsCount } = await this.supabase
            .from('doctors')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .eq('is_active', true)

        const { count: unitsCount } = await this.supabase
            .from('clinic_units')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .eq('is_active', true)

        const { count: tissGuidesCount } = await this.supabase
            .from('tiss_guides')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)

        return {
            doctors_count: doctorsCount || 0,
            units_count: unitsCount || 0,
            tiss_guides_count: tissGuidesCount || 0,
        }
    }
}
