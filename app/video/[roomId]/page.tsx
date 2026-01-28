'use client'

import { use, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { VideoCallRoom } from '@/components/video-call/VideoCallRoom'
import { Loader2, Video, Calendar, Clock, User, Stethoscope } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface VideoCallPageProps {
    params: Promise<{ roomId: string }>
    searchParams: Promise<{ role?: string; token?: string }>
}

interface AppointmentInfo {
    id: string
    date: string
    time: string
    status: string
    type: string
    patient: { id: string; full_name: string; email: string }
    doctor: { id: string; name: string; specialty: string }
    clinic: { id: string; name: string; slug: string }
}

export default function VideoCallPage({ params, searchParams }: VideoCallPageProps) {
    const { roomId } = use(params)
    const { role: roleParam, token: tokenParam } = use(searchParams)
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showStartButton, setShowStartButton] = useState(false)
    const [callStarted, setCallStarted] = useState(false)
    const [appointmentInfo, setAppointmentInfo] = useState<AppointmentInfo | null>(null)
    const [userInfo, setUserInfo] = useState<{
        role: 'doctor' | 'patient'
        token: string
    } | null>(null)

    useEffect(() => {
        async function validateAccess() {
            try {
                // 🔥 NEW: Check if accessing via token link (patient direct access)
                if (tokenParam && roleParam) {
                    console.log('[Video] Validating token access...')

                    const validateRes = await fetch('/api/video/validate-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            roomId,
                            token: tokenParam,
                            role: roleParam
                        })
                    })

                    if (validateRes.ok) {
                        const data = await validateRes.json()
                        console.log('[Video] Token validated:', data)

                        setAppointmentInfo(data.appointment)
                        setUserInfo({
                            role: data.role,
                            token: tokenParam
                        })
                        setShowStartButton(true) // Show "Iniciar Consulta" button
                        setLoading(false)
                        return
                    } else {
                        const errorData = await validateRes.json()
                        setError(errorData.error || 'Token inválido')
                        setLoading(false)
                        return
                    }
                }

                // FALLBACK: Original session-based validation for clinic users
                const sessionRes = await fetch('/api/auth/session')
                if (!sessionRes.ok) {
                    setError('Acesso não autorizado. Use o link enviado por email/WhatsApp.')
                    setLoading(false)
                    return
                }

                const sessionData = await sessionRes.json()

                if (!sessionData.session) {
                    setError('Acesso não autorizado. Use o link enviado por email/WhatsApp.')
                    setLoading(false)
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

                // Determine role based on user
                let role: 'doctor' | 'patient' = 'patient'

                const profileRes = await fetch('/api/users/me')
                if (profileRes.ok) {
                    const profileData = await profileRes.json()
                    const userRole = profileData.data?.role || profileData.role

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

                setAppointmentInfo({
                    id: appointment.id,
                    date: appointment.appointment_date,
                    time: appointment.appointment_time,
                    status: appointment.status,
                    type: appointment.type,
                    patient: appointment.patient,
                    doctor: appointment.doctor,
                    clinic: appointment.clinic
                })
                setUserInfo({
                    role,
                    token: sessionData.session.access_token
                })
                setShowStartButton(true)
                setLoading(false)
            } catch (err) {
                console.error('Error validating access:', err)
                setError('Erro ao carregar a consulta')
                setLoading(false)
            }
        }

        validateAccess()
    }, [roomId, roleParam, tokenParam, router])

    // Loading state
    if (loading) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-emerald-900 to-emerald-700 flex items-center justify-center z-50">
                <div className="text-center text-white">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
                    <p className="text-lg">Carregando consulta...</p>
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-red-900 to-red-700 flex items-center justify-center z-50">
                <div className="text-center text-white max-w-md px-4">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Video className="w-10 h-10" />
                    </div>
                    <p className="text-xl mb-2">Não foi possível acessar</p>
                    <p className="text-white/70 mb-6">{error}</p>
                    <button
                        onClick={() => window.close()}
                        className="px-6 py-3 bg-white text-red-900 rounded-lg hover:bg-gray-100 font-medium"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        )
    }

    // Show "Iniciar Consulta" button before starting call
    if (showStartButton && !callStarted && appointmentInfo) {
        const formattedDate = appointmentInfo.date
            ? format(new Date(appointmentInfo.date + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })
            : ''

        return (
            <div className="fixed inset-0 bg-gradient-to-br from-emerald-900 to-emerald-700 flex items-center justify-center z-50">
                <div className="text-center text-white max-w-md px-4">
                    {/* Logo/Icon */}
                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Video className="w-12 h-12" />
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold mb-2">Teleconsulta</h1>
                    <p className="text-emerald-200 mb-8">{appointmentInfo.clinic?.name}</p>

                    {/* Appointment Info Card */}
                    <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-8 text-left">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-emerald-300" />
                                <span>{formattedDate} às {appointmentInfo.time?.slice(0, 5)}</span>
                            </div>

                            {userInfo?.role === 'patient' && appointmentInfo.doctor && (
                                <div className="flex items-center gap-3">
                                    <Stethoscope className="w-5 h-5 text-emerald-300" />
                                    <div>
                                        <p className="font-medium">{appointmentInfo.doctor.name}</p>
                                        <p className="text-sm text-emerald-200">{appointmentInfo.doctor.specialty}</p>
                                    </div>
                                </div>
                            )}

                            {userInfo?.role === 'doctor' && appointmentInfo.patient && (
                                <div className="flex items-center gap-3">
                                    <User className="w-5 h-5 text-emerald-300" />
                                    <div>
                                        <p className="font-medium">{appointmentInfo.patient.full_name}</p>
                                        <p className="text-sm text-emerald-200">Paciente</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Start Button */}
                    <button
                        onClick={() => setCallStarted(true)}
                        className="w-full py-4 bg-white text-emerald-900 rounded-xl hover:bg-emerald-50 font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                    >
                        <Video className="w-6 h-6" />
                        Iniciar Consulta
                    </button>

                    <p className="text-emerald-200 text-sm mt-4">
                        Certifique-se de que sua câmera e microfone estão funcionando
                    </p>
                </div>
            </div>
        )
    }

    // Video call started
    if (!userInfo) {
        return null
    }

    return (
        <VideoCallRoom
            roomId={roomId}
            appointmentId={appointmentInfo?.id || roomId}
            role={userInfo.role}
            token={userInfo.token}
            onEndCall={() => {
                // If accessed via token, just close the window
                if (tokenParam) {
                    window.close()
                } else {
                    router.push('/dashboard')
                }
            }}
        />
    )
}
