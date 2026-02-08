import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    return NextResponse.json({
        status: 'ok',
        message: 'Test route within [doctorId] segment working!',
        timestamp: new Date().toISOString(),
        path: request.nextUrl.pathname
    })
}
