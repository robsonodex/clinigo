'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle } from 'lucide-react'

const CLINIGO_WHATSAPP_URL =
  'https://wa.me/5521975129005?text=Ol%C3%A1!%20Gostaria%20de%20conhecer%20o%20CliniGo%20para%20nossa%20cl%C3%ADnica%20de%20terapias'

export default function ChatbotWidget() {
  const [showPulse, setShowPulse] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 10000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      <motion.a
        href={CLINIGO_WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="fixed bottom-6 right-6 z-[9999] min-w-[56px] min-h-[56px] w-14 h-14 rounded-full bg-[#155E4B] hover:bg-[#0F493A] text-white shadow-lg border border-white/15 flex items-center justify-center transition-colors cursor-pointer group"
        aria-label="Falar com a Clin no WhatsApp (21) 97512-9005"
      >
        {showPulse && (
          <span className="absolute inset-0 rounded-full bg-[#155E4B] animate-ping opacity-25" />
        )}
        <MessageCircle className="w-6 h-6 relative z-10" strokeWidth={1.75} />

        <span className="absolute bottom-full right-0 mb-3 px-3 py-1.5 bg-[#0D1F1B] text-white text-xs font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
          Falar no WhatsApp · (21) 97512-9005
        </span>
      </motion.a>
    </AnimatePresence>
  )
}
