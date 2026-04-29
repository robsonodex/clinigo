'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  CheckCircle,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
  Phone,
  AlertTriangle,
  Unplug,
  Smartphone,
} from 'lucide-react'
import { toast } from 'sonner'

interface ConnectionState {
  connected: boolean
  status: 'connecting' | 'connected' | 'disconnected'
  phone_number: string | null
  connected_at: string | null
  qr_code: string | null
}

export default function WhatsAppPage() {
  const [state, setState] = useState<ConnectionState>({
    connected: false,
    status: 'disconnected',
    phone_number: null,
    connected_at: null,
    qr_code: null,
  })
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const qrRefreshRef = useRef<NodeJS.Timeout | null>(null)

  // ========== BUSCAR STATUS ==========
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/status')
      if (!res.ok) return

      const data = await res.json()
      setState(data)

      // Se conectou, parar polling e avisar
      if (data.connected && pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
        if (qrRefreshRef.current) {
          clearInterval(qrRefreshRef.current)
          qrRefreshRef.current = null
        }
        toast.success('WhatsApp conectado com sucesso! 🎉')
        setConnecting(false)
      }
    } catch { /* silent */ }
  }, [])

  // Buscar status inicial
  useEffect(() => {
    fetchStatus().finally(() => setLoading(false))
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (qrRefreshRef.current) clearInterval(qrRefreshRef.current)
    }
  }, [fetchStatus])

  // ========== CONECTAR ==========
  const handleConnect = async () => {
    setConnecting(true)
    try {
      const res = await fetch('/api/whatsapp/connect', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erro ao conectar')
        setConnecting(false)
        return
      }

      // Mostrar QR Code
      setState(prev => ({
        ...prev,
        qr_code: data.qr_code,
        status: data.status,
        connected: data.status === 'connected',
      }))

      if (data.status === 'connected') {
        toast.success('WhatsApp já estava conectado!')
        setConnecting(false)
        return
      }

      // Iniciar polling de status a cada 3 segundos
      if (pollingRef.current) clearInterval(pollingRef.current)
      pollingRef.current = setInterval(fetchStatus, 3000)

      // Atualizar QR Code a cada 30 segundos
      if (qrRefreshRef.current) clearInterval(qrRefreshRef.current)
      qrRefreshRef.current = setInterval(async () => {
        try {
          const refreshRes = await fetch('/api/whatsapp/connect', { method: 'POST' })
          const refreshData = await refreshRes.json()
          if (refreshRes.ok && refreshData.qr_code) {
            setState(prev => ({ ...prev, qr_code: refreshData.qr_code }))
          }
        } catch { /* silent */ }
      }, 30000)
    } catch (error) {
      toast.error('Erro ao conectar WhatsApp')
      setConnecting(false)
    }
  }

  // ========== DESCONECTAR ==========
  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' })
      if (res.ok) {
        setState({
          connected: false,
          status: 'disconnected',
          phone_number: null,
          connected_at: null,
          qr_code: null,
        })
        toast.success('WhatsApp desconectado')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao desconectar')
      }
    } catch {
      toast.error('Erro ao desconectar')
    } finally {
      setDisconnecting(false)
    }
  }

  // ========== LOADING ==========
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-500 mx-auto" />
          <p className="text-muted-foreground">Verificando conexão...</p>
        </div>
      </div>
    )
  }

  // ========== ESTADO: CONECTADO ==========
  if (state.connected) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-8">
          <MessageSquare className="h-8 w-8 text-green-500" />
          WhatsApp
        </h1>

        <Card className="border-2 border-green-300 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
                <Wifi className="h-8 w-8 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-green-800">Conectado</h3>
                  <Badge className="bg-green-500">Ativo</Badge>
                </div>
                {state.phone_number && (
                  <p className="text-green-700 flex items-center gap-1.5 mt-1">
                    <Phone className="h-4 w-4" />
                    +{state.phone_number.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '$1 ($2) $3-$4')}
                  </p>
                )}
                {state.connected_at && (
                  <p className="text-xs text-green-600 mt-1">
                    Conectado em {new Date(state.connected_at).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>

            {/* Info sobre o que está ativo */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <p className="text-sm font-medium">✅ Lembretes automáticos</p>
                <p className="text-xs text-muted-foreground">24h e 2h antes</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <p className="text-sm font-medium">✅ Confirmações</p>
                <p className="text-xs text-muted-foreground">Ao agendar</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <p className="text-sm font-medium">✅ Cancelamentos</p>
                <p className="text-xs text-muted-foreground">Aviso automático</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <p className="text-sm font-medium">✅ Documentos</p>
                <p className="text-xs text-muted-foreground">Receitas e laudos</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-green-200">
              <Button
                variant="outline"
                className="gap-2 text-red-600 hover:bg-red-50 border-red-200"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unplug className="h-4 w-4" />
                )}
                Desconectar WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ========== ESTADO: QR CODE (CONECTANDO) ==========
  if (state.qr_code || connecting) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-xl">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-8">
          <MessageSquare className="h-8 w-8 text-green-500" />
          WhatsApp
        </h1>

        <Card className="border-2 border-amber-200">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">Escaneie o QR Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR CODE */}
            <div className="flex justify-center">
              {state.qr_code ? (
                <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-green-300 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.qr_code.startsWith('data:') ? state.qr_code : `data:image/png;base64,${state.qr_code}`}
                    alt="QR Code WhatsApp"
                    className="w-72 h-72"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              ) : (
                <div className="w-72 h-72 bg-gray-100 rounded-2xl flex flex-col items-center justify-center gap-3 animate-pulse">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  <p className="text-sm text-gray-400">Gerando QR Code...</p>
                </div>
              )}
            </div>

            {/* Instruções */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex items-start gap-3">
                <Smartphone className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div className="text-sm space-y-1">
                  <p><strong>1.</strong> Abra o <strong>WhatsApp</strong> no seu celular</p>
                  <p><strong>2.</strong> Toque nos três pontos <strong>(⋮)</strong> → <strong>Aparelhos conectados</strong></p>
                  <p><strong>3.</strong> Toque em <strong>Conectar um aparelho</strong></p>
                  <p><strong>4.</strong> Aponte a câmera para este QR Code</p>
                </div>
              </div>
            </div>

            {/* Status de aguardo */}
            <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Aguardando escaneamento...</span>
            </div>

            {/* Botão novo QR */}
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={handleConnect}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Gerar novo QR Code
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ========== ESTADO: DESCONECTADO ==========
  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <h1 className="text-3xl font-bold flex items-center gap-3 mb-8">
        <MessageSquare className="h-8 w-8 text-green-500" />
        WhatsApp
      </h1>

      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
              <WifiOff className="h-10 w-10 text-gray-400" />
            </div>

            <div>
              <h2 className="text-xl font-bold">WhatsApp não conectado</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Conecte o WhatsApp da sua clínica para enviar lembretes, 
                confirmações e notificações automaticamente.
              </p>
            </div>

            <Button
              size="lg"
              className="gap-3 bg-green-600 hover:bg-green-700 text-lg px-8 py-6"
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Gerando QR Code...
                </>
              ) : (
                <>
                  <MessageSquare className="h-5 w-5" />
                  Conectar WhatsApp
                </>
              )}
            </Button>

            <div className="text-left max-w-md mx-auto bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                O que muda ao conectar:
              </p>
              <ul className="space-y-1 text-muted-foreground pl-6">
                <li>• Lembretes de consulta enviados automaticamente</li>
                <li>• Confirmação de agendamento instantânea</li>
                <li>• Aviso de cancelamento automático</li>
                <li>• Envio de receitas e laudos por WhatsApp</li>
              </ul>
            </div>

            <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg p-3 max-w-md mx-auto">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                O celular que escanear o QR Code ficará responsável por todos 
                os envios da clínica. Use o número oficial da clínica.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
