/**
 * Premium TV Panel - Public Route
 * URL: /painel-tv/[clinicId]
 * 
 * Professional fullscreen display for clinic waiting rooms.
 * Uses Supabase Realtime to show patient call animations.
 * No authentication required — accessed via clinic ID in URL.
 */

'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { useParams } from 'next/navigation'

interface Appointment {
    id: string
    status: string
    appointment_time: string
    checked_in_at?: string
    started_at?: string
    called_at?: string
    consulting_room_id?: string
    patient: {
        full_name: string
    }
    doctor: {
        user: {
            full_name: string
        }
    }
}

interface ConsultingRoom {
    id: string
    name: string
    display_name: string | null
    room_number: number
    doctor?: { id: string; user: { full_name: string }; specialty: string }
}

interface CalledPatient {
    patientName: string
    doctorName: string
    timestamp: number
}

export default function PainelTVPage() {
    const params = useParams()
    const clinicId = params.clinicId as string

    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [currentTime, setCurrentTime] = useState(new Date())
    const [calledPatient, setCalledPatient] = useState<CalledPatient | null>(null)
    const [clinicName, setClinicName] = useState('')
    const [isConnected, setIsConnected] = useState(false)
    const [audioReady, setAudioReady] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('tv_audio_ready') === 'true'
        }
        return false
    })
    const [rooms, setRooms] = useState<ConsultingRoom[]>([])
    const appointmentsRef = useRef<Appointment[]>([])
    const audioCtxRef = useRef<AudioContext | null>(null)

    const supabase = createClient()

    // Initialize AudioContext on first user interaction (browser autoplay policy)
    const initAudio = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
            setAudioReady(true)
            localStorage.setItem('tv_audio_ready', 'true')
        }
    }, [])

    useEffect(() => {
        const handleInteraction = () => {
            initAudio()
            document.removeEventListener('click', handleInteraction)
        }
        document.addEventListener('click', handleInteraction)
        return () => document.removeEventListener('click', handleInteraction)
    }, [initAudio])

    // Professional chime sound using Web Audio API
    const playCallSound = useCallback(async () => {
        const ctx = audioCtxRef.current
        if (!ctx) return

        // Resume AudioContext if browser suspended it after inactivity
        if (ctx.state === 'suspended') {
            await ctx.resume()
        }

        const now = ctx.currentTime

        // First tone — C5 (523 Hz)
        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.type = 'sine'
        osc1.frequency.setValueAtTime(523.25, now)
        gain1.gain.setValueAtTime(0, now)
        gain1.gain.linearRampToValueAtTime(0.4, now + 0.05)
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.6)
        osc1.connect(gain1)
        gain1.connect(ctx.destination)
        osc1.start(now)
        osc1.stop(now + 0.6)

        // Second tone — E5 (659 Hz) — 200ms after first
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(659.25, now + 0.2)
        gain2.gain.setValueAtTime(0, now + 0.2)
        gain2.gain.linearRampToValueAtTime(0.4, now + 0.25)
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.9)
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.start(now + 0.2)
        osc2.stop(now + 0.9)

        // Third tone — G5 (784 Hz) — 400ms after first
        const osc3 = ctx.createOscillator()
        const gain3 = ctx.createGain()
        osc3.type = 'sine'
        osc3.frequency.setValueAtTime(783.99, now + 0.4)
        gain3.gain.setValueAtTime(0, now + 0.4)
        gain3.gain.linearRampToValueAtTime(0.35, now + 0.45)
        gain3.gain.exponentialRampToValueAtTime(0.01, now + 1.2)
        osc3.connect(gain3)
        gain3.connect(ctx.destination)
        osc3.start(now + 0.4)
        osc3.stop(now + 1.2)
    }, [])

    const fetchAppointments = useCallback(async () => {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

        const { data } = await (supabase as any)
            .from('appointments')
            .select(`
                id,
                status,
                appointment_time,
                checked_in_at,
                started_at,
                called_at,
                consulting_room_id,
                patient:patients(full_name),
                doctor:doctors(user:users(full_name))
            `)
            .eq('clinic_id', clinicId)
            .eq('appointment_date', today)
            .in('status', ['WAITING', 'IN_PROGRESS', 'COMPLETED'])
            .order('appointment_time', { ascending: true })

        if (data) {
            const typed = data as Appointment[]
            setAppointments(typed)
            appointmentsRef.current = typed
        }
    }, [clinicId])

    const fetchRooms = useCallback(async () => {
        try {
            const res = await fetch(`/api/consulting-rooms?clinicId=${clinicId}`)
            if (res.ok) {
                const data = await res.json()
                setRooms(data.rooms || [])
            }
        } catch (e) {
            console.error('[TV Panel] Error fetching rooms:', e)
        }
    }, [clinicId])

    // Fetch clinic name
    useEffect(() => {
        async function fetchClinic() {
            const { data } = await (supabase as any)
                .from('clinics')
                .select('name')
                .eq('id', clinicId)
                .single()
            if (data) setClinicName(data.name)
        }
        fetchClinic()
    }, [clinicId])

    useEffect(() => {
        fetchAppointments()
        fetchRooms()

        // Realtime subscription
        const channel = supabase
            .channel('tv_panel_realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'appointments',
                },
                async (payload: any) => {
                    if (payload.eventType === 'UPDATE') {
                        // Detect patient call: CONFIRMED→WAITING (first call) or WAITING→WAITING with new called_at (re-call)
                        const isFirstCall = payload.new.status === 'WAITING' && payload.old?.status !== 'WAITING'
                        const isRecall = payload.new.status === 'WAITING' && payload.old?.status === 'WAITING' && payload.new.called_at !== payload.old?.called_at

                        if (isFirstCall || isRecall) {
                            // Fetch full data with patient/doctor names
                            await fetchAppointments()
                            // Small delay to ensure state is updated
                            setTimeout(() => {
                                const apt = appointmentsRef.current.find(a => a.id === payload.new.id)
                                if (apt) {
                                    setCalledPatient({
                                        patientName: apt.patient?.full_name || 'Paciente',
                                        doctorName: apt.doctor?.user?.full_name || '',
                                        timestamp: Date.now(),
                                    })
                                    // 🔊 Play notification sound
                                    playCallSound()
                                    // Auto-dismiss after 8 seconds
                                    setTimeout(() => setCalledPatient(null), 8000)
                                }
                            }, 600)
                        } else {
                            // Other status change — just refresh
                            fetchAppointments()
                        }
                    } else if (payload.eventType === 'INSERT') {
                        fetchAppointments()
                    }
                }
            )
            .subscribe((status: string) => {
                setIsConnected(status === 'SUBSCRIBED')
            })

        // Clock update
        const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000)

        // Fallback refresh every 60 seconds
        const refreshInterval = setInterval(fetchAppointments, 60000)

        return () => {
            channel.unsubscribe()
            clearInterval(clockInterval)
            clearInterval(refreshInterval)
        }
    }, [clinicId, fetchAppointments, fetchRooms, playCallSound])

    // Find the most recently called or in-progress patient to display
    const activePatient = appointments.find(a => a.status === 'WAITING' || a.status === 'IN_PROGRESS')

    // Find the consulting room for the active patient
    const activeRoom = activePatient?.consulting_room_id
        ? rooms.find(r => r.id === activePatient.consulting_room_id)
        : null

    return (
        <div
            className="h-screen text-white overflow-hidden flex flex-col font-sans"
            style={{ background: 'linear-gradient(160deg, #1a3a5c 0%, #15304d 50%, #0f2640 100%)' }}
        >
            {/* Audio Enable Prompt — disappears after first click */}
            {!audioReady && (
                <div
                    className="px-10 py-2 bg-amber-500/10 border-b border-amber-400/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    onClick={initAudio}
                >
                    <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M6 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h2l3.5-4.5A.5.5 0 0110 5v14a.5.5 0 01-.5.5L6 15z" />
                    </svg>
                    <span className="text-sm text-amber-300/80">Clique na tela para ativar o som de chamada</span>
                </div>
            )}

            {/* Main Content — Centered Display */}
            <div className="flex-1 flex flex-col items-center justify-center px-8">
                {activePatient ? (
                    <div className="text-center" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                        {/* Patient Name */}
                        <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-tight mb-4 tracking-tight">
                            {activePatient.patient?.full_name}
                        </h1>

                        {/* Doctor Name */}
                        {activePatient.doctor?.user?.full_name && (
                            <p className="text-2xl md:text-3xl lg:text-4xl text-white/70 font-light mb-10">
                                Dr. {activePatient.doctor.user.full_name}
                            </p>
                        )}

                        {/* Consultório Badge */}
                        <div className="inline-block">
                            <span
                                className="inline-block px-8 py-3 rounded-xl text-xl md:text-2xl font-semibold tracking-wide"
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    color: '#ffffff',
                                }}
                            >
                                {activeRoom
                                    ? `Consultório ${activeRoom.room_number}`
                                    : 'Consultório'
                                }
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="text-center" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                        <h1 className="text-4xl md:text-5xl font-light text-white/30 mb-4">
                            {clinicName || 'Painel de Atendimento'}
                        </h1>
                        <p className="text-xl text-white/15">
                            Aguardando chamada de paciente...
                        </p>
                    </div>
                )}
            </div>

            {/* Minimal Footer */}
            <footer className="flex items-center justify-between px-10 py-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <span className="text-xs text-white/30">{isConnected ? 'Ao vivo' : 'Reconectando...'}</span>
                </div>
                <div className="text-2xl font-light tracking-widest text-white/40 font-mono tabular-nums">
                    {format(currentTime, 'HH:mm')}
                </div>
            </footer>

            {/* Call Animation Overlay */}
            {calledPatient && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{
                        background: 'linear-gradient(160deg, #1a3a5c 0%, #15304d 50%, #0f2640 100%)',
                        animation: 'fadeIn 0.3s ease-out',
                    }}
                >
                    <div className="text-center max-w-5xl mx-auto px-8">
                        {/* Patient Name */}
                        <h2
                            className="text-7xl md:text-8xl lg:text-9xl font-bold text-white mb-6 leading-tight tracking-tight"
                            style={{ animation: 'slideUp 0.5s ease-out' }}
                        >
                            {calledPatient.patientName}
                        </h2>

                        {calledPatient.doctorName && (
                            <p className="text-3xl md:text-4xl text-white/70 font-light mb-10">
                                Dr. {calledPatient.doctorName}
                            </p>
                        )}

                        {/* Consultório Badge */}
                        <div className="inline-block">
                            <span
                                className="inline-block px-10 py-4 rounded-xl text-2xl md:text-3xl font-semibold tracking-wide"
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    color: '#ffffff',
                                    animation: 'slideUp 0.7s ease-out',
                                }}
                            >
                                {activeRoom
                                    ? `Consultório ${activeRoom.room_number}`
                                    : 'Consultório'
                                }
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Inline Styles for animations */}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
