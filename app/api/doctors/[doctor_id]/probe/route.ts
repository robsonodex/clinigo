import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface RouteParams {
    params: Promise<{ doctor_id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
    const { doctor_id: doctorId } = await params
    return NextResponse.json({
        status: 'ok',
        message: 'Dynamic Doctor Probe working',
        doctorId,
        timestamp: new Date().toISOString()
    })
}
