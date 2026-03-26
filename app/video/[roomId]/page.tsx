'use client'

import { use, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { VideoCallRoom } from '@/components/video-call/VideoCallRoom'
import { Loader2, Video, Calendar, Clock, User, Stethoscope, Shield, CheckSquare, Square } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ESPACO_INCLUIR_CLINIC_ID = '5163c916-8b82-4d80-8a71-01726836ee46'

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
    doctor: { id: string; full_name: string; specialty: string }
    clinic: { id: string; name: string; slug: string }
}

export default function VideoCallPage({ params, searchParams }: VideoCallPageProps) {
    const { roomId } = use(params)
    const { role: roleParam, token: tokenParam } = use(searchParams)
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showStartButton, setShowStartButton] = useState(false)
    const [showConsent, setShowConsent] = useState(false)
    const [callStarted, setCallStarted] = useState(false)
    const [appointmentInfo, setAppointmentInfo] = useState<AppointmentInfo | null>(null)
    const [userInfo, setUserInfo] = useState<{
        role: 'doctor' | 'patient'
        token: string
    } | null>(null)

    // Consent state
    const [consentTopics, setConsentTopics] = useState({
        teleatendimento: false,
        uso_dados: false,
        lgpd: false,
    })
    const [responsibleName, setResponsibleName] = useState('')
    const [patientName, setPatientName] = useState('')
    const [savingConsent, setSavingConsent] = useState(false)

    const allConsentAccepted = consentTopics.teleatendimento && consentTopics.uso_dados && consentTopics.lgpd

    const handleAcceptConsent = async () => {
        if (!allConsentAccepted || !appointmentInfo) return
        setSavingConsent(true)
        try {
            await fetch('/api/teleconsulta/consent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointment_id: appointmentInfo.id,
                    patient_id: appointmentInfo.patient?.id,
                    clinic_id: appointmentInfo.clinic?.id,
                    consent_topics: consentTopics,
                    responsible_name: responsibleName,
                    patient_name: patientName || appointmentInfo.patient?.full_name,
                })
            })
            setShowConsent(false)
            setCallStarted(true)
        } catch (err) {
            console.error('Error saving consent:', err)
        } finally {
            setSavingConsent(false)
        }
    }

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
                                        <p className="font-medium">{appointmentInfo.doctor.full_name}</p>
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
                        onClick={() => {
                            // Se for Espaço Incluir e role paciente, mostrar consentimento
                            if (appointmentInfo.clinic?.id === ESPACO_INCLUIR_CLINIC_ID && userInfo?.role === 'patient') {
                                setPatientName(appointmentInfo.patient?.full_name || '')
                                setShowConsent(true)
                                setShowStartButton(false)
                            } else {
                                setCallStarted(true)
                            }
                        }}
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

    // Consent screen for Espaço Incluir
    if (showConsent && appointmentInfo) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-emerald-900 to-emerald-700 flex items-center justify-center z-50 overflow-y-auto">
                <div className="text-white max-w-lg w-full px-4 py-8">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-8 h-8" />
                        </div>
                        <h1 className="text-xl font-bold">CONSENTIMENTO PARA TELEATENDIMENTO E TRATAMENTO DE DADOS</h1>
                        <p className="text-emerald-200 mt-1">{appointmentInfo.clinic?.name}</p>
                        <p className="text-emerald-300 text-sm mt-2">Antes de iniciar a teleconsulta, solicitamos a leitura e aceite dos termos abaixo:</p>
                    </div>

                    <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-3">
                        <p className="font-semibold mb-2">🔹 1. Teleatendimento</p>
                        <p className="text-sm text-emerald-100 mb-3">Declaro que estou ciente de que o atendimento será realizado de forma online (videochamada), podendo haver limitações técnicas, e concordo com sua realização.</p>
                        <button onClick={() => setConsentTopics(t => ({ ...t, teleatendimento: !t.teleatendimento }))} className="flex items-center gap-2 text-sm font-medium hover:text-emerald-200 transition-colors">
                            {consentTopics.teleatendimento ? <CheckSquare className="w-5 h-5 text-emerald-300" /> : <Square className="w-5 h-5" />}
                            Li e concordo
                        </button>
                    </div>

                    <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-3">
                        <p className="font-semibold mb-2">🔹 2. Uso de imagem, voz e dados</p>
                        <p className="text-sm text-emerald-100 mb-3">Autorizo o uso de imagem, voz e dados do paciente exclusivamente para fins assistenciais, garantindo o sigilo e ética profissional.</p>
                        <button onClick={() => setConsentTopics(t => ({ ...t, uso_dados: !t.uso_dados }))} className="flex items-center gap-2 text-sm font-medium hover:text-emerald-200 transition-colors">
                            {consentTopics.uso_dados ? <CheckSquare className="w-5 h-5 text-emerald-300" /> : <Square className="w-5 h-5" />}
                            Li e concordo
                        </button>
                    </div>

                    <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-3">
                        <p className="font-semibold mb-2">🔹 3. Proteção de dados (LGPD)</p>
                        <p className="text-sm text-emerald-100 mb-3">Autorizo o tratamento de dados pessoais e dados sensíveis (dados de saúde), conforme a Lei nº 13.709/2018 (LGPD), para fins de atendimento, registro em prontuário e acompanhamento terapêutico.</p>
                        <button onClick={() => setConsentTopics(t => ({ ...t, lgpd: !t.lgpd }))} className="flex items-center gap-2 text-sm font-medium hover:text-emerald-200 transition-colors">
                            {consentTopics.lgpd ? <CheckSquare className="w-5 h-5 text-emerald-300" /> : <Square className="w-5 h-5" />}
                            Li e concordo
                        </button>
                    </div>

                    <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-4">
                        <p className="font-semibold mb-2">🔹 Declaração final</p>
                        <p className="text-sm text-emerald-100 mb-3">Declaro que li, compreendi e concordo com os termos acima, fornecendo meu consentimento de forma livre, informada e inequívoca.</p>
                        <div className="space-y-2">
                            <div>
                                <label className="text-xs text-emerald-300">Nome do responsável</label>
                                <input value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-emerald-300" placeholder="Nome completo do responsável" />
                            </div>
                            <div>
                                <label className="text-xs text-emerald-300">Nome do paciente</label>
                                <input value={patientName} onChange={(e) => setPatientName(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-emerald-300" placeholder="Nome completo do paciente" />
                            </div>
                            <div className="flex gap-4 text-sm text-emerald-200">
                                <span>📅 {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}</span>
                                <span>🕒 {format(new Date(), "HH:mm")}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleAcceptConsent}
                        disabled={!allConsentAccepted || savingConsent}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-3 ${allConsentAccepted ? 'bg-white text-emerald-900 hover:bg-emerald-50 hover:shadow-xl' : 'bg-white/20 text-white/50 cursor-not-allowed'}`}
                    >
                        {savingConsent ? <Loader2 className="w-6 h-6 animate-spin" /> : <Video className="w-6 h-6" />}
                        ACEITAR E INICIAR TELECONSULTA
                    </button>
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
