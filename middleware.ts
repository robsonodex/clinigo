/**
 * CliniGo - Consolidated Middleware
 * Tripartite Architecture: Paciente, Médico, Clínica, Super Admin
 * 
 * Uses jose for JWT validation
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { jwtVerify } from 'jose'
import { ROUTE_MIN_PLAN } from '@/lib/constants/route-features'
import { type PlanType } from '@/lib/constants/plans'

// ============================================
// CONFIGURATION
// ============================================

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'clinigo-patient-portal-secret-key-2026'
)

// Super Admin email whitelist from env
const SUPER_ADMIN_EMAILS = (
    process.env.SUPER_ADMIN_EMAILS || 'robsonfenriz@gmail.com'
).split(',').map(e => e.trim().toLowerCase())

// Legacy single email support
const MASTER_ADMIN_EMAIL = SUPER_ADMIN_EMAILS[0]

// Public routes that don't require any authentication
const PUBLIC_ROUTES = [
    '/api/appointments',
    '/api/appointments/available-slots',
    '/api/payments/webhook',
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/register',
    '/api/doctors',
    '/api/patient/auth',
    '/api/marketplace',
    '/api/aia/triage',
]

// Patient portal routes (JWT auth, separate from Supabase)
const PATIENT_PORTAL_ROUTES = [
    '/paciente/meu-painel',
    '/paciente/historico',
    '/paciente/agendar',
    '/api/patient/profile',
    '/api/patient/appointments',
    '/api/patient/history',
]

// Super Admin hidden routes
const SUPER_ADMIN_ROUTES = [
    '/system-master-hub',
    '/api/super-admin',
    '/dashboard/super',
    '/api/super',
]

// Role-protected API routes
const ROLE_PROTECTED_ROUTES: Record<string, string[]> = {
    '/api/clinics': ['SUPER_ADMIN'],
    '/api/admin': ['SUPER_ADMIN'],
    '/api/ai/predict-diagnosis': ['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'],
}

// ============================================
// JWT VERIFICATION FOR PATIENTS
// ============================================

async function verifyPatientToken(request: NextRequest) {
    try {
        const token = request.cookies.get('patient_token')?.value
        if (!token) return null

        const { payload } = await jwtVerify(token, JWT_SECRET)
        if (payload.type !== 'patient') return null

        return payload as { sub: string; cpf: string; name: string; type: 'patient' }
    } catch {
        return null
    }
}

// ============================================
// SUPABASE CLIENT FOR AUTH
// ============================================

function createSupabaseClient(request: NextRequest) {
    const response = NextResponse.next()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll().map((cookie: { name: string; value: string }) => ({
                        name: cookie.name,
                        value: cookie.value,
                    }))
                },
                setAll(cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
                    cookies.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    return { supabase, response }
}

// ============================================
// MAIN MIDDLEWARE
// ============================================

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Skip static assets
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/public') ||
        pathname.includes('.') ||
        pathname === '/favicon.ico'
    ) {
        return NextResponse.next()
    }

    // ----------------------------------------
    // SUPER ADMIN PROTECTION (Hidden routes)
    // ----------------------------------------
    const isSuperAdminRoute = SUPER_ADMIN_ROUTES.some(route => pathname.startsWith(route))

    if (isSuperAdminRoute) {
        const { supabase } = createSupabaseClient(request)
        const { data: { user } } = await supabase.auth.getUser()

        // Return 404 to hide existence of route
        if (!user || user.email !== MASTER_ADMIN_EMAIL) {
            return new NextResponse('Not Found', { status: 404 })
        }
    }

    // ----------------------------------------
    // PATIENT PORTAL (JWT Auth)
    // ----------------------------------------
    const isPatientRoute = PATIENT_PORTAL_ROUTES.some(route => pathname.startsWith(route))
    const isPatientAuthRoute = pathname.startsWith('/api/patient/auth')
    const isPatientPublicPage = pathname === '/paciente/entrar' || pathname === '/paciente/registro'

    if (isPatientRoute && !isPatientAuthRoute && !isPatientPublicPage) {
        const patient = await verifyPatientToken(request)

        if (!patient) {
            if (!pathname.startsWith('/api')) {
                return NextResponse.redirect(new URL('/paciente/entrar', request.url))
            }
            return NextResponse.json(
                { error: 'Não autorizado', code: 'PATIENT_UNAUTHORIZED' },
                { status: 401 }
            )
        }

        // Set patient headers
        const response = NextResponse.next()
        response.headers.set('x-patient-id', patient.sub)
        response.headers.set('x-patient-name', patient.name)
        return response
    }

    // ----------------------------------------
    // SUPABASE AUTH (Clinic/Doctor/Admin)
    // ----------------------------------------
    const { supabase, response } = createSupabaseClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    // Public routes - no auth needed
    const isPublicRoute = PUBLIC_ROUTES.some((route) => {
        if (route === '/api/appointments' && pathname === '/api/appointments') {
            return request.method === 'POST'
        }
        if (route === '/api/doctors') {
            // GET is public, but if user is logged in, we still want to pass headers
            return pathname.startsWith(route) && request.method === 'GET'
        }
        return pathname.startsWith(route)
    })

    // Public pages
    const isPublicPage =
        pathname === '/' ||
        pathname === '/login' ||
        pathname === '/cadastro' ||
        pathname === '/planos' ||
        pathname.startsWith('/paciente/entrar') ||
        pathname.startsWith('/paciente/registro') ||
        pathname.match(/^\/[^/]+\/agendar/)

    if ((isPublicPage || isPublicRoute) && !user) {
        return response
    }

    // Protected API without user = 401
    if (pathname.startsWith('/api') && !user) {
        return NextResponse.json(
            { error: 'Não autorizado', code: 'UNAUTHORIZED' },
            { status: 401 }
        )
    }

    // Protected dashboard without user = redirect
    if (pathname.startsWith('/dashboard') && !user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // ----------------------------------------
    // ROLE-BASED ACCESS CONTROL
    // ----------------------------------------
    if (user) {
        let userRole = user.user_metadata?.role as string | undefined
        let userClinicId = user.user_metadata?.clinic_id as string | undefined
        let userPlanType: PlanType = 'STARTER'

        // Get role from database
        const { data: profile } = await supabase
            .from('users')
            .select('role, clinic_id')
            .eq('id', user.id)
            .single()

        if (profile) {
            userRole = profile.role as string
            userClinicId = profile.clinic_id as string
        }

        // Super Admin whitelist check
        const isSuperAdminEmail = SUPER_ADMIN_EMAILS.includes(
            (user.email || '').toLowerCase()
        )

        if (isSuperAdminEmail) {
            userRole = 'SUPER_ADMIN'
            userClinicId = undefined
            userPlanType = 'NETWORK' // Super admin has all access
        }

        // Get clinic plan type (for non-super admins)
        if (userRole !== 'SUPER_ADMIN' && userClinicId) {
            const { data: clinic } = await supabase
                .from('clinics')
                .select('is_active, plan_type')
                .eq('id', userClinicId)
                .single()

            if (clinic) {
                // Check if clinic is active
                if (!clinic.is_active) {
                    if (pathname.startsWith('/api')) {
                        return NextResponse.json(
                            { error: 'Clínica inativa', code: 'CLINIC_INACTIVE' },
                            { status: 403 }
                        )
                    }
                    return NextResponse.redirect(new URL('/login?error=clinic_inactive', request.url))
                }

                // Capture plan type (with legacy migration)
                const dbPlanType = (clinic.plan_type || 'STARTER') as string
                // Migrate legacy plan names
                const planMapping: Record<string, PlanType> = {
                    'BASIC': 'BASIC',
                    'PRO': 'PROFESSIONAL',
                    'ENTERPRISE': 'NETWORK',
                    'STARTER': 'STARTER',
                    'PROFESSIONAL': 'PROFESSIONAL',
                    'NETWORK': 'NETWORK',
                }
                userPlanType = planMapping[dbPlanType] || 'STARTER'
            }
        }

        // ----------------------------------------
        // PLAN-BASED ROUTE PROTECTION (5-Tier Hard Gate)
        // ----------------------------------------
        const PLAN_ORDER: Record<PlanType, number> = {
            'STARTER': 1,
            'BASIC': 2,
            'PROFESSIONAL': 3,
            'ENTERPRISE': 4,
            'NETWORK': 5
        }

        // Routes that require minimum plan (5-tier RJ market)
        // Imported from @/lib/constants/route-features

        // Skip plan check for upgrade-related routes (prevent loops)
        const isUpgradeRoute = pathname === '/dashboard/upgrade-required' ||
            pathname.startsWith('/dashboard/configuracoes/plano')

        // Only check plan for non-super-admins on dashboard routes
        if (!isUpgradeRoute && userRole !== 'SUPER_ADMIN') {
            // Check if route requires a higher plan
            for (const [route, minPlan] of Object.entries(ROUTE_MIN_PLAN)) {
                if (pathname.startsWith(route)) {
                    const currentPlanLevel = PLAN_ORDER[userPlanType]
                    const requiredPlanLevel = PLAN_ORDER[minPlan]

                    if (currentPlanLevel < requiredPlanLevel) {
                        // Extract feature name from route
                        const featureName = route.split('/').pop() || 'recurso'
                        const featureLabel = featureName.charAt(0).toUpperCase() + featureName.slice(1)

                        if (pathname.startsWith('/api')) {
                            return NextResponse.json(
                                {
                                    error: `Recurso "${featureLabel}" requer plano ${minPlan}`,
                                    code: 'PLAN_REQUIRED',
                                    current_plan: userPlanType,
                                    required_plan: minPlan,
                                    upgrade_url: '/dashboard/configuracoes/plano'
                                },
                                { status: 403 }
                            )
                        }

                        // Redirect to upgrade page with feature info
                        const upgradeUrl = new URL('/dashboard/upgrade-required', request.url)
                        upgradeUrl.searchParams.set('feature', featureLabel)
                        upgradeUrl.searchParams.set('plan', minPlan)
                        return NextResponse.redirect(upgradeUrl)
                    }
                    break // Route matched, no need to continue
                }
            }
        }

        // Check role permissions for API routes
        for (const [route, allowedRoles] of Object.entries(ROLE_PROTECTED_ROUTES)) {
            if (pathname.startsWith(route)) {
                if (!userRole || !allowedRoles.includes(userRole)) {
                    return NextResponse.json(
                        { error: 'Acesso negado', code: 'FORBIDDEN' },
                        { status: 403 }
                    )
                }
            }
        }

        // Set headers for downstream use (pass to API routes)
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-user-id', user.id)
        if (userRole) requestHeaders.set('x-user-role', userRole)
        if (userClinicId) requestHeaders.set('x-clinic-id', userClinicId)
        requestHeaders.set('x-plan-type', userPlanType)

        // DEBUG: Tagging traffic as processed by full middleware
        requestHeaders.set('x-middleware-full', 'true')

        const finalResponse = NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        })

        // Copy cookies from Supabase response to maintain session
        response.cookies.getAll().forEach((cookie: { name: string; value: string }) => {
            finalResponse.cookies.set(cookie.name, cookie.value)
        })

        return finalResponse
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
