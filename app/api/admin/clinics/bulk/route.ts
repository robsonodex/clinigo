/**
 * PATCH /api/admin/clinics/bulk - Bulk update clinics status
 * DELETE /api/admin/clinics/bulk - Bulk delete/deactivate clinics
 */
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, BadRequestError } from '@/lib/utils/errors'
import { successResponse, noContentResponse } from '@/lib/utils/responses'
import { z } from 'zod'

const bulkClinicUpdateSchema = z.object({
    ids: z.array(z.string().uuid()),
    is_active: z.boolean(),
})

const bulkClinicDeleteSchema = z.object({
    ids: z.array(z.string().uuid()),
})

export async function PATCH(request: NextRequest) {
    try {
        const userRole = request.headers.get('x-user-role')
        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Apenas super administradores podem realizar ações em massa em clínicas')
        }

        const body = await request.json()
        const { ids, is_active } = bulkClinicUpdateSchema.parse(body)

        if (ids.length === 0) {
            throw new BadRequestError('Nenhuma clínica selecionada')
        }

        const supabase = await createClient()

        // Using raw query approach to avoid type issues with dynamic table access
        const client = supabase as unknown as {
            from: (table: string) => {
                update: (data: Record<string, unknown>) => {
                    in: (column: string, values: string[]) => Promise<{ error: Error | null }>
                }
            }
        }

        const { error } = await client
            .from('clinics')
            .update({ is_active })
            .in('id', ids)

        if (error) throw error

        return successResponse({ message: `${ids.length} clínicas atualizadas com sucesso` })
    } catch (error) {
        return handleApiError(error)
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const userRole = request.headers.get('x-user-role')
        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Apenas super administradores podem realizar ações em massa em clínicas')
        }

        const body = await request.json()
        const { ids } = bulkClinicDeleteSchema.parse(body)

        if (ids.length === 0) {
            throw new BadRequestError('Nenhuma clínica selecionada')
        }

        const supabase = await createClient()

        // Using raw query approach to avoid type issues with dynamic table access
        const client = supabase as unknown as {
            from: (table: string) => {
                update: (data: Record<string, unknown>) => {
                    in: (column: string, values: string[]) => Promise<{ error: Error | null }>
                }
            }
        }

        // Soft delete - deactivate
        const { error } = await client
            .from('clinics')
            .update({ is_active: false })
            .in('id', ids)

        if (error) throw error

        return noContentResponse()
    } catch (error) {
        return handleApiError(error)
    }
}

