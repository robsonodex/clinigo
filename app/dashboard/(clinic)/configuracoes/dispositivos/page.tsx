// app/dashboard/(clinic)/configuracoes/dispositivos/page.tsx
// Painel Administrativo de Dispositivos e Tablets Pareados da Clinica

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

    const fetchDevices = useCallback(async () => {
        try {
            setIsRefreshing(true)
            const res = await fetch('/api/clinic-devices')
            if (res.ok) {
                const data = await res.json()
                setDevices(data.devices || [])
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
    }, [fetchDevices])

    // 1. Criar novo dispositivo
    const handleCreateDevice = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = newRoomLabel.trim()
        if (!trimmed || trimmed.length < 2) {
            toast.error('Informe a identificação da sala (ex: Sala 1, Consultório Infantil).')
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
        } catch (err) {
            toast.error('Erro ao conectar ao servidor.')
        } finally {
            setIsCreating(false)
        }
    }

    // 2. Copiar código para a área de transferência
    const handleCopyToken = () => {
        if (!generatedTokenData?.token) return
        navigator.clipboard.writeText(generatedTokenData.token)
        setHasCopied(true)
        toast.success('Código de pareamento copiado para a área de transferência.')
        setTimeout(() => setHasCopied(false), 2500)
    }

    // 3. Salvar edição de sala
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

    // 4. Revogar ou reativar dispositivo
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

    // 5. Regenerar código do dispositivo
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

    // 6. Excluir dispositivo
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

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 select-none font-sans">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <Tablet className="w-5 h-5" />
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                            Dispositivos Pareados
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Terminais em modo quiosque instalados nos consultórios para validação biométrica sem login
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchDevices}
                        disabled={isRefreshing}
                        className="min-h-[44px] px-3 text-xs gap-1.5 rounded-xl"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>Atualizar</span>
                    </Button>

                    <Button
                        onClick={() => {
                            setNewRoomLabel('')
                            setOpenCreateModal(true)
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] px-4 text-xs font-semibold rounded-xl gap-1.5 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Novo Dispositivo</span>
                    </Button>
                </div>
            </div>

            {/* Listagem de Dispositivos */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-bold text-foreground">
                                Dispositivos Cadastrados
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                Gerencie as salas habilitadas para check-in por dispositivo
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs font-mono">
                            {devices.length} {devices.length === 1 ? 'dispositivo' : 'dispositivos'}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="p-0 sm:p-4">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-2">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                            <p className="text-xs text-muted-foreground">Carregando dispositivos...</p>
                        </div>
                    ) : devices.length === 0 ? (
                        <div className="py-12 text-center space-y-3 max-w-sm mx-auto p-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                                <MonitorSmartphone className="w-6 h-6" />
                            </div>
                            <h3 className="text-sm font-bold text-foreground">
                                Nenhum dispositivo pareado ainda
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Clique no botão acima para registrar o primeiro dispositivo de consultório.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-100 dark:border-slate-800 text-xs">
                                        <TableHead>Sala / Identificação</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Código Pareado</TableHead>
                                        <TableHead>Última Conexão</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {devices.map((device) => {
                                        const isActive = device.status === 'active'
                                        return (
                                            <TableRow key={device.id} className="border-slate-100 dark:border-slate-800">
                                                <TableCell className="font-semibold text-sm text-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                                                            <Building2 className="w-4 h-4" />
                                                        </div>
                                                        <span>{device.room_label}</span>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    {isActive ? (
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-semibold gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                            Ativo
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-semibold gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
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
                                                        <span className="text-slate-400">Nunca conectado</span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {/* Editar Sala */}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingDevice(device)
                                                                setEditRoomLabel(device.room_label)
                                                            }}
                                                            title="Renomear identificação da sala"
                                                            className="min-h-[44px] min-w-[44px] p-2 text-slate-600 hover:text-foreground rounded-lg"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>

                                                        {/* Regenerar Código */}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setDeviceToRegenerate(device)}
                                                            title="Regenerar código de pareamento"
                                                            className="min-h-[44px] min-w-[44px] p-2 text-slate-600 hover:text-amber-600 rounded-lg"
                                                        >
                                                            <RotateCcw className="w-4 h-4" />
                                                        </Button>

                                                        {/* Revogar / Reativar */}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setDeviceToRevoke(device)}
                                                            title={isActive ? 'Revogar acesso deste dispositivo' : 'Reativar dispositivo'}
                                                            className={`min-h-[44px] min-w-[44px] p-2 rounded-lg ${
                                                                isActive ? 'text-slate-600 hover:text-rose-600' : 'text-emerald-600 hover:text-emerald-700'
                                                            }`}
                                                        >
                                                            {isActive ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                                        </Button>

                                                        {/* Excluir */}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setDeviceToDelete(device)}
                                                            title="Excluir dispositivo"
                                                            className="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-rose-600 rounded-lg"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Rodapé Informativo Discreto */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 px-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Conexão por token com conformidade LGPD.</span>
                </div>
                <div className="font-mono text-[11px] bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                    Rota do Terminal: <strong className="text-foreground">/terminal</strong>
                </div>
            </div>

            {/* Modal: Parear Novo Dispositivo */}
            <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
                <DialogContent className="max-w-md w-[95vw] sm:w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
                    <form onSubmit={handleCreateDevice}>
                        <DialogHeader className="pb-3">
                            <div className="flex items-center gap-2 text-emerald-600">
                                <Tablet className="w-5 h-5" />
                                <DialogTitle className="text-base sm:text-lg font-bold">
                                    Novo Dispositivo de Consultório
                                </DialogTitle>
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Identifique a sala onde o dispositivo ficará instalado
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
                                    placeholder="Ex: Consultório 1, Terapia Ocupacional"
                                    value={newRoomLabel}
                                    onChange={(e) => setNewRoomLabel(e.target.value)}
                                    className="h-11 rounded-xl"
                                    autoFocus
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Este nome aparecerá no topo do dispositivo para orientar a equipe.
                                </p>
                            </div>
                        </div>

                        <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 flex-col sm:flex-row gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpenCreateModal(false)}
                                className="min-h-[44px] rounded-xl text-xs w-full sm:w-auto"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isCreating}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] rounded-xl text-xs font-semibold w-full sm:w-auto"
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
                <DialogContent className="max-w-md w-[95vw] sm:w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
                    <DialogHeader className="pb-3">
                        <div className="flex items-center gap-2 text-emerald-600">
                            <ShieldCheck className="w-5 h-5" />
                            <DialogTitle className="text-base sm:text-lg font-bold">
                                Código de Pareamento do Dispositivo
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Sala: <strong>{generatedTokenData?.room_label}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
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
                                    className="h-11 font-mono text-xs bg-slate-50 dark:bg-slate-900 rounded-xl select-all"
                                />
                                <Button
                                    type="button"
                                    onClick={handleCopyToken}
                                    className="min-h-[44px] px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 shrink-0 text-xs"
                                >
                                    {hasCopied ? (
                                        <>
                                            <Check className="w-3.5 h-3.5" />
                                            Copiado
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5" />
                                            Copiar
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-1 text-muted-foreground">
                            <strong className="text-foreground block font-semibold">Como parear no dispositivo:</strong>
                            <ol className="list-decimal list-inside space-y-1 pl-1">
                                <li>No dispositivo da sala, abra o navegador e acesse a rota <code>/terminal</code>.</li>
                                <li>Cole ou digite o código acima no campo exibido.</li>
                                <li>Toque em <strong>Conectar Dispositivo à Sala</strong>.</li>
                            </ol>
                        </div>
                    </div>

                    <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            type="button"
                            onClick={() => setOpenTokenModal(false)}
                            className="min-h-[44px] rounded-xl text-xs font-semibold w-full"
                        >
                            Concluir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Editar Nome da Sala */}
            <Dialog open={Boolean(editingDevice)} onOpenChange={(o) => !o && setEditingDevice(null)}>
                <DialogContent className="max-w-md w-[95vw] sm:w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
                    <DialogHeader className="pb-3">
                        <DialogTitle className="text-base sm:text-lg font-bold">
                            Renomear Identificação da Sala
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Atualize o nome visível da sala para este terminal
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
                                className="h-11 rounded-xl"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-2 flex-col sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditingDevice(null)}
                            className="min-h-[44px] rounded-xl text-xs w-full sm:w-auto"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={isEditing}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] rounded-xl text-xs font-semibold w-full sm:w-auto"
                        >
                            {isEditing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                            Salvar Alteração
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Alerta: Confirmar Revogação */}
            <AlertDialog open={Boolean(deviceToRevoke)} onOpenChange={(o) => !o && setDeviceToRevoke(null)}>
                <AlertDialogContent className="max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
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
                        <AlertDialogCancel disabled={isProcessingAction} className="min-h-[44px] rounded-xl text-xs">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isProcessingAction}
                            onClick={() => deviceToRevoke && handleToggleStatus(deviceToRevoke)}
                            className={`min-h-[44px] rounded-xl text-xs font-semibold ${
                                deviceToRevoke?.status === 'active'
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                        >
                            {deviceToRevoke?.status === 'active' ? 'Confirmar Revogação' : 'Confirmar Reativação'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Alerta: Confirmar Regeneração de Código */}
            <AlertDialog open={Boolean(deviceToRegenerate)} onOpenChange={(o) => !o && setDeviceToRegenerate(null)}>
                <AlertDialogContent className="max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base sm:text-lg font-bold">
                            Regenerar Código de Pareamento?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground">
                            Ao regenerar, o código anterior do dispositivo da sala &ldquo;{deviceToRegenerate?.room_label}&rdquo; deixará de funcionar imediatamente. Você precisará digitar o novo código no dispositivo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel disabled={isProcessingAction} className="min-h-[44px] rounded-xl text-xs">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isProcessingAction}
                            onClick={() => deviceToRegenerate && handleRegenerateToken(deviceToRegenerate)}
                            className="bg-amber-600 hover:bg-amber-700 text-white min-h-[44px] rounded-xl text-xs font-semibold"
                        >
                            Regenerar e Exibir Código
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Alerta: Confirmar Exclusão */}
            <AlertDialog open={Boolean(deviceToDelete)} onOpenChange={(o) => !o && setDeviceToDelete(null)}>
                <AlertDialogContent className="max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base sm:text-lg font-bold text-rose-600">
                            Excluir Registro do Dispositivo?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground">
                            Tem certeza que deseja excluir o dispositivo da sala &ldquo;{deviceToDelete?.room_label}&rdquo;? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel disabled={isProcessingAction} className="min-h-[44px] rounded-xl text-xs">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isProcessingAction}
                            onClick={() => deviceToDelete && handleDeleteDevice(deviceToDelete)}
                            className="bg-rose-600 hover:bg-rose-700 text-white min-h-[44px] rounded-xl text-xs font-semibold"
                        >
                            Excluir Permanentemente
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
