import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

export function GET() {
    return new NextResponse('8f4c2b9e7a1d4e6f9c3b2a5d8e7f1a4c', {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
    })
}

