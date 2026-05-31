'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Send, Trash2, ArrowLeft, Calendar, Clock, Plus, Trash, Pencil } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface AdminUser {
  id: string
  name: string
  email: string
  phone: string
  role: string
  clinicName: string
  clinicId: string | null
}

interface ScheduledMessage {
  id: string
  created_at: string
  scheduled_for: string
  recipient_phone: string
  recipient_name: string
  subject: string
  message: string
  status: 'pending' | 'sent' | 'failed'
  error_message: string | null
  sent_at: string | null
}

export default function ClinWhatsAppPage() {
  const [status, setStatus] = useState<'loading' | 'disconnected' | 'connecting' | 'connected'>('loading')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Sistema de Abas
  const [activeTab, setActiveTab] = useState<'instant' | 'scheduled'>('instant')

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

  // Estados de Agendamento
  const [scheduledFor, setScheduledFor] = useState('')
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([])
  const [loadingScheduled, setLoadingScheduled] = useState(false)
  const [schedulingMsg, setSchedulingMsg] = useState(false)
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)

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

  const loadScheduledMessages = useCallback(async () => {
    setLoadingScheduled(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('scheduled_whatsapp_messages')
        .select('*')
        .order('scheduled_for', { ascending: true })

      if (error) throw error
      setScheduledMessages(data || [])
    } catch (e: any) {
      console.error('Erro ao buscar mensagens agendadas:', e.message)
    } finally {
      setLoadingScheduled(false)
    }
  }, [])

  useEffect(() => {
    checkStatus()
    loadAdmins()
    loadScheduledMessages()
  }, [checkStatus, loadAdmins, loadScheduledMessages])

  // Auto-processador silencioso: envia mensagens pendentes vencidas a cada 30 segundos
  const autoProcessQueue = useCallback(async () => {
    try {
      const supabase = createClient()
      const now = new Date().toISOString()

      // Busca direto do banco para ter dados frescos (não depende do state)
      const { data: pendingMessages, error: fetchError } = await supabase
        .from('scheduled_whatsapp_messages')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', now)

      if (fetchError || !pendingMessages || pendingMessages.length === 0) return

      console.log(`[AutoProcess] Encontradas ${pendingMessages.length} mensagens vencidas. Processando...`)

      for (const msg of pendingMessages) {
        const formattedText = `*Assunto:* ${msg.subject.trim()}\n\n${msg.message.trim()}`

        try {
          const res = await fetch('/api/clin-whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: msg.recipient_phone, text: formattedText })
          })

          const data = await res.json()

          if (res.ok) {
            await supabase
              .from('scheduled_whatsapp_messages')
              .update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null })
              .eq('id', msg.id)
            console.log(`[AutoProcess] Mensagem para ${msg.recipient_name} enviada com sucesso.`)
          } else {
            const errorMsg = data.error || 'Erro no envio automático'
            await supabase
              .from('scheduled_whatsapp_messages')
              .update({ status: 'failed', error_message: errorMsg })
              .eq('id', msg.id)
            console.error(`[AutoProcess] Falha ao enviar para ${msg.recipient_name}: ${errorMsg}`)
          }
        } catch (err: any) {
          await supabase
            .from('scheduled_whatsapp_messages')
            .update({ status: 'failed', error_message: err.message || 'Erro inesperado' })
            .eq('id', msg.id)
        }
      }

      // Atualiza a lista na tela após processar
      loadScheduledMessages()
    } catch (err) {
      // Silencioso — não interrompe o usuário
      console.error('[AutoProcess] Erro no auto-processamento:', err)
    }
  }, [loadScheduledMessages])

  useEffect(() => {
    // Executa imediatamente ao carregar a página
    const initialRun = setTimeout(() => autoProcessQueue(), 3000)
    // Depois repete a cada 30 segundos
    const interval = setInterval(() => autoProcessQueue(), 30000)

    return () => {
      clearTimeout(initialRun)
      clearInterval(interval)
    }
  }, [autoProcessQueue])

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
      let sanitized = customPhone.replace(/\D/g, '')
      if (sanitized.length < 10) {
        setSendError('Por favor, insira um número válido com DDD (mínimo 10 dígitos).')
        return
      }
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

  const handleStartEdit = (msg: ScheduledMessage) => {
    setEditingMessageId(msg.id)
    setSubject(msg.subject)
    setMessage(msg.message)
    
    // Formata a data ISO para YYYY-MM-DDThh:mm exigido pelo input datetime-local
    const date = new Date(msg.scheduled_for)
    const tzOffset = date.getTimezoneOffset() * 60000
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
    setScheduledFor(localISOTime)
    
    // Detecta se era administrador ou manual
    const admin = admins.find(a => {
      const cleanA = a.phone.replace(/\D/g, '')
      const cleanM = msg.recipient_phone.replace(/\D/g, '')
      return cleanA === cleanM || (cleanA.startsWith('55') && cleanA.substring(2) === cleanM) || (cleanM.startsWith('55') && cleanM.substring(2) === cleanA)
    })
    
    if (admin) {
      setSendMethod('registered')
      setSelectedAdminId(admin.id)
      setCustomPhone('')
    } else {
      setSendMethod('manual')
      setCustomPhone(msg.recipient_phone)
      setSelectedAdminId('')
    }

    setScheduleError(null)
    setScheduleSuccess(null)

    // Scroll suave até o formulário de agendamento
    const formElement = document.getElementById('agendamento-form')
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else {
      window.scrollTo({ top: 500, behavior: 'smooth' })
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setSubject('')
    setMessage('')
    setSelectedAdminId('')
    setCustomPhone('')
    setScheduledFor('')
    setScheduleError(null)
    setScheduleSuccess(null)
  }

  const handleScheduleMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    let targetPhone = ''
    let destinationName = ''

    if (sendMethod === 'registered') {
      if (!selectedAdminId) {
        setScheduleError('Selecione um administrador para agendar a mensagem.')
        return
      }
      const admin = admins.find(a => a.id === selectedAdminId)
      if (!admin || !admin.phone) {
        setScheduleError('Administrador selecionado não possui número de telefone cadastrado.')
        return
      }
      targetPhone = admin.phone
      destinationName = admin.name
    } else {
      if (!customPhone.trim()) {
        setScheduleError('Digite o número de telefone do destinatário.')
        return
      }
      let sanitized = customPhone.replace(/\D/g, '')
      if (sanitized.length < 10) {
        setScheduleError('Por favor, insira um número válido com DDD (mínimo 10 dígitos).')
        return
      }
      if (!sanitized.startsWith('55') && (sanitized.length === 10 || sanitized.length === 11)) {
        sanitized = '55' + sanitized
      }
      targetPhone = sanitized
      destinationName = customPhone.trim()
    }

    if (!subject.trim()) {
      setScheduleError('O campo Assunto é obrigatório.')
      return
    }
    if (!message.trim()) {
      setScheduleError('O campo Mensagem é obrigatório.')
      return
    }
    if (!scheduledFor) {
      setScheduleError('Selecione a data e hora do agendamento.')
      return
    }

    const scheduledDate = new Date(scheduledFor)
    if (scheduledDate <= new Date()) {
      setScheduleError('A data e hora do agendamento devem ser no futuro.')
      return
    }

    setSchedulingMsg(true)
    setScheduleError(null)
    setScheduleSuccess(null)

    try {
      const supabase = createClient()
      
      if (editingMessageId) {
        // Modo Edição
        const { error } = await supabase
          .from('scheduled_whatsapp_messages')
          .update({
            scheduled_for: scheduledDate.toISOString(),
            recipient_phone: targetPhone,
            recipient_name: destinationName,
            subject: subject.trim(),
            message: message.trim(),
            status: 'pending' // Reverte para pendente caso estivesse como falhado
          })
          .eq('id', editingMessageId)

        if (error) throw error
        setScheduleSuccess(`Agendamento para ${destinationName} atualizado com sucesso!`)
        handleCancelEdit()
      } else {
        // Modo Criação
        const { error } = await supabase
          .from('scheduled_whatsapp_messages')
          .insert({
            scheduled_for: scheduledDate.toISOString(),
            recipient_phone: targetPhone,
            recipient_name: destinationName,
            subject: subject.trim(),
            message: message.trim(),
            status: 'pending'
          })

        if (error) throw error
        setScheduleSuccess(`Mensagem agendada com sucesso para ${destinationName}!`)
        setSubject('')
        setMessage('')
        setCustomPhone('')
        setSelectedAdminId('')
        setScheduledFor('')
      }
      
      loadScheduledMessages()
    } catch (err: any) {
      setScheduleError(err.message || 'Erro ao processar agendamento.')
    } finally {
      setSchedulingMsg(false)
    }
  }

  const handleDeleteSchedule = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja cancelar e excluir o agendamento programado para ${name}? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('scheduled_whatsapp_messages')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadScheduledMessages()
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir agendamento.')
    }
  }

  const handleSendScheduledNow = async (msg: ScheduledMessage) => {
    if (!confirm(`Deseja enviar a mensagem programada para ${msg.recipient_name} imediatamente pelo WhatsApp?`)) {
      return
    }

    setLoadingScheduled(true)
    const formattedText = `*Assunto:* ${msg.subject.trim()}\n\n${msg.message.trim()}`
    
    try {
      const res = await fetch('/api/clin-whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: msg.recipient_phone,
          text: formattedText
        })
      })

      const data = await res.json()
      const supabase = createClient()

      if (!res.ok) {
        const errorMsg = data.error || 'Erro ao enviar mensagem instantânea'
        await supabase
          .from('scheduled_whatsapp_messages')
          .update({
            status: 'failed',
            error_message: errorMsg
          })
          .eq('id', msg.id)
        
        alert(`Falha no envio: ${errorMsg}`)
      } else {
        await supabase
          .from('scheduled_whatsapp_messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            error_message: null
          })
          .eq('id', msg.id)
        
        alert(`Mensagem enviada com sucesso para ${msg.recipient_name}!`)
      }

      loadScheduledMessages()
    } catch (err: any) {
      alert(`Erro inesperado: ${err.message}`)
    } finally {
      setLoadingScheduled(false)
    }
  }

  const handleTriggerQueue = async () => {
    // Filtra mensagens pendentes que já passaram do horário de envio
    const pendingExpired = scheduledMessages.filter(m => m.status === 'pending' && new Date(m.scheduled_for) <= new Date())
    
    if (pendingExpired.length === 0) {
      alert('Nenhuma mensagem programada vencida está pendente de envio no momento.')
      return
    }

    if (!confirm(`Deseja disparar imediatamente as ${pendingExpired.length} mensagens pendentes que já passaram do horário de envio?`)) {
      return
    }

    setLoadingScheduled(true)
    let sent = 0
    let failed = 0

    const supabase = createClient()

    for (const msg of pendingExpired) {
      const formattedText = `*Assunto:* ${msg.subject.trim()}\n\n${msg.message.trim()}`
      
      try {
        const res = await fetch('/api/clin-whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: msg.recipient_phone,
            text: formattedText
          })
        })

        const data = await res.json()

        if (!res.ok) {
          const errorMsg = data.error || 'Erro no envio'
          await supabase
            .from('scheduled_whatsapp_messages')
            .update({ status: 'failed', error_message: errorMsg })
            .eq('id', msg.id)
          failed++
        } else {
          await supabase
            .from('scheduled_whatsapp_messages')
            .update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null })
            .eq('id', msg.id)
          sent++
        }
      } catch (err) {
        await supabase
          .from('scheduled_whatsapp_messages')
          .update({ status: 'failed', error_message: 'Erro inesperado de envio' })
          .eq('id', msg.id)
        failed++
      }
    }

    alert(`Processamento concluído! Enviadas com sucesso: ${sent} | Falhas: ${failed}`)
    loadScheduledMessages()
  }

  const handleClearForm = () => {
    if (confirm('Deseja limpar todos os campos?')) {
      setSubject('')
      setMessage('')
      setSelectedAdminId('')
      setCustomPhone('')
      setScheduledFor('')
      setSendSuccess(null)
      setSendError(null)
      setScheduleSuccess(null)
      setScheduleError(null)
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
              clearInterval(interval)
              setQrCode(null)
              setStatus('disconnected')
              setError('QR Code expirou ou sessão inválida. Clique em "Conectar WhatsApp" para gerar um novo QR Code.')
            }
          } catch (e) {
            console.error('[Clin Poll Error]', e)
          }
        }, 3000)
        
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
      <div className="max-w-4xl mx-auto">
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
            Conecte o número de vendas do CliniGo e controle o envio de mensagens instantâneas e agendadas.
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

        {/* Sistema de Abas */}
        <div className="flex bg-gray-900/60 p-1.5 rounded-xl border border-gray-800 mt-8 mb-6 max-w-md">
          <button
            onClick={() => setActiveTab('instant')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === 'instant'
                ? 'bg-emerald-600/90 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
            }`}
          >
            <Send className="w-4 h-4" />
            Envio Instantâneo
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === 'scheduled'
                ? 'bg-emerald-600/90 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Mensagens Programadas
          </button>
        </div>

        {/* ABA 1: ENVIO INSTANTÂNEO */}
        {activeTab === 'instant' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <span className="text-xl">💬</span>
                  Enviar Mensagem Manual Instantânea
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Envie mensagens estruturadas para o WhatsApp dos administradores imediatamente.
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
                  ⚠️ Conecte o WhatsApp no painel acima para habilitar o envio de mensagens.
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
                          ? 'bg-emerald-600/30 border border-emerald-500/30 text-emerald-300'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800/30 border border-transparent'
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
                          ? 'bg-emerald-600/30 border border-emerald-500/30 text-emerald-300'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800/30 border border-transparent'
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
                  </div>
                ) : (
                  <div>
                    <label className="text-gray-300 font-medium text-sm mb-2 block">
                      Número de WhatsApp Destinatário
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 88 98807-3740"
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      className="bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                      required
                    />
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
                    {sendingMsg ? 'Enviando...' : (
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
        )}

        {/* ABA 2: MENSAGENS PROGRAMADAS */}
        {activeTab === 'scheduled' && (
          <div className="space-y-6">
            {/* Formulário de Agendamento */}
            <motion.div
              id="agendamento-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                    {editingMessageId ? '📝 Editar Mensagem Programada' : 'Programar Novo Envio'}
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {editingMessageId 
                      ? 'Modifique os dados abaixo para atualizar o agendamento na fila.' 
                      : 'Crie e salve uma mensagem para ser enviada automaticamente em uma data futura.'}
                  </p>
                </div>
              </div>

              {status !== 'connected' ? (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ Conecte o WhatsApp no painel acima para habilitar o agendamento de mensagens.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleScheduleMessage} className="space-y-5">
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
                          setScheduleError(null)
                        }}
                        className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                          sendMethod === 'registered'
                            ? 'bg-emerald-600/30 border border-emerald-500/30 text-emerald-300'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/30 border border-transparent'
                        }`}
                      >
                        <span>👥</span> Administrador Cadastrado
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSendMethod('manual')
                          setScheduleError(null)
                        }}
                        className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                          sendMethod === 'manual'
                            ? 'bg-emerald-600/30 border border-emerald-500/30 text-emerald-300'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/30 border border-transparent'
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
                        className="bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full animate-none"
                        required
                      >
                        <option value="">Selecione o administrador...</option>
                        {admins.map((admin) => (
                          <option key={admin.id} value={admin.id}>
                            {admin.clinicName} — {admin.name} ({admin.phone})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-gray-300 font-medium text-sm mb-2 block">
                        Número de WhatsApp Destinatário
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 88 98807-3740"
                        value={customPhone}
                        onChange={(e) => setCustomPhone(e.target.value)}
                        className="bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                        required
                      />
                    </div>
                  )}

                  {/* Data e Hora de Envio */}
                  <div>
                    <label className="text-gray-300 font-medium text-sm mb-2 block flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      Data e Hora Programada para o Envio
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      className="bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full color-scheme-dark"
                      required
                    />
                  </div>

                  {/* Assunto */}
                  <div>
                    <label className="text-gray-300 font-medium text-sm mb-2 block">
                      Assunto
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Alerta de Renovação de Plano..."
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
                      placeholder="Escreva a mensagem programada..."
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full resize-none"
                      required
                    />
                  </div>

                  {/* Mensagens de feedback */}
                  {scheduleError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                      <p className="text-red-400 text-sm">{scheduleError}</p>
                    </div>
                  )}

                  {scheduleSuccess && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                      <p className="text-emerald-400 text-sm">✅ {scheduleSuccess}</p>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex gap-3 pt-2">
                    {editingMessageId ? (
                      <>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 px-6 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 min-h-[48px]"
                        >
                          Cancelar Edição
                        </button>
                        <button
                          type="submit"
                          disabled={schedulingMsg}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-6 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
                        >
                          {schedulingMsg ? 'Salvando...' : (
                            <>
                              <span>💾</span>
                              Salvar Alterações
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleClearForm}
                          className="bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 px-6 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 min-h-[48px]"
                        >
                          <Trash2 className="w-4 h-4" />
                          Limpar
                        </button>
                        <button
                          type="submit"
                          disabled={schedulingMsg}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-6 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
                        >
                          {schedulingMsg ? 'Agendando...' : (
                            <>
                              <Plus className="w-4 h-4" />
                              Agendar Envio
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </form>
              )}
            </motion.div>

            {/* Lista de Mensagens Programadas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <Clock className="w-5 h-5 text-emerald-400" />
                    Agendamentos Salvos
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Visualize e gerencie a fila de mensagens agendadas do sistema.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTriggerQueue}
                    disabled={loadingScheduled}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 min-h-[40px]"
                    title="Forçar envio de todas as mensagens vencidas da fila"
                  >
                    <span>⚡</span> Disparar Fila Vencida
                  </button>
                  <button
                    onClick={loadScheduledMessages}
                    disabled={loadingScheduled}
                    className="p-2 hover:bg-gray-700/50 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-50 min-w-[40px] min-h-[40px] flex items-center justify-center"
                    title="Recarregar agendamentos"
                  >
                    <RefreshCw className={`w-5 h-5 ${loadingScheduled ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {loadingScheduled ? (
                <div className="py-8 text-center text-gray-500 text-sm">Carregando agendamentos...</div>
              ) : scheduledMessages.length === 0 ? (
                <div className="py-12 border border-dashed border-gray-700/50 rounded-xl text-center text-gray-500 text-sm">
                  📭 Nenhuma mensagem programada no momento.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-700/40">
                  <table className="w-full text-left border-collapse bg-gray-900/20">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-900/50 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="px-6 py-4">Destinatário</th>
                        <th className="px-6 py-4">Agendado Para</th>
                        <th className="px-6 py-4">Assunto</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-sm text-gray-300">
                      {scheduledMessages.map((msg) => (
                        <tr key={msg.id} className="hover:bg-gray-800/20 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-semibold text-white block">{msg.recipient_name}</span>
                            <span className="text-xs text-gray-500">{msg.recipient_phone}</span>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium">
                            {new Date(msg.scheduled_for).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-200">
                            {msg.subject}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                              msg.status === 'sent' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
                              msg.status === 'failed' ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
                              'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 animate-pulse'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                msg.status === 'sent' ? 'bg-emerald-400' :
                                msg.status === 'failed' ? 'bg-red-400' :
                                'bg-yellow-400'
                              }`} />
                              {msg.status === 'sent' && 'Enviado'}
                              {msg.status === 'failed' && 'Falhou'}
                              {msg.status === 'pending' && 'Pendente'}
                            </span>
                            {msg.error_message && (
                              <span className="text-[10px] text-red-400 block mt-1 max-w-[200px] truncate" title={msg.error_message}>
                                {msg.error_message}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {msg.status === 'pending' ? (
                              <div className="flex gap-2 justify-center items-center">
                                <button
                                  onClick={() => handleSendScheduledNow(msg)}
                                  className="p-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors inline-flex items-center justify-center min-w-[44px] min-h-[44px]"
                                  title="Enviar Agora"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleStartEdit(msg)}
                                  className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors inline-flex items-center justify-center min-w-[44px] min-h-[44px]"
                                  title="Editar Agendamento"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSchedule(msg.id, msg.recipient_name)}
                                  className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors inline-flex items-center justify-center min-w-[44px] min-h-[44px]"
                                  title="Cancelar e Excluir Agendamento"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="text-center">
                                <span className="text-gray-600 text-xs">-</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* How it works */}
        <div className="mt-6 bg-gray-800/40 border border-gray-700/30 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Como funciona</h3>
          <div className="space-y-3 text-gray-400 text-sm">
            <div className="flex gap-3">
              <span className="text-emerald-500 font-bold">1.</span>
              <span>Conecte o número do seu celular de vendas do CliniGo no painel superior.</span>
            </div>
            <div className="flex gap-3">
              <span className="text-emerald-500 font-bold">2.</span>
              <span>Escolha entre o envio instantâneo de mensagens ou o agendamento futuro na data desejada.</span>
            </div>
            <div className="flex gap-3">
              <span className="text-emerald-500 font-bold">3.</span>
              <span>O cron job automatizado processa a fila de mensagens a cada 10 minutos, realizando os disparos perfeitamente.</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Estilos inline para o input de data no layout escuro */}
      <style jsx global>{`
        .color-scheme-dark {
          color-scheme: dark;
        }
      `}</style>
    </div>
  )
}
