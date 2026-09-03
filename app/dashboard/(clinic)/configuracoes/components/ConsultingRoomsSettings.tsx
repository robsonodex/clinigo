'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
    Clock
} from 'lucide-react'

// Plan definitions mapping
const PLAN_LIMITS: Record<string, number> = {
    'BASICO': 1,
    'AVANCADO': 5,
    'PROFESSIONAL': 30,
    'ENTERPRISE': -1
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

export function ConsultingRoomsSettings() {
    const [clinicId, setClinicId] = useState<string | null>(null)
    const [planType, setPlanType] = useState<string>('BASICO')
    const [theme, setTheme] = useState<any>({})
    const [rooms, setRooms] = useState<ConsultingRoom[]>([])
    const [doctors, setDoctors] = useState<Doctor[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    const router = useRouter()
    const [whatsappCallEnabled, setWhatsappCallEnabled] = useState(false)
    const [whatsappConnected, setWhatsappConnected] = useState(false)
    const [whatsappPhone, setWhatsappPhone] = useState<string | null>(null)
    const [savingWhatsappToggle, setSavingWhatsappToggle] = useState(false)

    const [tvSoundTheme, setTvSoundTheme] = useState<'classico' | 'moderno' | 'harmonico' | 'bip'>('classico')
    const [tvVoiceGender, setTvVoiceGender] = useState<'feminina' | 'masculina' | 'padrao'>('feminina')
    const [tvRecallMinutes, setTvRecallMinutes] = useState<number>(5)
    const [savingAudioSettings, setSavingAudioSettings] = useState(false)

    // Form states
    const [isEditing, setIsEditing] = useState(false)
    const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
    const [roomName, setRoomName] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [roomNumber, setRoomNumber] = useState<number>(1)
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>('none')
    const [showOnTv, setShowOnTv] = useState(true)

    const supabase = createClient()

    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            // 1. Get authenticated user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 2. Get user's clinic ID & plan info
            const { data: userData } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', user.id)
                .single()

            if (!userData?.clinic_id) return
            setClinicId(userData.clinic_id)

            // 3. Fetch clinic details (plan & theme)
            const { data: clinicData } = await supabase
                .from('clinics')
                .select('plan_type, theme')
                .eq('id', userData.clinic_id)
                .single()

            if (clinicData) {
                setPlanType(clinicData.plan_type || 'BASICO')
                setTheme(clinicData.theme || {})
            }

            // 4. Fetch consulting rooms
            const roomsRes = await fetch(`/api/consulting-rooms?timestamp=${Date.now()}`)
            if (roomsRes.ok) {
                const data = await roomsRes.json()
                setRooms(data.rooms || [])
            }

            // 5. Fetch doctors
            const doctorsRes = await fetch('/api/doctors?pageSize=100')
            if (doctorsRes.ok) {
                const data = await doctorsRes.json()
                setDoctors(data.data || [])
            }

            // 6. Fetch TV WhatsApp settings & live status
            try {
                const tvSettingsRes = await fetch('/api/clinics/tv-settings')
                if (tvSettingsRes.ok) {
                    const tvData = await tvSettingsRes.json()
                    setWhatsappCallEnabled(Boolean(tvData.whatsappCallEnabled))
                    setWhatsappConnected(Boolean(tvData.whatsappConnected))
                    setWhatsappPhone(tvData.whatsappPhone || null)
                    if (tvData.tvSoundTheme) setTvSoundTheme(tvData.tvSoundTheme)
                    if (tvData.tvVoiceGender) setTvVoiceGender(tvData.tvVoiceGender)
                    if (tvData.tvRecallMinutes !== undefined) setTvRecallMinutes(Number(tvData.tvRecallMinutes))
                }
            } catch (tvErr) {
                console.warn('Erro ao carregar status do WhatsApp da TV:', tvErr)
            }

        } catch (error) {
            console.error('Error loading consulting rooms data:', error)
            toast.error('Erro ao carregar configurações.')
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Save TV layout preference
    const handleSaveTvLayout = async (layoutType: 'informativo' | 'classico') => {
        if (!clinicId) return
        try {
            const updatedTheme = { ...theme, tv_layout: layoutType }
            const { error } = await supabase
                .from('clinics')
                .update({ theme: updatedTheme })
                .eq('id', clinicId)

            if (error) throw error
            setTheme(updatedTheme)
            toast.success('Layout do Painel de TV atualizado!')
        } catch (e) {
            console.error('Error saving TV layout:', e)
            toast.error('Erro ao atualizar layout da TV.')
        }
    }

    // Toggle WhatsApp call notification with active connection validation
    const handleToggleWhatsappCall = async (checked: boolean) => {
        if (checked && !whatsappConnected) {
            toast.error('WhatsApp não está conectado', {
                description: 'Para habilitar o envio de chamada, o WhatsApp da clínica precisa estar conectado.',
                action: {
                    label: 'Conectar WhatsApp',
                    onClick: () => router.push('/dashboard/integracoes/whatsapp')
                }
            })
            return
        }

        try {
            setSavingWhatsappToggle(true)
            const res = await fetch('/api/clinics/tv-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ whatsappCallEnabled: checked })
            })

            if (res.ok) {
                setWhatsappCallEnabled(checked)
                toast.success(checked 
                    ? 'Notificação de chamada via WhatsApp ativada!' 
                    : 'Notificação de chamada via WhatsApp desativada!'
                )
            } else {
                const err = await res.json()
                toast.error(err.error || 'Erro ao atualizar configuração.')
                if (err.action === 'connect_whatsapp') {
                    router.push('/dashboard/integracoes/whatsapp')
                }
            }
        } catch (e) {
            toast.error('Erro de conexão ao salvar configuração.')
        } finally {
            setSavingWhatsappToggle(false)
        }
    }

    // Pré-escutar som de chamada (Prioridade 2)
    const previewSound = (type: 'classico' | 'moderno' | 'harmonico' | 'bip') => {
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

    // Testar voz do anúncio
    const previewVoice = (gender: 'feminina' | 'masculina' | 'padrao') => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return
        window.speechSynthesis.cancel()
        const text = 'Aline Teste, Sala B.'
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'pt-BR'
        utterance.rate = 0.88
        const voices = window.speechSynthesis.getVoices()
        const ptVoices = voices.filter(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR') || v.lang.startsWith('pt'))
        
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

    // Salvar preferências sonoras, voz e escalonamento
    const handleSaveAudioSettings = async (
        sound: 'classico' | 'moderno' | 'harmonico' | 'bip', 
        voice: 'feminina' | 'masculina' | 'padrao',
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
                    tvRecallMinutes: recallMinutes
                })
            })

            if (res.ok) {
                setTvSoundTheme(sound)
                setTvVoiceGender(voice)
                setTvRecallMinutes(recallMinutes)
                toast.success('Configurações de som, voz e re-chamada salvas com sucesso!')
            } else {
                toast.error('Erro ao salvar preferências de áudio.')
            }
        } catch (e) {
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

    const handleDeleteRoom = async (roomId: string) => {
        const confirmed = window.confirm('Tem certeza que deseja excluir este consultório?')
        if (!confirmed) return

        try {
            const res = await fetch(`/api/consulting-rooms/${roomId}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                toast.success('Consultório excluído!')
                loadData()
            } else {
                const errData = await res.json()
                toast.error(errData.error || 'Erro ao excluir consultório.')
            }
        } catch (e) {
            console.error('Error deleting room:', e)
            toast.error('Erro de conexão ao excluir.')
        }
    }

    const handleSubmitRoom = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!roomName.trim()) {
            toast.error('Informe o nome do consultório.')
            return
        }

        const maxRooms = PLAN_LIMITS[planType] || 1
        const activeRoomsCount = rooms.filter(r => r.is_active).length

        // Limit validation for new rooms
        if (!isEditing && maxRooms !== -1 && activeRoomsCount >= maxRooms) {
            toast.error(`Seu plano (${planType}) permite no máximo ${maxRooms} consultório(s). Faça um upgrade de plano para adicionar mais.`)
            return
        }

        try {
            setSubmitting(true)
            const payload = {
                name: roomName,
                display_name: displayName.trim() ? displayName : null,
                doctor_id: selectedDoctorId === 'none' ? null : selectedDoctorId,
                show_on_tv: showOnTv,
                room_number: roomNumber,
                is_active: true
            }

            let res
            if (isEditing && editingRoomId) {
                res = await fetch(`/api/consulting-rooms/${editingRoomId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
            } else {
                res = await fetch('/api/consulting-rooms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
            }

            if (res.ok) {
                toast.success(isEditing ? 'Consultório atualizado!' : 'Consultório cadastrado com sucesso!')
                resetForm()
                loadData()
            } else {
                const errData = await res.json()
                toast.error(errData.error || 'Erro ao salvar consultório.')
            }
        } catch (error) {
            console.error('Error saving room:', error)
            toast.error('Erro de conexão.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-sm text-muted-foreground">Carregando consultórios...</span>
            </div>
        )
    }

    const currentTvLayout = theme?.tv_layout || 'classico'
    const maxAllowedRooms = PLAN_LIMITS[planType] || 1
    const totalActiveRooms = rooms.filter(r => r.is_active).length
    const limitReached = maxAllowedRooms !== -1 && totalActiveRooms >= maxAllowedRooms

    return (
        <div className="space-y-6">
            
            {/* TV Layout selector */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Tv className="w-5 h-5 text-primary" />
                        <div>
                            <CardTitle>Aparência do Painel de TV</CardTitle>
                            <CardDescription>Escolha como o painel de senhas e consultórios será exibido na TV da clínica.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                        
                        {/* Option 1: Classic layout */}
                        <div 
                            onClick={() => handleSaveTvLayout('classico')}
                            className={`group relative rounded-xl border p-4 cursor-pointer transition-all duration-200 hover:border-primary/50 ${
                                currentTvLayout === 'classico' 
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                                    : 'border-border bg-card'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-semibold text-base">Layout Clássico (Foco Total)</span>
                                {currentTvLayout === 'classico' && (
                                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                                        <Check className="w-3.5 h-3.5" />
                                    </div>
                                )}
                            </div>
                            
                            {/* Fake classic screen mockup */}
                            <div className="w-full aspect-video rounded-lg border border-white/10 bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                                <div className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider mb-0.5">Senha</div>
                                <div className="text-3xl font-bold font-mono text-white mb-1">P-003</div>
                                <div className="px-3 py-1 rounded bg-white/15 text-[10px] border border-white/10 text-white font-medium">
                                    Consultório 1
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                                Foco gigante e exclusivo na última senha chamada. Ideal para telas menores ou salas de espera específicas.
                            </p>
                        </div>

                        {/* Option 2: Split screen layout */}
                        <div 
                            onClick={() => handleSaveTvLayout('informativo')}
                            className={`group relative rounded-xl border p-4 cursor-pointer transition-all duration-200 hover:border-primary/50 ${
                                currentTvLayout === 'informativo' 
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                                    : 'border-border bg-card'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-semibold text-base">Layout Informativo (Tela Dividida)</span>
                                {currentTvLayout === 'informativo' && (
                                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                                        <Check className="w-3.5 h-3.5" />
                                    </div>
                                )}
                            </div>
                            
                            {/* Fake split screen mockup */}
                            <div className="w-full aspect-video rounded-lg border border-white/10 bg-slate-950 grid grid-cols-3 gap-1 p-1 relative overflow-hidden">
                                <div className="col-span-2 bg-white/5 border border-white/5 rounded flex flex-col items-center justify-center p-2">
                                    <div className="text-[7px] text-amber-500 font-semibold uppercase mb-0.5">Senha</div>
                                    <div className="text-xl font-bold font-mono text-white mb-0.5">P-003</div>
                                    <div className="px-2 py-0.5 rounded bg-white/15 text-[7px] border border-white/10 text-white font-medium">
                                        Consultório 1
                                    </div>
                                </div>
                                <div className="col-span-1 bg-white/5 border border-white/5 rounded p-1 flex flex-col gap-1 text-[6px]">
                                    <span className="font-bold text-white/50 text-[5px] uppercase tracking-wider border-b border-white/5 pb-0.5">Salas</span>
                                    <div className="flex justify-between items-center bg-white/5 px-1 py-0.5 rounded text-[5px]">
                                        <span>Consultório 1</span>
                                        <span className="text-amber-500 font-semibold">Ativo</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/5 px-1 py-0.5 rounded text-[5px]">
                                        <span>Sala 2</span>
                                        <span className="text-amber-500 font-semibold">Ativo</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                                Tela dividida: exibe a senha atual ao lado de uma lista fixa de salas e médicos que estão atendendo no momento.
                            </p>
                        </div>

                    </div>
                </CardContent>
            </Card>

            {/* Chamada Multicanal via WhatsApp (Prioridade 1) */}
            <Card className="border-border/80 shadow-xs">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    Chamada Multicanal via WhatsApp
                                </CardTitle>
                                <CardDescription className="text-xs mt-0.5 leading-relaxed">
                                    Notifique o paciente automaticamente por WhatsApp no momento exato em que ele for chamado no Painel de TV.
                                </CardDescription>
                            </div>
                        </div>

                        {/* Badge de Status da Conexão WhatsApp */}
                        <div className="flex items-center gap-2 shrink-0">
                            {whatsappConnected ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Conectado {whatsappPhone ? `(${whatsappPhone})` : ''}
                                </span>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                        Não conectado
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs font-medium rounded-md px-2.5 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 min-h-[32px]"
                                        onClick={() => router.push('/dashboard/integracoes/whatsapp')}
                                        title="Conectar WhatsApp da Clínica"
                                    >
                                        Conectar
                                        <ExternalLink className="w-3 h-3 ml-1" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-muted/40 border border-border/60">
                        <div className="space-y-1 pr-2">
                            <Label htmlFor="whatsapp-call-toggle" className="text-sm font-semibold cursor-pointer">
                                Enviar notificação de chamada também por WhatsApp
                            </Label>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {whatsappConnected 
                                    ? "Ao chamar o paciente na recepção, uma mensagem será enviada com o nome do profissional, especialidade e o consultório."
                                    : "Para habilitar, o WhatsApp da clínica precisa estar conectado. Conecte o WhatsApp nas configurações de integrações."}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {savingWhatsappToggle && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                            <Switch
                                id="whatsapp-call-toggle"
                                checked={whatsappCallEnabled}
                                onCheckedChange={handleToggleWhatsappCall}
                                disabled={savingWhatsappToggle}
                                className="data-[state=checked]:bg-emerald-600 min-w-[44px] min-h-[24px]"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Identidade Sonora e Voz do Painel de TV (Prioridade 2) */}
            <Card className="border-border/80 shadow-xs">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                            <Volume2 className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Identidade Sonora e Voz da TV</CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                Personalize o som do alerta e o tipo de voz que anuncia os pacientes na sala de espera.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-0">
                    <div className="grid sm:grid-cols-2 gap-6">
                        
                        {/* Seletor de Som */}
                        <div className="space-y-3 p-4 rounded-xl border bg-card/60">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Music className="w-3.5 h-3.5 text-primary" />
                                    Som do Alerta (Chime)
                                </Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-semibold gap-1.5 min-h-[36px]"
                                    onClick={() => previewSound(tvSoundTheme)}
                                    title="Ouvir demonstração do som"
                                >
                                    <Volume2 className="w-3.5 h-3.5 text-primary" />
                                    Ouvir Som
                                </Button>
                            </div>

                            <Select
                                value={tvSoundTheme}
                                onValueChange={(val: any) => setTvSoundTheme(val)}
                            >
                                <SelectTrigger className="w-full h-11 bg-background">
                                    <SelectValue placeholder="Escolha um som" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="classico">Chime Clássico (Hospitalar - 3 Notas)</SelectItem>
                                    <SelectItem value="moderno">Ding-Dong Moderno (Aeroporto - 2 Tons)</SelectItem>
                                    <SelectItem value="harmonico">Acorde Harmônico (Zen & Suave)</SelectItem>
                                    <SelectItem value="bip">Bip Clínico (Alerta Rápido Dinâmico)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Tocado 1 segundo antes do anúncio por voz para chamar a atenção da sala de espera.
                            </p>
                        </div>

                        {/* Seletor de Voz Neural */}
                        <div className="space-y-3 p-4 rounded-xl border bg-card/60">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Volume2 className="w-3.5 h-3.5 text-primary" />
                                    Voz do Anúncio (TTS)
                                </Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-semibold gap-1.5 min-h-[36px]"
                                    onClick={() => previewVoice(tvVoiceGender)}
                                    title="Ouvir exemplo da voz"
                                >
                                    <Play className="w-3.5 h-3.5 text-primary" />
                                    Testar Voz
                                </Button>
                            </div>

                            <Select
                                value={tvVoiceGender}
                                onValueChange={(val: any) => setTvVoiceGender(val)}
                            >
                                <SelectTrigger className="w-full h-11 bg-background">
                                    <SelectValue placeholder="Escolha a voz" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="feminina">Voz Feminina (Recomendada / Suave)</SelectItem>
                                    <SelectItem value="masculina">Voz Masculina (Firme / Profissional)</SelectItem>
                                    <SelectItem value="padrao">Padrão do Sistema</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Exemplo: &ldquo;Aline Teste, Sala B&rdquo;.
                            </p>
                        </div>

                        {/* Escalonamento por Ausência de Atendimento (Prioridade 4) */}
                        <div className="space-y-3 p-4 rounded-xl border bg-card/60 sm:col-span-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-primary" />
                                    Escalonamento por Ausência de Atendimento (Re-chamada)
                                </Label>
                            </div>

                            <div className="grid sm:grid-cols-3 gap-4 items-center">
                                <div className="sm:col-span-1">
                                    <Select
                                        value={String(tvRecallMinutes)}
                                        onValueChange={(val) => setTvRecallMinutes(Number(val))}
                                    >
                                        <SelectTrigger className="w-full h-11 bg-background">
                                            <SelectValue placeholder="Tempo de espera" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="3">Após 3 minutos</SelectItem>
                                            <SelectItem value="5">Após 5 minutos (Recomendado)</SelectItem>
                                            <SelectItem value="10">Após 10 minutos</SelectItem>
                                            <SelectItem value="15">Após 15 minutos</SelectItem>
                                            <SelectItem value="0">Desativado (Sem re-chamada automática)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="sm:col-span-2 text-[11px] text-muted-foreground leading-relaxed">
                                    Se o paciente chamado não iniciar atendimento dentro do tempo estipulado, a TV repetirá o anúncio por som e voz e a recepção será alertada.
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="flex justify-end pt-2 border-t">
                        <Button
                            type="button"
                            onClick={() => handleSaveAudioSettings(tvSoundTheme, tvVoiceGender, tvRecallMinutes)}
                            disabled={savingAudioSettings}
                            className="gap-2 min-h-[44px] px-6 font-semibold"
                        >
                            {savingAudioSettings && <Loader2 className="w-4 h-4 animate-spin" />}
                            Salvar Configurações da TV
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Consulting Rooms list & form */}
            <div className="grid md:grid-cols-5 gap-6">
                
                {/* Rooms List */}
                <div className="md:col-span-3 space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Salas e Consultórios</CardTitle>
                                <CardDescription>
                                    Limites do seu Plano: <strong>{totalActiveRooms}</strong> de <strong>{maxAllowedRooms === -1 ? 'Ilimitado' : maxAllowedRooms}</strong> ativo(s).
                                </CardDescription>
                            </div>
                            <Building className="w-8 h-8 text-muted-foreground/30" />
                        </CardHeader>
                        <CardContent>
                            {rooms.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    Nenhum consultório cadastrado ainda. Use o formulário ao lado para cadastrar.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {rooms.map((room) => (
                                        <div 
                                            key={room.id}
                                            className="flex items-center justify-between p-3 rounded-lg border bg-card transition-all hover:bg-muted/10"
                                        >
                                            <div className="space-y-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm">
                                                        {room.name}
                                                    </span>
                                                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-mono">
                                                        Sala nº {room.room_number}
                                                    </span>
                                                    {!room.is_active && (
                                                        <span className="text-[10px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full">
                                                            Inativo
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {room.doctor?.user?.full_name ? (
                                                        <>
                                                            Médico: <strong className="text-foreground">{room.doctor.user.full_name}</strong> ({room.doctor.specialty})
                                                        </>
                                                    ) : (
                                                        <span className="text-muted-foreground/60 italic">Sem médico vinculado</span>
                                                    )}
                                                </p>
                                                {room.display_name && (
                                                    <p className="text-[10px] text-muted-foreground/80">
                                                        Exibição na TV: "{room.display_name}"
                                                    </p>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-1 shrink-0">
                                                <div className="p-2 text-muted-foreground">
                                                    {room.show_on_tv ? (
                                                        <Eye className="w-4 h-4 text-emerald-500" title="Exibe na TV" />
                                                    ) : (
                                                        <EyeOff className="w-4 h-4 text-muted-foreground/40" title="Oculto da TV" />
                                                    )}
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="w-9 h-9"
                                                    onClick={() => handleEditClick(room)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="w-9 h-9 hover:text-rose-500 hover:bg-rose-500/10"
                                                    onClick={() => handleDeleteRoom(room.id)}
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

                {/* Create/Edit Form */}
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>{isEditing ? 'Editar Consultório' : 'Adicionar Consultório'}</CardTitle>
                            <CardDescription>
                                {isEditing 
                                    ? 'Atualize as informações do consultório selecionado.'
                                    : 'Cadastre uma nova sala de atendimento física para sua clínica.'
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {limitReached && !isEditing && (
                                <div className="p-3 mb-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <div>
                                        <strong>Limite atingido!</strong> Seu plano permite no máximo {maxAllowedRooms} sala(s). Atualize sua assinatura para cadastrar mais.
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmitRoom} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="room_name">Nome do Consultório / Sala</Label>
                                    <Input 
                                        id="room_name"
                                        placeholder="Ex: Consultório 01, Sala de Triagem" 
                                        value={roomName}
                                        onChange={(e) => setRoomName(e.target.value)}
                                        disabled={limitReached && !isEditing}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="display_name">Nome para exibição na TV (Opcional)</Label>
                                    <Input 
                                        id="display_name"
                                        placeholder="Ex: Pediatria, Sala 2" 
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        disabled={limitReached && !isEditing}
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Deixe em branco para usar o nome padrão cadastrado acima.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="room_number">Número da Sala</Label>
                                        <Input 
                                            id="room_number"
                                            type="number"
                                            min={1}
                                            value={roomNumber}
                                            onChange={(e) => setRoomNumber(Number(e.target.value))}
                                            disabled={limitReached && !isEditing}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label>Médico Ativo na Sala</Label>
                                        <Select 
                                            value={selectedDoctorId} 
                                            onValueChange={setSelectedDoctorId}
                                            disabled={limitReached && !isEditing}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum (Livre)</SelectItem>
                                                {doctors.map((doc) => (
                                                    <SelectItem key={doc.id} value={doc.id}>
                                                        Dr(a). {doc.user?.full_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="show_on_tv" className="text-sm font-semibold">Exibir na TV</Label>
                                        <p className="text-[10px] text-muted-foreground">Mostrar o status deste consultório no painel de TV.</p>
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
                                            className="flex-1"
                                            onClick={resetForm}
                                        >
                                            Cancelar
                                        </Button>
                                    )}
                                    <Button 
                                        type="submit" 
                                        className="flex-1"
                                        disabled={submitting || (limitReached && !isEditing)}
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Salvando...
                                            </>
                                        ) : isEditing ? (
                                            'Atualizar'
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Adicionar
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

            </div>

        </div>
    )
}
