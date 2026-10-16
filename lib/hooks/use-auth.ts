'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext, type UserProfile, type ClinicData } from '@/components/providers/AuthProvider'

export type { UserProfile, ClinicData }

/**
 * Hook to access authentication and profile state.
 * Consumes the centralized AuthProvider context (zero duplicate network calls).
 */
export function useAuth() {
    return useAuthContext()
}

/**
 * Hook to require authentication
 */
export function useRequireAuth(redirectTo = '/clinica') {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && !user) {
            router.push(redirectTo)
        }
    }, [user, isLoading, router, redirectTo])

    return { user, isLoading }
}

/**
 * Hook to check user role
 * When in impersonation mode (Super Admin), returns CLINIC_ADMIN as effective role
 */
export function useRole() {
    const { user, profile, clinic, isLoading } = useAuth()
    const [isImpersonating, setIsImpersonating] = useState(false)
    const [impersonationClinicId, setImpersonationClinicId] = useState<string | null>(null)

    useEffect(() => {
        // Check if impersonation cookie exists (impersonation_active is httpOnly:false)
        const cookies = typeof document !== 'undefined'
            ? document.cookie.split(';').reduce((acc, cookie) => {
                const [key, value] = cookie.trim().split('=')
                if (key) acc[key] = decodeURIComponent(value || '')
                return acc
            }, {} as Record<string, string>)
            : {}

        const hasImpersonation = cookies['impersonation_active'] === 'true'
        setIsImpersonating(hasImpersonation)
        
        if (hasImpersonation && cookies['impersonation_clinic_id']) {
            setImpersonationClinicId(cookies['impersonation_clinic_id'])
        }
    }, [])

    const SUPER_ADMIN_EMAILS = [
        'robsonfenriz@gmail.com',
        'contato@clinigo.app',
        'superadmin@demo.clinigo.internal'
    ]
    const isRealSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())

    // When impersonating, act as CLINIC_ADMIN to show clinic menus
    const effectiveRole = (isImpersonating && isRealSuperAdmin)
        ? 'CLINIC_ADMIN'
        : profile?.role || null

    const effectiveClinicId = (isImpersonating && isRealSuperAdmin && impersonationClinicId)
        ? impersonationClinicId
        : profile?.clinic_id || clinic?.id

    return {
        role: effectiveRole,
        isSuperAdmin: !!isRealSuperAdmin, // Real role stays for admin-only checks
        isClinicAdmin: effectiveRole === 'CLINIC_ADMIN',
        isDoctor: effectiveRole === 'DOCTOR',
        isReceptionist: effectiveRole === 'RECEPTIONIST',
        isFinancial: effectiveRole === 'FINANCIAL',
        isReadOnly: effectiveRole === 'READONLY',
        isCoordinator: !!profile?.is_coordinator,
        clinicId: effectiveClinicId,
        isImpersonating,
        loading: isLoading,
        isLoading,
    }
}
