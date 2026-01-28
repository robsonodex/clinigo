import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ testId: string }> }
) {
    const { testId } = await context.params
    return NextResponse.json({
        message: 'Test inside appointments folder Works!',
        testId: testId,
        timestamp: new Date().toISOString()
    })
}
