'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Loader2, ExternalLink } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  transfer?: boolean
  whatsappUrl?: string
}

function generateSessionId(): string {
  return 'clin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId()
  const stored = sessionStorage.getItem('clinigo_chat_session')
  if (stored) return stored
  const newId = generateSessionId()
  sessionStorage.setItem('clinigo_chat_session', newId)
  return newId
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPulse, setShowPulse] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sessionIdRef = useRef<string>('')

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Mostrar mensagem de boas-vindas ao abrir pela primeira vez
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: 'Olá! 👋 Sou o Clin, assistente virtual do CliniGo. Fico feliz em te atender! Como posso te ajudar hoje?',
        timestamp: new Date()
      }])
    }
  }, [isOpen, messages.length])

  // Pulse desaparece após 10 segundos
  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 10000)
    return () => clearTimeout(timer)
  }, [])

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          sessionId: sessionIdRef.current,
          sourcePage: typeof window !== 'undefined' ? window.location.pathname : '/'
        })
      })

      const data = await response.json()

      if (response.ok) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
          transfer: data.transfer,
          whatsappUrl: data.whatsappUrl
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.error || 'Desculpe, tive um problema. Tente novamente em instantes.',
          timestamp: new Date()
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Ops, parece que houve um problema de conexão. Tente novamente!',
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => { setIsOpen(true); setShowPulse(false) }}
            className="fixed bottom-6 right-6 z-[9999] w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xl shadow-emerald-500/30 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer group"
            aria-label="Abrir chat"
          >
            {/* Pulse ring */}
            {showPulse && (
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
            )}
            <MessageCircle className="w-7 h-7 relative z-10" />
            
            {/* Tooltip */}
            <span className="absolute bottom-full right-0 mb-3 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
              Fale com o Clin 💬
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Painel do chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-[9999] w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-3rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-white/10"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Clin · CliniGo</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                    <span className="text-emerald-100 text-xs">Online agora</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Fechar chat"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50 to-white">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-md'
                        : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    
                    {/* Botão WhatsApp quando transferir */}
                    {msg.transfer && msg.whatsappUrl && (
                      <a
                        href={msg.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Falar pelo WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white shadow-sm border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 p-3 bg-white border-t border-slate-100">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua mensagem..."
                  maxLength={1000}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100 flex-shrink-0 cursor-pointer"
                  aria-label="Enviar mensagem"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-center text-[10px] text-slate-300 mt-2">
                Powered by CliniGo
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
