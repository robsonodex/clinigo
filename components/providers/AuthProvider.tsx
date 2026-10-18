'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export interface UserProfile {
    id: string
    email: string
    full_name: string
    role: 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'FINANCIAL' | 'READONLY'
    clinic_id?: string
    avatar_url?: string
    is_coordinator?: boolean
}

export interface ClinicData {
    id: string
    name?: string
    slug?: string
    logo_url?: string | null
    primary_color?: string | null
    plan_type?: string
    is_active?: boolean
    payment_confirmed?: boolean
    is_demo?: boolean
    approval_status?: string
    trial_ends_at?: string
    council_label?: string
    professional_label?: string
}

export interface AuthContextType {
    user: User | null
    profile: UserProfile | null
    clinic: ClinicData | null
    isLoading: boolean
    isAuthenticated: boolean
    signIn: (email: string, password: string) => Promise<void>
    signUp: (email: string, password: string, meta: { full_name: string }) => Promise<void>
    signOut: () => Promise<void>
    reloadUser: () => Promise<void>
    refreshProfile: () => Promise<void>
    supabase: ReturnType<typeof createClient>
}

export function clearAuthCache() {
    _memoryCache = null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Module-level deduplication and cache (5 minutes staleTime)
let _inFlightLoadPromise: Promise<{ profile: UserProfile | null; clinic: ClinicData | null }> | null = null
let _memoryCache: {
    userId: string
    profile: UserProfile | null
    clinic: ClinicData | null
    timestamp: number
} | null = null

const STALE_TIME = 5 * 60 * 1000 // 5 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [clinic, setClinic] = useState<ClinicData | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const router = useRouter()
    const supabase = createClient()
    const currentUserIdRef = useRef<string | null>(null)

    const fetchUserData = useCallback(async (authUser: User): Promise<{ profile: UserProfile | null; clinic: ClinicData | null }> => {
        const now = Date.now()

        // 1. Check in-memory cache
        if (_memoryCache && _memoryCache.userId === authUser.id && (now - _memoryCache.timestamp < STALE_TIME)) {
            return { profile: _memoryCache.profile, clinic: _memoryCache.clinic }
        }

        // 2. Return in-flight promise if another component triggered the load
        if (_inFlightLoadPromise) {
            return _inFlightLoadPromise
        }

        // 3. Single consolidated PostgREST query: users + joined clinics
        _inFlightLoadPromise = (async () => {
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select(`
                        id,
                        email,
                        full_name,
                        role,
                        clinic_id,
                        avatar_url,
                        is_coordinator,
                        clinics:clinic_id (
                            id,
                            name,
                            slug,
                            logo_url,
                            primary_color,
                            plan_type,
                            is_active,
                            payment_confirmed,
                            is_demo,
                            approval_status,
                            trial_ends_at,
                            council_label,
                            professional_label
                        )
                    `)
                    .eq('id', authUser.id)
                    .maybeSingle()

                const SUPER_ADMIN_EMAILS = [
                    'robsonfenriz@gmail.com',
                    'contato@clinigo.app',
                    'contato.clinigo@gmail.com',
                    'robsonsync.contas@gmail.com',
                    'superadmin@demo.clinigo.internal'
                ]
                const isSuperAdminUser = Boolean(authUser.email && SUPER_ADMIN_EMAILS.includes(authUser.email.toLowerCase()))

                if (error || !data) {
                    // Tenta fallback via rota autenticada do servidor (/api/profile)
                    try {
                        const srvRes = await fetch('/api/profile')
                        if (srvRes.ok) {
                            const srvData = await srvRes.json()
                            if (srvData?.user) {
                                const srvUser = srvData.user
                                const isSuper = isSuperAdminUser || srvUser.role === 'SUPER_ADMIN'
                                const resolvedSrvProfile: UserProfile = {
                                    id: srvUser.id,
                                    email: srvUser.email,
                                    full_name: srvUser.full_name || (isSuper ? 'Robson' : ''),
                                    role: (isSuper ? 'SUPER_ADMIN' : srvUser.role) as any,
                                    clinic_id: srvUser.clinic_id || undefined,
                                    avatar_url: srvUser.avatar_url || undefined,
                                    is_coordinator: !!srvUser.is_coordinator,
                                }
                                const resolvedSrvClinic = srvUser.clinic || null
                                return { profile: resolvedSrvProfile, clinic: resolvedSrvClinic }
                            }
                        }
                    } catch (srvErr) {
                        console.warn('[AuthProvider] Fallback /api/profile falhou:', srvErr)
                    }

                    if (isSuperAdminUser) {
                        const fallbackProfile: UserProfile = {
                            id: authUser.id,
                            email: authUser.email || 'contato@clinigo.app',
                            full_name: authUser.user_metadata?.full_name || 'Robson',
                            role: 'SUPER_ADMIN',
                            is_coordinator: false,
                        }
                        return { profile: fallbackProfile, clinic: null }
                    }
                    return { profile: null, clinic: null }
                }

                const userRecord = data as any
                let resolvedProfile: UserProfile = {
                    id: userRecord.id,
                    email: userRecord.email,
                    full_name: userRecord.full_name || (isSuperAdminUser ? 'Robson' : undefined),
                    role: (isSuperAdminUser ? 'SUPER_ADMIN' : userRecord.role) as any,
                    clinic_id: userRecord.clinic_id || undefined,
                    avatar_url: userRecord.avatar_url || undefined,
                    is_coordinator: !!userRecord.is_coordinator,
                }

                let resolvedClinic: ClinicData | null = (userRecord.clinics as any) || null

                // Handle Super Admin Impersonation
                if (typeof document !== 'undefined') {
                    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
                        const [key, value] = cookie.trim().split('=')
                        if (key) acc[key] = decodeURIComponent(value || '')
                        return acc
                    }, {} as Record<string, string>)

                    const isImpersonating = cookies['impersonation_active'] === 'true'
                    const impersonationClinicId = cookies['impersonation_clinic_id']

                    if (isImpersonating && resolvedProfile.role === 'SUPER_ADMIN' && impersonationClinicId) {
                        const { data: impClinic } = await supabase
                            .from('clinics')
                            .select(`
                                id,
                                name,
                                slug,
                                logo_url,
                                primary_color,
                                plan_type,
                                is_active,
                                payment_confirmed,
                                is_demo,
                                approval_status,
                                trial_ends_at,
                                council_label,
                                professional_label
                            `)
                            .eq('id', impersonationClinicId)
                            .maybeSingle()

                        if (impClinic) {
                            resolvedClinic = impClinic as ClinicData
                        }
                    }
                }

                _memoryCache = {
                    userId: authUser.id,
                    profile: resolvedProfile,
                    clinic: resolvedClinic,
                    timestamp: Date.now(),
                }

                return { profile: resolvedProfile, clinic: resolvedClinic }
            } catch (err) {
                console.error('[AuthProvider] Erro ao carregar dados do usuario/clinica:', err)
                return { profile: null, clinic: null }
            } finally {
                _inFlightLoadPromise = null
            }
        })()

        return _inFlightLoadPromise
    }, [supabase])

    const loadSession = useCallback(async () => {
        try {
            // Usa getSession() local (zero requisicoes ao endpoint de auth)
            const { data: { session }, error } = await supabase.auth.getSession()

            if (error || !session?.user) {
                // Fallback via cookies de sessão do servidor (/api/profile)
                try {
                    const srvRes = await fetch('/api/profile')
                    if (srvRes.ok) {
                        const srvData = await srvRes.json()
                        if (srvData?.user) {
                            const u = srvData.user
                            const SUPER_ADMIN_EMAILS = [
                                'robsonfenriz@gmail.com',
                                'contato@clinigo.app',
                                'contato.clinigo@gmail.com',
                                'robsonsync.contas@gmail.com',
                                'superadmin@demo.clinigo.internal'
                            ]
                            const isSuper = (u.email && SUPER_ADMIN_EMAILS.includes(u.email.toLowerCase())) || u.role === 'SUPER_ADMIN'
                            const resolvedProfile: UserProfile = {
                                id: u.id,
                                email: u.email,
                                full_name: u.full_name || (isSuper ? 'Robson' : ''),
                                role: (isSuper ? 'SUPER_ADMIN' : u.role) as any,
                                clinic_id: u.clinic_id || undefined,
                                avatar_url: u.avatar_url || undefined,
                                is_coordinator: !!u.is_coordinator,
                            }
                            setUser({ id: u.id, email: u.email } as any)
                            setProfile(resolvedProfile)
                            setClinic(u.clinic || null)
                            currentUserIdRef.current = u.id
                            setIsLoading(false)
                            return
                        }
                    }
                } catch (fallbackErr) {
                    console.warn('[AuthProvider] Fallback inicial via /api/profile falhou:', fallbackErr)
                }

                setUser(null)
                setProfile(null)
                setClinic(null)
                currentUserIdRef.current = null
                _memoryCache = null
                setIsLoading(false)
                return
            }

            const authUser = session.user
            setUser(authUser)
            currentUserIdRef.current = authUser.id

            const { profile: userProfile, clinic: clinicData } = await fetchUserData(authUser)
            setProfile(userProfile)
            setClinic(clinicData)
        } catch (err) {
            console.error('[AuthProvider] Erro ao inicializar sessao:', err)
            setUser(null)
            setProfile(null)
            setClinic(null)
        } finally {
            setIsLoading(false)
        }
    }, [supabase, fetchUserData])

    useEffect(() => {
        // Inicializa sessao via localStorage / cookies locais
        loadSession()

        // UMA unica assinatura global de onAuthStateChange
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_OUT') {
                    setUser(null)
                    setProfile(null)
                    setClinic(null)
                    currentUserIdRef.current = null
                    _memoryCache = null
                    setIsLoading(false)
                } else if (event === 'SIGNED_IN') {
                    const newUserId = session?.user?.id
                    // SOH refaz o fetch se o user.id realmente mudou!
                    if (newUserId && newUserId !== currentUserIdRef.current) {
                        setUser(session!.user)
                        currentUserIdRef.current = newUserId
                        setIsLoading(true)
                        const { profile: userProfile, clinic: clinicData } = await fetchUserData(session!.user)
                        setProfile(userProfile)
                        setClinic(clinicData)
                        setIsLoading(false)
                    }
                }
                // Ignora TOKEN_REFRESHED, INITIAL_SESSION e SIGNED_IN repetidos pelo foco de janela
            }
        )

        const handleProfileUpdate = () => {
            _memoryCache = null
            if (user) {
                fetchUserData(user).then(({ profile: p, clinic: c }) => {
                    setProfile(p)
                    setClinic(c)
                })
            }
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('user-profile-updated', handleProfileUpdate)
            window.addEventListener('clinic-profile-updated', handleProfileUpdate)
        }

        return () => {
            subscription.unsubscribe()
            if (typeof window !== 'undefined') {
                window.removeEventListener('user-profile-updated', handleProfileUpdate)
                window.removeEventListener('clinic-profile-updated', handleProfileUpdate)
            }
        }
    }, [supabase, loadSession, fetchUserData, user])

    const signIn = useCallback(async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            throw new Error(error.message)
        }

        try {
            await fetch('/api/auth/session/register', { method: 'POST', credentials: 'include' })
        } catch {
            // Non-blocking
        }

        if (data.user) {
            _memoryCache = null
            setUser(data.user)
            currentUserIdRef.current = data.user.id
            const { profile: p, clinic: c } = await fetchUserData(data.user)
            setProfile(p)
            setClinic(c)
        }

        router.push('/dashboard')
    }, [supabase, router, fetchUserData])

    const signUp = useCallback(async (email: string, password: string, meta: { full_name: string }) => {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name: meta.full_name }),
        })

        const data = await response.json()
        if (!response.ok) {
            throw new Error(data.error?.message || 'Erro ao criar conta')
        }

        try {
            await signIn(email, password)
        } catch {
            // Non-blocking
        }
    }, [signIn])

    const signOut = useCallback(async () => {
        const role = profile?.role
        const isPatient = user && !profile

        _memoryCache = null
        currentUserIdRef.current = null
        setUser(null)
        setProfile(null)
        setClinic(null)

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
    }, [supabase.auth, router, profile?.role, user, profile])

    const reloadUser = useCallback(async () => {
        _memoryCache = null
        if (user) {
            const { profile: p, clinic: c } = await fetchUserData(user)
            setProfile(p)
            setClinic(c)
        }
    }, [user, fetchUserData])

    const refreshProfile = useCallback(async () => {
        _memoryCache = null
        if (user) {
            const { profile: p, clinic: c } = await fetchUserData(user)
            setProfile(p)
            setClinic(c)
        }
    }, [user, fetchUserData])

    // Invalidação automática de cache em mutações de perfil, clínica, plano, módulos ou troca de clínica
    useEffect(() => {
        const handleRefresh = () => {
            _memoryCache = null
            if (user) {
                fetchUserData(user).then(({ profile: p, clinic: c }) => {
                    setProfile(p)
                    setClinic(c)
                })
            }
        }

        window.addEventListener('user-profile-updated', handleRefresh)
        window.addEventListener('clinic-profile-updated', handleRefresh)
        window.addEventListener('clinic-modules-updated', handleRefresh)
        window.addEventListener('clinic-switched', handleRefresh)

        return () => {
            window.removeEventListener('user-profile-updated', handleRefresh)
            window.removeEventListener('clinic-profile-updated', handleRefresh)
            window.removeEventListener('clinic-modules-updated', handleRefresh)
            window.removeEventListener('clinic-switched', handleRefresh)
        }
    }, [user, fetchUserData])

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                clinic,
                isLoading,
                isAuthenticated: !!user,
                signIn,
                signUp,
                signOut,
                reloadUser,
                refreshProfile,
                supabase,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuthContext() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuthContext must be used within an AuthProvider')
    }
    return context
}
