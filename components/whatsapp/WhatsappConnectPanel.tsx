/**
 * WhatsApp Connect Panel
 * Full UI component for managing WhatsApp QR Code session
 * States: idle, loading, qr_ready, connected, error
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWhatsappSession } from '@/hooks/useWhatsappSession'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  MessageCircle,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
  Smartphone,
  CheckCircle2,
  XCircle,
  QrCode,
} from 'lucide-react'

function formatPhone(phone: string | null): string {
  if (!phone) return ''
  // Format: +55 (21) 99999-9999
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 13) {
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`
  }
  if (cleaned.length === 12) {
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`
  }
  return `+${cleaned}`
}

export function WhatsappConnectPanel() {
  const { state, startSession, disconnect, refreshStatus } = useWhatsappSession()
  const [qrTimer, setQrTimer] = useState(60)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  // QR code expiration timer
  useEffect(() => {
    if (state.status !== 'qr_ready') {
      setQrTimer(60)
      return
    }

    const interval = setInterval(() => {
      setQrTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [state.status, state.qrBase64])

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true)
    await disconnect()
    setIsDisconnecting(false)
  }, [disconnect])

  const handleNewQr = useCallback(async () => {
    setQrTimer(60)
    await startSession()
  }, [startSession])

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
            <MessageCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-lg">WhatsApp da Clínica</CardTitle>
            <CardDescription>
              Conecte o WhatsApp da clínica para enviar mensagens automaticamente
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* === IDLE / DISCONNECTED STATE === */}
        {(state.status === 'idle' || state.status === 'disconnected') && (
          <div className="text-center space-y-4 py-4">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <WifiOff className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Conecte o WhatsApp da clínica escaneando o QR code para enviar mensagens automáticas aos pacientes.
              </p>
            </div>
            <Button
              onClick={startSession}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
              size="lg"
            >
              <QrCode className="h-5 w-5" />
              Conectar WhatsApp
            </Button>
          </div>
        )}

        {/* === LOADING STATE === */}
        {state.status === 'loading' && (
          <div className="text-center space-y-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto" />
            <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
          </div>
        )}

        {/* === QR READY STATE === */}
        {state.status === 'qr_ready' && state.qrBase64 && (
          <div className="text-center space-y-4">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="border-2 border-green-200 rounded-xl p-3 bg-white shadow-sm">
                <img
                  src={state.qrBase64}
                  alt="QR Code WhatsApp"
                  width={256}
                  height={256}
                  className="rounded-lg"
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
              <p className="text-sm font-medium text-gray-700">Como conectar:</p>
              <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
                <li>Abra o <strong>WhatsApp</strong> no celular</li>
                <li>
                  Toque em <strong>⋮</strong> →{' '}
                  <strong>Aparelhos conectados</strong>
                </li>
                <li>Toque em <strong>Conectar aparelho</strong></li>
                <li>Escaneie este código QR</li>
              </ol>
            </div>

            {/* Timer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>QR Code expira em</span>
                <span className={qrTimer <= 10 ? 'text-red-500 font-medium' : ''}>
                  {qrTimer}s
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${(qrTimer / 60) * 100}%` }}
                />
              </div>

              {qrTimer === 0 && (
                <Button
                  onClick={handleNewQr}
                  variant="outline"
                  className="gap-2 w-full"
                >
                  <RefreshCw className="h-4 w-4" />
                  Gerar novo QR Code
                </Button>
              )}
            </div>
          </div>
        )}

        {/* === CONNECTED STATE === */}
        {state.status === 'connected' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600 text-white">
                    <Wifi className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                </div>
                {state.connectedPhone && (
                  <p className="text-sm text-green-700 mt-1 font-mono">
                    <Smartphone className="h-3.5 w-3.5 inline mr-1" />
                    {formatPhone(state.connectedPhone)}
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              O WhatsApp da clínica está conectado. Mensagens serão enviadas automaticamente quando disponível.
            </p>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <WifiOff className="h-4 w-4" />
                  )}
                  Desconectar WhatsApp
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ao desconectar, o envio automático de mensagens será desativado.
                    Você precisará escanear o QR Code novamente para reconectar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDisconnect}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Sim, desconectar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* === ERROR STATE === */}
        {state.status === 'error' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Erro na conexão</AlertTitle>
              <AlertDescription>
                {state.error || 'Ocorreu um erro ao conectar o WhatsApp.'}
              </AlertDescription>
            </Alert>

            <Button
              onClick={startSession}
              variant="outline"
              className="w-full gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Refresh button (always visible except loading) */}
        {state.status !== 'loading' && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshStatus}
              className="text-xs text-muted-foreground gap-1.5"
            >
              <RefreshCw className="h-3 w-3" />
              Atualizar status
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
