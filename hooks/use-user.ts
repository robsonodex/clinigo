'use client'

/**
 * useUser Hook
 * Wrapper around useAuth that provides a simpler interface
 */

import { useAuth } from '@/lib/hooks/use-auth'

export function useUser() {
    const { user, profile, isLoading, isAuthenticated, signOut } = useAuth()

    return {
        user: profile ? {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            name: profile.full_name,
            role: profile.role,
            clinic_id: profile.clinic_id,
            avatar_url: profile.avatar_url,
        } : null,
        isLoading,
        isAuthenticated,
        signOut,
        // Raw data
        authUser: user,
        profile,
    }
}
