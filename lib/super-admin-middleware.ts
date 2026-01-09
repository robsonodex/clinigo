/**
 * Super Admin Portal - Dedicated Middleware
 * This file protects the hidden /system-master-hub route
 * 
 * SECURITY: Only robsonfenriz@gmail.com can access
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const MASTER_ADMIN_EMAIL = 'robsonfenriz@gmail.com'
const SUPER_ADMIN_ROUTES = [
    '/system-master-hub',
    '/api/super-admin',
]

/**
 * Check if user is the master admin
 */
export async function isMasterAdmin(request: NextRequest): Promise<boolean> {
    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return request.cookies.get(name)?.value
                    },
                    set() { },
                    remove() { },
                },
            }
        )

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return false

        // Only the master email can access
        if (user.email !== MASTER_ADMIN_EMAIL) return false

        // Double-check role from database
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        // Allow if role is SUPER_ADMIN or if it's the master email
        return profile?.role === 'SUPER_ADMIN' || user.email === MASTER_ADMIN_EMAIL

    } catch (error) {
        console.error('[SuperAdmin Middleware] Error:', error)
        return false
    }
}

/**
 * Middleware function for Super Admin routes
 */
export async function superAdminMiddleware(request: NextRequest): Promise<NextResponse | null> {
    const { pathname } = request.nextUrl

    // Check if this is a Super Admin route
    const isSuperAdminRoute = SUPER_ADMIN_ROUTES.some(route =>
        pathname.startsWith(route)
    )

    if (!isSuperAdminRoute) {
        return null // Not a Super Admin route, continue
    }

    const isAuthorized = await isMasterAdmin(request)

    if (!isAuthorized) {
        // Return 404 to hide the existence of this route
        return new NextResponse('Not Found', { status: 404 })
    }

    // Log the access
    console.log(`[SuperAdmin] Access granted to ${pathname}`)

    return null // Continue to the page
}

/**
 * Helper to wrap API routes with Super Admin protection
 */
export function requireSuperAdmin(handler: Function) {
    return async (request: NextRequest, ...args: any[]) => {
        const isAuthorized = await isMasterAdmin(request)

        if (!isAuthorized) {
            return NextResponse.json(
                { error: 'Not Found' },
                { status: 404 }
            )
        }

        return handler(request, ...args)
    }
}

