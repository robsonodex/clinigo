'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/use-auth'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Globe,
    CheckCircle2,
    AlertCircle,
    Settings,
    ExternalLink,
    Loader2,
    XCircle,
    Eye,
    EyeOff,
    HardDrive,
    Save
} from 'lucide-react'

interface IntegrationSettings {
    google_drive_configured?: boolean
    google_drive_info?: {
        client_id?: string | null
        folder_id?: string | null
    } | null
}

function useIntegrationSettings() {
    const { data, isLoading, refetch } = useQuery<{ settings: IntegrationSettings }>({
        queryKey: ['integration-settings'],
        queryFn: async () => {
            try {
                const response = await fetch('/api/integrations/settings')
                if (!response.ok) throw new Error('Falha ao obter configurações')
                return response.json()
            } catch {
                return { settings: {} }
            }
        },
    })

    return { settings: data?.settings || {}, isLoading, refetch }
}

export default function IntegracoesPage() {
    const { settings, isLoading, refetch } = useIntegrationSettings()
    const queryClient = useQueryClient()

    const [configModalOpen, setConfigModalOpen] = useState(false)
    const [formData, setFormData] = useState({
        client_id: '',
        client_secret: '',
        folder_id: '',
    })
    const [showSecret, setShowSecret] = useState(false)
    const [saving, setSaving] = useState(false)

    const isDriveConnected = !!settings.google_drive_configured

    const handleOpenModal = () => {
        setFormData({
            client_id: '',
            client_secret: '',
            folder_id: settings.google_drive_info?.folder_id || '',
        })
        setShowSecret(false)
        setConfigModalOpen(true)
    }

    const handleSave = async () => {
        if (!formData.client_id.trim() && !isDriveConnected) {
            toast.error('Informe o Client ID do Google Drive')
            return
        }

        setSaving(true)
        try {
            const response = await fetch('/api/integrations/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    integration_id: 'google_drive',
                    credentials: {
                        client_id: formData.client_id.trim(),
                        client_secret: formData.client_secret.trim(),
                        folder_id: formData.folder_id.trim(),
                        connected_at: new Date().toISOString(),
                    },
                }),
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error || 'Erro ao salvar credenciais')

            toast.success('Google Drive configurado com sucesso.')
            setConfigModalOpen(false)
            refetch()
            queryClient.invalidateQueries({ queryKey: ['integration-settings'] })
        } catch (error: any) {
            toast.error(error.message || 'Erro ao salvar integração')
        } finally {
            setSaving(false)
        }
    }

    const handleDisconnect = async () => {
        setSaving(true)
        try {
            const response = await fetch('/api/integrations/settings?integration_id=google_drive', {
                method: 'DELETE',
            })

            if (!response.ok) {
                const result = await response.json()
                throw new Error(result.error || 'Erro ao desconectar')
            }

            toast.success('Google Drive desconectado com sucesso.')
            setConfigModalOpen(false)
            refetch()
            queryClient.invalidateQueries({ queryKey: ['integration-settings'] })
        } catch (error: any) {
            toast.error(error.message || 'Erro ao desconectar integração')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto px-2 sm:px-4 py-4">
            {/* Header Corporativo Sóbrio */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/70 border border-border flex items-center justify-center text-foreground shrink-0 shadow-xs">
                        <Globe className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Integrações</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            Gerencie conexões com serviços externos autorizados para a sua clínica
                        </p>
                    </div>
                </div>
            </div>

            {/* Grid com apenas a integração do Google Drive */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="rounded-2xl border border-border shadow-xs bg-card hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden">
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shadow-xs">
                                <HardDrive className="w-6 h-6" />
                            </div>
                            <div>
                                {isLoading ? (
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                ) : isDriveConnected ? (
                                    <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-medium px-3 py-1">
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                        Ativo
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-medium px-3 py-1">
                                        <AlertCircle className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                        Pendente
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <CardTitle className="text-lg font-bold text-foreground mt-4">Google Drive</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                            Integração com sua conta do Google Drive para realização de backup e sincronização de prontuários, laudos e documentos clínicos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                            <span className="text-xs text-muted-foreground">
                                {isDriveConnected ? 'Sincronização habilitada' : 'Não conectado'}
                            </span>
                            <Button
                                variant={isDriveConnected ? 'outline' : 'default'}
                                onClick={handleOpenModal}
                                className={`min-h-[44px] px-4 text-sm font-medium ${
                                    isDriveConnected
                                        ? 'border-border text-foreground hover:bg-muted'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                {isDriveConnected ? 'Gerenciar' : 'Configurar'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Modal de Configuração do Google Drive */}
            <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
                <DialogContent className="sm:max-w-lg rounded-2xl border-border">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                                <HardDrive className="w-4 h-4" />
                            </div>
                            Configurar Google Drive
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Informe as credenciais da sua conta ou projeto Google Cloud para habilitar o armazenamento direto em seu drive.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="client_id" className="text-xs font-semibold text-foreground">
                                Client ID (OAuth 2.0) *
                            </Label>
                            <Input
                                id="client_id"
                                type="text"
                                placeholder="Ex: 123456789-abc.apps.googleusercontent.com"
                                value={formData.client_id}
                                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                className="min-h-[44px] text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="client_secret" className="text-xs font-semibold text-foreground">
                                Client Secret
                            </Label>
                            <div className="relative">
                                <Input
                                    id="client_secret"
                                    type={showSecret ? 'text' : 'password'}
                                    placeholder="Ex: GOCSPX-..."
                                    value={formData.client_secret}
                                    onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                                    className="min-h-[44px] text-sm pr-10"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                                    onClick={() => setShowSecret(!showSecret)}
                                    aria-label="Alternar visibilidade do Client Secret"
                                >
                                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="folder_id" className="text-xs font-semibold text-foreground">
                                ID da Pasta no Drive (Opcional)
                            </Label>
                            <Input
                                id="folder_id"
                                type="text"
                                placeholder="Ex: 1A2b3C4d5E6f... (deixe em branco para raiz)"
                                value={formData.folder_id}
                                onChange={(e) => setFormData({ ...formData, folder_id: e.target.value })}
                                className="min-h-[44px] text-sm"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Se especificado, todos os relatórios e backups serão salvos dentro dessa pasta.
                            </p>
                        </div>

                        <div className="pt-1">
                            <a
                                href="https://console.cloud.google.com/apis/credentials"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1.5"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Abrir Console Google Cloud
                            </a>
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2 border-t border-border">
                        {isDriveConnected && (
                            <Button
                                variant="outline"
                                onClick={handleDisconnect}
                                disabled={saving}
                                className="border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 min-h-[44px] px-4"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                                Desconectar
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            onClick={() => setConfigModalOpen(false)}
                            disabled={saving}
                            className="min-h-[44px] px-4"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] px-5"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Salvar Integração
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
