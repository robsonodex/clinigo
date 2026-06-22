'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare, CheckCircle, Loader2, Wifi, WifiOff, RefreshCw,
  Phone, AlertTriangle, Unplug, Smartphone, Plus, Trash2,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface SessionData {
  sector: string
  connected: boolean
  status: 'connecting' | 'connected' | 'disconnected'
  phone_number: string | null
  connected_at: string | null
  qr_code: string | null
}

const SECTOR_LABELS: Record<string, string> = {
  default: 'Principal', recepcao: 'Recepção', financeiro: 'Financeiro',
  comercial: 'Comercial', clinico: 'Clínico', suporte: 'Suporte',
}

const SECTOR_COLORS: Record<string, string> = {
  default: 'bg-green-100 text-green-800', recepcao: 'bg-blue-100 text-blue-800',
  financeiro: 'bg-amber-100 text-amber-800', comercial: 'bg-purple-100 text-purple-800',
  clinico: 'bg-teal-100 text-teal-800', suporte: 'bg-rose-100 text-rose-800',
}

export default function WhatsAppPage() {
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [loading, setLoading] = useState(true)
  const [connectingSector, setConnectingSector] = useState<string | null>(null)
  const [qrData, setQrData] = useState<{ sector: string; qr: string } | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newSector, setNewSector] = useState('')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const fetchAllSessions = useCallback(async () => {
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
        // Fallback: buscar sessão default
        const defRes = await fetch('/api/whatsapp/status')
        if (defRes.ok) {
          const defData = await defRes.json()
          setSessions([{ ...defData, sector: 'default' }])
        }
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchAllSessions().finally(() => setLoading(false))
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [fetchAllSessions])

  const handleConnect = async (sector: string) => {
    setConnectingSector(sector)
    try {
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Erro'); setConnectingSector(null); return }

      if (data.status === 'connected') {
        toast.success(`WhatsApp ${SECTOR_LABELS[sector] || sector} já estava conectado!`)
        setConnectingSector(null)
        fetchAllSessions()
        return
      }

      if (data.qr_code) {
        setQrData({ sector, qr: data.qr_code })
        // Poll até conectar
        if (pollingRef.current) clearInterval(pollingRef.current)
        pollingRef.current = setInterval(async () => {
          const sRes = await fetch(`/api/whatsapp/status?sector=${sector}`)
          if (sRes.ok) {
            const sData = await sRes.json()
            if (sData.connected) {
              clearInterval(pollingRef.current!)
              pollingRef.current = null
              setQrData(null)
              setConnectingSector(null)
              toast.success(`WhatsApp ${SECTOR_LABELS[sector] || sector} conectado! 🎉`)
              fetchAllSessions()
            }
          }
        }, 3000)
      }
    } catch { toast.error('Erro ao conectar'); setConnectingSector(null) }
  }

  const handleDisconnect = async (sector: string) => {
    if (!confirm(`Tem certeza que deseja desconectar o WhatsApp ${SECTOR_LABELS[sector] || sector}?`)) return
    try {
      const res = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector }),
      })
      if (res.ok) { toast.success('Desconectado'); fetchAllSessions() }
      else { const d = await res.json(); toast.error(d.error || 'Erro') }
    } catch { toast.error('Erro ao desconectar') }
  }

  const handleAddSector = async () => {
    const s = newSector.trim().toLowerCase().replace(/\s+/g, '_')
    if (!s) { toast.error('Digite o nome do setor'); return }
    if (sessions.some(ses => ses.sector === s)) { toast.error('Setor já existe'); return }
    setAddDialogOpen(false)
    setNewSector('')
    handleConnect(s)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-500 mx-auto" />
          <p className="text-muted-foreground">Verificando conexões...</p>
        </div>
      </div>
    )
  }

  const connectedSessions = sessions.filter(s => s.status === 'connected')
  const disconnectedSessions = sessions.filter(s => s.status !== 'connected')

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
            <MessageSquare className="h-7 w-7 text-green-500" />
            WhatsApp
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os WhatsApps conectados por setor
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchAllSessions()} className="gap-1.5 min-h-[44px]">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
          <Button onClick={() => setAddDialogOpen(true)} className="gap-1.5 bg-green-600 hover:bg-green-700 min-h-[44px]">
            <Plus className="h-4 w-4" /> Adicionar Setor
          </Button>
        </div>
      </div>

      {/* Sessões Conectadas */}
      {connectedSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Conectados ({connectedSessions.length})</h2>
          {connectedSessions.map(s => (
            <Card key={s.sector} className="border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                    <Wifi className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-green-800 dark:text-green-200">{SECTOR_LABELS[s.sector] || s.sector}</span>
                      <Badge className={`text-xs ${SECTOR_COLORS[s.sector] || 'bg-gray-100 text-gray-800'}`}>{s.sector}</Badge>
                      <Badge className="bg-green-500 text-white text-xs">Ativo</Badge>
                    </div>
                    {s.phone_number && (
                      <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />
                        +{s.phone_number.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '$1 ($2) $3-$4')}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 min-h-[44px] min-w-[44px]"
                    onClick={() => handleDisconnect(s.sector)}>
                    <Unplug className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sessões Desconectadas */}
      {disconnectedSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Desconectados</h2>
          {disconnectedSessions.map(s => (
            <Card key={s.sector} className="border-dashed">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                    <WifiOff className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <span className="font-bold">{SECTOR_LABELS[s.sector] || s.sector}</span>
                    <Badge className={`ml-2 text-xs ${SECTOR_COLORS[s.sector] || 'bg-gray-100 text-gray-800'}`}>{s.sector}</Badge>
                    <p className="text-xs text-muted-foreground mt-0.5">Desconectado</p>
                  </div>
                  <Button className="gap-1.5 bg-green-600 hover:bg-green-700 min-h-[44px]"
                    onClick={() => handleConnect(s.sector)}
                    disabled={connectingSector === s.sector}>
                    {connectingSector === s.sector ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                    Conectar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sem sessões - primeiro uso */}
      {sessions.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
              <WifiOff className="h-10 w-10 text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Nenhum WhatsApp conectado</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Conecte o WhatsApp da sua clínica para enviar lembretes, confirmações e notificações automaticamente.
              </p>
            </div>
            <Button size="lg" className="gap-3 bg-green-600 hover:bg-green-700 text-lg px-8 py-6 min-h-[44px]"
              onClick={() => handleConnect('default')} disabled={!!connectingSector}>
              {connectingSector ? <><Loader2 className="h-5 w-5 animate-spin" />Gerando QR...</> : <><MessageSquare className="h-5 w-5" />Conectar WhatsApp</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-2 text-sm">
        <p className="font-semibold flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Funcionalidades ativas ao conectar:</p>
        <div className="grid grid-cols-2 gap-1 text-muted-foreground pl-6">
          <span>• Lembretes automáticos (24h e 2h)</span>
          <span>• Confirmação de agendamento</span>
          <span>• Aviso de cancelamento</span>
          <span>• Envio de receitas e laudos</span>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Cada setor pode ter seu próprio WhatsApp. As notificações automáticas do sistema (lembretes, confirmações) são enviadas pelo WhatsApp <strong>Principal (default)</strong>.</p>
      </div>

      {/* QR Code Modal */}
      <Dialog open={!!qrData} onOpenChange={(open) => {
        if (!open) { setQrData(null); setConnectingSector(null); if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null } }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Escaneie o QR Code — {qrData && (SECTOR_LABELS[qrData.sector] || qrData.sector)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              {qrData?.qr ? (
                <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-green-300 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrData.qr.startsWith('data:') ? qrData.qr : `data:image/png;base64,${qrData.qr}`}
                    alt="QR Code" className="w-64 h-64" style={{ imageRendering: 'pixelated' }} />
                </div>
              ) : (
                <div className="w-64 h-64 bg-gray-100 rounded-2xl flex items-center justify-center animate-pulse">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm">
              <div className="flex items-start gap-2">
                <Smartphone className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p><strong>1.</strong> Abra o WhatsApp no celular</p>
                  <p><strong>2.</strong> Toque em <strong>⋮ → Aparelhos conectados</strong></p>
                  <p><strong>3.</strong> Toque em <strong>Conectar um aparelho</strong></p>
                  <p><strong>4.</strong> Aponte a câmera para o QR</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Aguardando escaneamento...
            </div>
            <Button variant="ghost" size="sm" className="w-full gap-1.5 min-h-[44px]"
              onClick={() => qrData && handleConnect(qrData.sector)}>
              <RefreshCw className="h-3.5 w-3.5" /> Gerar novo QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Adicionar Setor */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Setor WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Setor</Label>
              <Input value={newSector} onChange={e => setNewSector(e.target.value)}
                placeholder="Ex: financeiro, comercial, suporte" style={{ fontSize: '16px' }} />
            </div>
            <div className="text-xs text-muted-foreground">
              <p>Setores pré-definidos disponíveis:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {['recepcao', 'financeiro', 'comercial', 'clinico', 'suporte'].filter(s => !sessions.some(ses => ses.sector === s)).map(s => (
                  <button key={s} type="button" onClick={() => setNewSector(s)}
                    className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer border ${SECTOR_COLORS[s] || 'bg-gray-100'}`}>
                    {SECTOR_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleAddSector} className="w-full gap-1.5 bg-green-600 hover:bg-green-700 min-h-[44px]">
              <Plus className="h-4 w-4" /> Conectar WhatsApp do Setor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
