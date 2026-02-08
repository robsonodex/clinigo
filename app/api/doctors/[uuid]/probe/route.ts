import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface RouteParams {
    params: Promise<{ uuid: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
    const { uuid: doctorId } = await params
    return NextResponse.json({
        status: 'ok',
        message: 'Dynamic Doctor Probe working',
        doctorId,
        timestamp: new Date().toISOString()
    })
}
