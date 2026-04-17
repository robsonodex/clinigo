/**
 * POST /api/pep/sign/memed - Proxy para integração Memed (STUB)
 * 
 * A integração com a Memed ainda não foi configurada.
 * Esta rota está preparada para futura integração.
 * 
 * Auth: DOCTOR only
 */

import { NextResponse } from 'next/server'
import { requireRole, forbiddenResponse, unauthorizedResponse } from '@/lib/middlewares/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
    try {
        const authResult = await requireRole(['DOCTOR'])
        if (!authResult.authorized) {
            if (authResult.error?.includes('No valid session')) {
                return unauthorizedResponse(authResult.error)
            }
            return forbiddenResponse(authResult.error)
        }

        // Memed integration is not configured yet
        return NextResponse.json({
            error: 'Integração Memed não configurada',
            code: 'MEMED_NOT_CONFIGURED',
            message: 'A integração com a plataforma Memed ainda não foi configurada para esta clínica. Utilize a assinatura ICP-Brasil como alternativa.',
            fallback: 'icp_brasil'
        }, { status: 501 })

    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
