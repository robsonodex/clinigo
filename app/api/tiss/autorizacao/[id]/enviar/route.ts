/**
 * API: Send Authorization Request
 * POST /api/tiss/autorizacao/[id]/enviar
 */
import { type NextRequest } from 'next/server'
import { handleApiError, NotFoundError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { AutorizacaoService } from '@/lib/services/tiss/autorizacao-service'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const service = new AutorizacaoService()

        const updatedRequest = await service.sendToOperator(id)

        return successResponse({
            message: 'Solicitação enviada para a operadora',
            request: updatedRequest,
        })
    } catch (error) {
        return handleApiError(error)
    }
}
