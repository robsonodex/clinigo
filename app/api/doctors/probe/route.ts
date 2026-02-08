import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    return NextResponse.json({ status: 'ok', message: 'Doctors probe working', timestamp: new Date().toISOString() })
}
