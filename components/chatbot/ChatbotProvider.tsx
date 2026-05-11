'use client'

import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamic import para não impactar o bundle das páginas internas
const ChatbotWidget = dynamic(
  () => import('@/components/chatbot/ChatbotWidget'),
  { ssr: false }
)

// Páginas onde o chatbot NÃO deve aparecer
const EXCLUDED_PREFIXES = [
  '/dashboard',
  '/clinica',
  '/medico',
  '/admin',
  '/checkin',
  '/painel-tv',
  '/totem',
  '/video',
  '/paciente',
  '/m/',
  '/system-master-hub',
  '/pagamento',
  '/api',
  '/auth',
  '/(auth)',
  '/(patient)',
  '/(pwa)',
  '/reschedule',
  '/demo',
  '/help',
]

export default function ChatbotProvider() {
  const pathname = usePathname()

  // Não renderizar em páginas internas do sistema
  const isExcluded = EXCLUDED_PREFIXES.some(prefix => 
    pathname.startsWith(prefix)
  )

  if (isExcluded) return null

  return <ChatbotWidget />
}
