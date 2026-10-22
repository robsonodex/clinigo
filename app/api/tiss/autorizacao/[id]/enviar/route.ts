import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { requireTissAction, enforceTissAdministrativeGuard } from '@/lib/auth/tiss-role-guard';
/**
 * API: Send Authorization Request
 * POST /api/tiss/autorizacao/[id]/enviar
 */
import { type NextRequest } from 'next/server'
import { handleApiError, NotFoundError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { AutorizacaoService } from '@/lib/services/tiss/autorizacao-service'

export const POST = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    const guard = await requireTissAction(request, 'autorizacao.enviar');
    if (!guard.authorized) {
        return guard.response;
    }
    try {
        const { id } = await params
        const service = new AutorizacaoService()

        const updatedRequest = await service.sendToOperator(id)

        return successResponse({
            message: 'Solicitação enviada para a operadora',
            request: updatedRequest,
        })
    } catch (error) {
        request.log.error('tiss/autorizacao/[id]/enviar', { error: error instanceof Error ? error.message : String(error) })
        return handleApiError(error)
    }
})
