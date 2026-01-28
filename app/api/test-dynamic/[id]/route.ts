
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params
    return NextResponse.json({
        message: 'Test Dynamic Route Working',
        id: id,
        timestamp: new Date().toISOString()
    })
}
