'use client'

import { ChatLayout } from '@/components/chat/ChatLayout'
import { usePlan } from '@/lib/hooks/use-plan'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { MessageCircle, Lock } from 'lucide-react'

export default function ChatPage() {
    const { planType, isLoading, canAccess } = usePlan()
    const router = useRouter()

    // Check if plan supports chat (AVANCADO+)
    const hasAccess = !isLoading && planType && canAccess('chat_interno')

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 w-48 bg-gray-200 rounded" />
                    <div className="h-[calc(100vh-12rem)] bg-gray-100 rounded-xl" />
                </div>
            </div>
        )
    }

    if (!hasAccess) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Chat Interno
                    </h2>
                    <p className="text-gray-500 mb-4">
                        O chat interno está disponível a partir do plano Avançado.
                        Faça upgrade para ter comunicação em tempo real com sua equipe.
                    </p>
                    <button
                        onClick={() => router.push('/dashboard/configuracoes/assinatura')}
                        className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors text-sm font-medium"
                    >
                        Ver Planos
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="w-6 h-6 text-sky-600" />
                <h1 className="text-xl font-semibold text-gray-900">Chat Interno</h1>
            </div>
            <ChatLayout />
        </div>
    )
}
