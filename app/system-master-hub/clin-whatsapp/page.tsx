'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ClinWhatsAppPage() {
  const [status, setStatus] = useState<'loading' | 'disconnected' | 'connecting' | 'connected'>('loading')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/clin-whatsapp/connect')
      if (res.ok) {
        const data = await res.json()
        setPhoneNumber(data.phone_number)
        if (data.connected) {
          setStatus('connected')
          setQrCode(null)
        } else if (data.status === 'connecting') {
          // Não resetar para disconnected se está connecting
          setStatus(prev => prev === 'loading' ? 'disconnected' : prev)
        } else {
          setStatus('disconnected')
        }
      }
    } catch {
      setStatus(prev => prev === 'loading' ? 'disconnected' : prev)
    }
  }, [])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const handleConnect = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/clin-whatsapp/connect', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      if (data.qr_code) {
        setQrCode(data.qr_code)
        setStatus('connecting')
        // Poll para verificar se conectou
        const interval = setInterval(async () => {
          try {
            const statusRes = await fetch('/api/clin-whatsapp/connect')
            const statusData = await statusRes.json()
            console.log('[Clin Poll]', statusData)
            if (statusData.connected) {
              clearInterval(interval)
              setQrCode(null)
              setPhoneNumber(statusData.phone_number)
              setStatus('connected')
            } else if (statusData.status === 'disconnected') {
              // QR expirou ou sessão inválida — parar polling
              clearInterval(interval)
              setQrCode(null)
              setStatus('disconnected')
              setError('QR Code expirou ou sessão inválida. Clique em "Conectar WhatsApp" para gerar um novo QR Code.')
            }
          } catch (e) {
            console.error('[Clin Poll Error]', e)
          }
        }, 3000)
        // Parar poll após 3 minutos
        setTimeout(() => clearInterval(interval), 180000)
      } else if (data.status === 'connected') {
        setStatus('connected')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setLoading(true)
    try {
      await fetch('/api/clin-whatsapp/connect', { method: 'DELETE' })
      setStatus('disconnected')
      setPhoneNumber(null)
      setQrCode(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🤖</span>
            Clin — WhatsApp
          </h1>
          <p className="text-gray-400 mt-2">
            Conecte o número de vendas do CliniGo para o Clin responder automaticamente.
          </p>
        </div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8"
        >
          {/* Status Badge */}
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-3 h-3 rounded-full ${
              status === 'connected' ? 'bg-emerald-500 animate-pulse' :
              status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              'bg-red-500'
            }`} />
            <span className="text-lg font-medium text-white">
              {status === 'loading' && 'Verificando...'}
              {status === 'connected' && `Conectado — ${phoneNumber || 'Número ativo'}`}
              {status === 'connecting' && 'Aguardando escaneamento do QR Code...'}
              {status === 'disconnected' && 'Desconectado'}
            </span>
          </div>

          {/* QR Code */}
          <AnimatePresence>
            {qrCode && status === 'connecting' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 mb-6"
              >
                <div className="bg-white p-4 rounded-xl">
                  <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64" />
                </div>
                <div className="text-center">
                  <p className="text-gray-300 text-sm">
                    1. Abra o <strong>WhatsApp</strong> no celular com o número de vendas
                  </p>
                  <p className="text-gray-300 text-sm">
                    2. Vá em <strong>Dispositivos conectados → Conectar dispositivo</strong>
                  </p>
                  <p className="text-gray-300 text-sm">
                    3. <strong>Escaneie o QR Code</strong> acima
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info quando conectado */}
          {status === 'connected' && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
              <p className="text-emerald-400 text-sm">
                ✅ O Clin está respondendo automaticamente todas as mensagens que chegam neste número.
                Quando o lead estiver pronto para falar com humano, o Clin redireciona para você.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {status === 'disconnected' && (
              <button
                onClick={handleConnect}
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-6 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Conectando...' : '📱 Conectar WhatsApp'}
              </button>
            )}
            {status === 'connecting' && (
              <button
                onClick={handleConnect}
                disabled={loading}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-6 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Gerando...' : '🔄 Gerar novo QR Code'}
              </button>
            )}
            {status === 'connected' && (
              <>
                <button
                  onClick={handleConnect}
                  disabled={loading}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  🔄 Reconectar
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="bg-red-600/20 hover:bg-red-600/30 text-red-400 py-3 px-6 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Desconectar
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* How it works */}
        <div className="mt-6 bg-gray-800/40 border border-gray-700/30 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Como funciona</h3>
          <div className="space-y-3 text-gray-400 text-sm">
            <div className="flex gap-3">
              <span className="text-emerald-500 font-bold">1.</span>
              <span>Visitante clica em &quot;Fale com especialista&quot; no site</span>
            </div>
            <div className="flex gap-3">
              <span className="text-emerald-500 font-bold">2.</span>
              <span>Abre o WhatsApp e envia mensagem para o número conectado</span>
            </div>
            <div className="flex gap-3">
              <span className="text-emerald-500 font-bold">3.</span>
              <span>O Clin responde automaticamente: tira dúvidas, apresenta planos, captura dados</span>
            </div>
            <div className="flex gap-3">
              <span className="text-emerald-500 font-bold">4.</span>
              <span>Quando o lead quer comprar ou fazer demo, o Clin avisa você para assumir a conversa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
