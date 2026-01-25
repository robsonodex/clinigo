/**
 * API: TISS Authorization Requests
 * GET /api/tiss/autorizacao - List requests
 * POST /api/tiss/autorizacao - Create request
 */
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, BadRequestError } from '@/lib/utils/errors'
import { successResponse, paginatedResponse } from '@/lib/utils/responses'
import { AutorizacaoService } from '@/lib/services/tiss/autorizacao-service'
import { z } from 'zod'

const createAuthSchema = z.object({
    patient_id: z.string().uuid(),
    doctor_id: z.string().uuid(),
    health_insurance_id: z.string().uuid(),
    clinical_indication: z.string().min(50, 'Justificativa deve ter no mínimo 50 caracteres'),
    procedures: z.array(z.object({
        code: z.string(),
        description: z.string(),
        quantity: z.number().int().positive(),
    })).min(1, 'Adicione pelo menos um procedimento'),
})

/**
 * GET - List authorization requests
 */
export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        if (!userId) {
            throw new BadRequestError('Não autorizado')
        }

        const supabase = await createClient() as any
        const { data: user } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single()

        if (!user?.clinic_id) {
            throw new BadRequestError('Usuário sem clínica associada')
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || undefined
        const startDate = searchParams.get('start_date') || undefined
        const endDate = searchParams.get('end_date') || undefined

        const service = new AutorizacaoService()
        const requests = await service.listRequests(user.clinic_id, {
            status,
            startDate,
            endDate,
        })

        return successResponse({ requests })
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * POST - Create authorization request
 */
export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        if (!userId) {
            throw new BadRequestError('Não autorizado')
        }

        const supabase = await createClient() as any
        const { data: user } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single()

        if (!user?.clinic_id) {
            throw new BadRequestError('Usuário sem clínica associada')
        }

        const body = await request.json()
        const validatedData = createAuthSchema.parse(body)

        const service = new AutorizacaoService()
        const authRequest = await service.createAuthorizationRequest({
            clinic_id: user.clinic_id,
            ...validatedData,
        })

        return successResponse({
            message: 'Solicitação criada com sucesso',
            request: authRequest,
        }, { status: 201 })
    } catch (error) {
        return handleApiError(error)
    }
}
