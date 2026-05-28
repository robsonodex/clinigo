'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Send, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface AdminUser {
  id: string
  name: string
  email: string
  phone: string
  role: string
  clinicName: string
  clinicId: string | null
}

export default function ClinWhatsAppPage() {
  const [status, setStatus] = useState<'loading' | 'disconnected' | 'connecting' | 'connected'>('loading')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Estados do Envio Manual de WhatsApp
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [sendMethod, setSendMethod] = useState<'registered' | 'manual'>('registered')
  const [selectedAdminId, setSelectedAdminId] = useState('')
  const [customPhone, setCustomPhone] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loadingAdmins, setLoadingAdmins] = useState(false)
  const [sendingMsg, setSendingMsg] = useState(false)
  const [sendSuccess, setSendSuccess] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

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

  const loadAdmins = useCallback(async () => {
    setLoadingAdmins(true)
    try {
      const res = await fetch('/api/super-admin/admins')
      if (res.ok) {
        const result = await res.json()
        setAdmins(result.data || [])
      }
    } catch (e) {
      console.error('Erro ao buscar administradores:', e)
    } finally {
      setLoadingAdmins(false)
    }
  }, [])

  useEffect(() => {
    checkStatus()
    loadAdmins()
  }, [checkStatus, loadAdmins])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    let targetPhone = ''
    let destinationName = ''

    if (sendMethod === 'registered') {
      if (!selectedAdminId) {
        setSendError('Selecione um administrador para enviar a mensagem.')
        return
      }
      const admin = admins.find(a => a.id === selectedAdminId)
      if (!admin || !admin.phone) {
        setSendError('Administrador selecionado não possui número de telefone cadastrado.')
        return
      }
      targetPhone = admin.phone
      destinationName = admin.name
    } else {
      if (!customPhone.trim()) {
        setSendError('Digite o número de telefone do destinatário.')
        return
      }
      // Higienizar número
      let sanitized = customPhone.replace(/\D/g, '')
      if (sanitized.length < 10) {
        setSendError('Por favor, insira um número válido com DDD (mínimo 10 dígitos).')
        return
      }
      // Se não tem DDI (55), adiciona automaticamente
      if (!sanitized.startsWith('55') && (sanitized.length === 10 || sanitized.length === 11)) {
        sanitized = '55' + sanitized
      }
      targetPhone = sanitized
      destinationName = customPhone.trim()
    }

    if (!subject.trim()) {
      setSendError('O campo Assunto é obrigatório.')
      return
    }
    if (!message.trim()) {
      setSendError('O campo Mensagem é obrigatório.')
      return
    }

    setSendingMsg(true)
    setSendError(null)
    setSendSuccess(null)

    const formattedText = `*Assunto:* ${subject.trim()}\n\n${message.trim()}`

    try {
      const res = await fetch('/api/clin-whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetPhone,
          text: formattedText
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar mensagem')

      setSendSuccess(`Mensagem enviada com sucesso para ${destinationName}!`)
      setSubject('')
      setMessage('')
      setCustomPhone('')
      setSelectedAdminId('')
    } catch (err: any) {
      setSendError(err.message || 'Erro inesperado ao enviar mensagem.')
    } finally {
      setSendingMsg(false)
    }
  }

  const handleClearForm = () => {
    if (confirm('Deseja limpar todos os campos?')) {
      setSubject('')
      setMessage('')
      setSelectedAdminId('')
      setCustomPhone('')
      setSendSuccess(null)
      setSendError(null)
    }
  }

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
          <Link
            href="/system-master-hub"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200 mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Voltar para o Master Hub</span>
          </Link>
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

        {/* Formulário de Envio Manual */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 mt-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="text-xl">💬</span>
                Enviar Mensagem Manual
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Envie mensagens estruturadas para o WhatsApp dos administradores cadastrados.
              </p>
            </div>
            <button
              onClick={loadAdmins}
              disabled={loadingAdmins}
              className="p-2 hover:bg-gray-700/50 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              title="Recarregar lista de administradores"
            >
              <RefreshCw className={`w-5 h-5 ${loadingAdmins ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {status !== 'connected' ? (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
              <p className="text-yellow-400 text-sm">
                ⚠️ Conecte o WhatsApp no painel acima para habilitar o envio de mensagens manuais.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="space-y-5">
              {/* Alternar Método de Envio */}
              <div>
                <label className="text-gray-300 font-semibold text-xs uppercase tracking-wider mb-2 block">
                  Método de Destino
                </label>
                <div className="flex bg-gray-900/60 p-1 rounded-xl border border-gray-700/40">
                  <button
                    type="button"
                    onClick={() => {
                      setSendMethod('registered')
                      setSendError(null)
                    }}
                    className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                      sendMethod === 'registered'
                        ? 'bg-emerald-600/90 text-white shadow-md shadow-emerald-950/20'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                    }`}
                  >
                    <span>👥</span> Administrador Cadastrado
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSendMethod('manual')
                      setSendError(null)
                    }}
                    className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                      sendMethod === 'manual'
                        ? 'bg-emerald-600/90 text-white shadow-md shadow-emerald-950/20'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                    }`}
                  >
                    <span>📱</span> Digitar Número Manual
                  </button>
                </div>
              </div>

              {/* Renderização Condicional do Campo de Destino */}
              {sendMethod === 'registered' ? (
                <div>
                  <label className="text-gray-300 font-medium text-sm mb-2 block">
                    Administrador & Clínica Destinatária
                  </label>
                  <select
                    value={selectedAdminId}
                    onChange={(e) => setSelectedAdminId(e.target.value)}
                    className="bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                    required
                  >
                    <option value="">Selecione o administrador...</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.clinicName} — {admin.name} ({admin.phone}) [{admin.role}]
                      </option>
                    ))}
                  </select>
                  {admins.length === 0 && !loadingAdmins && (
                    <p className="text-xs text-gray-500 mt-1">
                      Nenhum administrador com telefone cadastrado foi encontrado no banco de dados.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-gray-300 font-medium text-sm mb-2 block">
                    Número de WhatsApp Destinatário
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 11 99999-9999 ou 5511999999999"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    className="bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    Insira o número completo com DDD. Se omitido o código de país (55), adicionaremos automaticamente para o Brasil.
                  </p>
                </div>
              )}

              {/* Assunto */}
              <div>
                <label className="text-gray-300 font-medium text-sm mb-2 block">
                  Assunto
                </label>
                <input
                  type="text"
                  placeholder="Ex: Confirmação de Assinatura, Atualização do Sistema..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                  required
                />
              </div>

              {/* Mensagem */}
              <div>
                <label className="text-gray-300 font-medium text-sm mb-2 block">
                  Mensagem
                </label>
                <textarea
                  placeholder="Escreva o conteúdo detalhado da mensagem que será enviada pelo WhatsApp..."
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full resize-none"
                  required
                />
              </div>

              {/* Mensagens de feedback */}
              {sendError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <p className="text-red-400 text-sm">{sendError}</p>
                </div>
              )}

              {sendSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-emerald-400 text-sm">✅ {sendSuccess}</p>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 px-6 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar
                </button>
                <button
                  type="submit"
                  disabled={sendingMsg}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-6 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sendingMsg ? (
                    <>Enviando...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar Mensagem
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
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
