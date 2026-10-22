import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export const GET = withAxiom(async (request: AxiomRequest) => {
    return NextResponse.json({
        status: 'ok',
        message: 'Test route within [doctorId] segment working!',
        timestamp: new Date().toISOString(),
        path: request.nextUrl.pathname
    })
})
