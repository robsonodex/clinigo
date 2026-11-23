/**
 * Premium TV Panel - Public Route
 * URL: /painel-tv/[clinicId]
 *
 * 4 layouts profissionais em tempo real via Supabase Realtime:
 * - editorial: Claro & Acolhedor (Conforto Sensorial — Terapias/ABA)
 * - executivo: Dark Esmeralda CliniGo (#0B1512)
 * - informativo: Tela Dividida com Salas & Terapeutas Ao Vivo
 * - classico: Foco Total de Alta Legibilidade
 */

'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useParams } from 'next/navigation'
import { Volume2, Maximize2, Minimize2, Megaphone, Clock, QrCode, Building2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
    type TvLayoutType,
    type TvPrivacyMode,
    type TvSoundTheme,
    type TvVoiceGender,
    type TvTestCallPayload,
    formatPatientNameForTv,
    getTvRealtimeChannelName,
    normalizeTvLayout,
    normalizeTvPrivacyMode,
} from '@/lib/utils/tv-panel'

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
        specialty?: string
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
    doctorName?: string
    specialty?: string
    timestamp: number
    isTest?: boolean
}

interface CallHistoryItem {
    id: string
    patientName: string
    roomName: string
    ticketNumber?: string | null
    calledTime: string
}

export default function PainelTVPage() {
    const params = useParams()
    const clinicId = params.clinicId as string

    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [currentTime, setCurrentTime] = useState(new Date())
    const [calledPatient, setCalledPatient] = useState<CalledPatient | null>(null)
    const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([])
    const [clinicName, setClinicName] = useState('')
    const [clinicLogoUrl, setClinicLogoUrl] = useState<string | null>(null)
    const [tvLayout, setTvLayout] = useState<TvLayoutType>('classico')
    const [tvPrivacyMode, setTvPrivacyMode] = useState<TvPrivacyMode>('full')
    const [tvTickerMessage, setTvTickerMessage] = useState('')
    const [tvShowQrCode, setTvShowQrCode] = useState(false)
    const [isConnected, setIsConnected] = useState(false)
    const [audioReady, setAudioReady] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [rooms, setRooms] = useState<ConsultingRoom[]>([])

    const appointmentsRef = useRef<Appointment[]>([])
    const roomsRef = useRef<ConsultingRoom[]>([])
    const audioCtxRef = useRef<AudioContext | null>(null)
    const overlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const [supabase] = useState(() => createClient())
    const [tvSoundTheme, setTvSoundTheme] = useState<TvSoundTheme>('classico')
    const [tvVoiceGender, setTvVoiceGender] = useState<TvVoiceGender>('feminina')
    const tvSoundThemeRef = useRef<TvSoundTheme>('classico')
    const tvVoiceGenderRef = useRef<TvVoiceGender>('feminina')
    const tvPrivacyModeRef = useRef<TvPrivacyMode>('full')
    tvSoundThemeRef.current = tvSoundTheme
    tvVoiceGenderRef.current = tvVoiceGender
    tvPrivacyModeRef.current = tvPrivacyMode

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
                if (window.speechSynthesis) {
                    const utterance = new SpeechSynthesisUtterance('')
                    window.speechSynthesis.speak(utterance)
                }
            }
        } catch (e) {
            console.warn('[TV Panel] Audio init error:', e)
        }
    }, [clinicId])

    const toggleFullscreen = useCallback(() => {
        if (typeof document === 'undefined') return
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {})
        } else {
            document.exitFullscreen?.().catch(() => {})
        }
    }, [])

    useEffect(() => {
        const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
        document.addEventListener('fullscreenchange', onFsChange)
        return () => document.removeEventListener('fullscreenchange', onFsChange)
    }, [])

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const wasEnabled =
                localStorage.getItem(`tv_audio_enabled_${clinicId}`) === 'true' ||
                localStorage.getItem('tv_audio_ready') === 'true'
            if (wasEnabled) {
                initAudio()
            }
        }

        const handleInteraction = () => initAudio()

        window.addEventListener('click', handleInteraction, { passive: true })
        window.addEventListener('keydown', handleInteraction, { passive: true })
        window.addEventListener('touchstart', handleInteraction, { passive: true })

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

    const playCallSound = useCallback(async (soundType: TvSoundTheme = 'classico') => {
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
            const osc1 = ctx.createOscillator(); const gain1 = ctx.createGain()
            osc1.type = 'sine'; osc1.frequency.setValueAtTime(523.25, now)
            gain1.gain.setValueAtTime(0, now); gain1.gain.linearRampToValueAtTime(0.4, now + 0.05); gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.6)
            osc1.connect(gain1); gain1.connect(ctx.destination); osc1.start(now); osc1.stop(now + 0.6)

            const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain()
            osc2.type = 'sine'; osc2.frequency.setValueAtTime(659.25, now + 0.2)
            gain2.gain.setValueAtTime(0, now + 0.2); gain2.gain.linearRampToValueAtTime(0.4, now + 0.25); gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.9)
            osc2.connect(gain2); gain2.connect(ctx.destination); osc2.start(now + 0.2); osc2.stop(now + 0.9)

            const osc3 = ctx.createOscillator(); const gain3 = ctx.createGain()
            osc3.type = 'sine'; osc3.frequency.setValueAtTime(783.99, now + 0.4)
            gain3.gain.setValueAtTime(0, now + 0.4); gain3.gain.linearRampToValueAtTime(0.35, now + 0.45); gain3.gain.exponentialRampToValueAtTime(0.01, now + 1.2)
            osc3.connect(gain3); gain3.connect(ctx.destination); osc3.start(now + 0.4); osc3.stop(now + 1.2)
        }
    }, [])

    const speakCall = useCallback((
        patientName: string,
        roomName: string,
        ticketNumber?: string | null
    ) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return

        window.speechSynthesis.cancel()
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume()
        }

        const spokenName = formatPatientNameForTv(patientName, tvPrivacyModeRef.current)
        const text = ticketNumber
            ? `Senha ${ticketNumber.replace('-', ' ')}, ${roomName}.`
            : `${spokenName}, ${roomName}.`

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'pt-BR'
        utterance.rate = 0.88
        utterance.pitch = 1.0

        const voices = window.speechSynthesis.getVoices()
        const ptVoices = voices.filter(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR') || v.lang.startsWith('pt'))

        let chosenVoice: SpeechSynthesisVoice | undefined
        if (tvVoiceGenderRef.current === 'masculina') {
            chosenVoice = ptVoices.find(v => /antonio|felipe|daniel|helio|male|masculin|ricardo/i.test(v.name))
        } else if (tvVoiceGenderRef.current === 'feminina') {
            chosenVoice = ptVoices.find(v => /francisca|luciana|maria|female|feminin|leticia|google português/i.test(v.name))
        }

        if (!chosenVoice && ptVoices.length > 0) {
            chosenVoice = ptVoices[0]
        }
        if (chosenVoice) {
            utterance.voice = chosenVoice
        }

        window.speechSynthesis.speak(utterance)
    }, [])

    const speakCallRef = useRef(speakCall)
    speakCallRef.current = speakCall

    const triggerCallAnnouncement = useCallback((entry: CalledPatient) => {
        const displayName = formatPatientNameForTv(entry.patientName, tvPrivacyModeRef.current)

        setCalledPatient({
            ...entry,
            patientName: displayName,
        })

        if (!entry.isTest) {
            setCallHistory((prev) => {
                const next: CallHistoryItem = {
                    id: `${entry.timestamp}-${displayName}`,
                    patientName: displayName,
                    roomName: entry.roomName,
                    ticketNumber: entry.ticketNumber,
                    calledTime: format(new Date(entry.timestamp), 'HH:mm'),
                }
                const deduped = prev.filter(
                    (h) => !(h.patientName === next.patientName && h.roomName === next.roomName)
                )
                return [next, ...deduped].slice(0, 4)
            })
        }

        playCallSound(tvSoundThemeRef.current)
        setTimeout(() => {
            speakCallRef.current(entry.patientName, entry.roomName, entry.ticketNumber)
        }, 700)

        if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current)
        overlayTimeoutRef.current = setTimeout(() => setCalledPatient(null), entry.isTest ? 8000 : 12000)
    }, [playCallSound])

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
                    called_at: q.status === 'WAITING' ? q.calledAt || q.arrivalTime : undefined,
                    consulting_room_id: q.consulting_room_id,
                    ticket_number: q.ticket_number,
                    patient: {
                        full_name: q.patient?.full_name || 'Paciente',
                    },
                    doctor: q.doctor ? {
                        id: q.doctor.id,
                        specialty: q.doctor.specialty,
                        user: {
                            full_name: q.doctor.user?.full_name || q.doctor.user?.name || '',
                        },
                    } : {
                        id: undefined,
                        user: { full_name: '' },
                    },
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

    const fetchClinic = useCallback(async () => {
        try {
            const { data } = await (supabase as any)
                .from('clinics')
                .select('name, logo_url, theme')
                .eq('id', clinicId)
                .single()
            if (data) {
                setClinicName(data.name || '')
                setClinicLogoUrl(data.logo_url || null)
                const t = data.theme || {}
                setTvLayout(normalizeTvLayout(t.tv_layout))
                setTvSoundTheme(t.tv_sound_theme || 'classico')
                setTvVoiceGender(t.tv_voice_gender || 'feminina')
                setTvPrivacyMode(normalizeTvPrivacyMode(t.tv_privacy_mode))
                setTvTickerMessage(typeof t.tv_ticker_message === 'string' ? t.tv_ticker_message : '')
                setTvShowQrCode(Boolean(t.tv_show_qr_code))
            }
        } catch (e) {
            console.error('[TV Panel] Error loading clinic info:', e)
        }
    }, [clinicId, supabase])

    useEffect(() => {
        fetchClinic()
        fetchAppointments()
        fetchRooms()

        let refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null
        const scheduleFetchAppointments = () => {
            if (refreshDebounceTimer) clearTimeout(refreshDebounceTimer)
            refreshDebounceTimer = setTimeout(() => {
                fetchAppointments()
            }, 2500)
        }

        const channel = supabase
            .channel(getTvRealtimeChannelName(clinicId))
            .on('broadcast', { event: 'tv_test_call' }, ({ payload }: { payload: TvTestCallPayload }) => {
                if (!payload?.patientName) return
                triggerCallAnnouncement({
                    patientName: payload.patientName,
                    roomName: payload.roomName || 'Sala 01',
                    doctorName: payload.doctorName,
                    specialty: payload.specialty,
                    ticketNumber: payload.ticketNumber,
                    timestamp: payload.timestamp || Date.now(),
                    isTest: true,
                })
            })
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'appointments',
                    filter: `clinic_id=eq.${clinicId}`,
                },
                async (payload: any) => {
                    if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                        if (payload.new && payload.new.status === 'WAITING') {
                            try {
                                const { data: apptData } = await (supabase as any)
                                    .from('appointments')
                                    .select(`
                                        id,
                                        clinic_id,
                                        ticket_number,
                                        consulting_room_id,
                                        patient:patients(full_name),
                                        doctor:doctors(specialty, user:users(full_name)),
                                        consulting_room:consulting_rooms(id, name, display_name, room_number)
                                    `)
                                    .eq('id', payload.new.id)
                                    .maybeSingle()

                                if (apptData && (!apptData.clinic_id || apptData.clinic_id === clinicId)) {
                                    let room = apptData.consulting_room
                                    if (!room && apptData.consulting_room_id) {
                                        room = roomsRef.current.find(r => r.id === apptData.consulting_room_id)
                                    }

                                    let roomText = 'Sala'
                                    if (room) {
                                        const rName = (room.name || '').trim()
                                        const rDisp = (room.display_name || '').trim()
                                        if (rDisp) {
                                            roomText = rDisp
                                        } else if (rName) {
                                            roomText = rName
                                        } else {
                                            roomText = `Sala ${room.room_number || 1}`
                                        }
                                    }

                                    const patientName = apptData.patient?.full_name?.trim() || 'Paciente'

                                    triggerCallAnnouncement({
                                        patientName,
                                        ticketNumber: apptData.ticket_number,
                                        roomName: roomText,
                                        doctorName: apptData.doctor?.user?.full_name,
                                        specialty: apptData.doctor?.specialty,
                                        timestamp: Date.now(),
                                    })
                                }
                            } catch (err) {
                                console.error('[TV Realtime Call Error]:', err)
                            }
                        }

                        scheduleFetchAppointments()
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'clinics',
                    filter: `id=eq.${clinicId}`,
                },
                (payload: any) => {
                    if (payload.new) {
                        if (payload.new.name) setClinicName(payload.new.name)
                        if ('logo_url' in payload.new) setClinicLogoUrl(payload.new.logo_url || null)
                        if (payload.new.theme) {
                            const t = payload.new.theme
                            setTvLayout(normalizeTvLayout(t.tv_layout))
                            if (t.tv_sound_theme) setTvSoundTheme(t.tv_sound_theme)
                            if (t.tv_voice_gender) setTvVoiceGender(t.tv_voice_gender)
                            setTvPrivacyMode(normalizeTvPrivacyMode(t.tv_privacy_mode))
                            setTvTickerMessage(typeof t.tv_ticker_message === 'string' ? t.tv_ticker_message : '')
                            setTvShowQrCode(Boolean(t.tv_show_qr_code))
                        }
                    }
                }
            )
            .subscribe((status: string) => {
                setIsConnected(status === 'SUBSCRIBED')
            })

        const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000)
        const refreshInterval = setInterval(() => {
            fetchAppointments()
        }, 900_000)

        return () => {
            if (refreshDebounceTimer) clearTimeout(refreshDebounceTimer)
            if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current)
            channel.unsubscribe()
            clearInterval(clockInterval)
            clearInterval(refreshInterval)
        }
    }, [clinicId, fetchClinic, fetchAppointments, fetchRooms, triggerCallAnnouncement, supabase])

    const activePatient = appointments.find(a => a.status === 'WAITING' || a.status === 'IN_PROGRESS')
    const activeRoom = activePatient
        ? rooms.find(r =>
            (activePatient.consulting_room_id && r.id === activePatient.consulting_room_id) ||
            (activePatient.doctor?.id && (r.doctor_id === activePatient.doctor.id || r.doctor?.id === activePatient.doctor.id)) ||
            (activePatient.doctor?.user?.full_name && r.doctor?.user?.full_name &&
                r.doctor.user.full_name.toLowerCase().trim() === activePatient.doctor.user.full_name.toLowerCase().trim())
        ) || null
        : null

    const visibleRooms = rooms.filter(r => r.show_on_tv !== false && (r.doctor || r.name))
    const displayActiveName = activePatient
        ? formatPatientNameForTv(activePatient.patient?.full_name, tvPrivacyMode)
        : ''
    const displayActiveRoom = activeRoom
        ? activeRoom.display_name || activeRoom.name || `Sala ${activeRoom.room_number}`
        : 'Sala de Atendimento'

    const isEditorialLight = tvLayout === 'editorial'
    const isExecutivo = tvLayout === 'executivo'
    const showSidebarPanel = tvLayout === 'editorial' || tvLayout === 'executivo' || tvLayout === 'informativo'
    const totemUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/totem/${clinicId}`
        : `https://clinigo.app/totem/${clinicId}`

    // Paleta por layout (100% editorial, sem cores bregas)
    const rootClass = isEditorialLight
        ? 'bg-[#FAFAF8] text-[#0F1F1B]'
        : isExecutivo
            ? 'bg-[#0B1512] text-[#F4F7F5]'
            : 'bg-[#081210] text-white'

    const headerBorderClass = isEditorialLight ? 'border-[#E4E6E2] bg-white/80' : 'border-white/10 bg-black/20'
    const sidePanelClass = isEditorialLight
        ? 'bg-white border-l border-[#E4E6E2]'
        : isExecutivo
            ? 'bg-[#0F1D19] border-l border-white/10'
            : 'bg-black/25 border-l border-white/10'

    const cardSurfaceClass = isEditorialLight
        ? 'bg-white border border-[#E4E6E2] shadow-sm'
        : isExecutivo
            ? 'bg-[#11221D] border border-white/10 shadow-xl'
            : 'bg-white/[0.04] border border-white/10'

    return (
        <div className={`h-screen w-screen overflow-hidden flex flex-col font-sans select-none ${rootClass}`}>
            {/* Banner de desbloqueio de áudio */}
            {!audioReady && (
                <div
                    className={`px-8 py-3 border-b flex items-center justify-center gap-2.5 cursor-pointer shrink-0 ${
                        isEditorialLight
                            ? 'bg-amber-50 border-amber-200 text-amber-950'
                            : 'bg-amber-500/15 border-amber-400/25 text-amber-200'
                    }`}
                    onClick={initAudio}
                >
                    <Volume2 className="w-5 h-5 shrink-0" />
                    <span className="text-sm md:text-base font-semibold">
                        Clique em qualquer ponto da tela para ativar o som e o anúncio por voz do Painel de TV
                    </span>
                </div>
            )}

            {/* Header Institucional com Logo da Clínica + Data/Hora */}
            <header className={`px-8 py-4 border-b flex items-center justify-between gap-4 shrink-0 ${headerBorderClass}`}>
                <div className="flex items-center gap-4 min-w-0">
                    {clinicLogoUrl ? (
                        <img
                            src={clinicLogoUrl}
                            alt={clinicName || 'Logo da Clínica'}
                            className={`h-11 max-w-[180px] object-contain rounded-md ${
                                isEditorialLight ? '' : 'bg-white/95 px-2.5 py-1'
                            }`}
                        />
                    ) : (
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            isEditorialLight ? 'bg-[#155E4B] text-white' : 'bg-[#155E4B] text-white'
                        }`}>
                            <Building2 className="w-5 h-5" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className={`text-lg md:text-xl font-bold tracking-tight truncate ${
                            isEditorialLight ? 'text-[#0F1F1B]' : 'text-white'
                        }`}>
                            {clinicName || 'Painel de Atendimento'}
                        </p>
                        <p className={`text-xs uppercase tracking-widest font-medium ${
                            isEditorialLight ? 'text-[#52605C]' : 'text-white/50'
                        }`}>
                            {format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-5 shrink-0">
                    <div className={`text-3xl md:text-4xl font-semibold tracking-tight font-mono tabular-nums ${
                        isEditorialLight ? 'text-[#155E4B]' : 'text-white'
                    }`}>
                        {format(currentTime, 'HH:mm')}
                    </div>
                </div>
            </header>

            {/* Corpo Principal */}
            <div className="flex-1 flex overflow-hidden">
                {/* Coluna Principal (Chamada Ativa ou Tela de Boas-vindas) */}
                <div className={`flex-1 flex flex-col justify-between p-8 md:p-12 overflow-hidden ${
                    showSidebarPanel ? 'w-2/3' : 'w-full'
                }`}>
                    <div className="flex-1 flex items-center justify-center">
                        {activePatient ? (
                            <div
                                className={`w-full max-w-4xl rounded-2xl p-8 md:p-12 text-center space-y-6 ${
                                    tvLayout === 'classico' ? '' : cardSurfaceClass
                                }`}
                                style={{ animation: 'fadeIn 0.4s ease-out' }}
                            >
                                <div className="flex items-center justify-center gap-3 flex-wrap">
                                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold uppercase tracking-widest ${
                                        isEditorialLight
                                            ? 'bg-[#155E4B]/10 text-[#155E4B]'
                                            : 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/25'
                                    }`}>
                                        <span className={`w-2 h-2 rounded-full ${isEditorialLight ? 'bg-[#155E4B]' : 'bg-emerald-400'}`} />
                                        {activePatient.status === 'WAITING' ? 'Chamada Atual' : 'Em Atendimento'}
                                    </span>

                                    {activePatient.ticket_number && (
                                        <span className={`inline-block px-5 py-1.5 rounded-full font-mono text-lg md:text-2xl font-bold tracking-widest ${
                                            isEditorialLight
                                                ? 'bg-[#0F1F1B] text-white'
                                                : 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                                        }`}>
                                            SENHA {activePatient.ticket_number}
                                        </span>
                                    )}
                                </div>

                                <h1 className={`font-extrabold leading-[1.08] tracking-tight break-words ${
                                    tvLayout === 'classico'
                                        ? 'text-6xl md:text-8xl uppercase'
                                        : 'text-5xl md:text-7xl'
                                } ${isEditorialLight ? 'text-[#0F1F1B]' : 'text-white'}`}>
                                    {displayActiveName}
                                </h1>

                                {activePatient.doctor?.user?.full_name && (
                                    <p className={`text-xl md:text-2xl font-medium ${
                                        isEditorialLight ? 'text-[#52605C]' : 'text-white/65'
                                    }`}>
                                        Atendimento com{' '}
                                        <strong className={isEditorialLight ? 'text-[#0F1F1B]' : 'text-white'}>
                                            {activePatient.doctor.user.full_name}
                                        </strong>
                                    </p>
                                )}

                                <div className="pt-2">
                                    <span className={`inline-block px-10 md:px-14 py-4 md:py-5 rounded-xl text-3xl md:text-5xl font-extrabold tracking-wide ${
                                        isEditorialLight
                                            ? 'bg-[#155E4B] text-white shadow-md'
                                            : 'bg-[#155E4B] text-white border border-emerald-400/30 shadow-xl'
                                    }`}>
                                        {displayActiveRoom}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center max-w-2xl mx-auto space-y-5" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                                {clinicLogoUrl && (
                                    <img
                                        src={clinicLogoUrl}
                                        alt={clinicName}
                                        className={`h-20 mx-auto object-contain rounded-lg ${
                                            isEditorialLight ? '' : 'bg-white/95 px-4 py-2'
                                        }`}
                                    />
                                )}
                                <h1 className={`text-3xl md:text-5xl font-bold tracking-tight ${
                                    isEditorialLight ? 'text-[#0F1F1B]' : 'text-white/85'
                                }`}>
                                    Bem-vindo(a){clinicName ? ` à ${clinicName}` : ''}
                                </h1>
                                <p className={`text-base md:text-xl ${
                                    isEditorialLight ? 'text-[#52605C]' : 'text-white/45'
                                }`}>
                                    Aguarde confortavelmente. Seu nome e sala aparecerão nesta tela assim que o profissional chamar.
                                </p>

                                {tvShowQrCode && (
                                    <div className={`inline-flex items-center gap-4 p-4 rounded-xl mt-4 text-left ${cardSurfaceClass}`}>
                                        <div className="bg-white p-2 rounded-lg border border-border shrink-0">
                                            <QRCodeSVG value={totemUrl} size={96} />
                                        </div>
                                        <div className="space-y-1 max-w-[220px]">
                                            <p className={`text-sm font-semibold flex items-center gap-1.5 ${
                                                isEditorialLight ? 'text-[#0F1F1B]' : 'text-white'
                                            }`}>
                                                <QrCode className="w-4 h-4 text-[#155E4B]" />
                                                Check-in pelo celular
                                            </p>
                                            <p className={`text-xs leading-relaxed ${
                                                isEditorialLight ? 'text-[#52605C]' : 'text-white/60'
                                            }`}>
                                                Aponte a câmera do seu celular para confirmar sua chegada na recepção.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Faixa inferior de últimas chamadas nos modos Clássico e Informativo */}
                    {(tvLayout === 'classico' || tvLayout === 'informativo') && callHistory.length > 0 && (
                        <div className="pt-4 border-t border-white/10">
                            <p className="text-xs font-semibold uppercase tracking-widest text-white/45 mb-2.5 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                Últimas Chamadas
                            </p>
                            <div className="grid grid-cols-3 gap-3">
                                {callHistory.slice(0, 3).map((item) => (
                                    <div
                                        key={item.id}
                                        className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between gap-2"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-white truncate">{item.patientName}</p>
                                            <p className="text-xs text-emerald-300 truncate">{item.roomName}</p>
                                        </div>
                                        <span className="text-xs font-mono text-white/50 tabular-nums shrink-0">
                                            {item.calledTime}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Painel Lateral (Editorial, Executivo e Informativo) */}
                {showSidebarPanel && (
                    <aside className={`w-1/3 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto ${sidePanelClass}`}>
                        {/* Seção 1: Últimas Chamadas (Editorial e Executivo) */}
                        {(tvLayout === 'editorial' || tvLayout === 'executivo') && (
                            <div className="space-y-3">
                                <h2 className={`text-xs font-bold uppercase tracking-widest pb-2.5 border-b flex items-center gap-2 ${
                                    isEditorialLight
                                        ? 'text-[#52605C] border-[#E4E6E2]'
                                        : 'text-white/50 border-white/10'
                                }`}>
                                    <Clock className="w-3.5 h-3.5" />
                                    Últimas Chamadas
                                </h2>

                                {callHistory.length === 0 ? (
                                    <p className={`text-xs py-3 ${isEditorialLight ? 'text-[#52605C]' : 'text-white/35'}`}>
                                        As últimas chamadas aparecerão aqui automaticamente.
                                    </p>
                                ) : (
                                    <div className="space-y-2.5">
                                        {callHistory.map((item, idx) => (
                                            <div
                                                key={item.id}
                                                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                                                    idx === 0
                                                        ? isEditorialLight
                                                            ? 'bg-[#155E4B]/5 border-[#155E4B]/30'
                                                            : 'bg-[#155E4B]/25 border-emerald-400/35'
                                                        : isEditorialLight
                                                            ? 'bg-[#FAFAF8] border-[#E4E6E2]'
                                                            : 'bg-white/[0.04] border-white/10'
                                                }`}
                                            >
                                                <div className="min-w-0">
                                                    <p className={`font-semibold text-sm md:text-base truncate ${
                                                        isEditorialLight ? 'text-[#0F1F1B]' : 'text-white'
                                                    }`}>
                                                        {item.patientName}
                                                    </p>
                                                    <p className={`text-xs font-medium truncate ${
                                                        isEditorialLight ? 'text-[#155E4B]' : 'text-emerald-300'
                                                    }`}>
                                                        {item.roomName}
                                                    </p>
                                                </div>
                                                <span className={`text-xs font-mono tabular-nums shrink-0 ${
                                                    isEditorialLight ? 'text-[#52605C]' : 'text-white/50'
                                                }`}>
                                                    {item.calledTime}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Seção 2: Salas em Atendimento */}
                        <div className="space-y-3 flex-1">
                            <h2 className={`text-xs font-bold uppercase tracking-widest pb-2.5 border-b ${
                                isEditorialLight
                                    ? 'text-[#52605C] border-[#E4E6E2]'
                                    : 'text-white/50 border-white/10'
                            }`}>
                                Salas em Atendimento
                            </h2>

                            <div className="space-y-2.5">
                                {visibleRooms.map((room) => {
                                    const isRoomActive =
                                        activeRoom?.id === room.id || activePatient?.consulting_room_id === room.id

                                    return (
                                        <div
                                            key={room.id}
                                            className={`p-3.5 rounded-xl border transition-colors ${
                                                isRoomActive
                                                    ? isEditorialLight
                                                        ? 'bg-[#155E4B] text-white border-[#155E4B]'
                                                        : 'bg-[#155E4B]/35 border-emerald-400/45 text-white'
                                                    : isEditorialLight
                                                        ? 'bg-[#FAFAF8] border-[#E4E6E2] text-[#0F1F1B]'
                                                        : 'bg-white/[0.04] border-white/10 text-white'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center gap-2">
                                                <span className="font-semibold text-sm truncate">
                                                    {room.display_name || room.name || `Sala ${room.room_number}`}
                                                </span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                                                    isRoomActive
                                                        ? isEditorialLight
                                                            ? 'bg-white text-[#155E4B]'
                                                            : 'bg-emerald-400 text-[#0B1512]'
                                                        : isEditorialLight
                                                            ? 'bg-[#155E4B]/10 text-[#155E4B]'
                                                            : 'bg-white/10 text-white/70'
                                                }`}>
                                                    {isRoomActive ? 'Chamando' : 'Ativa'}
                                                </span>
                                            </div>
                                            {room.doctor?.user?.full_name && (
                                                <p className={`text-xs truncate mt-1 ${
                                                    isRoomActive
                                                        ? 'text-white/90'
                                                        : isEditorialLight
                                                            ? 'text-[#52605C]'
                                                            : 'text-white/60'
                                                }`}>
                                                    {room.doctor.user.full_name}
                                                    {room.doctor.specialty ? ` · ${room.doctor.specialty}` : ''}
                                                </p>
                                            )}
                                        </div>
                                    )
                                })}

                                {visibleRooms.length === 0 && (
                                    <p className={`text-xs text-center py-6 ${
                                        isEditorialLight ? 'text-[#52605C]' : 'text-white/35'
                                    }`}>
                                        Nenhuma sala cadastrada para exibição.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* QR Code discreto no rodapé da lateral quando há paciente ativo */}
                        {tvShowQrCode && activePatient && (
                            <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                                isEditorialLight
                                    ? 'bg-[#FAFAF8] border-[#E4E6E2]'
                                    : 'bg-white/5 border-white/10'
                            }`}>
                                <div className="bg-white p-1.5 rounded-md shrink-0">
                                    <QRCodeSVG value={totemUrl} size={56} />
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-xs font-semibold ${isEditorialLight ? 'text-[#0F1F1B]' : 'text-white'}`}>
                                        Auto Check-in
                                    </p>
                                    <p className={`text-[11px] leading-snug ${isEditorialLight ? 'text-[#52605C]' : 'text-white/55'}`}>
                                        Escaneie para confirmar sua chegada.
                                    </p>
                                </div>
                            </div>
                        )}
                    </aside>
                )}
            </div>

            {/* Faixa de Recados da Recepção (opcional) */}
            {tvTickerMessage && (
                <div className={`px-8 py-2.5 border-t flex items-center gap-3 shrink-0 ${
                    isEditorialLight
                        ? 'bg-[#155E4B] text-white border-[#155E4B]'
                        : 'bg-[#155E4B]/30 text-emerald-100 border-emerald-400/20'
                }`}>
                    <Megaphone className="w-4 h-4 shrink-0" />
                    <p className="text-sm md:text-base font-medium truncate">
                        {tvTickerMessage}
                    </p>
                </div>
            )}

            {/* Rodapé Institucional */}
            <footer className={`flex items-center justify-between px-8 py-3.5 border-t shrink-0 ${headerBorderClass}`}>
                <div className="flex items-center gap-2.5">
                    <span className={`inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className={`text-xs font-semibold tracking-widest uppercase font-mono ${
                        isEditorialLight ? 'text-[#52605C]' : 'text-white/45'
                    }`}>
                        {isConnected ? 'Canal em Tempo Real Ativo' : 'Reconectando...'}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {!audioReady && (
                        <button
                            type="button"
                            onClick={initAudio}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-400 text-slate-950 font-semibold text-xs hover:bg-amber-300 transition-colors"
                        >
                            <Volume2 className="w-3.5 h-3.5" />
                            Ativar Som
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                            isEditorialLight
                                ? 'border-[#E4E6E2] text-[#52605C] hover:text-[#0F1F1B] hover:bg-[#FAFAF8]'
                                : 'border-white/15 text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                        title={isFullscreen ? 'Sair da Tela Cheia' : 'Expandir em Tela Cheia'}
                    >
                        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}</span>
                    </button>
                </div>
            </footer>

            {/* Overlay de Chamada em Tela Cheia (suave no Editorial Sensorial, alto impacto no Dark) */}
            {calledPatient && (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center p-8 ${
                        isEditorialLight
                            ? 'bg-[#FAFAF8]/98 text-[#0F1F1B]'
                            : 'bg-[#081210]/96 text-white'
                    }`}
                    style={{ animation: 'fadeIn 0.25s ease-out' }}
                >
                    <div
                        className={`text-center max-w-5xl w-full mx-auto rounded-2xl p-10 md:p-16 space-y-6 ${
                            isEditorialLight
                                ? 'bg-white border-2 border-[#155E4B] shadow-2xl'
                                : 'bg-[#0F1D19] border-2 border-emerald-400/40 shadow-2xl'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-3 flex-wrap">
                            {calledPatient.isTest && (
                                <span className="px-4 py-1.5 rounded-full text-xs md:text-sm font-bold uppercase tracking-widest bg-amber-100 text-amber-900 border border-amber-300">
                                    Chamada de Teste
                                </span>
                            )}
                            {calledPatient.ticketNumber && (
                                <span className={`px-6 py-2 rounded-full text-2xl md:text-3xl font-bold font-mono tracking-widest uppercase ${
                                    isEditorialLight
                                        ? 'bg-[#155E4B]/10 text-[#155E4B]'
                                        : 'bg-amber-400 text-slate-950'
                                }`}>
                                    SENHA {calledPatient.ticketNumber}
                                </span>
                            )}
                        </div>

                        <h2
                            className={`text-6xl md:text-8xl font-black leading-tight tracking-tight break-words ${
                                isEditorialLight ? 'text-[#0F1F1B]' : 'text-white uppercase'
                            }`}
                            style={{ animation: 'slideUp 0.35s ease-out' }}
                        >
                            {calledPatient.patientName}
                        </h2>

                        {calledPatient.doctorName && (
                            <p className={`text-xl md:text-2xl font-medium ${
                                isEditorialLight ? 'text-[#52605C]' : 'text-white/70'
                            }`}>
                                {calledPatient.doctorName}
                                {calledPatient.specialty ? ` · ${calledPatient.specialty}` : ''}
                            </p>
                        )}

                        <div style={{ animation: 'slideUp 0.45s ease-out' }} className="pt-3">
                            <span className="inline-block px-14 py-5 rounded-xl text-4xl md:text-6xl font-extrabold tracking-wide uppercase bg-[#155E4B] text-white shadow-xl">
                                {calledPatient.roomName}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(28px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
