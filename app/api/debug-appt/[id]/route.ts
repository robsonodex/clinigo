import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    console.log('[DEBUG-APPT] Rota alternativa acionada')
    const { id } = await params
    return NextResponse.json({
        success: true,
        message: 'Debug route works',
        id,
        timestamp: Date.now()
    })
}
