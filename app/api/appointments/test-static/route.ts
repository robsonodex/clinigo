import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export const GET = withAxiom(async (request: AxiomRequest) => {
    return NextResponse.json({
        message: 'Nested static route works!',
        timestamp: Date.now(),
        path: '/api/appointments/test-static'
    })
})
