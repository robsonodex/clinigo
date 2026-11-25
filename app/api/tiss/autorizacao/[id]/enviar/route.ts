import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { requireTissAction } from '@/lib/auth/tiss-role-guard'
/**
 * API: Send Authorization Request
 * POST /api/tiss/autorizacao/[id]/enviar
 */
import { handleApiError, NotFoundError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { AutorizacaoService } from '@/lib/services/tiss/autorizacao-service'

export const POST = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireTissAction(request, 'autorizacao.enviar')
    if (!guard.authorized) {
        return guard.response
    }
    try {
        const { id } = await params
        const clinicId = guard.session?.clinicId
        if (!clinicId) {
            throw new NotFoundError('Clínica não vinculada à sessão')
        }

        const service = new AutorizacaoService()
        const updatedRequest = await service.sendToOperator(id, clinicId)

        return successResponse({
            message: 'Solicitação registrada como enviada para a operadora',
            request: updatedRequest,
        })
    } catch (error) {
        request.log.error('tiss/autorizacao/[id]/enviar', { error: error instanceof Error ? error.message : String(error) })
        if (error instanceof Error && error.message.includes('não encontrada')) {
            return handleApiError(new NotFoundError(error.message))
        }
        return handleApiError(error)
    }
})
