'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare, CheckCircle2, Loader2, Wifi, WifiOff, RefreshCw,
  Phone, AlertTriangle, Unplug, Smartphone, Plus, ShieldCheck,
} from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

import { useAuth } from '@/lib/hooks/use-auth'

interface SessionData {
  sector: string
  connected: boolean
  status: 'connecting' | 'connected' | 'disconnected'
  phone_number: string | null
  connected_at: string | null
  qr_code: string | null
}

const SECTOR_LABELS: Record<string, string> = {
  default: 'Principal',
  recepcao: 'Recepção',
  financeiro: 'Financeiro',
  comercial: 'Comercial',
  clinico: 'Clínico',
  suporte: 'Suporte',
}

export default function WhatsAppPage() {
  const { user, profile } = useAuth()
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [connectingSector, setConnectingSector] = useState<string | null>(null)
  const [sectorToDisconnect, setSectorToDisconnect] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [qrData, setQrData] = useState<{ sector: string; qr: string } | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newSector, setNewSector] = useState('')
  const [doctors, setDoctors] = useState<any[]>([])
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const fetchAllSessions = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const res = await fetch('/api/whatsapp/status?sector=all')
      if (!res.ok) return
      const data = await res.json()

      if (data.sessions && Array.isArray(data.sessions)) {
        setSessions(data.sessions.map((s: any) => ({
          sector: s.sector || 'default',
          connected: s.status === 'connected',
          status: s.status || 'disconnected',
          phone_number: s.phone_number,
          connected_at: s.connected_at,
          qr_code: s.qr_code,
        })))
      } else {
        const defRes = await fetch('/api/whatsapp/status')
        if (defRes.ok) {
          const defData = await defRes.json()
          setSessions([{
            sector: defData.sector || 'default',
            connected: defData.connected,
            status: defData.status || 'disconnected',
            phone_number: defData.phone_number,
            connected_at: defData.connected_at,
            qr_code: defData.qr_code,
          }])
        }
      }
      if (manual) toast.success('Status das conexões atualizado.')
    } catch {
      if (manual) toast.error('Não foi possível atualizar o status das conexões.')
    } finally {
      if (manual) setRefreshing(false)
    }
  }, [])

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch('/api/doctors?pageSize=100')
      if (res.ok) {
        const data = await res.json()
        setDoctors(data.data || [])
      }
    } catch (err) {
      console.error('Erro ao buscar profissionais:', err)
    }
  }, [])

  useEffect(() => {
    Promise.all([
      fetchAllSessions(),
      fetchDoctors(),
    ]).finally(() => setLoading(false))

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [fetchAllSessions, fetchDoctors])

  const getSectorLabel = useCallback((sector: string) => {
    if (SECTOR_LABELS[sector]) return SECTOR_LABELS[sector]
    const doc = doctors.find(d => d.user_id === sector)
    if (doc) return `${doc.user?.full_name || doc.full_name} (${doc.specialty || 'Terapeuta'})`
    return sector
  }, [doctors])

  const handleConnect = async (sector: string, force = false) => {
    setConnectingSector(sector)
    try {
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector, force }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Erro ao iniciar conexão com o WhatsApp.')
        setConnectingSector(null)
        return
      }

      if (data.status === 'connected') {
        toast.success(`WhatsApp ${getSectorLabel(sector)} já está conectado.`)
        setConnectingSector(null)
        fetchAllSessions()
        return
      }

      if (data.qr_code) {
        setQrData({ sector, qr: data.qr_code })
        if (pollingRef.current) clearInterval(pollingRef.current)
        let attempts = 0
        pollingRef.current = setInterval(async () => {
          if (typeof document !== 'undefined' && document.hidden) return
          attempts++
          if (attempts > 30) {
            if (pollingRef.current) clearInterval(pollingRef.current)
            pollingRef.current = null
            setQrData(null)
            setConnectingSector(null)
            toast.error('O tempo do QR Code expirou. Clique novamente para gerar um novo código.')
            return
          }
          const sRes = await fetch(`/api/whatsapp/status?sector=${encodeURIComponent(sector)}`)
          if (sRes.ok) {
            const sData = await sRes.json()
            if (sData.connected) {
              if (pollingRef.current) clearInterval(pollingRef.current)
              pollingRef.current = null
              setQrData(null)
              setConnectingSector(null)
              toast.success(`WhatsApp ${getSectorLabel(sector)} conectado com sucesso.`)
              fetchAllSessions()
            }
          }
        }, 3000)
      } else {
        toast.error('Não foi possível gerar o QR Code no momento. Tente novamente.')
        setConnectingSector(null)
      }
    } catch {
      toast.error('Erro de conexão ao gerar QR Code.')
      setConnectingSector(null)
    }
  }

  const handleConfirmDisconnect = async () => {
    if (!sectorToDisconnect) return
    setDisconnecting(true)
    try {
      const res = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector: sectorToDisconnect }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(`WhatsApp ${getSectorLabel(sectorToDisconnect)} desconectado.`)
        setSectorToDisconnect(null)
        fetchAllSessions()
      } else {
        toast.error(data.error || 'Não foi possível desconectar este canal.')
      }
    } catch {
      toast.error('Erro ao desconectar o canal do WhatsApp.')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleAddSector = async () => {
    const normalized = newSector
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')

    if (!normalized) {
      toast.error('Informe o nome do setor ou canal.')
      return
    }
    if (sessions.some(ses => ses.sector === normalized)) {
      toast.error('Já existe uma conexão cadastrada para este setor.')
      return
    }
    setAddDialogOpen(false)
    setNewSector('')
    handleConnect(normalized)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verificando conexões do WhatsApp...</p>
        </div>
      </div>
    )
  }

  const userRole = profile?.role || user?.role || ''
  const isAuthorized = ['CLINIC_ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN'].includes(userRole)
  const canManageChannels = ['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(userRole)

  if (!isAuthorized) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-xl">
        <Card className="border-amber-200 bg-amber-50/50 text-center p-6 space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-700">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Acesso Restrito ao Módulo de WhatsApp</h2>
          <p className="text-sm text-muted-foreground">
            A visualização e gestão das conexões de WhatsApp da clínica é permitida exclusivamente para Administradores e equipe de Recepção.
          </p>
        </Card>
      </div>
    )
  }

  const connectedSessions = sessions.filter(s => s.status === 'connected')
  const disconnectedSessions = sessions.filter(s => s.status !== 'connected')

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-8 px-4 space-y-6">
      {/* Cabeçalho editorial padrão CliniGo */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">WhatsApp</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Gerencie os números conectados por setor para lembretes e confirmações automáticas
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => fetchAllSessions(true)}
            disabled={refreshing}
            className="gap-1.5 min-h-[44px] flex-1 sm:flex-none"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          {canManageChannels && (
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] flex-1 sm:flex-none"
            >
              <Plus className="h-4 w-4" />
              Adicionar Conexão
            </Button>
          )}
        </div>
      </div>

      {!canManageChannels && (
        <div className="flex items-start gap-2.5 text-xs sm:text-sm text-muted-foreground bg-muted/60 border border-border rounded-lg p-3.5">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p>
            Você está em modo de consulta. Apenas o <strong>Administrador da Clínica</strong> pode conectar novos números ou desconectar canais ativos.
          </p>
        </div>
      )}

      {/* Sessões Conectadas */}
      {connectedSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Canais Conectados ({connectedSessions.length})
          </h2>
          {connectedSessions.map(s => (
            <Card key={s.sector} className="border-primary/25 bg-card shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                      <Wifi className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground truncate">{getSectorLabel(s.sector)}</span>
                        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                          {SECTOR_LABELS[s.sector] ? s.sector : 'profissional'}
                        </Badge>
                        <Badge className="bg-primary text-primary-foreground text-xs font-medium">
                          Ativo
                        </Badge>
                      </div>
                      {s.phone_number && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1 tabular-nums">
                          <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                          +{s.phone_number.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '$1 ($2) $3-$4')}
                        </p>
                      )}
                    </div>
                  </div>
                  {canManageChannels && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 min-h-[44px] px-3.5 gap-1.5 self-end sm:self-center"
                      onClick={() => setSectorToDisconnect(s.sector)}
                    >
                      <Unplug className="h-4 w-4" />
                      Desconectar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sessões Desconectadas */}
      {disconnectedSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Canais Desconectados ({disconnectedSessions.length})
          </h2>
          {disconnectedSessions.map(s => (
            <Card key={s.sector} className="border-dashed border-border shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                      <WifiOff className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground truncate">{getSectorLabel(s.sector)}</span>
                        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                          {SECTOR_LABELS[s.sector] ? s.sector : 'profissional'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Aguardando pareamento</p>
                    </div>
                  </div>
                  {canManageChannels && (
                    <Button
                      className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] self-end sm:self-center"
                      onClick={() => handleConnect(s.sector, true)}
                      disabled={connectingSector === s.sector}
                    >
                      {connectingSector === s.sector ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MessageSquare className="h-4 w-4" />
                      )}
                      {connectingSector === s.sector ? 'Gerando QR...' : 'Conectar'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sem sessões - primeiro uso */}
      {sessions.length === 0 && (
        <Card className="border-dashed border-border shadow-sm">
          <CardContent className="py-10 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <WifiOff className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Nenhum WhatsApp conectado</h2>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
                Conecte o WhatsApp da sua clínica para enviar lembretes de sessões, confirmações e avisos de chamada automaticamente.
              </p>
            </div>
            {canManageChannels && (
              <Button
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 min-h-[44px]"
                onClick={() => handleConnect('default', true)}
                disabled={!!connectingSector}
              >
                {connectingSector ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando QR Code...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    Conectar WhatsApp Principal
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resumo de funcionalidades */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-3 text-sm">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            Recursos habilitados ao conectar
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground pl-6">
            <span>Lembretes automáticos (24h e 2h antes da sessão)</span>
            <span>Confirmação de agendamento pela recepção</span>
            <span>Aviso de chamada no Painel de TV</span>
            <span>Envio de documentos, relatórios e declarações</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2.5 text-xs text-accent-foreground bg-accent/60 border border-primary/15 rounded-lg p-3.5">
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p>
          Cada profissional que possuir um canal próprio conectado terá seus <strong>lembretes e confirmações</strong> enviados pelo número vinculado. Caso o canal esteja desconectado, o disparo automático fica pausado até novo pareamento.
        </p>
      </div>

      {/* Modal: QR Code */}
      <Dialog
        open={!!qrData}
        onOpenChange={(open) => {
          if (!open) {
            setQrData(null)
            setConnectingSector(null)
            if (pollingRef.current) {
              clearInterval(pollingRef.current)
              pollingRef.current = null
            }
          }
        }}
      >
        <DialogContent className="max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-center">
              Escaneie o QR Code — {qrData && getSectorLabel(qrData.sector)}
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              O pareamento é atualizado automaticamente assim que o aparelho confirmar a leitura.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              {qrData?.qr ? (
                <div className="bg-white p-4 rounded-lg border-2 border-dashed border-primary/40">
                  <img
                    src={qrData.qr.startsWith('data:') ? qrData.qr : `data:image/png;base64,${qrData.qr}`}
                    alt="QR Code de pareamento WhatsApp"
                    className="w-60 h-60"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              ) : (
                <div className="w-60 h-60 bg-muted rounded-lg flex items-center justify-center animate-pulse">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="bg-muted/60 border border-border rounded-lg p-3.5 space-y-1 text-xs sm:text-sm">
              <div className="flex items-start gap-2.5">
                <Smartphone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="space-y-0.5 text-muted-foreground">
                  <p><strong className="text-foreground">1.</strong> Abra o WhatsApp no celular da clínica</p>
                  <p><strong className="text-foreground">2.</strong> Acesse <strong className="text-foreground">Menu → Aparelhos conectados</strong></p>
                  <p><strong className="text-foreground">3.</strong> Toque em <strong className="text-foreground">Conectar um aparelho</strong></p>
                  <p><strong className="text-foreground">4.</strong> Aponte a câmera para o QR Code acima</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Aguardando leitura do QR Code...
            </div>
            <Button
              variant="outline"
              className="w-full gap-1.5 min-h-[44px]"
              onClick={() => qrData && handleConnect(qrData.sector, true)}
            >
              <RefreshCw className="h-4 w-4" />
              Gerar novo QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar Setor/Conexão */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-sm w-[95vw]">
          <DialogHeader>
            <DialogTitle>Adicionar Conexão WhatsApp</DialogTitle>
            <DialogDescription className="text-xs">
              Informe o setor da clínica para gerar uma nova sessão dedicada de atendimento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp-sector-name">Nome do Setor ou Canal</Label>
              <Input
                id="whatsapp-sector-name"
                value={newSector}
                onChange={e => setNewSector(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddSector()
                  }
                }}
                placeholder="Ex: recepcao, financeiro, comercial"
                className="min-h-[44px] text-base sm:text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              className="min-h-[44px] w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAddSector}
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Conectar Canal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alerta de Confirmação: Desconectar WhatsApp */}
      <AlertDialog
        open={!!sectorToDisconnect}
        onOpenChange={(open) => {
          if (!open && !disconnecting) setSectorToDisconnect(null)
        }}
      >
        <AlertDialogContent className="max-w-md w-[95vw]">
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar canal de WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desconectar o WhatsApp <strong>{sectorToDisconnect ? getSectorLabel(sectorToDisconnect) : ''}</strong>? Os envios automáticos deste canal serão interrompidos até um novo pareamento por QR Code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={disconnecting} className="min-h-[44px]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmDisconnect()
              }}
              disabled={disconnecting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground min-h-[44px]"
            >
              {disconnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Desconectando...
                </>
              ) : (
                'Confirmar Desconexão'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
