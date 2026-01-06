/**
 * Next.js Middleware for Authentication and Route Protection
 */
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { rateLimit, createRateLimitResponse, addRateLimitHeaders } from '@/lib/middlewares/rate-limit'

/**
 * Routes that don't require authentication
 */
const PUBLIC_ROUTES = [
    '/api/appointments', // POST for public booking
    '/api/appointments/available-slots',
    '/api/payments/webhook',
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/register',
    '/api/doctors',
]

/**
 * Routes that require rate limiting (public endpoints vulnerable to abuse)
 */
const RATE_LIMITED_ROUTES = [
    '/api/appointments',
    '/api/appointments/available-slots',
]

/**
 * Routes that require specific roles
 */
const ROLE_PROTECTED_ROUTES: Record<string, string[]> = {
    '/api/clinics': ['SUPER_ADMIN'],
    '/api/admin': ['SUPER_ADMIN'],
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Skip middleware for static assets
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/public') || // If you have a specific public prefix
        pathname.includes('.')
    ) {
        return NextResponse.next()
    }

    // Apply rate limiting to public booking endpoints
    const shouldRateLimit = RATE_LIMITED_ROUTES.some(route => pathname.startsWith(route))
    if (shouldRateLimit) {
        const rateLimitResult = await rateLimit(request)
        if (!rateLimitResult.success) {
            return createRateLimitResponse(rateLimitResult)
        }
    }

    // Refresh session and get user for ALL routes to keep cookies in sync
    const { supabase, user, response } = await updateSession(request)

    // Check if route is public
    const isPublicRoute = PUBLIC_ROUTES.some((route) => {
        if (route === '/api/appointments' && pathname === '/api/appointments') {
            return request.method === 'POST'
        }
        return pathname.startsWith(route)
    })

    // If it's a protected API route and no user, return 401
    if (!isPublicRoute && pathname.startsWith('/api') && !user) {
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Não autorizado',
                    code: 'UNAUTHORIZED',
                },
            },
            { status: 401 }
        )
    }

    // Role-based protection for APIs
    if (user && pathname.startsWith('/api')) {
        // Try to get role from metadata first (fast)
        let userRole = user.user_metadata?.role as string | undefined
        let userClinicId = user.user_metadata?.clinic_id as string | undefined

        // Fallback or double-check: Get from DB profile (reliable)
        const { data: profile } = (await supabase
            .from('users')
            .select('role, clinic_id')
            .eq('id', user.id)
            .single()) as { data: { role: string; clinic_id: string } | null }

        if (profile?.role) {
            userRole = profile.role
            userClinicId = profile.clinic_id
        }

        // Emergency Override for developer/owner
        if (user.email === 'robsonfenriz@gmail.com') {
            userRole = 'SUPER_ADMIN'
            userClinicId = undefined
        }

        // CRITICAL: Check clinic status if the user belongs to one and is not SUPER_ADMIN
        if (userRole !== 'SUPER_ADMIN' && userClinicId) {
            const { data: clinic } = (await supabase
                .from('clinics')
                .select('is_active')
                .eq('id', userClinicId)
                .single()) as { data: { is_active: boolean } | null }

            if (clinic && !clinic.is_active) {
                return NextResponse.json(
                    {
                        success: false,
                        error: {
                            message: 'Acesso bloqueado. Esta clínica está inativa.',
                            code: 'CLINIC_INACTIVE',
                        },
                    },
                    { status: 403 }
                )
            }
        }

        console.log('[Middleware] Auth API Check Result:', {
            pathname,
            email: user.email,
            id: user.id,
            finalRole: userRole,
            overridden: user.email === 'robsonfenriz@gmail.com',
        })

        for (const [route, allowedRoles] of Object.entries(ROLE_PROTECTED_ROUTES)) {
            if (pathname.startsWith(route)) {
                if (!userRole || !allowedRoles.includes(userRole)) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: {
                                message: 'Acesso negado',
                                code: 'FORBIDDEN',
                            },
                        },
                        { status: 403 }
                    )
                }
            }
        }

        // Set headers for API routes
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-user-id', user.id)
        if (userRole) {
            requestHeaders.set('x-user-role', userRole)
        }

        const finalResponse = NextResponse.next({
            request: { headers: requestHeaders },
        })

        // Copy cookies
        response.cookies.getAll().forEach((cookie) => {
            finalResponse.cookies.set(cookie.name, cookie.value)
        })

        return finalResponse
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
