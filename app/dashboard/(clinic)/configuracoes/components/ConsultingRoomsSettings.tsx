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
    EyeOff
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
