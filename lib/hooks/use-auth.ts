'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { type User } from '@supabase/supabase-js'

interface UserProfile {
    id: string
    email: string
    full_name: string
    role: 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR'
    clinic_id?: string
    avatar_url?: string
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
        await supabase.auth.signOut()
        router.push('/login')
    }, [supabase.auth, router])

    const signIn = useCallback(async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            throw new Error(error.message)
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
    }
}

/**
 * Hook to require authentication
 */
export function useRequireAuth(redirectTo = '/login') {
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
 */
export function useRole() {
    const { profile } = useAuth()

    return {
        role: profile?.role || null,
        isSuperAdmin: profile?.role === 'SUPER_ADMIN',
        isClinicAdmin: profile?.role === 'CLINIC_ADMIN',
        isDoctor: profile?.role === 'DOCTOR',
        clinicId: profile?.clinic_id,
    }
}
