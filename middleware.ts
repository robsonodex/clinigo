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
    process.env.SUPER_ADMIN_EMAILS || 'robsonfenriz@gmail.com,contato@clinigo.app'
).split(',').map(e => e.trim().toLowerCase())

// Legacy single email support
const MASTER_ADMIN_EMAIL = SUPER_ADMIN_EMAILS[0]

// Public routes that don't require any authentication
const PUBLIC_ROUTES = [
    '/api/appointments-list', // Moved list/create endpoint (POST public, GET auth)
    '/api/appointments/', // Allow dynamic appointment routes like /api/appointments/[id]
    '/api/appointments/details/', // Temporary fix for 404 issue in production
    '/api/appointments/available-slots',
    '/api/debug-appt', // Temporary debug route
    '/api-v2/appointments/', // V2 routing fix
    '/apitest', // Root level test
    '/api/payments/webhook',
    '/api/billing/webhook', // Mercado Pago webhook - CRITICAL for payment confirmation
    '/api/billing/create-preference', // Create payment preference
    '/api/billing/create-subscription', // Create subscription
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/register',
    '/api/auth/pre-register', // Self-registration with Banco Inter boleto - public for new clinics
    '/api/auth/boleto-pdf', // Boleto PDF download for registration - public
    '/api/webhooks/bancointer', // Banco Inter webhook - CRITICAL for payment confirmation
    '/api/doctors',
    '/api/doctors/', // Allow dynamic doctor routes (profile, schedules)
    '/api/clinics/by-slug/', // Public clinic lookup by slug for booking pages
    '/api/patient/auth',
    '/api/marketplace',
    '/api/aia/triage',
    '/api/plans', // New public plans API
    '/api/debug/', // DEBUG ROUTES
    '/api/probe', // Root probe
    '/api/doctors/probe', // Doctors probe
    '/api/debug-doctor', // DB Debug tool
    '/api/debug-appointment', // Temp debug for appointment lookup
    '/api/video/validate-token', // Patient video room access via token link
    '/api/partners/register', // Partner registration - public for new affiliates
    '/api/partners/test-dashboard', // TEMP: Debug endpoint for partner dashboard
    '/api/qr/', // QR Code images for email - dynamic route (legacy)
    '/api/qr', // QR Code images for email - query parameter route
    '/api/checkin/', // Pre-checkin API routes (public for patients)
    '/api/checkin/pre-checkin', // Pre-checkin submission (public)
    '/api/checkin/ocr', // OCR processing for documents (public)
    '/api/checkin/validate', // QR Code validation (public)
    '/api/checkin/verify', // QR Code verification and queue (public)
    '/partners/login', // Partner login page
    '/partners/register', // Partner registration page
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
    '/api/clinics': ['SUPER_ADMIN', 'CLINIC_ADMIN'], // CLINIC_ADMIN pode ver detalhes da própria clínica
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
    const { pathname, hostname } = request.nextUrl

    // ----------------------------------------
    // WWW REDIRECT (Fix CORS)
    // ----------------------------------------
    if (hostname.startsWith('www.')) {
        const newUrl = new URL(request.url)
        newUrl.hostname = hostname.replace('www.', '')
        return NextResponse.redirect(newUrl)
    }

    // ----------------------------------------
    // OPTIMIZATION: BYPASS AUTH ROUTES
    // ----------------------------------------
    // prevents middleware from blocking/timing out on login APIs due to getUser() calls
    const AUTH_API_ROUTES = [
        '/api/auth/login',
        '/api/auth/signup',
        '/api/auth/register',
        '/api/auth/reset-password',
        '/api/auth/callback'
    ]

    if (AUTH_API_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.next()
    }

    // DEBUG: Log all /api/clinics requests to diagnose 404 issue
    if (pathname.startsWith('/api/clinics/') && !pathname.includes('by-slug')) {
        console.log('[MIDDLEWARE DEBUG] /api/clinics request:', {
            pathname,
            method: request.method,
            url: request.url,
        })
    }

    // DEBUG: Log /api/appointments requests for 404 diagnosis
    if (pathname.startsWith('/api/appointments')) {
        console.log('[MIDDLEWARE DEBUG] /api/appointments request:', {
            pathname,
            method: request.method,
            url: request.url,
        })
    }



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

        if (!user) {
            return new NextResponse('Not Found', { status: 404 })
        }

        // Check if email is in whitelist (Master Admin)
        const isWhitelisted = SUPER_ADMIN_EMAILS.includes((user.email || '').toLowerCase())

        if (!isWhitelisted) {
            // If not whitelisted, check DB role
            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role !== 'SUPER_ADMIN') {
                return new NextResponse('Not Found', { status: 404 })
            }
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
    // PARTNER ROUTES (PARTNER role bypass)
    // Parceiros não têm registro na tabela 'users',
    // então bypass da verificação de perfil/role padrão
    // ----------------------------------------
    const isPartnerDashboardRoute = pathname.startsWith('/partners/') && !pathname.startsWith('/partners/login') && !pathname.startsWith('/partners/register')
    const isPartnerApiRoute = pathname.startsWith('/api/partners/') && !pathname.startsWith('/api/partners/register') && !pathname.startsWith('/api/partners/validate-code')

    if (isPartnerDashboardRoute || isPartnerApiRoute) {
        const { supabase: partnerSupabase, response: partnerResponse } = createSupabaseClient(request)
        const { data: { user: partnerUser }, error: authError } = await partnerSupabase.auth.getUser()

        console.log('[MIDDLEWARE:PARTNER] Path:', pathname, 'User:', partnerUser?.id, 'Role:', partnerUser?.user_metadata?.role, 'AppRole:', partnerUser?.app_metadata?.role, 'AuthError:', authError?.message)

        if (partnerUser) {
            const userRole = partnerUser.user_metadata?.role || partnerUser.app_metadata?.role
            if (userRole === 'PARTNER') {
                // Partner authenticated - allow access without users table lookup
                console.log('[MIDDLEWARE:PARTNER] Access granted for partner:', partnerUser.id)
                return partnerResponse
            }
            // User exists but is not a PARTNER - fall through to general auth
            console.log('[MIDDLEWARE:PARTNER] User is not PARTNER, falling through to general auth')
        }

        if (!partnerUser) {
            if (isPartnerApiRoute) {
                return NextResponse.json(
                    { error: 'Não autorizado', code: 'PARTNER_UNAUTHORIZED' },
                    { status: 401 }
                )
            }
            return NextResponse.redirect(new URL('/partners/login', request.url))
        }
    }

    // ----------------------------------------
    // SUPABASE AUTH (Clinic/Doctor/Admin)
    // ----------------------------------------
    const { supabase, response } = createSupabaseClient(request)

    // Securely get the user (validates token against Supabase Auth)
    // This handles token refresh if needed via the checkConfig defined above

    // Now get user (session is refreshed)
    const { data: { user } } = await supabase.auth.getUser()

    // Public routes that don't require any authentication
    const isPublicRoute = PUBLIC_ROUTES.some((route) => {
        if (route === '/api/appointments-list' && pathname === '/api/appointments-list') {
            return request.method === 'POST'
        }
        if (route === '/api/doctors') {
            // GET /api/doctors (list) and GET /api/doctors/[id] are public for marketplace
            // Also allow /api/doctors/[id]/health-insurances for public booking
            if (request.method === 'GET') {
                // NUCLEAR OPTION: Allow ALL /api/doctors/* requests
                if (pathname.startsWith('/api/doctors')) {
                    console.log('[MIDDLEWARE ALLOW] Permitting /api/doctors path:', pathname)
                    return true
                }

                // FALLBACK (Commented out for debug)
                /*
                const isDocRoot = pathname === '/api/doctors'
                const isDocId = pathname.match(/^\/api\/doctors\/[a-f0-9-]+$/)
                const isInsurances = pathname.match(/^\/api\/doctors\/[a-f0-9-]+\/health-insurances$/)
                const isSchedules = pathname.match(/^\/api\/doctors\/[a-f0-9-]+\/schedules$/)
                const isDynamicProbe = pathname.match(/^\/api\/doctors\/[a-f0-9-]+\/probe$/)

                // DEBUG MATCH
                if (pathname.includes('/schedules') || pathname.includes('/probe')) {
                    console.log('[MIDDLEWARE MATCH]', { pathname, isSchedules: !!isSchedules, isDynamicProbe: !!isDynamicProbe })
                }

                return isDocRoot || isDocId || isInsurances || isSchedules || isDynamicProbe
                */
                return false
            }
            return false
        }
        return pathname.startsWith(route)
    })

    // Public pages
    const isPublicPage =
        pathname === '/' ||
        pathname === '/login' ||
        pathname === '/clinica' ||
        pathname === '/medico' ||
        pathname === '/cadastro' ||
        pathname === '/planos' ||
        pathname === '/pagamento-pendente' ||
        pathname === '/pagamento-expirado' ||
        pathname.startsWith('/pagamento/') ||
        pathname.startsWith('/paciente/entrar') ||
        pathname.startsWith('/paciente/registro') ||
        pathname.startsWith('/video/') || // Patient video room via token link
        pathname.startsWith('/painel-tv/') || // Public TV panel for clinics
        pathname.match(/^\/[^/]+\/agendar/)

    // Public routes/pages without user = allow
    if ((isPublicPage || isPublicRoute) && !user) {
        return response
    }

    // DEBUG: Log /api/doctors schedules requests (Correct Location)
    if (pathname.includes('/schedules') && pathname.startsWith('/api/doctors')) {
        console.log('[MIDDLEWARE DEBUG] /api/doctors/.../schedules request:', {
            pathname,
            method: request.method,
            userPresent: !!user,
            isPublicRoute,
            isPublicPage,
            userRole: user?.user_metadata?.role,
        })
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
        return NextResponse.redirect(new URL('/clinica', request.url))
    }

    // ----------------------------------------
    // ROLE-BASED ACCESS CONTROL
    // ----------------------------------------
    if (user) {
        let userRole = user.user_metadata?.role as string | undefined
        let userClinicId = user.user_metadata?.clinic_id as string | undefined
        let userPlanType: PlanType = 'BASICO'

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
            userPlanType = 'ENTERPRISE' // Super admin has all access
            userClinicId = undefined
        }

        // Get clinic plan type (for non-super admins)
        if (userRole !== 'SUPER_ADMIN' && userClinicId) {
            const { data: clinic } = await supabase
                .from('clinics')
                .select('is_active, plan_type, payment_confirmed, is_demo, approval_status, trial_ends_at')
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
                    return NextResponse.redirect(new URL('/clinica?error=clinic_inactive', request.url))
                }

                // PAYMENT REQUIRED CHECK (v3.3.0)
                // Block access if payment is not confirmed
                // EXCEPTION: Demo accounts bypass payment verification
                if (clinic.payment_confirmed === false && !clinic.is_demo) {
                    // Allow billing-related API routes
                    if (pathname.startsWith('/api/billing')) {
                        // Allow through for payment processing
                    } else if (pathname.startsWith('/api')) {
                        return NextResponse.json(
                            {
                                error: 'Pagamento pendente',
                                code: 'PAYMENT_REQUIRED',
                                redirect_url: '/pagamento-pendente'
                            },
                            { status: 402 }
                        )
                    } else if (pathname.startsWith('/dashboard')) {
                        return NextResponse.redirect(new URL('/pagamento-pendente', request.url))
                    }
                }

                // TRIAL EXPIRATION CHECK
                if (clinic.approval_status === 'trial' && clinic.trial_ends_at) {
                    const trialEnd = new Date(clinic.trial_ends_at)
                    if (trialEnd < new Date()) {
                        // Allow billing/plan routes for payment
                        if (pathname.startsWith('/api/billing') || pathname.startsWith('/dashboard/configuracoes/plano')) {
                            // Allow through for payment processing
                        } else if (pathname.startsWith('/api')) {
                            return NextResponse.json(
                                {
                                    error: 'Período de teste expirado',
                                    code: 'TRIAL_EXPIRED',
                                    redirect_url: '/dashboard/upgrade-required'
                                },
                                { status: 402 }
                            )
                        } else if (pathname.startsWith('/dashboard')) {
                            return NextResponse.redirect(new URL('/dashboard/upgrade-required?reason=trial_expired', request.url))
                        }
                    }
                }

                // Capture plan type (with legacy migration)
                const dbPlanType = (clinic.plan_type || 'BASICO') as string
                // Migrate legacy plan names to new nomenclature
                const planMapping: Record<string, PlanType> = {
                    // New names
                    'BASICO': 'BASICO',
                    'AVANCADO': 'AVANCADO',
                    'PROFESSIONAL': 'PROFESSIONAL',
                    'ENTERPRISE': 'ENTERPRISE',
                    'NETWORK': 'ENTERPRISE',
                    // Legacy names migration
                    'STARTER': 'BASICO',
                    'BASIC': 'AVANCADO',
                    'PRO': 'PROFESSIONAL',
                }
                userPlanType = planMapping[dbPlanType] || 'BASICO'
            }
        }

        // ----------------------------------------
        // PLAN-BASED ROUTE PROTECTION (4-Tier Hard Gate)
        // ----------------------------------------
        const PLAN_ORDER: Record<PlanType, number> = {
            'BASICO': 1,
            'AVANCADO': 2,
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
                // Allow if user has an allowed role OR if no role requirement specified
                if (userRole && allowedRoles.includes(userRole)) {
                    // Role is allowed, continue
                    break
                } else if (!userRole) {
                    // No role assigned, block
                    return NextResponse.json(
                        { error: 'Acesso negado - sem role', code: 'NO_ROLE' },
                        { status: 403 }
                    )
                } else {
                    // Has role but not allowed
                    return NextResponse.json(
                        { error: 'Acesso negado - role não permitida', code: 'FORBIDDEN', role: userRole, allowed: allowedRoles },
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

        // DEBUG: Expose middleware path to client response
        finalResponse.headers.set('x-debug-mw-path', pathname)
        finalResponse.headers.set('x-debug-mw-matched', 'true')
        finalResponse.headers.set('x-debug-mw-ts', Date.now().toString())

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
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)  
         * - favicon.ico (favicon file)
         * - icons/* (PWA icons)
         * - public static files (svg, png, jpg, etc)
         */
        '/((?!_next/static|_next/image|favicon\\.ico|icons/|public/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest|js|css|woff|woff2|ttf|eot)$).*)',
    ],
}
