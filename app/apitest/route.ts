import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    return NextResponse.json({
        message: 'Root APITEST works',
        timestamp: Date.now()
    })
}
