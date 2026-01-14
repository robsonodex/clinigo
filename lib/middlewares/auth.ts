/**
 * Authorization Middleware
 * Provides role-based access control for API routes
 * 
 * SECURITY: Verifies user roles from profiles.role column
 * Supported roles: SUPER_ADMIN, CLINIC_ADMIN, DOCTOR, RECEPTIONIST, PATIENT
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { log } from '@/lib/logger'

export type UserRole = 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'PATIENT'

export interface AuthResult {
    authorized: boolean
    user?: {
        id: string
        email: string
        role: UserRole
        clinic_id: string | null
    }
    error?: string
}

/**
 * Verify user authentication and authorization
 * @param allowedRoles - Array of roles that are authorized to access the resource
 * @returns AuthResult with authorization status and user data
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthResult> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return {
                authorized: false,
                error: 'Unauthorized - No valid session'
            }
        }

        // Get user profile with role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, clinic_id')
            .eq('id', user.id)
            .single<{ role: string; clinic_id: string | null }>()

        if (profileError || !profile) {
            log.error('Failed to fetch user profile', { userId: user.id, error: profileError })
            return {
                authorized: false,
                error: 'User profile not found'
            }
        }

        const userRole = profile.role as UserRole

        // Check if user's role is in the allowed roles
        if (!allowedRoles.includes(userRole)) {
            log.audit(user.id, 'unauthorized_access_attempt', {
                userRole,
                allowedRoles,
                email: user.email
            })
            return {
                authorized: false,
                error: `Access denied - Role '${userRole}' not authorized`
            }
        }

        return {
            authorized: true,
            user: {
                id: user.id,
                email: user.email || '',
                role: userRole,
                clinic_id: profile.clinic_id
            }
        }

    } catch (error) {
        log.error('Authorization middleware error', { error })
        return {
            authorized: false,
            error: 'Internal authentication error'
        }
    }
}

/**
 * Helper function to create a 403 Forbidden response
 * @param message - Optional error message
 */
export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
    return NextResponse.json(
        { error: message },
        { status: 403 }
    )
}

/**
 * Helper function to create a 401 Unauthorized response
 * @param message - Optional error message
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
    return NextResponse.json(
        { error: message },
        { status: 401 }
    )
}

/**
 * Wrapper function for API route handlers that require specific roles
 * Usage:
 * 
 * export const POST = withRole(['CLINIC_ADMIN', 'SUPER_ADMIN'], async (request, authResult) => {
 *   const { user } = authResult
 *   // Your handler code here
 * })
 */
export function withRole(
    allowedRoles: UserRole[],
    handler: (request: Request, authResult: AuthResult, ...args: any[]) => Promise<NextResponse>
) {
    return async (request: Request, context?: any): Promise<NextResponse> => {
        const authResult = await requireRole(allowedRoles)

        if (!authResult.authorized) {
            if (authResult.error?.includes('No valid session')) {
                return unauthorizedResponse(authResult.error)
            }
            return forbiddenResponse(authResult.error)
        }

        return handler(request, authResult, context)
    }
}
