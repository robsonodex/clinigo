// app/dashboard/(clinic)/configuracoes/dispositivos/page.tsx
// Painel Administrativo de Dispositivos e Tablets Pareados da Clínica

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
import {
    Tablet,
    Plus,
    RefreshCw,
    Copy,
    Check,
    Trash2,
    RotateCcw,
    Edit2,
    ShieldCheck,
    AlertCircle,
    Loader2,
    Clock,
    MonitorSmartphone,
    Building2,
    KeyRound,
    Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Device {
    id: string
    room_label: string
    status: 'active' | 'revoked'
    last_seen_at: string | null
    created_at: string
    token_masked: string
    token_last4: string
}

export default function DevicesSettingsPage() {
    const [devices, setDevices] = useState<Device[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Modal: Criar / Parear Novo Dispositivo
    const [openCreateModal, setOpenCreateModal] = useState(false)
    const [newRoomLabel, setNewRoomLabel] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    // Modal: Exibição do Código de Pareamento Recém-Criado / Regenerado
    const [openTokenModal, setOpenTokenModal] = useState(false)
    const [generatedTokenData, setGeneratedTokenData] = useState<{
        room_label: string
        token: string
    } | null>(null)
    const [hasCopied, setHasCopied] = useState(false)

    // Modal: Editar Sala
    const [editingDevice, setEditingDevice] = useState<Device | null>(null)
    const [editRoomLabel, setEditRoomLabel] = useState('')
    const [isEditing, setIsEditing] = useState(false)

    // Confirmações
    const [deviceToRevoke, setDeviceToRevoke] = useState<Device | null>(null)
    const [deviceToRegenerate, setDeviceToRegenerate] = useState<Device | null>(null)
    const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null)
    const [isProcessingAction, setIsProcessingAction] = useState(false)

    // Gestão de PIN da Recepção
    const [receptionPins, setReceptionPins] = useState<{ id: string; label: string; status: string; created_at: string }[]>([])
    const [openPinModal, setOpenPinModal] = useState(false)
    const [newPinValue, setNewPinValue] = useState('')
    const [newPinLabel, setNewPinLabel] = useState('Recepção Principal')
    const [isSavingPin, setIsSavingPin] = useState(false)

    const fetchReceptionPins = useCallback(async () => {
        try {
            const res = await fetch('/api/reception/pins')
            if (res.ok) {
                const data = await res.json()
                setReceptionPins(data.pins || [])
            }
        } catch (err) {
            console.error('[Pins] Erro ao carregar PINs:', err)
        }
    }, [])

    const fetchDevices = useCallback(async (manual = false) => {
        try {
            setIsRefreshing(true)
            const res = await fetch('/api/clinic-devices')
            if (res.ok) {
                const data = await res.json()
                setDevices(data.devices || [])
                if (manual) toast.success('Lista de dispositivos atualizada.')
            } else {
                toast.error('Não foi possível carregar os dispositivos da clínica.')
            }
        } catch (err) {
            console.error('[Devices Page] Erro:', err)
            toast.error('Erro de conexão ao carregar dispositivos.')
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }, [])

    useEffect(() => {
        fetchDevices()
        fetchReceptionPins()
    }, [fetchDevices, fetchReceptionPins])

    const handleSaveNewPin = async (e: React.FormEvent) => {
        e.preventDefault()
        const cleanPin = newPinValue.trim()
        if (!cleanPin || cleanPin.length < 4 || !/^\d+$/.test(cleanPin)) {
            toast.error('O PIN deve conter entre 4 e 8 dígitos numéricos.')
            return
        }

        try {
            setIsSavingPin(true)
            const res = await fetch('/api/reception/pins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pin: cleanPin,
                    label: newPinLabel.trim() || 'Recepção',
                }),
            })

            const data = await res.json()
            if (!res.ok || !data.success) {
                toast.error(data.error || 'Erro ao cadastrar PIN.')
                return
            }

            toast.success('Novo PIN da recepção configurado com sucesso.')
            setOpenPinModal(false)
            setNewPinValue('')
            fetchReceptionPins()
        } catch {
            toast.error('Erro de conexão ao salvar PIN.')
        } finally {
            setIsSavingPin(false)
        }
    }

    const handleCreateDevice = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = newRoomLabel.trim()
        if (!trimmed || trimmed.length < 2) {
            toast.error('Informe a identificação da sala (ex: Sala 1, Terapia Ocupacional).')
            return
        }

        try {
            setIsCreating(true)
            const res = await fetch('/api/clinic-devices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room_label: trimmed }),
            })

            const data = await res.json()
            if (!res.ok || !data.success) {
                toast.error(data.error || 'Erro ao cadastrar dispositivo.')
                return
            }

            setOpenCreateModal(false)
            setNewRoomLabel('')
            setGeneratedTokenData({
                room_label: data.device.room_label,
                token: data.device.device_token,
            })
            setOpenTokenModal(true)
            fetchDevices()
            toast.success('Dispositivo cadastrado. Copie o código de pareamento.')
        } catch {
            toast.error('Erro ao conectar ao servidor.')
        } finally {
            setIsCreating(false)
        }
    }

    const handleCopyToken = async () => {
        if (!generatedTokenData?.token) return
        try {
            await navigator.clipboard.writeText(generatedTokenData.token)
            setHasCopied(true)
            toast.success('Código de pareamento copiado para a área de transferência.')
            setTimeout(() => setHasCopied(false), 2500)
        } catch {
            toast.error('Não foi possível copiar automaticamente. Selecione o código acima.')
        }
    }

    const handleSaveEdit = async () => {
        if (!editingDevice) return
        const trimmed = editRoomLabel.trim()
        if (!trimmed || trimmed.length < 2) {
            toast.error('Identificação da sala inválida.')
            return
        }

        try {
            setIsEditing(true)
            const res = await fetch(`/api/clinic-devices/${editingDevice.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room_label: trimmed }),
            })

            const data = await res.json()
            if (res.ok && data.success) {
                toast.success('Sala atualizada com sucesso.')
                setEditingDevice(null)
                fetchDevices()
            } else {
                toast.error(data.error || 'Erro ao renomear sala.')
            }
        } catch {
            toast.error('Erro ao salvar alteração.')
        } finally {
            setIsEditing(false)
        }
    }

    const handleToggleStatus = async (device: Device) => {
        const nextStatus = device.status === 'active' ? 'revoked' : 'active'
        try {
            setIsProcessingAction(true)
            const res = await fetch(`/api/clinic-devices/${device.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus }),
            })

            if (res.ok) {
                toast.success(nextStatus === 'active' ? 'Dispositivo reativado.' : 'Dispositivo revogado.')
                setDeviceToRevoke(null)
                fetchDevices()
            } else {
                toast.error('Erro ao alterar status do dispositivo.')
            }
        } catch {
            toast.error('Falha na comunicação com o servidor.')
        } finally {
            setIsProcessingAction(false)
        }
    }

    const handleRegenerateToken = async (device: Device) => {
        try {
            setIsProcessingAction(true)
            const res = await fetch(`/api/clinic-devices/${device.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'regenerate' }),
            })

            const data = await res.json()
            if (res.ok && data.success && data.device.device_token) {
                setDeviceToRegenerate(null)
                setGeneratedTokenData({
                    room_label: data.device.room_label,
                    token: data.device.device_token,
                })
                setOpenTokenModal(true)
                fetchDevices()
                toast.success('Novo código gerado com sucesso.')
            } else {
                toast.error(data.error || 'Erro ao regenerar código.')
            }
        } catch {
            toast.error('Falha ao regenerar código.')
        } finally {
            setIsProcessingAction(false)
        }
    }

    const handleDeleteDevice = async (device: Device) => {
        try {
            setIsProcessingAction(true)
            const res = await fetch(`/api/clinic-devices/${device.id}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                toast.success('Dispositivo desvinculado com sucesso.')
                setDeviceToDelete(null)
                fetchDevices()
            } else {
                toast.error('Erro ao excluir dispositivo.')
            }
        } catch {
            toast.error('Falha ao excluir dispositivo.')
        } finally {
            setIsProcessingAction(false)
        }
    }

    const filteredDevices = devices.filter((device) => {
        if (!searchTerm.trim()) return true
        const term = searchTerm.toLowerCase()
        return (
            device.room_label.toLowerCase().includes(term) ||
            device.token_last4.toLowerCase().includes(term)
        )
    })

    const activePin = receptionPins.find((p) => p.status === 'active')

    return (
        <div className="space-y-6 max-w-6xl mx-auto py-6 sm:py-8 px-4">
            {/* Cabeçalho editorial padrão CliniGo */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <Tablet className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                            Dispositivos Pareados
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            Terminais em modo quiosque instalados nas salas para check-in e validação biométrica sem login
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fetchDevices(true)}
                        disabled={isRefreshing}
                        className="min-h-[44px] px-3 gap-1.5 flex-1 sm:flex-none"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>Atualizar</span>
                    </Button>

                    <Button
                        type="button"
                        onClick={() => {
                            setNewRoomLabel('')
                            setOpenCreateModal(true)
                        }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] px-4 font-medium gap-1.5 flex-1 sm:flex-none"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Novo Dispositivo</span>
                    </Button>
                </div>
            </div>

            {/* Listagem de Dispositivos */}
            <Card className="border-border shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <div>
                                <CardTitle className="text-base font-semibold text-foreground">
                                    Dispositivos Cadastrados
                                </CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">
                                    Gerencie as salas habilitadas para check-in e biometria facial
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="text-xs font-mono tabular-nums">
                                {devices.length} {devices.length === 1 ? 'dispositivo' : 'dispositivos'}
                            </Badge>
                        </div>

                        {devices.length > 0 && (
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar por sala..."
                                    className="pl-9 min-h-[44px]"
                                />
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-0 sm:p-4 sm:pt-0">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-2">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <p className="text-xs text-muted-foreground">Carregando dispositivos...</p>
                        </div>
                    ) : devices.length === 0 ? (
                        <div className="py-12 text-center space-y-3 max-w-sm mx-auto p-4">
                            <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                                <MonitorSmartphone className="w-6 h-6" />
                            </div>
                            <h3 className="text-sm font-semibold text-foreground">
                                Nenhum dispositivo pareado ainda
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Clique em <strong>Novo Dispositivo</strong> para registrar o primeiro tablet ou totem de sala.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="text-xs">
                                        <TableHead>Sala / Identificação</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Código Pareado</TableHead>
                                        <TableHead>Última Conexão</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredDevices.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                                                Nenhum dispositivo encontrado para &ldquo;{searchTerm}&rdquo;.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredDevices.map((device) => {
                                            const isActive = device.status === 'active'
                                            return (
                                                <TableRow key={device.id}>
                                                    <TableCell className="font-medium text-sm text-foreground">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                                                                <Building2 className="w-4 h-4" />
                                                            </div>
                                                            <span>{device.room_label}</span>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        {isActive ? (
                                                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/30 text-xs font-medium gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                                Ativo
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/30 text-xs font-medium gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                                                                Revogado
                                                            </Badge>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                                        {device.token_masked}
                                                    </TableCell>

                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {device.last_seen_at ? (
                                                            <span title={format(new Date(device.last_seen_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}>
                                                                {formatDistanceToNow(new Date(device.last_seen_at), { addSuffix: true, locale: ptBR })}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground/70">Nunca conectado</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setEditingDevice(device)
                                                                    setEditRoomLabel(device.room_label)
                                                                }}
                                                                title="Renomear identificação da sala"
                                                                aria-label={`Renomear ${device.room_label}`}
                                                                className="min-h-[44px] min-w-[44px] p-2 text-muted-foreground hover:text-foreground"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </Button>

                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setDeviceToRegenerate(device)}
                                                                title="Regenerar código de pareamento"
                                                                aria-label={`Regenerar código de ${device.room_label}`}
                                                                className="min-h-[44px] min-w-[44px] p-2 text-muted-foreground hover:text-amber-700"
                                                            >
                                                                <RotateCcw className="w-4 h-4" />
                                                            </Button>

                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setDeviceToRevoke(device)}
                                                                title={isActive ? 'Revogar acesso deste dispositivo' : 'Reativar dispositivo'}
                                                                aria-label={isActive ? `Revogar ${device.room_label}` : `Reativar ${device.room_label}`}
                                                                className={`min-h-[44px] min-w-[44px] p-2 ${
                                                                    isActive
                                                                        ? 'text-muted-foreground hover:text-destructive'
                                                                        : 'text-primary hover:text-primary/80'
                                                                }`}
                                                            >
                                                                {isActive ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                                            </Button>

                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setDeviceToDelete(device)}
                                                                title="Excluir dispositivo"
                                                                aria-label={`Excluir ${device.room_label}`}
                                                                className="min-h-[44px] min-w-[44px] p-2 text-muted-foreground hover:text-destructive"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Card: Gestão de PIN do Modo Recepção */}
            <Card className="border-border shadow-sm">
                <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                                <KeyRound className="w-4 h-4" />
                            </div>
                            <CardTitle className="text-base font-semibold text-foreground">
                                PIN de Acesso — Modo Recepção
                            </CardTitle>
                        </div>
                        <CardDescription className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                            Código numérico de 4 a 8 dígitos para desbloquear temporariamente (15 minutos) a busca e gestão da fila no terminal sem exigir login de usuário.
                        </CardDescription>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setNewPinValue('')
                            setOpenPinModal(true)
                        }}
                        className="min-h-[44px] border-primary/40 text-primary hover:bg-primary/5 font-medium gap-2 shrink-0 self-start sm:self-auto"
                    >
                        <KeyRound className="w-4 h-4" />
                        <span>{activePin ? 'Alterar PIN da Recepção' : 'Configurar PIN da Recepção'}</span>
                    </Button>
                </CardHeader>

                <CardContent className="pt-3 border-t border-border">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-muted-foreground">Status do PIN:</span>
                            {activePin ? (
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/30 gap-1.5 py-1 px-2.5">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>PIN ativo configurado ({activePin.label})</span>
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-200 gap-1.5 py-1 px-2.5">
                                    <span>PIN Padrão Inicial: <strong>1234</strong> — recomendamos personalizar</span>
                                </Badge>
                            )}
                        </div>

                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>Desbloqueio efêmero com expiração automática em 15 minutos</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Rodapé Informativo */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 px-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Conexão criptografada por token exclusivo com conformidade LGPD.</span>
                </div>
                <div className="font-mono text-xs bg-muted px-2.5 py-1 rounded-md border border-border">
                    Rota do Terminal: <strong className="text-foreground">/terminal</strong>
                </div>
            </div>

            {/* Modal: Definir / Alterar PIN da Recepção */}
            <Dialog open={openPinModal} onOpenChange={setOpenPinModal}>
                <DialogContent className="max-w-md w-[95vw] sm:w-full p-6 border-border">
                    <form onSubmit={handleSaveNewPin}>
                        <DialogHeader className="pb-3">
                            <div className="flex items-center gap-2 text-foreground">
                                <KeyRound className="w-5 h-5 text-primary" />
                                <DialogTitle className="text-base sm:text-lg font-bold">
                                    Configurar PIN do Modo Recepção
                                </DialogTitle>
                            </div>
                            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                                Digite um código de 4 a 8 dígitos numéricos. A equipe da recepção utilizará este código para desbloquear o terminal.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="reception_pin_label" className="text-xs font-semibold">
                                    Identificação / Rótulo
                                </Label>
                                <Input
                                    id="reception_pin_label"
                                    type="text"
                                    placeholder="Ex: Recepção Principal, Totem Sala de Espera"
                                    value={newPinLabel}
                                    onChange={(e) => setNewPinLabel(e.target.value)}
                                    className="min-h-[44px]"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="reception_pin_code" className="text-xs font-semibold">
                                    Novo Código PIN (4 a 8 dígitos numéricos)
                                </Label>
                                <Input
                                    id="reception_pin_code"
                                    type="password"
                                    maxLength={8}
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="Ex: 5820"
                                    value={newPinValue}
                                    onChange={(e) => setNewPinValue(e.target.value.replace(/\D/g, ''))}
                                    className="min-h-[44px] font-mono text-center tracking-widest text-lg"
                                    autoFocus
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Apenas números. O PIN anterior será inativado e substituído imediatamente.
                                </p>
                            </div>
                        </div>

                        <DialogFooter className="pt-3 border-t border-border mt-3 flex-col sm:flex-row gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpenPinModal(false)}
                                className="min-h-[44px] w-full sm:w-auto"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingPin || newPinValue.length < 4}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] font-medium w-full sm:w-auto"
                            >
                                {isSavingPin ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                                        Salvando PIN...
                                    </>
                                ) : (
                                    'Salvar Novo PIN'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Parear Novo Dispositivo */}
            <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
                <DialogContent className="max-w-md w-[95vw] sm:w-full p-6 border-border">
                    <form onSubmit={handleCreateDevice}>
                        <DialogHeader className="pb-3">
                            <div className="flex items-center gap-2 text-primary">
                                <Tablet className="w-5 h-5" />
                                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                                    Novo Dispositivo de Sala
                                </DialogTitle>
                            </div>
                            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                                Identifique a sala onde o tablet ou terminal ficará instalado.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="room_label" className="text-xs font-semibold">
                                    Nome da Sala / Consultório
                                </Label>
                                <Input
                                    id="room_label"
                                    type="text"
                                    placeholder="Ex: Sala 1, Terapia Ocupacional, Fonoaudiologia"
                                    value={newRoomLabel}
                                    onChange={(e) => setNewRoomLabel(e.target.value)}
                                    className="min-h-[44px]"
                                    autoFocus
                                />
                                <p className="text-xs text-muted-foreground">
                                    Este nome aparecerá no topo do terminal para orientar a equipe.
                                </p>
                            </div>
                        </div>

                        <DialogFooter className="pt-3 border-t border-border mt-3 flex-col sm:flex-row gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpenCreateModal(false)}
                                className="min-h-[44px] w-full sm:w-auto"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isCreating}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] font-medium w-full sm:w-auto"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                                        Gerando Código...
                                    </>
                                ) : (
                                    'Gerar Código de Pareamento'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Exibição do Código de Pareamento */}
            <Dialog open={openTokenModal} onOpenChange={setOpenTokenModal}>
                <DialogContent className="max-w-md w-[95vw] sm:w-full p-6 border-border">
                    <DialogHeader className="pb-3">
                        <div className="flex items-center gap-2 text-primary">
                            <ShieldCheck className="w-5 h-5" />
                            <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                                Código de Pareamento do Dispositivo
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                            Sala: <strong className="text-foreground">{generatedTokenData?.room_label}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <span>
                                Este código é exibido integralmente <strong>uma única vez</strong> por segurança. Copie e insira no dispositivo.
                            </span>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Código do Terminal</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    readOnly
                                    value={generatedTokenData?.token || ''}
                                    className="min-h-[44px] font-mono text-xs bg-muted/50 select-all"
                                />
                                <Button
                                    type="button"
                                    onClick={handleCopyToken}
                                    className="min-h-[44px] px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shrink-0"
                                >
                                    {hasCopied ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Copiado
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            Copiar
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="p-3.5 bg-muted/40 rounded-lg border border-border text-xs space-y-1.5 text-muted-foreground">
                            <strong className="text-foreground block font-semibold">Como parear no dispositivo:</strong>
                            <ol className="list-decimal list-inside space-y-1 pl-1">
                                <li>No dispositivo da sala, abra o navegador e acesse <code>/terminal</code>.</li>
                                <li>Cole ou digite o código acima no campo exibido.</li>
                                <li>Toque em <strong>Conectar Dispositivo à Sala</strong>.</li>
                            </ol>
                        </div>
                    </div>

                    <DialogFooter className="pt-3 border-t border-border">
                        <Button
                            type="button"
                            onClick={() => setOpenTokenModal(false)}
                            className="min-h-[44px] bg-primary hover:bg-primary/90 text-primary-foreground font-medium w-full"
                        >
                            Concluir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Editar Nome da Sala */}
            <Dialog open={Boolean(editingDevice)} onOpenChange={(o) => !o && !isEditing && setEditingDevice(null)}>
                <DialogContent className="max-w-md w-[95vw] sm:w-full p-6 border-border">
                    <DialogHeader className="pb-3">
                        <DialogTitle className="text-base sm:text-lg font-bold">
                            Renomear Identificação da Sala
                        </DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                            Atualize o nome visível da sala para este terminal.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit_room_label" className="text-xs font-semibold">
                                Nome da Sala
                            </Label>
                            <Input
                                id="edit_room_label"
                                type="text"
                                value={editRoomLabel}
                                onChange={(e) => setEditRoomLabel(e.target.value)}
                                className="min-h-[44px]"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-3 border-t border-border mt-2 flex-col sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditingDevice(null)}
                            className="min-h-[44px] w-full sm:w-auto"
                            disabled={isEditing}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={isEditing}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] font-medium w-full sm:w-auto"
                        >
                            {isEditing && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                            Salvar Alteração
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Alerta: Confirmar Revogação */}
            <AlertDialog open={Boolean(deviceToRevoke)} onOpenChange={(o) => !o && !isProcessingAction && setDeviceToRevoke(null)}>
                <AlertDialogContent className="max-w-md w-[95vw] p-6 border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base sm:text-lg font-bold">
                            {deviceToRevoke?.status === 'active' ? 'Revogar Acesso do Dispositivo?' : 'Reativar Dispositivo?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground">
                            {deviceToRevoke?.status === 'active'
                                ? `O dispositivo instalado na sala "${deviceToRevoke?.room_label}" perderá o acesso à fila até ser reativado.`
                                : `O dispositivo da sala "${deviceToRevoke?.room_label}" poderá retomar os check-ins normalmente.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel disabled={isProcessingAction} className="min-h-[44px]">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isProcessingAction}
                            onClick={(e) => {
                                e.preventDefault()
                                if (deviceToRevoke) handleToggleStatus(deviceToRevoke)
                            }}
                            className={`min-h-[44px] font-medium ${
                                deviceToRevoke?.status === 'active'
                                    ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                                    : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                            }`}
                        >
                            {deviceToRevoke?.status === 'active' ? 'Confirmar Revogação' : 'Confirmar Reativação'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Alerta: Confirmar Regeneração de Código */}
            <AlertDialog open={Boolean(deviceToRegenerate)} onOpenChange={(o) => !o && !isProcessingAction && setDeviceToRegenerate(null)}>
                <AlertDialogContent className="max-w-md w-[95vw] p-6 border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base sm:text-lg font-bold">
                            Regenerar Código de Pareamento?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground">
                            Ao regenerar, o código anterior do dispositivo da sala &ldquo;{deviceToRegenerate?.room_label}&rdquo; deixará de funcionar imediatamente. Você precisará inserir o novo código no dispositivo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel disabled={isProcessingAction} className="min-h-[44px]">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isProcessingAction}
                            onClick={(e) => {
                                e.preventDefault()
                                if (deviceToRegenerate) handleRegenerateToken(deviceToRegenerate)
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white min-h-[44px] font-medium"
                        >
                            Regenerar e Exibir Código
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Alerta: Confirmar Exclusão */}
            <AlertDialog open={Boolean(deviceToDelete)} onOpenChange={(o) => !o && !isProcessingAction && setDeviceToDelete(null)}>
                <AlertDialogContent className="max-w-md w-[95vw] p-6 border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base sm:text-lg font-bold text-destructive">
                            Excluir Registro do Dispositivo?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground">
                            Tem certeza que deseja excluir o dispositivo da sala &ldquo;{deviceToDelete?.room_label}&rdquo;? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel disabled={isProcessingAction} className="min-h-[44px]">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isProcessingAction}
                            onClick={(e) => {
                                e.preventDefault()
                                if (deviceToDelete) handleDeleteDevice(deviceToDelete)
                            }}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground min-h-[44px] font-medium"
                        >
                            Excluir Permanentemente
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
