'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { type User } from '@supabase/supabase-js'

interface UserProfile {
    id: string
    email: string
    full_name: string
    role: 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'RECEPTIONIST'
    clinic_id?: string
    avatar_url?: string
    is_coordinator?: boolean
}

interface AuthState {
    user: User | null
    profile: UserProfile | null
    isLoading: boolean
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        profile: null,
        isLoading: true,
    })
    const router = useRouter()
    const supabase = createClient()

    // Load user and profile
    const loadUser = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setState({ user: null, profile: null, isLoading: false })
                return
            }

            // Fetch profile
            const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single()

            setState({
                user,
                profile: profile as UserProfile | null,
                isLoading: false,
            })
        } catch {
            setState({ user: null, profile: null, isLoading: false })
        }
    }, [supabase])

    useEffect(() => {
        loadUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event) => {
                if (event === 'SIGNED_OUT') {
                    setState({ user: null, profile: null, isLoading: false })
                } else if (event === 'SIGNED_IN') {
                    loadUser()
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [supabase.auth, loadUser])

    const signOut = useCallback(async () => {
        const role = state.profile?.role
        const isPatient = state.user && !state.profile

        await supabase.auth.signOut()

        if (role === 'CLINIC_ADMIN') {
            router.push('/clinica')
        } else if (role === 'DOCTOR') {
            router.push('/medico')
        } else if (isPatient) {
            router.push('/paciente')
        } else {
            router.push('/clinica')
        }
    }, [supabase.auth, router, state.profile?.role, state.user, state.profile])

    const signIn = useCallback(async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            throw new Error(error.message)
        }

        // Register single session (invalidate other devices)
        try {
            await fetch('/api/auth/session/register', { method: 'POST', credentials: 'include' })
        } catch {
            // Non-blocking
        }

        await loadUser()
        router.push('/dashboard')
    }, [supabase.auth, loadUser, router])

    const signUp = useCallback(async (email: string, password: string, meta: { full_name: string }) => {
        // We use our API to register because we need to create a Clinic and User Profile atomically
        // and Supabase allow-list or triggers might be complex to set up for multi-tenant creation from client.
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name: meta.full_name }),
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error?.message || 'Erro ao criar conta')
        }

        // Auto login after sign up?
        // Supabase usually requires email confirmation unless disabled.
        // If disabled, we can login immediately. 
        // For now, let's assume we might need to login manually or the API returns a session (unlikely if strictly auth admin).

        // Try to sign in immediately (if auto confirm is on)
        try {
            await signIn(email, password)
        } catch (e) {
            // If sign in fails (e.g. email not confirmed), just return, the page will redirect to login usually?
            // But the SignUp page expects this promise to resolve.
        }
    }, [signIn])

    return {
        ...state,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!state.user,
        supabase,
    }
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
    const { profile } = useAuth()
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

    // When impersonating, act as CLINIC_ADMIN to show clinic menus
    const effectiveRole = (isImpersonating && profile?.role === 'SUPER_ADMIN')
        ? 'CLINIC_ADMIN'
        : profile?.role || null

    const effectiveClinicId = (isImpersonating && profile?.role === 'SUPER_ADMIN' && impersonationClinicId)
        ? impersonationClinicId
        : profile?.clinic_id

    return {
        role: effectiveRole,
        isSuperAdmin: profile?.role === 'SUPER_ADMIN', // Real role stays for admin-only checks
        isClinicAdmin: effectiveRole === 'CLINIC_ADMIN',
        isDoctor: effectiveRole === 'DOCTOR',
        isReceptionist: effectiveRole === 'RECEPTIONIST',
        isCoordinator: !!profile?.is_coordinator,
        clinicId: effectiveClinicId,
        isImpersonating,
    }
}

