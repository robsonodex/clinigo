import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export const GET = withAxiom(async (request: AxiomRequest) => {
    return NextResponse.json({
        message: 'pong',
        timestamp: Date.now(),
        env: process.env.NODE_ENV
    })
})
