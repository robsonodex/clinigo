/**
 * POST /api/super-admin/extend-trial - Extend clinic trial period (Super Admin only)
 * Activates the clinic and sets a new trial expiration date (default +7 days)
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, BadRequestError, NotFoundError } from '@/lib/utils/errors'

export async function POST(request: NextRequest) {
    try {
        const userRole = request.headers.get('x-user-role')

        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Apenas super administradores podem estender períodos de teste')
        }

        const body = await request.json()
        const { clinicId, days = 7 } = body

        if (!clinicId) {
            throw new BadRequestError('Informe o clinicId')
        }

        const supabase = createServiceRoleClient()

        // Verify if clinic exists
        const { data: clinic, error: fetchError } = await supabase
            .from('clinics')
            .select('id, name')
            .eq('id', clinicId)
            .single()

        if (fetchError || !clinic) {
            throw new NotFoundError('Clínica não encontrada')
        }

        // Calculate new trial end date (today + X days)
        const newTrialEnd = new Date()
        newTrialEnd.setDate(newTrialEnd.getDate() + days)
        // Set to end of the day
        newTrialEnd.setHours(23, 59, 59, 999)

        // Update clinic status
        const { error: updateError } = await supabase
            .from('clinics')
            .update({
                is_active: true,
                approval_status: 'trial',
                trial_ends_at: newTrialEnd.toISOString(),
                payment_confirmed: true // Allow access during the trial extension
            })
            .eq('id', clinicId)

        if (updateError) {
            throw new Error(`Erro ao atualizar clínica: ${updateError.message}`)
        }

        // Create audit log
        try {
            const { createAuditLog } = await import('@/lib/services/audit')
            await createAuditLog({
                action: `Período de teste estendido em ${days} dias para a clínica ${clinic.name}`,
                entityType: 'clinics',
                entityId: clinicId,
                severity: 'WARNING',
                metadata: {
                    clinic_name: clinic.name,
                    extended_by: 'SUPER_ADMIN',
                    days,
                    new_expiration: newTrialEnd.toISOString()
                }
            })
        } catch (auditError) {
            console.error('Erro ao criar log de auditoria:', auditError)
        }

        return NextResponse.json({
            success: true,
            message: `Clínica "${clinic.name}" ativada e período de testes estendido por mais ${days} dias (Expira em: ${newTrialEnd.toLocaleDateString('pt-BR')})`,
            newExpirationDate: newTrialEnd.toISOString()
        })

    } catch (error) {
        return handleApiError(error)
    }
}
