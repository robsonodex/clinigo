import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export const GET = withAxiom(async (request: AxiomRequest) => {
    return NextResponse.json({ status: 'ok', message: 'Doctors probe working', timestamp: new Date().toISOString() })
})
