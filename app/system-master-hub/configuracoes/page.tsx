'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    Settings, ArrowLeft, RefreshCw, AlertTriangle, Loader2,
    Plus, Trash2, ToggleLeft, ToggleRight, Flag, Wrench, Shield,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

interface FeatureFlag {
    id: string; flag_key: string; description: string
    is_enabled: boolean; rollout_percentage: number
    allowed_plans: string[]; created_at: string
}

interface PlatformSetting {
    id: string; key: string; value: string; description: string | null
}

export default function ConfiguracoesPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [flags, setFlags] = useState<FeatureFlag[]>([])
    const [settings, setSettings] = useState<PlatformSetting[]>([])
    const [processing, setProcessing] = useState<string | null>(null)

    // New flag dialog
    const [newFlagOpen, setNewFlagOpen] = useState(false)
    const [newFlag, setNewFlag] = useState({ flag_key: '', description: '', is_enabled: false, rollout_percentage: 100 })

    // Delete confirm
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; flagId: string; flagKey: string }>({ open: false, flagId: '', flagKey: '' })

    // Maintenance mode
    const maintenanceSetting = settings.find(s => s.key === 'maintenance_mode')
    const isMaintenanceOn = maintenanceSetting ? JSON.parse(maintenanceSetting.value || 'false') : false

    const loadData = useCallback(async () => {
        setIsLoading(true); setError(null)
        try {
            const res = await fetch('/api/super-admin/feature-flags')
            if (!res.ok) throw new Error('Erro ao carregar dados')
            const result = await res.json()
            setFlags(result.data?.flags || [])
            setSettings(result.data?.settings || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro')
        } finally { setIsLoading(false) }
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const apiCall = async (body: any) => {
        const res = await fetch('/api/super-admin/feature-flags', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || 'Erro') }
        return res.json()
    }

    const toggleFlag = async (flagId: string, enabled: boolean) => {
        setProcessing(flagId)
        try {
            await apiCall({ action: 'toggle_flag', flag_id: flagId, enabled })
            setFlags(prev => prev.map(f => f.id === flagId ? { ...f, is_enabled: enabled } : f))
        } catch (e: any) { alert(`Erro: ${e.message}`) }
        finally { setProcessing(null) }
    }

    const createFlag = async () => {
        if (!newFlag.flag_key.trim()) { alert('Flag key é obrigatória'); return }
        setProcessing('new')
        try {
            await apiCall({ action: 'create_flag', ...newFlag })
            setNewFlagOpen(false)
            setNewFlag({ flag_key: '', description: '', is_enabled: false, rollout_percentage: 100 })
            loadData()
        } catch (e: any) { alert(`Erro: ${e.message}`) }
        finally { setProcessing(null) }
    }

    const deleteFlag = async () => {
        setProcessing('delete')
        try {
            await apiCall({ action: 'delete_flag', flag_id: deleteConfirm.flagId })
            setDeleteConfirm({ open: false, flagId: '', flagKey: '' })
            loadData()
        } catch (e: any) { alert(`Erro: ${e.message}`) }
        finally { setProcessing(null) }
    }

    const toggleMaintenance = async (enabled: boolean) => {
        setProcessing('maintenance')
        try {
            await apiCall({ action: 'update_setting', key: 'maintenance_mode', value: enabled })
            setSettings(prev => prev.map(s =>
                s.key === 'maintenance_mode' ? { ...s, value: JSON.stringify(enabled) } : s
            ))
            alert(enabled ? '⚠️ Modo manutenção ATIVADO' : '✅ Modo manutenção DESATIVADO')
        } catch (e: any) { alert(`Erro: ${e.message}`) }
        finally { setProcessing(null) }
    }

    if (isLoading) return (
        <div className="min-h-screen bg-gray-50 p-6"><div className="max-w-7xl mx-auto space-y-6">
            <Skeleton className="h-12 w-80 bg-gray-200" />
            <Skeleton className="h-96 bg-gray-200" />
        </div></div>
    )

    if (error) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Card className="max-w-md"><CardContent className="pt-6 text-center space-y-4">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" /><p className="text-red-600">{error}</p>
                <Button onClick={loadData} variant="outline"><RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente</Button>
            </CardContent></Card>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Settings className="h-7 w-7 text-gray-700" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Configurações Globais</h1>
                            <p className="text-xs text-gray-500">Feature Flags, Settings e Manutenção</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="h-4 w-4 mr-2" /> Atualizar</Button>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/system-master-hub')}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Manutenção */}
                <Card className={isMaintenanceOn ? 'border-red-300 bg-red-50' : 'bg-white'}>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Wrench className={`h-6 w-6 ${isMaintenanceOn ? 'text-red-500' : 'text-gray-400'}`} />
                                <div>
                                    <CardTitle className="text-lg">Modo Manutenção</CardTitle>
                                    <CardDescription>
                                        {isMaintenanceOn ? '⚠️ O sistema está em manutenção — clínicas não conseguem acessar' : 'Sistema operando normalmente'}
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium">{isMaintenanceOn ? 'ATIVO' : 'Inativo'}</span>
                                <Switch
                                    checked={isMaintenanceOn}
                                    onCheckedChange={toggleMaintenance}
                                    disabled={processing === 'maintenance'}
                                />
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <Tabs defaultValue="flags">
                    <TabsList className="bg-white border"><TabsTrigger value="flags">Feature Flags</TabsTrigger><TabsTrigger value="settings">Platform Settings</TabsTrigger></TabsList>

                    <TabsContent value="flags" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-500">{flags.length} flag{flags.length !== 1 ? 's' : ''} configurada{flags.length !== 1 ? 's' : ''}</p>
                            <Button size="sm" onClick={() => setNewFlagOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" /> Nova Flag
                            </Button>
                        </div>

                        {flags.length === 0 ? (
                            <Card><CardContent className="py-12 text-center">
                                <Flag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Nenhuma feature flag criada</p>
                            </CardContent></Card>
                        ) : (
                            <Card><CardContent className="p-0"><Table>
                                <TableHeader><TableRow>
                                    <TableHead>Flag</TableHead><TableHead>Descrição</TableHead>
                                    <TableHead>Rollout</TableHead><TableHead>Status</TableHead>
                                    <TableHead>Ações</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {flags.map(flag => (
                                        <TableRow key={flag.id} className="hover:bg-gray-50">
                                            <TableCell className="font-mono text-sm font-medium">{flag.flag_key}</TableCell>
                                            <TableCell className="text-sm text-gray-600 max-w-[250px] truncate">{flag.description || '—'}</TableCell>
                                            <TableCell><Badge variant="outline">{flag.rollout_percentage}%</Badge></TableCell>
                                            <TableCell>
                                                <button onClick={() => toggleFlag(flag.id, !flag.is_enabled)} disabled={processing === flag.id} className="flex items-center gap-1">
                                                    {processing === flag.id ? <Loader2 className="h-5 w-5 animate-spin" /> : flag.is_enabled
                                                        ? <ToggleRight className="h-6 w-6 text-green-500" />
                                                        : <ToggleLeft className="h-6 w-6 text-gray-400" />
                                                    }
                                                </button>
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ open: true, flagId: flag.id, flagKey: flag.flag_key })} className="text-red-500 hover:text-red-700">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table></CardContent></Card>
                        )}
                    </TabsContent>

                    <TabsContent value="settings">
                        <Card><CardContent className="p-0"><Table>
                            <TableHeader><TableRow>
                                <TableHead>Chave</TableHead><TableHead>Valor</TableHead><TableHead>Descrição</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {settings.map(s => (
                                    <TableRow key={s.id} className="hover:bg-gray-50">
                                        <TableCell className="font-mono text-sm">{s.key}</TableCell>
                                        <TableCell className="text-sm max-w-[300px] truncate">{s.value}</TableCell>
                                        <TableCell className="text-sm text-gray-500">{s.description || '—'}</TableCell>
                                    </TableRow>
                                ))}
                                {settings.length === 0 && (
                                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-gray-400">Nenhuma configuração encontrada</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table></CardContent></Card>
                    </TabsContent>
                </Tabs>
            </main>

            {/* New Flag Dialog */}
            <Dialog open={newFlagOpen} onOpenChange={setNewFlagOpen}>
                <DialogContent><DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Flag className="h-5 w-5 text-blue-600" /> Nova Feature Flag</DialogTitle>
                    <DialogDescription>Crie uma flag para controlar funcionalidades da plataforma</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Flag Key *</Label>
                        <Input value={newFlag.flag_key} onChange={e => setNewFlag(p => ({ ...p, flag_key: e.target.value }))} placeholder="ex: enable_ai_anamnesis" className="font-mono" />
                    </div>
                    <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea value={newFlag.description} onChange={e => setNewFlag(p => ({ ...p, description: e.target.value }))} placeholder="O que esta flag controla?" rows={2} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>Ativada por padrão</Label>
                        <Switch checked={newFlag.is_enabled} onCheckedChange={v => setNewFlag(p => ({ ...p, is_enabled: v }))} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setNewFlagOpen(false)}>Cancelar</Button>
                    <Button onClick={createFlag} disabled={processing === 'new' || !newFlag.flag_key.trim()}>
                        {processing === 'new' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Criar Flag
                    </Button>
                </DialogFooter></DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={deleteConfirm.open} onOpenChange={o => { if (!o) setDeleteConfirm(p => ({ ...p, open: false })) }}>
                <DialogContent><DialogHeader>
                    <DialogTitle>⚠️ Excluir Feature Flag</DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja excluir <strong className="font-mono">{deleteConfirm.flagKey}</strong>? Esta ação não pode ser desfeita e removerá todos os overrides associados.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteConfirm(p => ({ ...p, open: false }))}>Cancelar</Button>
                    <Button onClick={deleteFlag} disabled={processing === 'delete'} className="bg-red-600 hover:bg-red-700 text-white">
                        {processing === 'delete' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />} Excluir
                    </Button>
                </DialogFooter></DialogContent>
            </Dialog>
        </div>
    )
}
