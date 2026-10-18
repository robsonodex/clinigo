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

// Teto de tempo para qualquer etapa de carregamento: nenhuma chamada pode travar a interface.
function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timeout:${label}`)), ms)
        Promise.resolve(promise).then(
            value => { clearTimeout(timer); resolve(value) },
            err => { clearTimeout(timer); reject(err) }
        )
    })
}

const VALID_ROLES = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'FINANCIAL', 'READONLY']

// Ultimo recurso quando banco e /api/profile falham: perfil a partir dos metadados do token.
// Afeta somente a interface; APIs e RLS continuam validando o papel real no servidor.
function profileFromMetadata(authUser: User): UserProfile | null {
    const meta = (authUser.user_metadata || {}) as Record<string, any>
    if (!meta.role || !VALID_ROLES.includes(meta.role)) return null
    return {
        id: authUser.id,
        email: authUser.email || '',
        full_name: meta.full_name || meta.name || '',
        role: meta.role,
        clinic_id: meta.clinic_id || undefined,
        avatar_url: meta.avatar_url || undefined,
        is_coordinator: false,
    }
}

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
                let data: any = null
                let error: any = null
                try {
                    const result = await withTimeout(supabase
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
                    .maybeSingle(), 6000, 'users')
                    data = result.data
                    error = result.error
                } catch (queryErr) {
                    error = queryErr
                }

                const SUPER_ADMIN_EMAILS = [
                    'robsonfenriz@gmail.com',
                    'contato@clinigo.app',
                    'superadmin@demo.clinigo.internal'
                ]
                const isSuperAdminUser = Boolean(authUser.email && SUPER_ADMIN_EMAILS.includes(authUser.email.toLowerCase()))

                if (error || !data) {
                    // Tenta fallback via rota autenticada do servidor (/api/profile)
                    try {
                        const srvRes = await withTimeout(fetch('/api/profile'), 8000, 'api-profile')
                        if (srvRes.ok) {
                            const srvData = await srvRes.json()
                            if (srvData?.user) {
                                const srvUser = srvData.user
                                const isSuper = isSuperAdminUser || srvUser.role === 'SUPER_ADMIN'
                                const resolvedSrvProfile: UserProfile = {
                                    id: srvUser.id,
                                    email: srvUser.email,
                                    full_name: srvUser.full_name || srvUser.name || (isSuper ? 'Robson' : ''),
                                    role: (isSuper ? 'SUPER_ADMIN' : srvUser.role) as any,
                                    clinic_id: srvUser.clinic_id || srvUser.clinic?.id || undefined,
                                    avatar_url: srvUser.avatar_url || undefined,
                                    is_coordinator: !!srvUser.is_coordinator,
                                }
                                const resolvedSrvClinic = srvUser.clinic || null
                                _memoryCache = {
                                    userId: srvUser.id,
                                    profile: resolvedSrvProfile,
                                    clinic: resolvedSrvClinic,
                                    timestamp: Date.now(),
                                }
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
                    // Nao grava em cache: a proxima navegacao tenta novamente o banco.
                    return { profile: profileFromMetadata(authUser), clinic: null }
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
                return { profile: profileFromMetadata(authUser), clinic: null }
            } finally {
                _inFlightLoadPromise = null
            }
        })()

        return _inFlightLoadPromise
    }, [supabase])

    const loadSession = useCallback(async () => {
        try {
            // 1. Tenta getSession() local (zero requisições de rede se em cache) com teto de 5s
            let authUser: User | null = null
            try {
                const { data: { session } } = await withTimeout(supabase.auth.getSession(), 5000, 'getSession')
                authUser = session?.user || null
            } catch (sessionErr) {
                console.warn('[AuthProvider] getSession indisponivel, usando fallback do servidor:', sessionErr)
            }

            // 2. Se getSession() vier vazio, tenta getUser() para hidratar o cliente
            if (!authUser) {
                try {
                    const { data: userData } = await withTimeout(supabase.auth.getUser(), 5000, 'getUser')
                    if (userData?.user) {
                        authUser = userData.user
                    }
                } catch {
                    // segue para fallback de servidor
                }
            }

            if (!authUser) {
                // 3. Fallback via cookies de sessão do servidor (/api/profile)
                let srvData: any = null
                try {
                    let srvRes = await withTimeout(fetch('/api/profile'), 8000, 'api-profile')
                    if (!srvRes.ok && typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
                        // Pequeno delay de sincronização defensivo para páginas do dashboard
                        await new Promise(r => setTimeout(r, 600))
                        srvRes = await withTimeout(fetch('/api/profile'), 8000, 'api-profile-retry')
                    }
                    if (srvRes.ok) {
                        srvData = await srvRes.json()
                    }
                } catch (fallbackErr) {
                    console.warn('[AuthProvider] Fallback inicial via /api/profile falhou:', fallbackErr)
                }

                if (srvData?.user) {
                    const u = srvData.user
                    const SUPER_ADMIN_EMAILS = [
                        'robsonfenriz@gmail.com',
                        'contato@clinigo.app',
                        'superadmin@demo.clinigo.internal'
                    ]
                    const isSuper = (u.email && SUPER_ADMIN_EMAILS.includes(u.email.toLowerCase())) || u.role === 'SUPER_ADMIN'
                    const resolvedProfile: UserProfile = {
                        id: u.id,
                        email: u.email,
                        full_name: u.full_name || u.name || (isSuper ? 'Robson' : ''),
                        role: (isSuper ? 'SUPER_ADMIN' : u.role) as any,
                        clinic_id: u.clinic_id || u.clinic?.id || undefined,
                        avatar_url: u.avatar_url || undefined,
                        is_coordinator: !!u.is_coordinator,
                    }
                    setUser({ id: u.id, email: u.email } as any)
                    setProfile(resolvedProfile)
                    setClinic(u.clinic || null)
                    currentUserIdRef.current = u.id
                    _memoryCache = {
                        userId: u.id,
                        profile: resolvedProfile,
                        clinic: u.clinic || null,
                        timestamp: Date.now(),
                    }
                    setIsLoading(false)
                    return
                }

                setUser(null)
                setProfile(null)
                setClinic(null)
                currentUserIdRef.current = null
                _memoryCache = null
                setIsLoading(false)
                return
            }

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
        // IMPORTANTE: o callback NAO pode aguardar chamadas do supabase. O auth-js dispara
        // SIGNED_IN dentro do lock de sessao (setSession, initialize, signIn); aguardar uma
        // query aqui causa deadlock (login preso em "Entrando..." / dashboard em branco).
        // Por isso o carregamento do perfil e adiado com setTimeout(0), fora do lock.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
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
                        const signedInUser = session!.user
                        setUser(signedInUser)
                        currentUserIdRef.current = newUserId
                        setIsLoading(true)
                        setTimeout(async () => {
                            try {
                                const { profile: userProfile, clinic: clinicData } = await fetchUserData(signedInUser)
                                if (currentUserIdRef.current !== newUserId) return
                                setProfile(userProfile)
                                setClinic(clinicData)
                            } finally {
                                setIsLoading(false)
                            }
                        }, 0)
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
