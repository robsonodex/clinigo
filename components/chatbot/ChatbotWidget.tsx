'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle } from 'lucide-react'

export default function ChatbotWidget() {
  const [showPulse, setShowPulse] = useState(true)

  // Pulse desaparece após 10 segundos
  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 10000)
    return () => clearTimeout(timer)
  }, [])

  const whatsappUrl = 'https://wa.me/5521990400577?text=Olá!%20Gostaria%20de%20falar%20com%20um%20especialista'

  return (
    <>
      {/* Botão flutuante para redirecionamento direto pro WhatsApp */}
      <AnimatePresence>
        <motion.a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="fixed bottom-6 right-6 z-[9999] w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xl shadow-emerald-500/30 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer group"
          aria-label="Fale com um especialista no WhatsApp"
        >
          {/* Pulse ring */}
          {showPulse && (
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
          )}
          <MessageCircle className="w-7 h-7 relative z-10" />
          
          {/* Tooltip */}
          <span className="absolute bottom-full right-0 mb-3 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            Fale com um especialista 💬
          </span>
        </motion.a>
      </AnimatePresence>
    </>
  )
}
