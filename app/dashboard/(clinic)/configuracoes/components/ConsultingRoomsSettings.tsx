'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
    Building,
    Tv,
    Plus,
    Edit,
    Trash2,
    Loader2,
    Check,
    AlertTriangle,
    Eye,
    EyeOff,
    MessageSquare,
    ExternalLink,
    Volume2,
    Music,
    Play,
    Clock,
    Copy,
    Radio,
    ShieldCheck,
    QrCode,
    Megaphone,
    ArrowRight,
    X,
    ImageIcon,
    Upload,
} from 'lucide-react'
import { ClinicLogoModal } from '@/components/sidebar/clinic-logo-modal'
import {
    OFFICIAL_CLINIGO_LOGO_LIGHT,
    TV_LAYOUT_OPTIONS,
    type TvLayoutType,
    type TvLogoMode,
    type TvPrivacyMode,
    type TvSoundTheme,
    type TvVoiceGender,
    getTvRealtimeChannelName,
    normalizeTvLayout,
    normalizeTvLogoMode,
    normalizeTvPrivacyMode,
    type TvTestCallPayload,
} from '@/lib/utils/tv-panel'

const PLAN_LIMITS: Record<string, number> = {
    BASICO: 1,
    AVANCADO: 5,
    PROFESSIONAL: 30,
    ENTERPRISE: -1,
}

interface Doctor {
    id: string
    user: {
        full_name: string
    }
    specialty: string
}

interface ConsultingRoom {
    id: string
    name: string
    display_name: string | null
    room_number: number
    doctor_id: string | null
    show_on_tv: boolean
    is_active: boolean
    doctor?: { id: string; user: { full_name: string }; specialty: string }
}

