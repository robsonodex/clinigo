import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    return NextResponse.json({
        message: 'Nested static route works!',
        timestamp: Date.now(),
        path: '/api/appointments/test-static'
    })
}
