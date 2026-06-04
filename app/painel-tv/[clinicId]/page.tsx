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
    ticket_number?: string | null
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
    ticketNumber?: string | null
    roomName: string
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
    const [audioReady, setAudioReady] = useState(false)
    const [rooms, setRooms] = useState<ConsultingRoom[]>([])
    const appointmentsRef = useRef<Appointment[]>([])
    const roomsRef = useRef<ConsultingRoom[]>([])
    const audioCtxRef = useRef<AudioContext | null>(null)

    const supabase = createClient()

    // Initialize AudioContext & SpeechSynthesis on first user interaction
    const initAudio = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
            setAudioReady(true)
            localStorage.setItem('tv_audio_ready', 'true')

            // Unlock SpeechSynthesis
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                const utterance = new SpeechSynthesisUtterance('')
                window.speechSynthesis.speak(utterance)
            }
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
        if (!audioCtxRef.current) {
            try {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
                setAudioReady(true)
            } catch (e) {
                console.error('[TV Panel] Cannot create AudioContext:', e)
                return
            }
        }
        const ctx = audioCtxRef.current

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

    // Speech synthesis vocalization of called patient
    const speakCall = useCallback((patientName: string, roomName: string, ticketNumber?: string | null) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return

        // Cancel any active speech to avoid overlapping
        window.speechSynthesis.cancel()

        // Speak sequence: Ticket (spelled out), patient name, room name
        let text = ''
        if (ticketNumber) {
            const spelledTicket = ticketNumber.replace('-', ' ')
            text = `Senha ${spelledTicket}, ${patientName}. Dirija-se ao ${roomName}.`
        } else {
            text = `${patientName}. Dirija-se ao ${roomName}.`
        }

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'pt-BR'
        utterance.rate = 0.9 // Calm natural speaking rate
        utterance.pitch = 1.0

        // Find PT-BR voice
        const voices = window.speechSynthesis.getVoices()
        const ptVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR'))
        if (ptVoice) {
            utterance.voice = ptVoice
        }

        window.speechSynthesis.speak(utterance)
    }, [])

    const fetchAppointments = useCallback(async () => {
        try {
            const res = await fetch(`/api/reception/queue?clinicId=${clinicId}`)
            if (res.ok) {
                const data = await res.json()
                const mapped: Appointment[] = (data.queue || []).map((q: any) => ({
                    id: q.id,
                    status: q.status,
                    appointment_time: q.scheduledTime ? q.scheduledTime.split('T')[1]?.substring(0, 5) || '' : '',
                    checked_in_at: q.checkedInAt || q.arrivalTime,
                    started_at: q.status === 'IN_PROGRESS' ? q.arrivalTime : undefined,
                    called_at: q.status === 'WAITING' ? q.arrivalTime : undefined,
                    consulting_room_id: q.consulting_room_id,
                    ticket_number: q.ticket_number,
                    patient: {
                        full_name: q.patient?.full_name || 'Paciente'
                    },
                    doctor: q.doctor ? {
                        user: {
                            full_name: q.doctor.user?.full_name || q.doctor.user?.name || ''
                        }
                    } : {
                        user: {
                            full_name: ''
                        }
                    }
                }))
                setAppointments(mapped)
                appointmentsRef.current = mapped
            }
        } catch (e) {
            console.error('[TV Panel] Error fetching appointments from queue endpoint:', e)
        }
    }, [clinicId])

    const fetchRooms = useCallback(async () => {
        try {
            const res = await fetch(`/api/consulting-rooms?clinicId=${clinicId}`)
            if (res.ok) {
                const data = await res.json()
                const roomList = data.rooms || []
                setRooms(roomList)
                roomsRef.current = roomList
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
                        // Detect patient call
                        const isFirstCall = payload.new.status === 'WAITING' && payload.old?.status !== 'WAITING'
                        const isRecall = payload.new.status === 'WAITING' && payload.old?.status === 'WAITING' && payload.new.called_at !== payload.old?.called_at

                        if (isFirstCall || isRecall) {
                            await fetchAppointments()
                            // Small delay to ensure state lists are synced
                            setTimeout(() => {
                                const apt = appointmentsRef.current.find(a => a.id === payload.new.id)
                                if (apt) {
                                    // Resolve room name
                                    const roomId = payload.new.consulting_room_id
                                    const room = roomsRef.current.find(r => r.id === roomId)
                                    const roomText = room ? room.display_name || room.name || `Consultório ${room.room_number}` : 'Consultório'

                                    setCalledPatient({
                                        patientName: apt.patient?.full_name || 'Paciente',
                                        doctorName: apt.doctor?.user?.full_name || '',
                                        ticketNumber: apt.ticket_number,
                                        roomName: roomText,
                                        timestamp: Date.now(),
                                    })

                                    // Play sound
                                    playCallSound()

                                    // Speak name and room 1 second after chime starts
                                    setTimeout(() => {
                                        speakCall(apt.patient?.full_name || 'Paciente', roomText, apt.ticket_number)
                                    }, 1000)

                                    // Dismiss call overlay after 12 seconds
                                    setTimeout(() => setCalledPatient(null), 12000)
                                }
                            }, 500)
                        } else {
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
    }, [clinicId, fetchAppointments, fetchRooms, playCallSound, speakCall])

    // Find the most recently called or in-progress patient to display on main screen
    const activePatient = appointments.find(a => a.status === 'WAITING' || a.status === 'IN_PROGRESS')

    // Find the consulting room for the active patient
    const activeRoom = activePatient?.consulting_room_id
        ? rooms.find(r => r.id === activePatient.consulting_room_id)
        : null

    return (
        <div
            className="h-screen text-white overflow-hidden flex flex-col font-sans select-none"
            style={{ background: 'linear-gradient(160deg, #1a3a5c 0%, #15304d 50%, #0f2640 100%)' }}
        >
            {/* Audio Enable Prompt */}
            {!audioReady && (
                <div
                    className="px-10 py-3.5 bg-amber-500/10 border-b border-amber-400/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    onClick={initAudio}
                    style={{ animation: 'pulseGlow 2s infinite' }}
                >
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M6 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h2l3.5-4.5A.5.5 0 0110 5v14a.5.5 0 01-.5.5L6 15z" />
                    </svg>
                    <span className="text-sm md:text-base font-medium text-amber-300">
                        Toque ou clique na tela para ativar o som de chamada e voz
                    </span>
                </div>
            )}

            {/* Main Content — Centered Display */}
            <div className="flex-1 flex flex-col items-center justify-center px-8">
                {activePatient ? (
                    <div className="text-center" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                        {/* Ticket Number Badge */}
                        {activePatient.ticket_number && (
                            <div className="mb-4">
                                <span className="inline-block px-5 py-2 rounded-xl text-amber-400 font-mono text-2xl font-semibold border border-amber-400/20 bg-amber-400/5 tracking-wider">
                                    SENHA {activePatient.ticket_number}
                                </span>
                            </div>
                        )}

                        {/* Patient Name */}
                        <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-tight mb-4 tracking-tight uppercase">
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
                                    ? activeRoom.display_name || activeRoom.name || `Consultório ${activeRoom.room_number}`
                                    : 'Consultório'
                                }
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="text-center" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                        <h1 className="text-4xl md:text-5xl font-light text-white/30 mb-4 tracking-wider uppercase">
                            {clinicName || 'Painel de Atendimento'}
                        </h1>
                        <p className="text-xl text-white/15">
                            Aguardando chamada de paciente...
                        </p>
                    </div>
                )}
            </div>

            {/* Minimal Footer */}
            <footer className="flex items-center justify-between px-10 py-4 border-t border-white/5 bg-slate-950/20">
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />
                    <span className="text-xs text-white/30 tracking-wider uppercase">
                        {isConnected ? 'Sistema Conectado' : 'Reconectando...'}
                    </span>
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
                        background: 'linear-gradient(160deg, #1e3a60 0%, #112844 100%)',
                        animation: 'fadeIn 0.25s ease-out',
                    }}
                >
                    <div className="text-center max-w-5xl mx-auto px-8">
                        {/* Call Announcement Header */}
                        <div className="mb-8" style={{ animation: 'slideUp 0.4s ease-out' }}>
                            <span className="inline-block px-6 py-2.5 rounded-2xl bg-amber-400 text-slate-950 text-xl font-bold font-mono tracking-widest uppercase">
                                {calledPatient.ticketNumber ? `SENHA ${calledPatient.ticketNumber}` : 'CHAMADA'}
                            </span>
                        </div>

                        {/* Patient Name */}
                        <h2
                            className="text-7xl md:text-8xl lg:text-9xl font-bold text-white mb-6 leading-tight tracking-tight uppercase"
                            style={{ animation: 'slideUp 0.5s ease-out' }}
                        >
                            {calledPatient.patientName}
                        </h2>

                        {calledPatient.doctorName && (
                            <p className="text-3xl md:text-4xl text-white/70 font-light mb-10" style={{ animation: 'slideUp 0.6s ease-out' }}>
                                Dr. {calledPatient.doctorName}
                            </p>
                        )}

                        {/* Consultório Badge */}
                        <div className="inline-block" style={{ animation: 'slideUp 0.7s ease-out' }}>
                            <span
                                className="inline-block px-12 py-5 rounded-2xl text-3xl md:text-4xl font-bold tracking-wide"
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    color: '#ffffff',
                                }}
                            >
                                {calledPatient.roomName}
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
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulseGlow {
                    0% { background-color: rgba(245, 158, 11, 0.08); }
                    50% { background-color: rgba(245, 158, 11, 0.16); }
                    100% { background-color: rgba(245, 158, 11, 0.08); }
                }
            `}</style>
        </div>
    )
}