function TvLayoutThumbnail({ layoutId }: { layoutId: TvLayoutType }) {
    if (layoutId === 'editorial') {
        return (
            <div className="w-full aspect-video rounded-lg border border-border bg-[#FAFAF8] grid grid-cols-3 gap-1.5 p-2 overflow-hidden">
                <div className="col-span-2 bg-white border border-[#E4E6E2] rounded-md flex flex-col items-center justify-center p-2">
                    <div className="text-[6px] font-semibold uppercase tracking-wider text-[#155E4B] bg-[#155E4B]/10 px-1.5 py-0.5 rounded mb-1">
                        Chamada Atual
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-[#0F1F1B] leading-tight">Lucas Mendes</div>
                    <div className="mt-1 px-2.5 py-0.5 rounded bg-[#155E4B] text-[7px] text-white font-semibold">
                        Sala 01 · Terapia
                    </div>
                </div>
                <div className="col-span-1 bg-white border border-[#E4E6E2] rounded-md p-1.5 flex flex-col gap-1">
                    <span className="font-semibold text-[#52605C] text-[5px] uppercase tracking-wider border-b border-[#E4E6E2] pb-0.5">
                        Últimas
                    </span>
                    <div className="bg-[#FAFAF8] px-1 py-0.5 rounded text-[5px] text-[#0F1F1B]">
                        <div className="font-semibold truncate">Sofia R.</div>
                        <div className="text-[#52605C]">Sala 02</div>
                    </div>
                    <div className="bg-[#FAFAF8] px-1 py-0.5 rounded text-[5px] text-[#0F1F1B]">
                        <div className="font-semibold truncate">Pedro A.</div>
                        <div className="text-[#52605C]">Sala 03</div>
                    </div>
                </div>
            </div>
        )
    }

    if (layoutId === 'executivo') {
        return (
            <div className="w-full aspect-video rounded-lg border border-emerald-950 bg-[#0B1512] grid grid-cols-3 gap-1.5 p-2 overflow-hidden">
                <div className="col-span-2 bg-[#11221D] border border-white/10 rounded-md flex flex-col items-center justify-center p-2">
                    <div className="text-[6px] font-semibold uppercase tracking-wider text-emerald-300 mb-1">
                        P-004 · Em Chamada
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-white leading-tight">Lucas Mendes</div>
                    <div className="mt-1 px-2.5 py-0.5 rounded bg-[#155E4B] text-[7px] text-white font-semibold">
                        Sala 01 · Fono
                    </div>
                </div>
                <div className="col-span-1 bg-white/5 border border-white/10 rounded-md p-1.5 flex flex-col gap-1 text-white">
                    <span className="font-semibold text-white/50 text-[5px] uppercase tracking-wider border-b border-white/10 pb-0.5">
                        Histórico
                    </span>
                    <div className="bg-white/5 px-1 py-0.5 rounded text-[5px]">
                        <div className="font-semibold truncate">Sofia R.</div>
                        <div className="text-emerald-300">Sala 02</div>
                    </div>
                    <div className="bg-white/5 px-1 py-0.5 rounded text-[5px]">
                        <div className="font-semibold truncate">Pedro A.</div>
                        <div className="text-white/50">Sala 03</div>
                    </div>
                </div>
            </div>
        )
    }

    if (layoutId === 'informativo') {
        return (
            <div className="w-full aspect-video rounded-lg border border-slate-800 bg-slate-950 grid grid-cols-3 gap-1.5 p-2 overflow-hidden">
                <div className="col-span-2 bg-white/5 border border-white/10 rounded-md flex flex-col items-center justify-center p-2">
                    <div className="text-[6px] text-amber-400 font-semibold uppercase mb-0.5">Senha P-003</div>
                    <div className="text-xs sm:text-sm font-bold text-white mb-1">Lucas Mendes</div>
                    <div className="px-2 py-0.5 rounded bg-white/15 text-[7px] border border-white/10 text-white font-medium">
                        Sala 01
                    </div>
                </div>
                <div className="col-span-1 bg-white/5 border border-white/10 rounded-md p-1.5 flex flex-col gap-1 text-[5px] text-white">
                    <span className="font-bold text-white/50 uppercase tracking-wider border-b border-white/10 pb-0.5">
                        Salas Ao Vivo
                    </span>
                    <div className="flex justify-between items-center bg-amber-400/15 px-1 py-0.5 rounded">
                        <span>Sala 01</span>
                        <span className="text-amber-300 font-semibold">Chamando</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 px-1 py-0.5 rounded">
                        <span>Sala 02</span>
                        <span className="text-emerald-400 font-semibold">Ativo</span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full aspect-video rounded-lg border border-slate-800 bg-[#081210] flex flex-col items-center justify-center p-3 overflow-hidden">
            <div className="text-[7px] text-emerald-300 font-semibold uppercase tracking-widest mb-0.5">Senha P-003</div>
            <div className="text-base sm:text-lg font-extrabold text-white tracking-tight">LUCAS MENDES</div>
            <div className="mt-1 px-3 py-0.5 rounded bg-[#155E4B] text-[8px] text-white font-semibold">
                SALA 01
            </div>
        </div>
    )
}

export function ConsultingRoomsSettings() {
    const [clinicId, setClinicId] = useState<string | null>(null)
    const [clinicName, setClinicName] = useState('')
    const [clinicLogoUrl, setClinicLogoUrl] = useState<string | null>(null)
    const [planType, setPlanType] = useState<string>('BASICO')
    const [theme, setTheme] = useState<Record<string, any>>({})
    const [rooms, setRooms] = useState<ConsultingRoom[]>([])
    const [doctors, setDoctors] = useState<Doctor[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    const router = useRouter()
    const [whatsappCallEnabled, setWhatsappCallEnabled] = useState(false)
    const [whatsappConnected, setWhatsappConnected] = useState(false)
    const [whatsappPhone, setWhatsappPhone] = useState<string | null>(null)
    const [savingWhatsappToggle, setSavingWhatsappToggle] = useState(false)

    const [tvLayout, setTvLayout] = useState<TvLayoutType>('classico')
    const [savingLayout, setSavingLayout] = useState<TvLayoutType | null>(null)
    const [tvLogoMode, setTvLogoMode] = useState<TvLogoMode>('clinic')
    const [savingLogoMode, setSavingLogoMode] = useState<TvLogoMode | null>(null)
    const [logoModalOpen, setLogoModalOpen] = useState(false)
    const [copiedTvLink, setCopiedTvLink] = useState(false)
    const [sendingTestCall, setSendingTestCall] = useState(false)

    const [tvPrivacyMode, setTvPrivacyMode] = useState<TvPrivacyMode>('full')
    const [tvTickerMessage, setTvTickerMessage] = useState('')
    const [tvShowQrCode, setTvShowQrCode] = useState(false)
    const [savingDisplayPrefs, setSavingDisplayPrefs] = useState(false)

    const [tvSoundTheme, setTvSoundTheme] = useState<TvSoundTheme>('classico')
    const [tvVoiceGender, setTvVoiceGender] = useState<TvVoiceGender>('feminina')
    const [tvRecallMinutes, setTvRecallMinutes] = useState<number>(5)
    const [savingAudioSettings, setSavingAudioSettings] = useState(false)

    // Form states (Salas)
    const [isEditing, setIsEditing] = useState(false)
    const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
    const [roomName, setRoomName] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [roomNumber, setRoomNumber] = useState<number>(1)
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>('none')
    const [showOnTv, setShowOnTv] = useState(true)
    const [roomToDelete, setRoomToDelete] = useState<ConsultingRoom | null>(null)
    const [deletingRoom, setDeletingRoom] = useState(false)

    const [supabase] = useState(() => createClient())

    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: userData } = await (supabase
                .from('users') as any)
                .select('clinic_id')
                .eq('id', user.id)
                .single()

            if (!userData?.clinic_id) return
            setClinicId(userData.clinic_id)

            const { data: clinicData } = await (supabase
                .from('clinics') as any)
                .select('name, logo_url, plan_type, theme')
                .eq('id', userData.clinic_id)
                .single()

            if (clinicData) {
                setClinicName(clinicData.name || '')
                setClinicLogoUrl(clinicData.logo_url || null)
                setPlanType(clinicData.plan_type || 'BASICO')
                const t = clinicData.theme || {}
                setTheme(t)
                setTvLayout(normalizeTvLayout(t.tv_layout))
                setTvLogoMode(normalizeTvLogoMode(t.tv_logo_mode))
                setTvPrivacyMode(normalizeTvPrivacyMode(t.tv_privacy_mode))
                setTvTickerMessage(typeof t.tv_ticker_message === 'string' ? t.tv_ticker_message : '')
                setTvShowQrCode(Boolean(t.tv_show_qr_code))
            }

            const [roomsRes, doctorsRes, tvSettingsRes] = await Promise.all([
                fetch(`/api/consulting-rooms?timestamp=${Date.now()}`),
                fetch('/api/doctors?pageSize=100'),
                fetch('/api/clinics/tv-settings'),
            ])

            if (roomsRes.ok) {
                const data = await roomsRes.json()
                setRooms(data.rooms || [])
            }

            if (doctorsRes.ok) {
                const data = await doctorsRes.json()
                setDoctors(data.data || [])
            }

            if (tvSettingsRes.ok) {
                const tvData = await tvSettingsRes.json()
                if (typeof tvData.clinicName === 'string') setClinicName(tvData.clinicName)
                if ('clinicLogoUrl' in tvData) setClinicLogoUrl(tvData.clinicLogoUrl || null)
                setWhatsappCallEnabled(Boolean(tvData.whatsappCallEnabled))
                setWhatsappConnected(Boolean(tvData.whatsappConnected))
                setWhatsappPhone(tvData.whatsappPhone || null)
                if (tvData.tvLayout) setTvLayout(normalizeTvLayout(tvData.tvLayout))
                if (tvData.tvLogoMode) setTvLogoMode(normalizeTvLogoMode(tvData.tvLogoMode))
                if (tvData.tvSoundTheme) setTvSoundTheme(tvData.tvSoundTheme)
                if (tvData.tvVoiceGender) setTvVoiceGender(tvData.tvVoiceGender)
                if (tvData.tvRecallMinutes !== undefined) setTvRecallMinutes(Number(tvData.tvRecallMinutes))
                if (tvData.tvPrivacyMode) setTvPrivacyMode(normalizeTvPrivacyMode(tvData.tvPrivacyMode))
                if (typeof tvData.tvTickerMessage === 'string') setTvTickerMessage(tvData.tvTickerMessage)
                if (typeof tvData.tvShowQrCode === 'boolean') setTvShowQrCode(tvData.tvShowQrCode)
            }
        } catch (error) {
            console.error('Error loading consulting rooms data:', error)
            toast.error('Erro ao carregar configurações de salas e TV.')
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        loadData()
    }, [loadData])

    const tvUrl = clinicId && typeof window !== 'undefined'
        ? `${window.location.origin}/painel-tv/${clinicId}`
        : clinicId
            ? `https://clinigo.app/painel-tv/${clinicId}`
            : ''

    const handleOpenTvPanel = () => {
        if (!tvUrl) {
            toast.error('Clínica não identificada para abrir o Painel de TV.')
            return
        }
        window.open(tvUrl, '_blank', 'noopener,noreferrer')
    }

    const handleCopyTvLink = async () => {
        if (!tvUrl) return
        try {
            await navigator.clipboard.writeText(tvUrl)
            setCopiedTvLink(true)
            toast.success('Link do Painel de TV copiado. Basta abrir no navegador da Smart TV.')
            setTimeout(() => setCopiedTvLink(false), 2500)
        } catch {
            toast.error('Não foi possível copiar o link automaticamente.')
        }
    }

    const handleSendLiveTestCall = async () => {
        if (!clinicId) return
        setSendingTestCall(true)
        try {
            const firstRoom = rooms.find(r => r.is_active)
            const testRoomName = firstRoom?.display_name || firstRoom?.name || 'Sala 01 · Terapia'
            const payload: TvTestCallPayload = {
                patientName: 'Lucas Mendes',
                roomName: testRoomName,
                doctorName: firstRoom?.doctor?.user?.full_name || 'Equipe Clínica',
                specialty: firstRoom?.doctor?.specialty || 'Terapia Multidisciplinar',
                ticketNumber: 'T-001',
                timestamp: Date.now(),
            }

            const channel = supabase.channel(getTvRealtimeChannelName(clinicId))
            await new Promise<void>((resolve, reject) => {
                const timer = setTimeout(() => resolve(), 2000)
                channel.subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        clearTimeout(timer)
                        const res = await channel.send({
                            type: 'broadcast',
                            event: 'tv_test_call',
                            payload,
                        })
                        if (res === 'ok') resolve()
                        else reject(new Error('Falha ao transmitir teste'))
                    }
                })
            })
            await supabase.removeChannel(channel)

            toast.success(`Chamada de teste enviada para a TV (${testRoomName}).`, {
                description: 'Se o Painel de TV estiver aberto em outra aba ou televisão, ele exibirá o alerta agora.',
            })
        } catch (err) {
            console.error('Erro ao enviar chamada de teste:', err)
            toast.error('Não foi possível enviar a chamada de teste no momento.')
        } finally {
            setSendingTestCall(false)
        }
    }

    const handleSaveTvLayout = async (layoutType: TvLayoutType) => {
        if (!clinicId || savingLayout === layoutType) return
        setSavingLayout(layoutType)
        try {
            const res = await fetch('/api/clinics/tv-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tvLayout: layoutType }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || 'Erro ao atualizar layout')
            }
            const data = await res.json()
            setTvLayout(layoutType)
            setTheme(data.theme || { ...theme, tv_layout: layoutType })
            toast.success('Layout do Painel de TV atualizado em tempo real.')
        } catch (e: any) {
            console.error('Error saving TV layout:', e)
            toast.error(e?.message || 'Erro ao atualizar layout da TV.')
        } finally {
            setSavingLayout(null)
        }
    }

    const handleSaveTvLogoMode = async (mode: TvLogoMode) => {
        if (!clinicId || savingLogoMode === mode) return
        setSavingLogoMode(mode)
        try {
            const res = await fetch('/api/clinics/tv-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tvLogoMode: mode }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || 'Erro ao atualizar logotipo exibido')
            }
            const data = await res.json()
            setTvLogoMode(mode)
            if (data.theme) setTheme(data.theme)
            toast.success(
                mode === 'clinic'
                    ? 'Painel de TV e Totem configurados para exibir o logotipo da clínica.'
                    : 'Painel de TV e Totem configurados para exibir o logotipo oficial CliniGo.'
            )
        } catch (e: any) {
            toast.error(e?.message || 'Erro ao atualizar logotipo da TV.')
        } finally {
            setSavingLogoMode(null)
        }
    }

    const handleSaveDisplayPreferences = async () => {
        if (!clinicId) return
        setSavingDisplayPrefs(true)
        try {
            const res = await fetch('/api/clinics/tv-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tvLogoMode,
                    tvPrivacyMode,
                    tvTickerMessage: tvTickerMessage.trim(),
                    tvShowQrCode,
                }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || 'Erro ao salvar preferências de exibição')
            }
            const data = await res.json()
            if (data.theme) setTheme(data.theme)
            toast.success('Preferências da sala de espera atualizadas na TV ao vivo.')
        } catch (e: any) {
            toast.error(e?.message || 'Erro ao salvar preferências de exibição.')
        } finally {
            setSavingDisplayPrefs(false)
        }
    }

    const handleToggleWhatsappCall = async (checked: boolean) => {
        if (checked && !whatsappConnected) {
            toast.error('WhatsApp não está conectado', {
                description: 'Para habilitar o envio de chamada, o WhatsApp da clínica precisa estar conectado.',
                action: {
                    label: 'Conectar WhatsApp',
                    onClick: () => router.push('/dashboard/whatsapp'),
                },
            })
            return
        }

        try {
            setSavingWhatsappToggle(true)
            const res = await fetch('/api/clinics/tv-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ whatsappCallEnabled: checked }),
            })

            if (res.ok) {
                setWhatsappCallEnabled(checked)
                toast.success(
                    checked
                        ? 'Notificação de chamada via WhatsApp ativada.'
                        : 'Notificação de chamada via WhatsApp desativada.'
                )
            } else {
                const err = await res.json()
                toast.error(err.error || 'Erro ao atualizar configuração.')
                if (err.action === 'connect_whatsapp') {
                    router.push('/dashboard/whatsapp')
                }
            }
        } catch {
            toast.error('Erro de conexão ao salvar configuração.')
        } finally {
            setSavingWhatsappToggle(false)
        }
    }

    const previewSound = (type: TvSoundTheme) => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
            const now = ctx.currentTime

            if (type === 'moderno') {
                const o1 = ctx.createOscillator(); const g1 = ctx.createGain()
                o1.type = 'sine'; o1.frequency.setValueAtTime(698.46, now)
                g1.gain.setValueAtTime(0, now); g1.gain.linearRampToValueAtTime(0.4, now + 0.05); g1.gain.exponentialRampToValueAtTime(0.01, now + 0.7)
                o1.connect(g1); g1.connect(ctx.destination); o1.start(now); o1.stop(now + 0.7)

                const o2 = ctx.createOscillator(); const g2 = ctx.createGain()
                o2.type = 'sine'; o2.frequency.setValueAtTime(523.25, now + 0.35)
                g2.gain.setValueAtTime(0, now + 0.35); g2.gain.linearRampToValueAtTime(0.4, now + 0.4); g2.gain.exponentialRampToValueAtTime(0.01, now + 1.2)
                o2.connect(g2); g2.connect(ctx.destination); o2.start(now + 0.35); o2.stop(now + 1.2)
            } else if (type === 'harmonico') {
                ;[523.25, 783.99, 1046.50].forEach(f => {
                    const o = ctx.createOscillator(); const g = ctx.createGain()
                    o.type = 'triangle'; o.frequency.setValueAtTime(f, now)
                    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.2, now + 0.05); g.gain.exponentialRampToValueAtTime(0.005, now + 1.4)
                    o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + 1.4)
                })
            } else if (type === 'bip') {
                ;[0, 0.22].forEach(offset => {
                    const o = ctx.createOscillator(); const g = ctx.createGain()
                    o.type = 'sine'; o.frequency.setValueAtTime(880, now + offset)
                    g.gain.setValueAtTime(0, now + offset); g.gain.linearRampToValueAtTime(0.4, now + offset + 0.02); g.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.15)
                    o.connect(g); g.connect(ctx.destination); o.start(now + offset); o.stop(now + offset + 0.15)
                })
            } else {
                const o1 = ctx.createOscillator(); const g1 = ctx.createGain()
                o1.type = 'sine'; o1.frequency.setValueAtTime(523.25, now)
                g1.gain.setValueAtTime(0, now); g1.gain.linearRampToValueAtTime(0.4, now + 0.05); g1.gain.exponentialRampToValueAtTime(0.01, now + 0.6)
                o1.connect(g1); g1.connect(ctx.destination); o1.start(now); o1.stop(now + 0.6)

                const o2 = ctx.createOscillator(); const g2 = ctx.createGain()
                o2.type = 'sine'; o2.frequency.setValueAtTime(659.25, now + 0.2)
                g2.gain.setValueAtTime(0, now + 0.2); g2.gain.linearRampToValueAtTime(0.4, now + 0.25); g2.gain.exponentialRampToValueAtTime(0.01, now + 0.9)
                o2.connect(g2); g2.connect(ctx.destination); o2.start(now + 0.2); o2.stop(now + 0.9)

                const o3 = ctx.createOscillator(); const g3 = ctx.createGain()
                o3.type = 'sine'; o3.frequency.setValueAtTime(783.99, now + 0.4)
                g3.gain.setValueAtTime(0, now + 0.4); g3.gain.linearRampToValueAtTime(0.35, now + 0.45); g3.gain.exponentialRampToValueAtTime(0.01, now + 1.2)
                o3.connect(g3); g3.connect(ctx.destination); o3.start(now + 0.4); o3.stop(now + 1.2)
            }
        } catch (e) {
            console.error('Audio preview error:', e)
        }
    }

    const previewVoice = (gender: TvVoiceGender) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return
        window.speechSynthesis.cancel()
        const text = tvPrivacyMode === 'initials' ? 'Lucas M., Sala 01.' : 'Lucas Mendes, Sala 01.'
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'pt-BR'
        utterance.rate = 0.88
        const voices = window.speechSynthesis.getVoices()
        const ptVoices = voices.filter(v => {
            const lang = v?.lang || ''
            return lang.includes('pt-BR') || lang.includes('pt_BR') || lang.startsWith('pt')
        })

        let chosenVoice: SpeechSynthesisVoice | undefined
        if (gender === 'masculina') {
            chosenVoice = ptVoices.find(v => /antonio|felipe|daniel|helio|male|masculin|ricardo/i.test(v.name))
        } else if (gender === 'feminina') {
            chosenVoice = ptVoices.find(v => /francisca|luciana|maria|female|feminin|leticia|google português/i.test(v.name))
        }
        if (!chosenVoice && ptVoices.length > 0) chosenVoice = ptVoices[0]
        if (chosenVoice) utterance.voice = chosenVoice
        window.speechSynthesis.speak(utterance)
    }

    const handleSaveAudioSettings = async (
        sound: TvSoundTheme,
        voice: TvVoiceGender,
        recallMinutes: number
    ) => {
        try {
            setSavingAudioSettings(true)
            const res = await fetch('/api/clinics/tv-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tvSoundTheme: sound,
                    tvVoiceGender: voice,
                    tvRecallMinutes: recallMinutes,
                }),
            })

            if (res.ok) {
                setTvSoundTheme(sound)
                setTvVoiceGender(voice)
                setTvRecallMinutes(recallMinutes)
                toast.success('Configurações de som, voz e re-chamada salvas.')
            } else {
                toast.error('Erro ao salvar preferências de áudio.')
            }
        } catch {
            toast.error('Erro de conexão ao salvar áudio.')
        } finally {
            setSavingAudioSettings(false)
        }
    }

    const resetForm = () => {
        setIsEditing(false)
        setEditingRoomId(null)
        setRoomName('')
        setDisplayName('')
        setRoomNumber(rooms.length + 1)
        setSelectedDoctorId('none')
        setShowOnTv(true)
    }

    const handleEditClick = (room: ConsultingRoom) => {
        setIsEditing(true)
        setEditingRoomId(room.id)
        setRoomName(room.name)
        setDisplayName(room.display_name || '')
        setRoomNumber(room.room_number)
        setSelectedDoctorId(room.doctor_id || 'none')
        setShowOnTv(room.show_on_tv)
    }

    const handleConfirmDeleteRoom = async () => {
        if (!roomToDelete) return
        setDeletingRoom(true)
        try {
            const res = await fetch(`/api/consulting-rooms/${roomToDelete.id}`, {
                method: 'DELETE',
            })
            if (res.ok) {
                toast.success(`Sala "${roomToDelete.name}" excluída.`)
                setRoomToDelete(null)
                loadData()
            } else {
                const errData = await res.json().catch(() => ({}))
                toast.error(errData.error || 'Erro ao excluir sala.')
            }
        } catch (e) {
            console.error('Error deleting room:', e)
            toast.error('Erro de conexão ao excluir.')
        } finally {
            setDeletingRoom(false)
        }
    }

    const handleSubmitRoom = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!roomName.trim()) {
            toast.error('Informe o nome da sala ou consultório.')
            return
        }

        const maxRooms = PLAN_LIMITS[planType] || 1
        const activeRoomsCount = rooms.filter(r => r.is_active).length

        if (!isEditing && maxRooms !== -1 && activeRoomsCount >= maxRooms) {
            toast.error(`Seu plano (${planType}) permite no máximo ${maxRooms} sala(s). Faça upgrade para adicionar mais.`)
            return
        }

        try {
            setSubmitting(true)
            const payload = {
                name: roomName.trim(),
                display_name: displayName.trim() ? displayName.trim() : null,
                doctor_id: selectedDoctorId === 'none' ? null : selectedDoctorId,
                show_on_tv: showOnTv,
                room_number: roomNumber,
                is_active: true,
            }

            const res = isEditing && editingRoomId
                ? await fetch(`/api/consulting-rooms/${editingRoomId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
                : await fetch('/api/consulting-rooms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })

            if (res.ok) {
                toast.success(isEditing ? 'Sala atualizada com sucesso.' : 'Sala cadastrada com sucesso.')
                resetForm()
                loadData()
            } else {
                const errData = await res.json().catch(() => ({}))
                toast.error(errData.error || 'Erro ao salvar sala.')
            }
        } catch (error) {
            console.error('Error saving room:', error)
            toast.error('Erro de conexão ao salvar sala.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
                <span className="ml-3 text-sm text-muted-foreground">Carregando consultórios e painel de TV...</span>
            </div>
        )
    }

    const maxAllowedRooms = PLAN_LIMITS[planType] || 1
    const totalActiveRooms = rooms.filter(r => r.is_active).length
    const limitReached = maxAllowedRooms !== -1 && totalActiveRooms >= maxAllowedRooms

    return (
        <div className="space-y-6">
            {/* 1. Aparência do Painel de TV + Barra de Ações Diretas */}
            <Card className="border-border shadow-sm">
                <CardHeader className="pb-4 border-b border-border/60">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                                <Tv className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base sm:text-lg font-semibold">
                                    Aparência do Painel de TV
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm mt-0.5">
                                    Escolha o visual exibido na televisão da recepção. As mudanças entram ao vivo na TV sem precisar atualizar a página.
                                </CardDescription>
                            </div>
                        </div>

                        {/* Barra de Ações Diretas da TV */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                onClick={handleOpenTvPanel}
                                disabled={!clinicId}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] px-4 gap-1.5 font-medium"
                            >
                                <Tv className="w-4 h-4" />
                                Abrir Painel de TV
                                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push('/dashboard/recepcao')}
                                className="min-h-[44px] px-3.5 gap-1.5"
                            >
                                Ir para Recepção
                                <ArrowRight className="w-4 h-4" />
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCopyTvLink}
                                disabled={!clinicId}
                                className="min-h-[44px] px-3.5 gap-1.5"
                            >
                                {copiedTvLink ? (
                                    <Check className="w-4 h-4 text-primary" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                                {copiedTvLink ? 'Link Copiado' : 'Copiar Link'}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSendLiveTestCall}
                                disabled={!clinicId || sendingTestCall}
                                className="min-h-[44px] px-3.5 gap-1.5 border-primary/35 text-primary hover:bg-primary/5"
                                title="Envia uma chamada fictícia ao vivo para a TV aberta sem alterar a agenda"
                            >
                                {sendingTestCall ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Radio className="w-4 h-4" />
                                )}
                                Testar Chamada na TV
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {TV_LAYOUT_OPTIONS.map((option) => {
                            const isSelected = tvLayout === option.id
                            const isSavingThis = savingLayout === option.id

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleSaveTvLayout(option.id)}
                                    disabled={savingLayout !== null}
                                    className={`text-left group relative rounded-lg border-2 p-4 transition-colors ${
                                        isSelected
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border bg-card hover:border-primary/45'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="space-y-1">
                                            <span className="font-semibold text-sm sm:text-base text-foreground block">
                                                {option.title}
                                            </span>
                                            <Badge variant="outline" className="text-[11px] font-normal bg-background">
                                                {option.badge}
                                            </Badge>
                                        </div>
                                        {isSavingThis ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                                        ) : isSelected ? (
                                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                        ) : null}
                                    </div>

                                    <TvLayoutThumbnail layoutId={option.id} />

                                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                                        {option.description}
                                    </p>
                                    <p className="text-[11px] text-primary font-medium mt-1.5">
                                        Indicado para: {option.recommendedFor}
                                    </p>
                                </button>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* 2. Experiência da Sala de Espera (Privacidade LGPD, Recado e QR Code) */}
            <Card className="border-border shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-semibold">
                                Experiência da Sala de Espera e Privacidade LGPD
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm mt-0.5">
                                Personalize a privacidade dos nomes chamados, exiba recados institucionais no rodapé e ative o QR Code de auto check-in na TV.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                    {/* Identidade Visual: Logotipo da Clínica vs Logo Oficial CliniGo */}
                    <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-semibold flex items-center gap-1.5">
                                    <ImageIcon className="w-4 h-4 text-primary shrink-0" />
                                    Logotipo exibido no Painel de TV e Totem
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Escolha se a televisão da recepção e o totem exibem o logotipo da sua própria clínica ou o logotipo oficial do CliniGo.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setLogoModalOpen(true)}
                                disabled={!clinicId}
                                className="min-h-[40px] gap-1.5 text-xs font-medium shrink-0"
                            >
                                <Upload className="w-3.5 h-3.5 text-primary" />
                                {clinicLogoUrl ? 'Alterar Logo da Clínica' : 'Enviar Logo da Clínica'}
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleSaveTvLogoMode('clinic')}
                                disabled={savingLogoMode !== null}
                                className={`text-left rounded-lg border-2 p-3.5 transition-colors flex flex-col justify-between gap-3 ${
                                    tvLogoMode === 'clinic'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border bg-muted/20 hover:border-primary/45'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <span className="text-sm font-semibold text-foreground block">
                                            Logotipo da Minha Clínica
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            Exibe a marca própria da sua unidade
                                        </span>
                                    </div>
                                    {savingLogoMode === 'clinic' ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                                    ) : tvLogoMode === 'clinic' ? (
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    ) : null}
                                </div>
                                <div className="h-14 rounded-md border border-border bg-white px-3 flex items-center justify-center overflow-hidden">
                                    {clinicLogoUrl ? (
                                        <img
                                            src={clinicLogoUrl}
                                            alt={clinicName || 'Logotipo da clínica'}
                                            className="max-h-10 max-w-[160px] w-auto object-contain"
                                        />
                                    ) : (
                                        <span className="text-[11px] text-muted-foreground text-center">
                                            Nenhum logo enviado ainda (usará o logo CliniGo até você enviar)
                                        </span>
                                    )}
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSaveTvLogoMode('clinigo')}
                                disabled={savingLogoMode !== null}
                                className={`text-left rounded-lg border-2 p-3.5 transition-colors flex flex-col justify-between gap-3 ${
                                    tvLogoMode === 'clinigo'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border bg-muted/20 hover:border-primary/45'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <span className="text-sm font-semibold text-foreground block">
                                            Logotipo Oficial CliniGo
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            Adaptado automaticamente ao fundo claro ou escuro
                                        </span>
                                    </div>
                                    {savingLogoMode === 'clinigo' ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                                    ) : tvLogoMode === 'clinigo' ? (
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    ) : null}
                                </div>
                                <div className="h-14 rounded-md border border-border bg-white px-3 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={OFFICIAL_CLINIGO_LOGO_LIGHT}
                                        alt="CliniGo"
                                        className="max-h-8 w-auto object-contain"
                                    />
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border bg-muted/25">
                            <div className="space-y-1">
                                <Label htmlFor="tv-privacy-toggle" className="text-sm font-semibold cursor-pointer flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                                    Modo Privacidade LGPD na TV
                                </Label>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Exibe apenas o primeiro nome e a inicial do sobrenome (ex.: <strong>Lucas M.</strong>). Ideal para clínicas de Psicologia e Terapias.
                                </p>
                            </div>
                            <Switch
                                id="tv-privacy-toggle"
                                checked={tvPrivacyMode === 'initials'}
                                onCheckedChange={(checked) => setTvPrivacyMode(checked ? 'initials' : 'full')}
                            />
                        </div>

                        <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border bg-muted/25">
                            <div className="space-y-1">
                                <Label htmlFor="tv-qr-toggle" className="text-sm font-semibold cursor-pointer flex items-center gap-1.5">
                                    <QrCode className="w-4 h-4 text-primary shrink-0" />
                                    QR Code de Check-in na TV
                                </Label>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Exibe um QR Code discreto no canto da TV para pacientes que acabaram de chegar realizarem o check-in pelo próprio celular.
                                </p>
                            </div>
                            <Switch
                                id="tv-qr-toggle"
                                checked={tvShowQrCode}
                                onCheckedChange={setTvShowQrCode}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5 p-4 rounded-lg border border-border bg-card">
                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor="tv-ticker-message" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Megaphone className="w-3.5 h-3.5 text-primary" />
                                Faixa de Recados da Recepção (Opcional)
                            </Label>
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {tvTickerMessage.length}/240
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                id="tv-ticker-message"
                                value={tvTickerMessage}
                                onChange={(e) => setTvTickerMessage(e.target.value.slice(0, 240))}
                                placeholder="Ex: Bem-vindos! Apresente sua carteirinha do convênio na recepção · Wi-Fi: Clinica_Visitantes"
                                className="min-h-[44px]"
                            />
                            {tvTickerMessage && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setTvTickerMessage('')}
                                    className="min-h-[44px] min-w-[44px] shrink-0"
                                    title="Limpar mensagem"
                                    aria-label="Limpar mensagem do rodapé"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Quando preenchida, aparece como uma faixa institucional limpa no rodapé de todos os layouts da TV.
                        </p>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-border">
                        <Button
                            type="button"
                            onClick={handleSaveDisplayPreferences}
                            disabled={savingDisplayPrefs}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 min-h-[44px] px-6 font-medium"
                        >
                            {savingDisplayPrefs && <Loader2 className="w-4 h-4 animate-spin" />}
                            Salvar Preferências de Exibição
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 3. Chamada Multicanal via WhatsApp */}
            <Card className="border-border shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold">
                                    Chamada Multicanal via WhatsApp
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm mt-0.5 leading-relaxed">
                                    Notifique o paciente ou responsável automaticamente por WhatsApp no momento exato em que for chamado no Painel de TV.
                                </CardDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {whatsappConnected ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/25">
                                    <span className="w-2 h-2 rounded-full bg-primary" />
                                    Conectado {whatsappPhone ? `(${whatsappPhone})` : ''}
                                </span>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                        <span className="w-2 h-2 rounded-full bg-amber-600" />
                                        Não conectado
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="min-h-[38px] text-xs font-medium px-3 border-amber-300 text-amber-900 hover:bg-amber-50"
                                        onClick={() => router.push('/dashboard/whatsapp')}
                                        title="Conectar WhatsApp da Clínica"
                                    >
                                        Conectar
                                        <ExternalLink className="w-3 h-3 ml-1.5" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-muted/40 border border-border/70">
                        <div className="space-y-1 pr-2">
                            <Label htmlFor="whatsapp-call-toggle" className="text-sm font-semibold cursor-pointer">
                                Enviar notificação de chamada também por WhatsApp
                            </Label>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {whatsappConnected
                                    ? 'Ao chamar o paciente na recepção, uma mensagem é enviada com o nome do terapeuta, especialidade e sala.'
                                    : 'Para habilitar, o WhatsApp da clínica precisa estar conectado. Conecte no menu Comunicação → WhatsApp.'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {savingWhatsappToggle && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                            <Switch
                                id="whatsapp-call-toggle"
                                checked={whatsappCallEnabled}
                                onCheckedChange={handleToggleWhatsappCall}
                                disabled={savingWhatsappToggle}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 4. Identidade Sonora e Voz do Painel de TV */}
            <Card className="border-border shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                            <Volume2 className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-semibold">Identidade Sonora e Voz da TV</CardTitle>
                            <CardDescription className="text-xs sm:text-sm mt-0.5">
                                Personalize o som do alerta, o tipo de voz que anuncia os pacientes e a re-chamada automática.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-0">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-3 p-4 rounded-lg border border-border bg-card">
                            <div className="flex items-center justify-between gap-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Music className="w-3.5 h-3.5 text-primary" />
                                    Som do Alerta (Chime)
                                </Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="min-h-[38px] text-xs font-medium gap-1.5"
                                    onClick={() => previewSound(tvSoundTheme)}
                                    title="Ouvir demonstração do som"
                                >
                                    <Volume2 className="w-3.5 h-3.5 text-primary" />
                                    Ouvir Som
                                </Button>
                            </div>

                            <Select
                                value={tvSoundTheme}
                                onValueChange={(val) => setTvSoundTheme(val as TvSoundTheme)}
                            >
                                <SelectTrigger className="w-full min-h-[44px] bg-background">
                                    <SelectValue placeholder="Escolha um som" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="classico">Chime Clássico (Hospitalar - 3 Notas)</SelectItem>
                                    <SelectItem value="moderno">Ding-Dong Moderno (2 Tons)</SelectItem>
                                    <SelectItem value="harmonico">Acorde Harmônico (Suave / Sensorial)</SelectItem>
                                    <SelectItem value="bip">Bip Clínico (Alerta Rápido)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Tocado 1 segundo antes do anúncio por voz para chamar a atenção da sala de espera.
                            </p>
                        </div>

                        <div className="space-y-3 p-4 rounded-lg border border-border bg-card">
                            <div className="flex items-center justify-between gap-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Volume2 className="w-3.5 h-3.5 text-primary" />
                                    Voz do Anúncio (TTS)
                                </Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="min-h-[38px] text-xs font-medium gap-1.5"
                                    onClick={() => previewVoice(tvVoiceGender)}
                                    title="Ouvir exemplo da voz"
                                >
                                    <Play className="w-3.5 h-3.5 text-primary" />
                                    Testar Voz
                                </Button>
                            </div>

                            <Select
                                value={tvVoiceGender}
                                onValueChange={(val) => setTvVoiceGender(val as TvVoiceGender)}
                            >
                                <SelectTrigger className="w-full min-h-[44px] bg-background">
                                    <SelectValue placeholder="Escolha a voz" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="feminina">Voz Feminina (Recomendada / Suave)</SelectItem>
                                    <SelectItem value="masculina">Voz Masculina (Firme / Clara)</SelectItem>
                                    <SelectItem value="padrao">Padrão do Sistema</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Exemplo: &ldquo;{tvPrivacyMode === 'initials' ? 'Lucas M., Sala 01' : 'Lucas Mendes, Sala 01'}&rdquo;.
                            </p>
                        </div>

                        <div className="space-y-3 p-4 rounded-lg border border-border bg-card sm:col-span-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-primary" />
                                Re-chamada Automática por Ausência
                            </Label>

                            <div className="grid sm:grid-cols-3 gap-4 items-center">
                                <div className="sm:col-span-1">
                                    <Select
                                        value={String(tvRecallMinutes)}
                                        onValueChange={(val) => setTvRecallMinutes(Number(val))}
                                    >
                                        <SelectTrigger className="w-full min-h-[44px] bg-background">
                                            <SelectValue placeholder="Tempo de espera" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="3">Após 3 minutos</SelectItem>
                                            <SelectItem value="5">Após 5 minutos (Recomendado)</SelectItem>
                                            <SelectItem value="10">Após 10 minutos</SelectItem>
                                            <SelectItem value="15">Após 15 minutos</SelectItem>
                                            <SelectItem value="0">Desativado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="sm:col-span-2 text-xs text-muted-foreground leading-relaxed">
                                    Se o paciente chamado não iniciar o atendimento dentro do tempo configurado, a TV repete o anúncio por som e voz e a recepção recebe alerta.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-border">
                        <Button
                            type="button"
                            onClick={() => handleSaveAudioSettings(tvSoundTheme, tvVoiceGender, tvRecallMinutes)}
                            disabled={savingAudioSettings}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 min-h-[44px] px-6 font-medium"
                        >
                            {savingAudioSettings && <Loader2 className="w-4 h-4 animate-spin" />}
                            Salvar Configurações de Áudio
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 5. Salas e Consultórios */}
            <div className="grid md:grid-cols-5 gap-6">
                <div className="md:col-span-3 space-y-4">
                    <Card className="border-border shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-semibold">Salas de Atendimento</CardTitle>
                                <CardDescription>
                                    Limites do seu plano: <strong>{totalActiveRooms}</strong> de <strong>{maxAllowedRooms === -1 ? 'Ilimitado' : maxAllowedRooms}</strong> ativa(s).
                                </CardDescription>
                            </div>
                            <Building className="w-7 h-7 text-muted-foreground/30 shrink-0" />
                        </CardHeader>
                        <CardContent>
                            {rooms.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    Nenhuma sala cadastrada ainda. Utilize o formulário ao lado para adicionar.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {rooms.map((room) => (
                                        <div
                                            key={room.id}
                                            className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors"
                                        >
                                            <div className="space-y-1 min-w-0 pr-3">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold text-sm text-foreground">
                                                        {room.name}
                                                    </span>
                                                    <span className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-mono tabular-nums">
                                                        Sala nº {room.room_number}
                                                    </span>
                                                    {!room.is_active && (
                                                        <span className="text-[11px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                                                            Inativa
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {room.doctor?.user?.full_name ? (
                                                        <>
                                                            Profissional: <strong className="text-foreground">{room.doctor.user.full_name}</strong> ({room.doctor.specialty})
                                                        </>
                                                    ) : (
                                                        <span className="text-muted-foreground/70 italic">Sem profissional fixo vinculado</span>
                                                    )}
                                                </p>
                                                {room.display_name && (
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Exibição na TV: &ldquo;{room.display_name}&rdquo;
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                <div className="p-2 text-muted-foreground">
                                                    {room.show_on_tv ? (
                                                        <span title="Exibida na TV" className="inline-flex">
                                                            <Eye className="w-4 h-4 text-primary" />
                                                        </span>
                                                    ) : (
                                                        <span title="Oculta na TV" className="inline-flex">
                                                            <EyeOff className="w-4 h-4 text-muted-foreground/40" />
                                                        </span>
                                                    )}
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="min-h-[44px] min-w-[44px]"
                                                    onClick={() => handleEditClick(room)}
                                                    title="Editar sala"
                                                    aria-label={`Editar ${room.name}`}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="min-h-[44px] min-w-[44px] hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setRoomToDelete(room)}
                                                    title="Excluir sala"
                                                    aria-label={`Excluir ${room.name}`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Formulário de Criação/Edição de Sala */}
                <div className="md:col-span-2">
                    <Card className="border-border shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">
                                {isEditing ? 'Editar Sala' : 'Adicionar Sala'}
                            </CardTitle>
                            <CardDescription>
                                {isEditing
                                    ? 'Atualize as informações da sala selecionada.'
                                    : 'Cadastre uma nova sala física de atendimento da clínica.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {limitReached && !isEditing && (
                                <div className="p-3 mb-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
                                    <div>
                                        <strong>Limite atingido.</strong> Seu plano permite no máximo {maxAllowedRooms} sala(s). Atualize sua assinatura para cadastrar mais.
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmitRoom} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="room_name">Nome da Sala / Consultório</Label>
                                    <Input
                                        id="room_name"
                                        placeholder="Ex: Sala 01, Sala Sensorial, Fonoaudiologia"
                                        value={roomName}
                                        onChange={(e) => setRoomName(e.target.value)}
                                        disabled={limitReached && !isEditing}
                                        className="min-h-[44px]"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="display_name">Nome para exibição na TV (Opcional)</Label>
                                    <Input
                                        id="display_name"
                                        placeholder="Ex: Sala 01 · Terapia Ocupacional"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        disabled={limitReached && !isEditing}
                                        className="min-h-[44px]"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Deixe em branco para usar o nome principal acima.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="room_number">Número da Sala</Label>
                                        <Input
                                            id="room_number"
                                            type="number"
                                            min={1}
                                            value={roomNumber}
                                            onChange={(e) => setRoomNumber(Number(e.target.value))}
                                            disabled={limitReached && !isEditing}
                                            className="min-h-[44px]"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label>Profissional Fixo</Label>
                                        <Select
                                            value={selectedDoctorId}
                                            onValueChange={setSelectedDoctorId}
                                            disabled={limitReached && !isEditing}
                                        >
                                            <SelectTrigger className="min-h-[44px]">
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum (Rotativa)</SelectItem>
                                                {doctors.map((doc) => (
                                                    <SelectItem key={doc.id} value={doc.id}>
                                                        {doc.user?.full_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                                    <div className="space-y-0.5 pr-2">
                                        <Label htmlFor="show_on_tv" className="text-sm font-semibold">Exibir na TV</Label>
                                        <p className="text-xs text-muted-foreground">Mostrar esta sala no painel lateral da TV.</p>
                                    </div>
                                    <Switch
                                        id="show_on_tv"
                                        checked={showOnTv}
                                        onCheckedChange={setShowOnTv}
                                        disabled={limitReached && !isEditing}
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    {isEditing && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="flex-1 min-h-[44px]"
                                            onClick={resetForm}
                                        >
                                            Cancelar
                                        </Button>
                                    )}
                                    <Button
                                        type="submit"
                                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] font-medium"
                                        disabled={submitting || (limitReached && !isEditing)}
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Salvando...
                                            </>
                                        ) : isEditing ? (
                                            'Atualizar Sala'
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Adicionar Sala
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Alerta de Confirmação: Excluir Sala */}
            <AlertDialog open={!!roomToDelete} onOpenChange={(open) => !open && !deletingRoom && setRoomToDelete(null)}>
                <AlertDialogContent className="max-w-md w-[95vw]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir sala de atendimento?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir <strong>{roomToDelete?.name}</strong>? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel disabled={deletingRoom} className="min-h-[44px]">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deletingRoom}
                            onClick={(e) => {
                                e.preventDefault()
                                handleConfirmDeleteRoom()
                            }}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground min-h-[44px]"
                        >
                            {deletingRoom ? 'Excluindo...' : 'Confirmar Exclusão'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de Upload/Alteração do Logotipo da Clínica */}
            <ClinicLogoModal
                open={logoModalOpen}
                onOpenChange={setLogoModalOpen}
                clinicId={clinicId}
                clinicName={clinicName}
                currentLogoUrl={clinicLogoUrl}
                onLogoUpdated={loadData}
            />
        </div>
    )
}
