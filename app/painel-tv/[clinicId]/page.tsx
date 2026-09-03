/**
 * Premium TV Panel - Public Route
 * URL: /painel-tv/[clinicId]
 * 
 * Professional fullscreen display for clinic waiting rooms.
 * Uses Supabase Realtime to show patient call animations and layout changes.
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
        id?: string
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
    doctor_id?: string | null
    show_on_tv?: boolean
    doctor?: { id: string; user: { full_name: string }; specialty: string }
}

interface CalledPatient {
    patientName: string
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
    const [tvLayout, setTvLayout] = useState<'classico' | 'informativo'>('classico')
    const [isConnected, setIsConnected] = useState(false)
    const [audioReady, setAudioReady] = useState(false)
    const [rooms, setRooms] = useState<ConsultingRoom[]>([])
    
    const appointmentsRef = useRef<Appointment[]>([])
    const roomsRef = useRef<ConsultingRoom[]>([])
    const audioCtxRef = useRef<AudioContext | null>(null)

    const supabase = createClient()
    const [tvSoundTheme, setTvSoundTheme] = useState<'classico' | 'moderno' | 'harmonico' | 'bip'>('classico')
    const [tvVoiceGender, setTvVoiceGender] = useState<'feminina' | 'masculina' | 'padrao'>('feminina')

    // Initialize AudioContext & SpeechSynthesis on first user interaction with permanent localStorage persistence (P5)
    const initAudio = useCallback(() => {
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
            }
            if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                audioCtxRef.current.resume()
            }
            setAudioReady(true)
            if (typeof window !== 'undefined') {
                localStorage.setItem(`tv_audio_enabled_${clinicId}`, 'true')
                localStorage.setItem('tv_audio_ready', 'true')

                // Unlock SpeechSynthesis
                if (window.speechSynthesis) {
                    const utterance = new SpeechSynthesisUtterance('')
                    window.speechSynthesis.speak(utterance)
                }
            }
        } catch (e) {
            console.warn('[TV Panel] Audio init error:', e)
        }
    }, [clinicId])

    // Autoplay keep-alive: tenta restaurar áudio se já foi habilitado anteriormente (P5)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const wasEnabled = localStorage.getItem(`tv_audio_enabled_${clinicId}`) === 'true' || localStorage.getItem('tv_audio_ready') === 'true'
            if (wasEnabled) {
                initAudio()
            }
        }

        const handleInteraction = () => {
            initAudio()
        }

        window.addEventListener('click', handleInteraction, { passive: true })
        window.addEventListener('keydown', handleInteraction, { passive: true })
        window.addEventListener('touchstart', handleInteraction, { passive: true })

        // Keep-alive a cada 20 segundos para evitar que o navegador suspenda o AudioContext
        const keepAliveInterval = setInterval(() => {
            if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                audioCtxRef.current.resume().catch(() => {})
            }
        }, 20000)

        return () => {
            window.removeEventListener('click', handleInteraction)
            window.removeEventListener('keydown', handleInteraction)
            window.removeEventListener('touchstart', handleInteraction)
            clearInterval(keepAliveInterval)
        }
    }, [clinicId, initAudio])

    // Som de chamada configurável por clínica (Identidade sonora - P2)
    const playCallSound = useCallback(async (soundType: 'classico' | 'moderno' | 'harmonico' | 'bip' = 'classico') => {
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

        if (soundType === 'moderno') {
            // Ding-Dong de aeroporto / Dois tons: F5 (698.46 Hz) -> C5 (523.25 Hz)
            const osc1 = ctx.createOscillator()
            const gain1 = ctx.createGain()
            osc1.type = 'sine'
            osc1.frequency.setValueAtTime(698.46, now)
            gain1.gain.setValueAtTime(0, now)
            gain1.gain.linearRampToValueAtTime(0.45, now + 0.05)
            gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.7)
            osc1.connect(gain1)
            gain1.connect(ctx.destination)
            osc1.start(now)
            osc1.stop(now + 0.7)

            const osc2 = ctx.createOscillator()
            const gain2 = ctx.createGain()
            osc2.type = 'sine'
            osc2.frequency.setValueAtTime(523.25, now + 0.35)
            gain2.gain.setValueAtTime(0, now + 0.35)
            gain2.gain.linearRampToValueAtTime(0.45, now + 0.4)
            gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.2)
            osc2.connect(gain2)
            gain2.connect(ctx.destination)
            osc2.start(now + 0.35)
            osc2.stop(now + 1.2)
        } else if (soundType === 'harmonico') {
            // Acorde harmônico simultâneo suave C5 + G5 + C6
            ;[523.25, 783.99, 1046.50].forEach((freq) => {
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                osc.type = 'triangle'
                osc.frequency.setValueAtTime(freq, now)
                gain.gain.setValueAtTime(0, now)
                gain.gain.linearRampToValueAtTime(0.2, now + 0.06)
                gain.gain.exponentialRampToValueAtTime(0.005, now + 1.4)
                osc.connect(gain)
                gain.connect(ctx.destination)
                osc.start(now)
                osc.stop(now + 1.4)
            })
        } else if (soundType === 'bip') {
            // Bip duplo rápido e claro (880 Hz)
            ;[0, 0.22].forEach((offset) => {
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                osc.type = 'sine'
                osc.frequency.setValueAtTime(880, now + offset)
                gain.gain.setValueAtTime(0, now + offset)
                gain.gain.linearRampToValueAtTime(0.4, now + offset + 0.02)
                gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.15)
                osc.connect(gain)
                gain.connect(ctx.destination)
                osc.start(now + offset)
                osc.stop(now + offset + 0.15)
            })
        } else {
            // Chime clássico CliniGO: C5 -> E5 -> G5
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
        }
    }, [])

    // Voz neural limpa e objetiva: Nome do Paciente + Sala
    const speakCall = useCallback((
        patientName: string, 
        roomName: string, 
        ticketNumber?: string | null
    ) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return

        // Cancelar qualquer fila anterior e retomar caso o navegador tenha pausado
        window.speechSynthesis.cancel()
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume()
        }

        // Locução enxuta: "[Nome do Paciente], [Sala]" ou "Senha [Número], [Sala]"
        let text = ''
        if (ticketNumber) {
            const spelledTicket = ticketNumber.replace('-', ' ')
            text = `Senha ${spelledTicket}, ${roomName}.`
        } else {
            text = `${patientName}, ${roomName}.`
        }

        console.log('[TV Panel Anunciando Voz]:', text)

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'pt-BR'
        utterance.rate = 0.88
        utterance.pitch = 1.0

        // Localizar melhor voz pt-BR conforme preferência configurada (Feminina / Masculina)
        const voices = window.speechSynthesis.getVoices()
        const ptVoices = voices.filter(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR') || v.lang.startsWith('pt'))
        
        let chosenVoice: SpeechSynthesisVoice | undefined

        if (tvVoiceGender === 'masculina') {
            chosenVoice = ptVoices.find(v => 
                /antonio|felipe|daniel|helio|male|masculin|ricardo/i.test(v.name)
            )
        } else if (tvVoiceGender === 'feminina') {
            chosenVoice = ptVoices.find(v => 
                /francisca|luciana|maria|female|feminin|leticia|google português/i.test(v.name)
            )
        }

        if (!chosenVoice && ptVoices.length > 0) {
            chosenVoice = ptVoices[0]
        }

        if (chosenVoice) {
            utterance.voice = chosenVoice
        }

        window.speechSynthesis.speak(utterance)
    }, [tvVoiceGender])

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
                        id: q.doctor.id,
                        user: {
                            full_name: q.doctor.user?.full_name || q.doctor.user?.name || ''
                        }
                    } : {
                        id: undefined,
                        user: {
                            full_name: ''
                        }
                    }
                }))
                setAppointments(mapped)
                appointmentsRef.current = mapped
            }
        } catch (e) {
            console.error('[TV Panel] Error fetching appointments:', e)
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

    // Fetch clinic name and layout theme config
    const fetchClinic = useCallback(async () => {
        try {
            const { data } = await (supabase as any)
                .from('clinics')
                .select('name, theme')
                .eq('id', clinicId)
                .single()
            if (data) {
                setClinicName(data.name)
                const savedLayout = data.theme?.tv_layout || 'classico'
                setTvLayout(savedLayout)
                setTvSoundTheme(data.theme?.tv_sound_theme || 'classico')
                setTvVoiceGender(data.theme?.tv_voice_gender || 'feminina')
            }
        } catch (e) {
            console.error('[TV Panel] Error loading clinic info:', e)
        }
    }, [clinicId, supabase])

    useEffect(() => {
        fetchClinic()
        fetchAppointments()
        fetchRooms()

        // Realtime subscription for appointments & clinic changes
        const channel = supabase
            .channel(`tv_panel_realtime_${clinicId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'appointments',
                },
                async (payload: any) => {
                    if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                        // Se o agendamento foi colocado ou atualizado em WAITING (chamado)
                        if (payload.new && payload.new.status === 'WAITING') {
                            try {
                                // Buscar dados completos imediatamente direto do Supabase por ID
                                const { data: apptData } = await (supabase as any)
                                    .from('appointments')
                                    .select(`
                                        id,
                                        clinic_id,
                                        ticket_number,
                                        consulting_room_id,
                                        patient:patients(full_name),
                                        consulting_room:consulting_rooms(id, name, display_name, room_number)
                                    `)
                                    .eq('id', payload.new.id)
                                    .maybeSingle()

                                if (apptData && (!apptData.clinic_id || apptData.clinic_id === clinicId)) {
                                    // Resolver nome da sala com prioridade absoluta no NOME cadastrado da sala
                                    let room = apptData.consulting_room
                                    if (!room && apptData.consulting_room_id) {
                                        room = roomsRef.current.find(r => r.id === apptData.consulting_room_id)
                                    }

                                    let roomText = 'Sala'
                                    if (room) {
                                        const rName = (room.name || '').trim()
                                        const rDisp = (room.display_name || '').trim()
                                        // Priorizar o nome da sala (ex: "Sala 8", "Sala B", "Consultório 1")
                                        if (rName) {
                                            roomText = rName
                                        } else if (rDisp && !/clinico|geral|médic|doutor|especial|pediat|psico/i.test(rDisp)) {
                                            roomText = rDisp
                                        } else {
                                            roomText = `Sala ${room.room_number || 1}`
                                        }
                                    }

                                    const patientName = apptData.patient?.full_name?.trim() || 'Paciente'

                                    // Exibir imediatamente na tela da TV
                                    setCalledPatient({
                                        patientName,
                                        ticketNumber: apptData.ticket_number,
                                        roomName: roomText,
                                        timestamp: Date.now(),
                                    })

                                    // Tocar som configurado
                                    playCallSound(tvSoundTheme)

                                    // Locução por voz imediata: exclusivamente Nome do Paciente + Sala cadastrada
                                    setTimeout(() => {
                                        speakCall(patientName, roomText, apptData.ticket_number)
                                    }, 700)

                                    // Fechar overlay após 12 segundos
                                    setTimeout(() => setCalledPatient(null), 12000)
                                }
                            } catch (err) {
                                console.error('[TV Realtime Call Error]:', err)
                            }
                        }

                        fetchAppointments()
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'clinics',
                    filter: `id=eq.${clinicId}`
                },
                (payload: any) => {
                    if (payload.new && payload.new.theme) {
                        const savedLayout = payload.new.theme.tv_layout || 'classico'
                        setTvLayout(savedLayout)
                        if (payload.new.theme.tv_sound_theme) {
                            setTvSoundTheme(payload.new.theme.tv_sound_theme)
                        }
                        if (payload.new.theme.tv_voice_gender) {
                            setTvVoiceGender(payload.new.theme.tv_voice_gender)
                        }
                        if (payload.new.name) {
                            setClinicName(payload.new.name)
                        }
                    }
                }
            )
            .subscribe((status: string) => {
                setIsConnected(status === 'SUBSCRIBED')
            })

        // Clock update
        const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000)

        // Fallback refresh every 60 seconds
        const refreshInterval = setInterval(() => {
            fetchAppointments()
            fetchRooms()
        }, 60000)

        return () => {
            channel.unsubscribe()
            clearInterval(clockInterval)
            clearInterval(refreshInterval)
        }
    }, [clinicId, fetchClinic, fetchAppointments, fetchRooms, playCallSound, speakCall, supabase])

    // Find the most recently called or in-progress patient to display on main screen
    const activePatient = appointments.find(a => a.status === 'WAITING' || a.status === 'IN_PROGRESS')

    // Find the consulting room for the active patient (por ID direto ou por médico associado)
    const activeRoom = activePatient
        ? rooms.find(r => 
            (activePatient.consulting_room_id && r.id === activePatient.consulting_room_id) ||
            (activePatient.doctor?.id && (r.doctor_id === activePatient.doctor.id || r.doctor?.id === activePatient.doctor.id)) ||
            (activePatient.doctor?.user?.full_name && r.doctor?.user?.full_name && 
             r.doctor.user.full_name.toLowerCase().trim() === activePatient.doctor.user.full_name.toLowerCase().trim())
          ) || null
        : null

    return (
        <div
            className="h-screen w-screen text-white overflow-hidden flex flex-col font-sans select-none"
            style={{ background: 'linear-gradient(160deg, #0b1a2d 0%, #0d1e33 50%, #081220 100%)' }}
        >
            {/* Audio Enable Prompt */}
            {!audioReady && (
                <div
                    className="px-10 py-3.5 bg-amber-500/10 border-b border-amber-400/20 flex items-center justify-center gap-2 cursor-pointer shrink-0 animate-pulse"
                    onClick={initAudio}
                >
                    <svg className="w-5 h-5 text-amber-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M6 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h2l3.5-4.5A.5.5 0 0110 5v14a.5.5 0 01-.5.5L6 15z" />
                    </svg>
                    <span className="text-sm md:text-base font-semibold text-amber-300">
                        Clique em qualquer lugar da tela para ativar o som e voz do painel
                    </span>
                </div>
            )}

            {/* Layout Wrapper */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Main panel area */}
                <div className={`flex-1 flex flex-col items-center justify-center px-12 transition-all duration-300 ${
                    tvLayout === 'informativo' ? 'w-2/3 border-r border-white/5' : 'w-full'
                }`}>
                    {activePatient ? (
                        <div className="text-center space-y-6" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                            
                            {/* Ticket number (Giant scale) */}
                            {activePatient.ticket_number && (
                                <div>
                                    <span className="inline-block px-10 py-4 rounded-3xl bg-amber-400/10 text-amber-400 font-mono text-5xl md:text-6xl font-bold border border-amber-400/25 tracking-widest shadow-[0_0_50px_rgba(245,158,11,0.1)]">
                                        {activePatient.ticket_number}
                                    </span>
                                </div>
                            )}

                            {/* Patient Name */}
                            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-white leading-tight tracking-tight uppercase drop-shadow-lg">
                                {activePatient.patient?.full_name}
                            </h1>

                            {/* Doctor Name */}
                            {activePatient.doctor?.user?.full_name && (
                                <p className="text-2xl md:text-3xl text-white/60 font-medium">
                                    Atendimento com: <strong className="text-white">Dr(a). {activePatient.doctor.user.full_name}</strong>
                                </p>
                            )}

                            {/* Consultório Badge */}
                            <div className="pt-4">
                                <span
                                    className="inline-block px-12 py-5 rounded-3xl text-3xl md:text-4xl font-extrabold tracking-wide shadow-2xl border border-white/10"
                                    style={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                        backdropFilter: 'blur(20px)',
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
                        <div className="text-center space-y-4" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                            <h1 className="text-4xl md:text-5xl font-light text-white/20 tracking-widest uppercase">
                                {clinicName || 'Painel de Atendimento'}
                            </h1>
                            <p className="text-lg text-white/10 font-mono">
                                Aguardando chamadas de pacientes...
                            </p>
                        </div>
                    )}
                </div>

                {/* Right side panel (Layout Informativo / Split screen) */}
                {tvLayout === 'informativo' && (
                    <div 
                        className="w-1/3 bg-slate-950/40 p-8 flex flex-col overflow-y-auto space-y-6"
                        style={{ animation: 'slideRightIn 0.3s ease-out' }}
                    >
                        <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest border-b border-white/10 pb-4">
                            Salas de Atendimento
                        </h2>
                        
                        <div className="space-y-4 flex-1">
                            {rooms.filter(r => r.doctor).map((room) => {
                                const isRoomActive = activeRoom?.id === room.id || activePatient?.consulting_room_id === room.id
                                return (
                                    <div 
                                        key={room.id}
                                        className={`p-4 rounded-2xl border transition-all duration-300 ${
                                            isRoomActive 
                                                ? 'bg-amber-400/10 border-amber-400/30 shadow-[0_0_20px_rgba(245,158,11,0.05)]' 
                                                : 'bg-white/5 border-white/5 hover:border-white/10'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-semibold text-sm text-white/90">
                                                {room.display_name || room.name || `Sala ${room.room_number}`}
                                            </span>
                                            {isRoomActive ? (
                                                <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                                    Chamando
                                                </span>
                                            ) : (
                                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
                                                    Ativo
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-white/50 truncate">
                                            {room.doctor?.user?.full_name}
                                        </p>
                                        <p className="text-[10px] text-white/30 italic">
                                            {room.doctor?.specialty}
                                        </p>
                                    </div>
                                )
                            })}

                            {rooms.filter(r => r.doctor).length === 0 && (
                                <p className="text-sm text-white/20 italic text-center pt-8">
                                    Nenhuma sala ativa no momento.
                                </p>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* Premium Footer */}
            <footer className="flex items-center justify-between px-10 py-5 border-t border-white/5 bg-slate-950/30 shrink-0">
                <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                        {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    </span>
                    <span className="text-xs font-semibold text-white/30 tracking-widest uppercase font-mono">
                        {isConnected ? 'Canal em Tempo Real Ativo' : 'Conectando ao Servidor...'}
                    </span>
                </div>
                <div className="text-3xl font-light tracking-widest text-white/40 font-mono tabular-nums">
                    {format(currentTime, 'HH:mm')}
                </div>
            </footer>

            {/* Alerta Discreto de Desbloqueio de Áudio (Políticas de Autoplay do Navegador) */}
            {!audioReady && (
                <button
                    onClick={initAudio}
                    className="fixed bottom-6 left-6 z-40 flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_40px_rgba(245,158,11,0.5)] cursor-pointer hover:bg-amber-300 transition-all animate-bounce"
                    title="O navegador exige um clique para permitir o som da TV"
                >
                    🔊 Clique na tela para ativar o som da TV
                </button>
            )}

            {/* Fullscreen Call Animation Overlay - Limpo, Elegante e Direto */}
            {calledPatient && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-6"
                    style={{
                        background: 'linear-gradient(165deg, #091c33 0%, #050d18 100%)',
                        animation: 'fadeIn 0.2s ease-out',
                    }}
                >
                    {/* Decorative ambient glowing background */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                    <div className="text-center max-w-6xl mx-auto space-y-8 relative z-10">
                        {/* Ticket Badge (se houver) */}
                        {calledPatient.ticketNumber && (
                            <div style={{ animation: 'slideUp 0.3s ease-out' }}>
                                <span className="inline-block px-12 py-4 rounded-3xl bg-amber-400 text-slate-950 text-4xl md:text-5xl font-black font-mono tracking-widest uppercase shadow-[0_0_50px_rgba(245,158,11,0.3)]">
                                    SENHA {calledPatient.ticketNumber}
                                </span>
                            </div>
                        )}

                        {/* Patient Name */}
                        <h2
                            className="text-7xl md:text-8xl lg:text-9xl font-black text-white leading-tight tracking-tight uppercase drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]"
                            style={{ animation: 'slideUp 0.4s ease-out' }}
                        >
                            {calledPatient.patientName}
                        </h2>

                        {/* Consulting Room - Apenas o nome cadastrado da sala */}
                        <div style={{ animation: 'slideUp 0.5s ease-out' }} className="pt-4">
                            <span
                                className="inline-block px-16 py-6 rounded-3xl text-5xl md:text-7xl font-black tracking-wider uppercase border border-white/15 shadow-2xl"
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    backdropFilter: 'blur(20px)',
                                    color: '#ffffff',
                                }}
                            >
                                {calledPatient.roomName.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS Animation Tokens */}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideRightIn {
                    from { opacity: 0; transform: translateX(50px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    )
}
