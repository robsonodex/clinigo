'use client'

import { useState } from 'react'
import { ChatLayout } from '@/components/chat/ChatLayout'
import { MessageCircle, Headphones, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type TabType = 'all' | 'support'

export default function SuperAdminChatPage() {
    const [activeTab, setActiveTab] = useState<TabType>('all')

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-3 mb-3">
                        <MessageCircle className="w-6 h-6 text-sky-600" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Central de Chat</h1>
                            <p className="text-xs text-gray-500">Comunicação com clínicas e suporte</p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                                activeTab === 'all'
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Building2 className="w-4 h-4" />
                            Todas as Conversas
                        </button>
                        <button
                            onClick={() => setActiveTab('support')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                                activeTab === 'support'
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Headphones className="w-4 h-4" />
                            Suporte
                        </button>
                    </div>
                </div>
            </header>

            {/* Chat */}
            <main className="max-w-7xl mx-auto px-6 py-6">
                <ChatLayout isSuperAdmin={true} />
            </main>
        </div>
    )
}
