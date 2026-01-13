'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { VideoCallRoom } from '@/components/video-call/VideoCallRoom'
import { Loader2 } from 'lucide-react'

interface VideoCallPageProps {
    params: Promise<{ roomId: string }>
    searchParams: Promise<{ role?: string }>
}

export default function VideoCallPage({ params, searchParams }: VideoCallPageProps) {
    const { roomId } = use(params)
    const { role: roleParam } = use(searchParams)
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [userInfo, setUserInfo] = useState<{
        role: 'doctor' | 'patient'
        token: string
    } | null>(null)

    useEffect(() => {
        async function validateAccess() {
            try {
                // Get current session
                const sessionRes = await fetch('/api/auth/session')
                if (!sessionRes.ok) {
                    router.push('/login')
                    return
                }

                const sessionData = await sessionRes.json()

                if (!sessionData.session) {
                    router.push('/login')
                    return
                }

                // The roomId IS the appointmentId
                const appointmentRes = await fetch(`/api/appointments/${roomId}`)
                if (!appointmentRes.ok) {
                    setError('Consulta não encontrada')
                    setLoading(false)
                    return
                }

                const appointmentData = await appointmentRes.json()
                const appointment = appointmentData.data || appointmentData

                console.log('[Video] Appointment data:', appointment)
                console.log('[Video] Current user:', sessionData.user?.id)

                // Determine role based on user
                let role: 'doctor' | 'patient' = 'patient'

                // Check user's role from profile
                const profileRes = await fetch('/api/users/me')
                if (profileRes.ok) {
                    const profileData = await profileRes.json()
                    const userRole = profileData.data?.role || profileData.role
                    console.log('[Video] User role from profile:', userRole)

                    if (userRole === 'DOCTOR' || userRole === 'CLINIC_ADMIN' || userRole === 'SUPER_ADMIN') {
                        role = 'doctor'
                    }
                }

                // Override with URL param if specified
                if (roleParam === 'doctor') {
                    role = 'doctor'
                } else if (roleParam === 'patient') {
                    role = 'patient'
                }

                console.log('[Video] Final role:', role)

                setUserInfo({
                    role,
                    token: sessionData.session.access_token
                })
                setLoading(false)
            } catch (err) {
                console.error('Error validating access:', err)
                setError('Erro ao carregar a consulta')
                setLoading(false)
            }
        }

        validateAccess()
    }, [roomId, roleParam, router])

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
                <div className="text-center text-white">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
                    <p className="text-lg">Carregando consulta...</p>
                </div>
            </div>
        )
    }

    if (error || !userInfo) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
                <div className="text-center text-white">
                    <p className="text-xl text-red-400 mb-4">{error || 'Erro desconhecido'}</p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-6 py-2 bg-white text-black rounded-lg hover:bg-gray-100"
                    >
                        Voltar ao Dashboard
                    </button>
                </div>
            </div>
        )
    }

    return (
        <VideoCallRoom
            roomId={roomId}
            appointmentId={roomId}
            role={userInfo.role}
            token={userInfo.token}
            onEndCall={() => {
                router.push('/dashboard')
            }}
        />
    )
}
